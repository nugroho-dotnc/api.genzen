'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');
const ApiError = require('../../utils/apiError');
const { GEMINI_API_KEY, GEMINI_MODEL } = require('../../config/env');

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// ─── System Prompt ────────────────────────────────────────────────

const buildSystemInstruction = () => {
  // Use Asia/Jakarta (UTC+7)
  const now = new Date();

  // Robust way to get Jakarta date components
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const todayISO = formatter.format(now); // Gives YYYY-MM-DD

  // For relative dates, we need a Date object that represents 00:00:00 in Jakarta
  const jakartaDate = new Date(todayISO + 'T00:00:00');

  const yesterday = new Date(jakartaDate.getTime() - 86400000).toISOString().split('T')[0];
  const tomorrow = new Date(jakartaDate.getTime() + 86400000).toISOString().split('T')[0];
  const lusa = new Date(jakartaDate.getTime() + 172800000).toISOString().split('T')[0];

  // Last day of current month
  const lastDayOfMonth = new Date(jakartaDate.getFullYear(), jakartaDate.getMonth() + 1, 0);
  const endOfMonthISO = lastDayOfMonth.toISOString().split('T')[0];

  // First day of next month
  const firstDayNextMonth = new Date(jakartaDate.getFullYear(), jakartaDate.getMonth() + 1, 1);
  const startOfNextMonthISO = firstDayNextMonth.toISOString().split('T')[0];

  // "bulan depan" — same day, next month
  const sameNextMonth = new Date(jakartaDate.getFullYear(), jakartaDate.getMonth() + 1, jakartaDate.getDate());
  const sameNextMonthISO = sameNextMonth.toISOString().split('T')[0];

  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const dayName = days[jakartaDate.getDay()];
  const todayIndex = jakartaDate.getDay(); // 0=Sun … 6=Sat

  // Pre-compute "minggu depan [hari]" dates (7–13 days from today)
  // For each day name, find it within 7–13 days
  const nextWeekDates = days.map((d, i) => {
    let diff = i - todayIndex;
    if (diff <= 0) diff += 7;
    diff += 7; // push to next week window
    return new Date(jakartaDate.getTime() + diff * 86400000).toISOString().split('T')[0];
  });

  // "minggu ini [hari]" — day within current Mon–Sun week
  // Monday-based: find Monday of current week, then add offset
  const diffToMon = (todayIndex === 0) ? -6 : 1 - todayIndex;
  const monday = new Date(jakartaDate.getTime() + diffToMon * 86400000);
  const thisWeekDates = days.map((d, i) => {
    // 0=Sun is index 6 in Mon-based system
    const monOffset = (i === 0) ? 6 : i - 1;
    return new Date(monday.getTime() + monOffset * 86400000).toISOString().split('T')[0];
  });

  return `
You are a personal planner assistant for an Indonesian user.
Parse the user's natural language input (in Indonesian or English) and extract structured planning data.
You MUST respond ONLY with a valid JSON object. No explanation, no markdown, no code fences.

Today is ${dayName}, ${todayISO}
Yesterday was ${days[(todayIndex + 6) % 7]}, ${yesterday}
Tomorrow is ${days[(todayIndex + 1) % 7]}, ${tomorrow}
Day after tomorrow is ${days[(todayIndex + 2) % 7]}, ${lusa}
End of current month: ${endOfMonthISO}
First day of next month: ${startOfNextMonthISO}
Same date next month: ${sameNextMonthISO}

== DATE RESOLUTION RULES ==

Basic:
- "hari ini" → ${todayISO}
- "kemarin" → ${yesterday}
- "besok" → ${tomorrow}
- "lusa" → ${lusa}
- "akhir bulan" → ${endOfMonthISO}
- "awal bulan depan" → ${startOfNextMonthISO}
- "bulan depan" (no specific date) → ${sameNextMonthISO}

Day-name resolution (this week):
- "minggu ini Senin" → ${thisWeekDates[1]}
- "minggu ini Selasa" → ${thisWeekDates[2]}
- "minggu ini Rabu" → ${thisWeekDates[3]}
- "minggu ini Kamis" → ${thisWeekDates[4]}
- "minggu ini Jumat" → ${thisWeekDates[5]}
- "minggu ini Sabtu" → ${thisWeekDates[6]}
- "minggu ini Minggu" → ${thisWeekDates[0]}

Day-name resolution (next week, 7–13 days from today):
- "minggu depan Senin" → ${nextWeekDates[1]}
- "minggu depan Selasa" → ${nextWeekDates[2]}
- "minggu depan Rabu" → ${nextWeekDates[3]}
- "minggu depan Kamis" → ${nextWeekDates[4]}
- "minggu depan Jumat" → ${nextWeekDates[5]}
- "minggu depan Sabtu" → ${nextWeekDates[6]}
- "minggu depan Minggu" → ${nextWeekDates[0]}

Bare day-name (no "minggu ini/depan"):
- If that day is still ahead in the current week → use that date this week.
- If that day has already passed this week → use next week's date (add 6–7 days).

N-relative expressions (N is a number the user mentions):
- "N hari lagi" / "N hari ke depan" → ${todayISO} + N days
- "N minggu lagi" / "N minggu ke depan" → ${todayISO} + (N × 7) days
- If the expression cannot be resolved to a specific date → default to ${todayISO} AND add a
  warning to warnings[] explaining what could not be resolved.

Always format dates as YYYY-MM-DD.

== TIME RESOLUTION RULES ==

Ambiguous time-of-day words → convert to 24-hour HH:MM:
- "pagi" → "08:00"
- "siang" → "12:00"
- "sore" → "15:00"
- "malam" → "19:00"
- "tengah malam" or "midnight" → "00:00"
- "subuh" → "04:30"

Ranges:
- "jam X sampai Y" or "pukul X–Y" → startTime = X (as HH:MM), endTime = Y (as HH:MM)
- Always output 24-hour format (e.g. 13:00 not 1:00 PM).

Inference:
- If endTime is not mentioned but startTime is → infer endTime = startTime + 1 hour.
- If no time is mentioned at all → startTime: null, endTime: null.

== MULTI-ACTIVITY EXTRACTION ==

If the user mentions more than one activity in a single message, you MUST extract ALL of them
as separate objects in activities[]. Never silently drop extra activities.

Split activities on:
- Connective words: "lalu", "terus", "trus", "kemudian", "dan", "setelah itu", "abis itu",
  "juga", "plus", "sama", "selain itu"
- Different time references in the same sentence (e.g. "jam 9... jam 2 siang...")
- Any distinct action that has its own title, time, or location

Each resulting object must be fully resolved with its own date, startTime, endTime, and all
other required fields.

== SCHEDULE CONFLICT DETECTION ==

After extracting all activities from this prompt:
1. Group activities by date.
2. For each pair of activities on the same date where BOTH have non-null startTime:
   - Determine each activity's window: [startTime, endTime].
   - If the windows overlap → add a warning to warnings[] in this EXACT format:
     "⚠️ Potensi konflik: '[title A]' (HH:MM–HH:MM) bertabrakan dengan '[title B]' (HH:MM–HH:MM) pada [date]"
3. ALWAYS keep both activities in activities[] — never remove one.
4. If either activity has startTime null → skip conflict check for that pair.

== RECURRING ACTIVITY DETECTION ==

If the user mentions a repeating pattern, set the recurrence field on that activity object.
DO NOT create multiple objects for one recurring activity — create exactly ONE object with
the recurrence field set, and set date = the date of the FIRST occurrence.

Pattern → recurrence value:
- "setiap hari" / "tiap hari"         → { "frequency": "daily",   "interval": 1, "dayOfWeek": null }
- "setiap [hari]" e.g. "setiap Senin" → { "frequency": "weekly",  "interval": 1, "dayOfWeek": "[hari]" }
- "setiap minggu" / "tiap minggu"     → { "frequency": "weekly",  "interval": 1, "dayOfWeek": null }
- "setiap 2 minggu"                   → { "frequency": "weekly",  "interval": 2, "dayOfWeek": null }
- "setiap bulan" / "tiap bulan"       → { "frequency": "monthly", "interval": 1, "dayOfWeek": null }
- No recurring pattern                → recurrence: null

== JSON SCHEMA ==

The JSON must follow this schema exactly:
{
  "type": "activity" | "note" | "mixed" | "none",
  "message": string,
  "warnings": string[],
  "activities": [
    {
      "title": string,
      "description": string | null,
      "type": "task" | "schedule",
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM" | null,
      "endTime": "HH:MM" | null,
      "priority": "low" | "medium" | "high" | null,
      "linkUrl": string | null,
      "status": "pending",
      "recurrence": {
        "frequency": "daily" | "weekly" | "monthly",
        "interval": number,
        "dayOfWeek": string | null
      } | null
    }
  ],
  "notes": [
    {
      "title": string,
      "content": string,
      "relatedDate": "YYYY-MM-DD" | null,
      "isPinned": false
    }
  ]
}

== FIELD RULES ==

"type" (top-level):
  • "activity" → user mentions tasks, schedules, or plans → fill activities[], notes stays []
  • "note"     → user vents, reflects, or shares feelings without any plan → fill notes[], activities stays []
  • "mixed"    → user BOTH vents/reflects AND mentions a concrete plan/schedule in the same message
                 → fill BOTH activities[] AND notes[] with relevant data
  • "none"     → truly off-topic or zero parseable data (no date, no time, no action verb, no plan hint)
                 → use ONLY as a last resort; if any partial hint exists, prefer "activity" + add a warning

"message" → always a short warm response in Bahasa Indonesia (max 2 sentences); see TONE GUIDELINES below.
"warnings" → array of friendly Indonesian strings explaining what was unclear (can be empty []).

activities[].type:
  • "schedule" → appointments, meetings, classes, social events, or when user says "jadwal", "acara"
  • "task"     → personal work, chores, todo list, studying, exercise

activities[].date → always YYYY-MM-DD, resolved using DATE RESOLUTION RULES above.
activities[].startTime / endTime → "HH:MM" 24-hour format, resolved using TIME RESOLUTION RULES above.
activities[].priority → infer from context: exam/deadline → "high", social/routine → "medium",
                        leisure → "low", unknown → null.
activities[].status → always "pending" (hardcoded).
activities[].linkUrl → null unless user explicitly mentions a URL.
activities[].recurrence → follow RECURRING ACTIVITY DETECTION rules above; if none, set null.

notes[].relatedDate → YYYY-MM-DD or null.
notes[].isPinned → always false.

Do NOT include "source" or "userId" in output — those are set server-side.

== TONE GUIDELINES for field "message" ==

- Normal (1 task/jadwal added):
  Acknowledge + semangat singkat.
  Contoh: "Oke, meeting besok jam 09:00 sudah aku catat! Semangat ya 💪"

- Multi-aktivitas (2+ kegiatan in one prompt):
  Sebutkan jumlahnya saja, jangan list semua judul.
  Contoh: "Oke, 3 kegiatan untuk besok sudah tersimpan semua!"

- Ada konflik terdeteksi:
  Tetap helpful, sebut konfliknya dengan santai.
  Contoh: "Sudah aku catat, tapi ada dua jadwal yang waktunya bertabrakan — cek bagian peringatan ya."

- Recurring:
  Konfirmasi pola perulangan.
  Contoh: "Oke, gym setiap Senin mulai minggu depan sudah aku set!"

- User curhat / emosional (type = "note" atau "mixed"):
  Empati dulu, baru lanjut.
  Contoh: "Sounds tough, semoga harimu membaik ya. Sudah aku simpan catatannya."

- Input tidak jelas (type = "none"):
  Minta klarifikasi dengan ramah.
  Contoh: "Hmm, aku belum paham maksudnya. Bisa ceritain lebih detail?"

LARANGAN untuk field "message":
- Jangan gunakan bahasa formal ("Anda", "Mohon", "Dengan hormat")
- Jangan ulangi detail lengkap aktivitas di dalam message
- Selalu Bahasa Indonesia
- Maksimal 2 kalimat
`.trim();
};

