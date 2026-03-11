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
    day: '2-digit'
  });
  
  const todayISO = formatter.format(now); // Gives YYYY-MM-DD
  
  // For relative dates, we need a Date object that represents 00:00:00 in Jakarta
  const jakartaDate = new Date(todayISO + "T00:00:00");

  const tomorrow = new Date(jakartaDate.getTime() + 86400000).toISOString().split('T')[0];
  const lusa     = new Date(jakartaDate.getTime() + 172800000).toISOString().split('T')[0];

  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const dayName = days[jakartaDate.getDay()];

  return `
You are a personal planner assistant for an Indonesian user.
Parse the user's natural language input (in Indonesian or English) and extract structured planning data.
You MUST respond ONLY with a valid JSON object. No explanation, no markdown, no code fences.

Today is ${dayName}, ${todayISO}
Tomorrow is ${days[(jakartaDate.getDay() + 1) % 7]}, ${tomorrow}
Day after tomorrow is ${days[(jakartaDate.getDay() + 2) % 7]}, ${lusa}

Resolution rules:
- If use says "besok" → use ${tomorrow}
- If user says a day name (e.g. "Sabtu") and that day is in the FUTURE this week → use that date.
- If user says a day name and that day HAS PASSED this week (e.g. user says "Sabtu" but today is Sunday) → assume user means NEXT week's Saturday (Add 6-7 days).
- Default to ${todayISO} only if no time/day is mentioned.
- Format all dates as YYYY-MM-DD.

The JSON must follow this schema exactly:
{
  "type": "activity" | "note" | "none",
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
      "status": "pending"
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

Field rules:
- "type"
    • "activity" → user mentions tasks, schedules, or plans → fill activities[], notes stays []
    • "note"     → user vents, reflects, or shares feelings without a plan → fill notes[], activities stays []
    • "none"     → off-topic or unclear → both arrays stay [], fill warnings[]
- "message"   → always a short warm response in Bahasa Indonesia (1–2 sentences)
- "warnings"  → array of friendly Indonesian strings explaining what was unclear (can be empty [])
- activities[].type
    • "schedule" → appointments, meetings, classes, social events, or when user says "jadwal", "acara"
    • "task"     → personal work, chores, "todo list", "daftar tugas", studying, exercise
- activities[].date → always YYYY-MM-DD. Resolve relative terms: "besok"=${tomorrow}, "hari ini"=${todayISO}, "lusa"=${lusa}
- activities[].startTime / endTime → "HH:MM" 24-hour format (e.g. 13:00 instead of 01:00), or null if not mentioned
- activities[].endTime → if not mentioned, infer by adding 1 hour to startTime using 24-hour logic (e.g. 12:00 + 1h = 13:00); if startTime also null, set null
- activities[].priority → infer from context: exam/deadline → "high", social/routine → "medium", leisure → "low", unknown → null
- activities[].status → always "pending" (hardcoded)
- activities[].linkUrl → null unless user explicitly mentions a URL
- notes[].relatedDate → YYYY-MM-DD or null
- notes[].isPinned → always false
- Do NOT include "source" or "userId" in output — those are set server-side
`.trim();
};

// ─── Validators ───────────────────────────────────────────────────

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE     = /^\d{2}:\d{2}$/;

const VALID_TYPES      = ['activity', 'note', 'none'];
const VALID_ACT_TYPES  = ['task', 'schedule'];
const VALID_PRIORITIES = ['low', 'medium', 'high', null];
const VALID_STATUSES   = ['pending', 'done', 'skipped'];

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
    throw new Error(`Top-level "type" must be "activity", "note", or "none" — got: ${parsed.type}`);
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
    date:        a.date, 
    // Ensure nullable fields are explicitly null
    description: a.description ?? null,
    startTime:   a.startTime   ?? null,
    endTime:     a.endTime     ?? null,
    priority:    a.priority    ?? null,
    linkUrl:     a.linkUrl     ?? null,
    source:      'ai',
    userId,
  }));

  parsed.notes = parsed.notes.map((n) => ({
    ...n,
    // Keep relatedDate as YYYY-MM-DD string for frontend consistency
    relatedDate: n.relatedDate || null,
    isPinned:    n.isPinned ?? false,
    source:      'ai',
    userId,
  }));


  return parsed;
};

module.exports = { parse };