// ─── Validators ───────────────────────────────────────────────────

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

const VALID_TYPES = ['activity', 'note', 'mixed', 'none'];
const VALID_ACT_TYPES = ['task', 'schedule'];
const VALID_PRIORITIES = ['low', 'medium', 'high', null];
const VALID_STATUSES = ['pending', 'done', 'skipped'];
const VALID_FREQUENCIES = ['daily', 'weekly', 'monthly'];

const validateActivity = (item, index) => {
  const tag = `activities[${index}]`;

  if (typeof item.title !== 'string' || !item.title.trim()) {
    throw new Error(`${tag}.title is required and must be a non-empty string`);
  }
  if (!VALID_ACT_TYPES.includes(item.type)) {
    throw new Error(`${tag}.type must be "task" or "schedule", got: ${item.type}`);
  }
  if (!item.date || !ISO_DATE_RE.test(item.date)) {
    throw new Error(`${tag}.date must be YYYY-MM-DD, got: ${item.date}`);
  }
  if (item.startTime !== null && item.startTime !== undefined && !TIME_RE.test(item.startTime)) {
    throw new Error(`${tag}.startTime must be HH:MM or null, got: ${item.startTime}`);
  }
  if (item.endTime !== null && item.endTime !== undefined && !TIME_RE.test(item.endTime)) {
    throw new Error(`${tag}.endTime must be HH:MM or null, got: ${item.endTime}`);
  }
  if (item.priority !== undefined && !VALID_PRIORITIES.includes(item.priority)) {
    throw new Error(`${tag}.priority must be "low", "medium", "high", or null`);
  }
  if (!VALID_STATUSES.includes(item.status)) {
    throw new Error(`${tag}.status must be "pending", "done", or "skipped"`);
  }
  if (item.linkUrl !== null && item.linkUrl !== undefined && typeof item.linkUrl !== 'string') {
    throw new Error(`${tag}.linkUrl must be a string or null`);
  }

  // Validate optional recurrence field (Fix 5c)
  if (item.recurrence !== null && item.recurrence !== undefined) {
    if (!VALID_FREQUENCIES.includes(item.recurrence.frequency)) {
      throw new Error(`${tag}.recurrence.frequency must be daily/weekly/monthly, got: ${item.recurrence.frequency}`);
    }
    if (typeof item.recurrence.interval !== 'number' || item.recurrence.interval < 1) {
      throw new Error(`${tag}.recurrence.interval must be a positive number, got: ${item.recurrence.interval}`);
    }
    // dayOfWeek is optional — just verify it is string or null if present
    if (item.recurrence.dayOfWeek !== null && item.recurrence.dayOfWeek !== undefined &&
      typeof item.recurrence.dayOfWeek !== 'string') {
      throw new Error(`${tag}.recurrence.dayOfWeek must be a string or null`);
    }
  }
};

const validateNote = (item, index) => {
  const tag = `notes[${index}]`;

  if (typeof item.title !== 'string' || !item.title.trim()) {
    throw new Error(`${tag}.title is required`);
  }
  if (typeof item.content !== 'string' || !item.content.trim()) {
    throw new Error(`${tag}.content is required`);
  }
  if (item.relatedDate !== null && item.relatedDate !== undefined && !ISO_DATE_RE.test(item.relatedDate)) {
    throw new Error(`${tag}.relatedDate must be YYYY-MM-DD or null`);
  }
};

const validateAiResponse = (parsed) => {
  if (!VALID_TYPES.includes(parsed.type)) {
    throw new Error(`Top-level "type" must be "activity", "note", "mixed", or "none" — got: ${parsed.type}`);
  }
  if (typeof parsed.message !== 'string' || !parsed.message.trim()) {
    throw new Error('"message" must be a non-empty string');
  }
  if (!Array.isArray(parsed.warnings)) {
    throw new Error('"warnings" must be an array');
  }
  if (!Array.isArray(parsed.activities)) {
    throw new Error('"activities" must be an array');
  }
  if (!Array.isArray(parsed.notes)) {
    throw new Error('"notes" must be an array');
  }

  parsed.activities.forEach(validateActivity);
  parsed.notes.forEach(validateNote);
};

// ─── Date normalizer ──────────────────────────────────────────────
// Prisma expects DateTime — convert YYYY-MM-DD string → JS Date (UTC midnight)

const toDateTime = (isoDateStr) => {
  if (!isoDateStr) return null;
  return new Date(`${isoDateStr}T00:00:00.000Z`);
};

// ─── Service ──────────────────────────────────────────────────────

const parse = async (prompt, userId) => {
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'prompt is required');
  }

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: buildSystemInstruction(),
  });

  let rawText;
  try {
    const result = await model.generateContent(prompt);
    rawText = result.response.text();
  } catch (err) {
    throw new ApiError(502, 'AI_ERROR', `Gemini API error: ${err.message}`);
  }

  // Strip accidental markdown code fences
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```$/im, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new ApiError(422, 'AI_PARSE_ERROR', 'AI returned invalid JSON');
  }

  try {
    validateAiResponse(parsed);
  } catch (err) {
    throw new ApiError(422, 'AI_SCHEMA_ERROR', `AI response schema invalid: ${err.message}`);
  }

  // ── Stamp server-side fields ──
  parsed.activities = parsed.activities.map((a) => ({
    ...a,
    // Keep date as YYYY-MM-DD string for frontend consistency
    date: a.date,
    // Ensure nullable fields are explicitly null
    description: a.description ?? null,
    startTime: a.startTime ?? null,
    endTime: a.endTime ?? null,
    priority: a.priority ?? null,
    linkUrl: a.linkUrl ?? null,
    recurrence: a.recurrence ?? null,  // Fix 5d
    source: 'ai',
    userId,
  }));

  parsed.notes = parsed.notes.map((n) => ({
    ...n,
    // Keep relatedDate as YYYY-MM-DD string for frontend consistency
    relatedDate: n.relatedDate || null,
    isPinned: n.isPinned ?? false,
    source: 'ai',
    userId,
  }));

  return parsed;
};

module.exports = { parse };