# D-Planner Backend 🛠️

The backend of D-Planner is a robust Node.js API built with Express, featuring AI integration for natural language processing and Prisma ORM for database management.

---

## 🚀 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL/PostgreSQL (via Prisma)
- **AI**: Google Gemini (generative-ai)
- **Authentication**: JWT & Bcrypt.js
- **Validation**: Express-Validator

---

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18+)
- A MySQL or PostgreSQL instance
- Google Gemini API Key

### Installation

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Create a `.env` file in this directory and fill it with your credentials:

   ```env
   PORT=5000
   DATABASE_URL="mysql://your_user:your_password@localhost:3306/d_planner"
   JWT_SECRET="your_secret_key"
   REFRESH_TOKEN_SECRET="your_refresh_secret"
   GEMINI_API_KEY="your_google_ai_key"
   FRONTEND_URL="http://localhost:5173"
   ```

3. **Initialize Database**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

### Scripts

- `npm run dev`: Start server with nodemon (development)
- `npm start`: Start production server
- `npm run prisma:studio`: Open Prisma interactive UI

---

## 📖 API Documentation

Base URL: `http://localhost:5000/api`

All protected routes require the header:

```
Authorization: Bearer <accessToken>
```

Responses Envelope:

```json
{
  "success": true | false,
  "message": "...",
  "data": { ... },
  "error": { "code": "...", "message": "..." }
}
```

---

## Table of Contents

- [Auth](#auth)
- [Users](#users)
- [Categories](#categories)
- [Notes](#notes)
- [Activities](#activities)
- [Activity Logs](#activity-logs)
- [Gamification](#gamification)
- [Dashboard](#dashboard)
- [AI Parse](#ai-parse)
- [Health](#health)
- [Error Codes](#error-codes)

---

## Auth

### POST `/auth/register`

Daftarkan user baru dengan email & password.

**Form Fill Example**

| Field             | Input Type | Contoh Nilai       |
| ----------------- | ---------- | ------------------ |
| `name`            | text       | `Budi Santoso`     |
| `email`           | email      | `budi@example.com` |
| `password`        | password   | `Rahasia123`       |
| `confirmPassword` | password   | `Rahasia123`       |

> Password minimal **8 karakter**. `confirmPassword` harus sama persis dengan `password`.

**Body (JSON)**

```json
{
  "name": "Budi Santoso",
  "email": "budi@example.com",
  "password": "Rahasia123",
  "confirmPassword": "Rahasia123"
}
```

**Response `201`**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Budi Santoso",
      "email": "budi@example.com"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses**

| Status | Code                | Penyebab                                     |
| ------ | ------------------- | -------------------------------------------- |
| `400`  | `VALIDATION_ERROR`  | Ada field yang kosong atau email tidak valid |
| `400`  | `VALIDATION_ERROR`  | Password kurang dari 8 karakter              |
| `400`  | `PASSWORD_MISMATCH` | `password` dan `confirmPassword` tidak sama  |
| `409`  | `CONFLICT`          | Email sudah terdaftar                        |

---

### POST `/auth/login`

Login dengan email & password.

**Form Fill Example**

| Field      | Input Type | Contoh Nilai       |
| ---------- | ---------- | ------------------ |
| `email`    | email      | `budi@example.com` |
| `password` | password   | `Rahasia123`       |

**Body (JSON)**

```json
{
  "email": "budi@example.com",
  "password": "Rahasia123"
}
```

**Response `200`**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Budi Santoso",
      "email": "budi@example.com"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses**

| Status | Code                  | Penyebab                          |
| ------ | --------------------- | --------------------------------- |
| `400`  | `VALIDATION_ERROR`    | email atau password tidak dikirim |
| `401`  | `INVALID_CREDENTIALS` | Email atau password salah         |

> Pesan error login sengaja dibuat generik ("Email atau password salah") untuk mencegah **email enumeration attack**.

---

### POST `/auth/refresh`

Dapatkan access token baru menggunakan refresh token.

**Form Fill Example**

| Field          | Input Type | Contoh Nilai                                            |
| -------------- | ---------- | ------------------------------------------------------- |
| `refreshToken` | hidden     | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2N...` |

> `refreshToken` disimpan di `localStorage` atau `httpOnly cookie` setelah login/register.

**Body (JSON)**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NDAx..."
}
```

**Response `200`**

```json
{
  "success": true,
  "message": "Token refreshed",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### POST `/auth/logout`

Logout. Tidak butuh body — cukup kirim request lalu hapus token di sisi client.

**Response `200`**

```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": null
}
```

---

## Users

> 🔒 Semua route user membutuhkan header `Authorization`.

### PATCH `/users/change-password`

Ubah password user.

**Form Fill Example**

| Field                | Input Type | Contoh Nilai   |
| -------------------- | ---------- | -------------- |
| `oldPassword`        | password   | `Rahasia123`   |
| `newPassword`        | password   | `BaruRahasia`  |
| `confirmNewPassword` | password   | `BaruRahasia`  |

**Body (JSON)**

```json
{
  "oldPassword": "Rahasia123",
  "newPassword": "BaruRahasia",
  "confirmNewPassword": "BaruRahasia"
}
```

**Response `200`**

```json
{
  "success": true,
  "message": "Password berhasil diubah",
  "data": null
}
```

**Error Responses**

| Status | Code                  | Penyebab                          |
| ------ | --------------------- | --------------------------------- |
| `400`  | `VALIDATION_ERROR`    | Field kosong atau password kurang dari 8 karakter |
| `400`  | `PASSWORD_MISMATCH`   | newPassword dan confirmNewPassword tidak sama |
| `400`  | `INVALID_CREDENTIALS` | oldPassword salah                 |
| `404`  | `NOT_FOUND`           | User tidak ditemukan              |

---

## Activities

> 🔒 Semua route activity membutuhkan header `Authorization`.

### GET `/activities`

List activity milik user yang sedang login.

**Query Parameters**

| Param      | Type                             | Description                  |
| ---------- | -------------------------------- | ---------------------------- |
| `date`     | `YYYY-MM-DD`                     | Filter berdasarkan tanggal   |
| `type`     | `task` \| `schedule`             | Filter berdasarkan tipe      |
| `status`   | `pending` \| `done` \| `skipped` | Filter berdasarkan status    |
| `priority` | `low` \| `medium` \| `high`      | Filter berdasarkan prioritas |

**Contoh request:**

```
GET /api/activities?date=2026-02-22&type=schedule&status=pending
```

**Response `200`**

```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": "64f1a2b3c4d5e6f7a8b9c0d2",
      "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
      "title": "Meeting Weekly Project",
      "description": "Sync mingguan bersama tim backend",
      "type": "schedule",
      "date": "2026-02-22T00:00:00.000Z",
      "startTime": "09:00",
      "endTime": "10:00",
      "status": "pending",
      "priority": "medium",
      "linkUrl": "https://meet.google.com/abc-defg-hij",
      "source": "manual",
      "createdAt": "2026-02-22T00:00:00.000Z",
      "updatedAt": "2026-02-22T00:00:00.000Z"
    }
  ]
}
```

---

### POST `/activities`

Buat activity baru.

**Form Fill Example — Schedule (ada jam & link)**

| Field         | Input Type | Contoh Nilai                           |
| ------------- | ---------- | -------------------------------------- |
| `title`       | text       | `Meeting Weekly Project`               |
| `description` | textarea   | `Sync mingguan bersama tim backend`    |
| `type`        | select     | `schedule`                             |
| `date`        | date       | `2026-02-22`                           |
| `startTime`   | time       | `09:00`                                |
| `endTime`     | time       | `10:00`                                |
| `status`      | select     | `pending`                              |
| `priority`    | select     | `medium`                               |
| `linkUrl`     | url        | `https://meet.google.com/abc-defg-hij` |
| `source`      | hidden     | `manual`                               |

**Form Fill Example — Task (tugas tanpa jam)**

| Field         | Input Type | Contoh Nilai                                |
| ------------- | ---------- | ------------------------------------------- |
| `title`       | text       | `Kerjain laporan bulanan`                   |
| `description` | textarea   | `Rekap semua data penjualan bulan Februari` |
| `type`        | select     | `task`                                      |
| `date`        | date       | `2026-02-22`                                |
| `startTime`   | time       | _(kosong)_                                  |
| `endTime`     | time       | _(kosong)_                                  |
| `status`      | select     | `pending`                                   |
| `priority`    | select     | `high`                                      |
| `linkUrl`     | url        | _(kosong)_                                  |
| `source`      | hidden     | `manual`                                    |

**Field Rules**

| Field         | Required | Type   | Nilai                                  |
| ------------- | -------- | ------ | -------------------------------------- |
| `title`       | ✅       | string | —                                      |
| `type`        | ✅       | string | `task`, `schedule`                     |
| `date`        | ✅       | string | `YYYY-MM-DD`                           |
| `source`      | ✅       | string | `ai`, `manual`                         |
| `description` | ❌       | string | —                                      |
| `startTime`   | ❌       | string | `HH:MM`                                |
| `endTime`     | ❌       | string | `HH:MM`                                |
| `status`      | ❌       | string | `pending` (default), `done`, `skipped` |
| `priority`    | ❌       | string | `low`, `medium`, `high`                |
| `linkUrl`     | ❌       | string | max 1 URL                              |

**Body (JSON)**

```json
{
  "title": "Meeting Weekly Project",
  "description": "Sync mingguan bersama tim backend",
  "type": "schedule",
  "date": "2026-02-22",
  "startTime": "09:00",
  "endTime": "10:00",
  "status": "pending",
  "priority": "medium",
  "linkUrl": "https://meet.google.com/abc-defg-hij",
  "source": "manual"
}
```

**Response `201`**

```json
{
  "success": true,
  "message": "Activity created",
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c0d2",
    "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "title": "Meeting Weekly Project",
    "description": "Sync mingguan bersama tim backend",
    "type": "schedule",
    "date": "2026-02-22T00:00:00.000Z",
    "startTime": "09:00",
    "endTime": "10:00",
    "status": "pending",
    "priority": "medium",
    "linkUrl": "https://meet.google.com/abc-defg-hij",
    "source": "manual",
    "createdAt": "2026-02-22T00:22:00.000Z",
    "updatedAt": "2026-02-22T00:22:00.000Z"
  }
}
```

---

### GET `/activities/:id`

Ambil satu activity berdasarkan ID.

**Response `200`**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c0d2",
    "title": "Meeting Weekly Project",
    "...": "..."
  }
}
```

---

### PUT `/activities/:id`

Update activity (partial — kirim hanya field yang mau diubah).

**Body (JSON)**

```json
{
  "title": "Meeting Weekly Project — Updated",
  "priority": "high",
  "date": "2026-02-23"
}
```

**Response `200`**

```json
{
  "success": true,
  "message": "Activity updated",
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c0d2",
    "title": "Meeting Weekly Project — Updated",
    "...": "..."
  }
}
```

---

### DELETE `/activities/:id`

Hapus activity beserta semua log-nya.

**Response `200`**

```json
{
  "success": true,
  "message": "Activity deleted",
  "data": null
}
```

---

### PATCH `/activities/:id/status`

Update hanya status activity. Otomatis membuat `ActivityLog`.

**Body (JSON)**

```json
{
  "status": "done"
}
```

Nilai valid: `pending` | `done` | `skipped`

**Response `200`**

```json
{
  "success": true,
  "message": "Status updated",
  "data": { "id": "64f1a2b3c4d5e6f7a8b9c0d2", "status": "done", "...": "..." }
}
```

---

## Categories

> 🔒 Semua route category membutuhkan header `Authorization`.

### GET `/categories`

List semua kategori milik user yang sedang login.

**Response `200`**

```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": "64f1a2b3c4d5e6f7a8b9c0d6",
      "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Work",
      "color": "#FF5733",
      "createdAt": "2026-02-22T00:00:00.000Z",
      "updatedAt": "2026-02-22T00:00:00.000Z"
    }
  ]
}
```

### POST `/categories`

Buat kategori baru.

**Form Fill Example**

| Field  | Input Type | Contoh Nilai |
| ------ | ---------- | ------------ |
| `name` | text       | `Work`       |
| `color`| text       | `#FF5733`    |

**Field Rules**

| Field  | Required | Type   | Nilai          |
| ------ | -------- | ------ | -------------- |
| `name` | ✅       | string | —              |
| `color`| ❌       | string | Hex color code |

**Body (JSON)**

```json
{
  "name": "Work",
  "color": "#FF5733"
}
```

**Response `201`**

```json
{
  "success": true,
  "message": "Category created",
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c0d6",
    "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Work",
    "color": "#FF5733",
    "createdAt": "2026-02-22T00:22:00.000Z",
    "updatedAt": "2026-02-22T00:22:00.000Z"
  }
}
```

**Error Responses**

| Status | Code                | Penyebab                          |
| ------ | ------------------- | --------------------------------- |
| `400`  | `VALIDATION_ERROR`  | `name` kosong                     |
| `400`  | `VALIDATION_ERROR`  | Nama kategori sudah ada untuk user ini |

### GET `/categories/:id`

Ambil satu kategori berdasarkan ID.

**Response `200`**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c0d6",
    "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Work",
    "color": "#FF5733",
    "...": "..."
  }
}
```

### PUT `/categories/:id`

Update kategori (partial — kirim hanya field yang mau diubah).

**Body (JSON)**

```json
{
  "name": "Personal",
  "color": "#33FF57"
}
```

**Response `200`**

```json
{
  "success": true,
  "message": "Category updated",
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c0d6",
    "name": "Personal",
    "color": "#33FF57",
    "...": "..."
  }
}
```

### DELETE `/categories/:id`

Hapus kategori. Jika ada notes yang menggunakan kategori ini, mereka akan kehilangan referensi kategori (set null).

**Response `200`**

```json
{
  "success": true,
  "message": "Category deleted",
  "data": null
}
```

---

> 🔒 Semua route note membutuhkan header `Authorization`.

### GET `/notes`

List semua catatan milik user.

**Query Parameters**

| Param         | Type              | Description                        |
| ------------- | ----------------- | ---------------------------------- |
| `isPinned`    | `true` \| `false` | Filter berdasarkan pin             |
| `categoryId`  | string            | Filter berdasarkan kategori        |
| `relatedDate` | `YYYY-MM-DD`      | Filter berdasarkan tanggal terkait |

**Response `200`**

```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": "64f1a2b3c4d5e6f7a8b9c0d3",
      "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
      "title": "Catatan Rapat Sprint 3",
      "content": "Bahas fitur notifikasi, target selesai minggu depan. PIC: Andi",
      "isPinned": false,
      "relatedDate": "2026-02-22T00:00:00.000Z",
      "source": "manual",
      "categoryId": null,
      "color": null,
      "category": null,
      "createdAt": "2026-02-22T00:00:00.000Z",
      "updatedAt": "2026-02-22T00:00:00.000Z"
    }
  ]
}
```

---

### POST `/notes`

Buat catatan baru.

**Form Fill Example — Catatan biasa**

| Field         | Input Type | Contoh Nilai                                                     |
| ------------- | ---------- | ---------------------------------------------------------------- |
| `title`       | text       | `Catatan Rapat Sprint 3`                                         |
| `content`     | textarea   | `Bahas fitur notifikasi, target selesai minggu depan. PIC: Andi` |
| `isPinned`    | checkbox   | `false`                                                          |
| `relatedDate` | date       | `2026-02-22`                                                     |
| `categoryId`  | select     | `64f1a2b3c4d5e6f7a8b9c0d6`                                       |
| `color`       | text       | `#FF5733`                                                        |
| `source`      | hidden     | `manual`                                                         |

**Form Fill Example — Catatan penting (pin)**

| Field         | Input Type | Contoh Nilai                                                     |
| ------------- | ---------- | ---------------------------------------------------------------- |
| `title`       | text       | `Info Akses Server Staging`                                      |
| `content`     | textarea   | `IP: 192.168.1.10 / User: admin / hubungi DevOps untuk password` |
| `isPinned`    | checkbox   | `true`                                                           |
| `relatedDate` | date       | _(kosong)_                                                       |
| `source`      | hidden     | `manual`                                                         |

**Field Rules**

| Field         | Required | Type                      |
| ------------- | -------- | ------------------------- |
| `title`       | ✅       | string                    |
| `content`     | ✅       | string                    |
| `source`      | ✅       | `ai` \| `manual`          |
| `isPinned`    | ❌       | boolean (default `false`) |
| `relatedDate` | ❌       | `YYYY-MM-DD`              |
| `categoryId`  | ❌       | string (UUID)             |
| `color`       | ❌       | string (hex color code)   |

**Body (JSON)**

```json
{
  "title": "Catatan Rapat Sprint 3",
  "content": "Bahas fitur notifikasi, target selesai minggu depan. PIC: Andi",
  "isPinned": false,
  "relatedDate": "2026-02-22",
  "categoryId": "64f1a2b3c4d5e6f7a8b9c0d6",
  "color": "#FF5733",
  "source": "manual"
}
```

**Response `201`**

```json
{
  "success": true,
  "message": "Note created",
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c0d3",
    "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "title": "Catatan Rapat Sprint 3",
    "content": "Bahas fitur notifikasi, target selesai minggu depan. PIC: Andi",
    "isPinned": false,
    "relatedDate": "2026-02-22T00:00:00.000Z",
    "source": "manual",
    "categoryId": "64f1a2b3c4d5e6f7a8b9c0d6",
    "color": "#FF5733",
    "category": {
      "id": "64f1a2b3c4d5e6f7a8b9c0d6",
      "name": "Work",
      "color": "#FF5733"
    },
    "createdAt": "2026-02-22T00:22:00.000Z",
    "updatedAt": "2026-02-22T00:22:00.000Z"
  }
}
```

---

### GET `/notes/:id`

Ambil satu catatan berdasarkan ID.

---

### PUT `/notes/:id`

Update catatan (partial — kirim hanya field yang mau diubah).

**Body (JSON)**

```json
{
  "title": "Catatan Rapat Sprint 3 — Revisi",
  "content": "Tambahan: fitur export PDF juga masuk scope sprint ini",
  "isPinned": true
}
```

**Response `200`**

```json
{
  "success": true,
  "message": "Note updated",
  "data": { "id": "64f1a2b3c4d5e6f7a8b9c0d3", "...": "..." }
}
```

---

### DELETE `/notes/:id`

Hapus catatan.

**Response `200`**

```json
{
  "success": true,
  "message": "Note deleted",
  "data": null
}
```

---

### PATCH `/notes/:id/pin`

Toggle status pin catatan. Tidak butuh body.

**Response `200`**

```json
{
  "success": true,
  "message": "Note pinned",
  "data": { "id": "64f1a2b3c4d5e6f7a8b9c0d3", "isPinned": true, "...": "..." }
}
```

---

## Activity Logs

> 🔒 Membutuhkan header `Authorization`.

### GET `/activity-logs`

Ambil log activity milik user.

**Query Parameters**

| Param        | Type   | Description                        |
| ------------ | ------ | ---------------------------------- |
| `activityId` | string | Filter log untuk activity tertentu |

**Response `200`**

```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": "64f1a2b3c4d5e6f7a8b9c0d4",
      "activityId": "64f1a2b3c4d5e6f7a8b9c0d2",
      "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
      "action": "completed",
      "timestamp": "2026-02-22T10:05:00.000Z",
      "activity": {
        "id": "64f1a2b3c4d5e6f7a8b9c0d2",
        "title": "Meeting Weekly Project",
        "type": "schedule"
      }
    }
  ]
}
```

### GET `/activity-logs/heatmap`

Ambil data jumlah aktivitas yang selesai (done) per hari selama 1 tahun terakhir. Sangat cocok digunakan untuk UI *Contribution Graph* atau *Heatmap*.

**Response `200`**

```json
{
  "success": true,
  "message": "Heatmap data fetched successfully",
  "data": [
    {
      "date": "2026-03-01",
      "count": 2
    },
    {
      "date": "2026-03-02",
      "count": 5
    }
  ]
}
```

## Gamification

> 🔒 Semua route gamification membutuhkan header `Authorization`.

### GET `/gamification`

Ambil data gamifikasi milik user (streak saat ini, streak terpanjang, dan tanggal terakhir update). Jika user belum memiliki data gamifikasi, sistem akan otomatis membuatkannya dengan nilai `0`.

**Response `200`**

```json
{
  "success": true,
  "message": "Gamification data retrieved successfully",
  "data": {
    "id": "64f1a2b3c4d5e6f7a8b9c0d5",
    "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "currentStreak": 3,
    "longestStreak": 14,
    "lastUpdateDate": "2026-03-07T00:00:00.000Z"
  }
}
```

**Log Actions**

| Action      | Dipicu oleh                                     |
| ----------- | ----------------------------------------------- |
| `created`   | `POST /activities`                              |
| `updated`   | `PUT /activities/:id`                           |
| `completed` | `PATCH /activities/:id/status` dengan `done`    |
| `skipped`   | `PATCH /activities/:id/status` dengan `skipped` |

---

## Dashboard

> 🔒 Semua route dashboard membutuhkan header `Authorization`.

Endpoint dashboard menyediakan data agregat aktivitas pengguna yang dapat difilter berdasarkan rentang waktu (`period`).

**Query Parameter `period`**

| Nilai     | Rentang Waktu       |
| --------- | ------------------- |
| `today`   | Hari ini            |
| `week`    | 7 hari terakhir     |
| `month`   | 30 hari terakhir    |
| `3month`  | 90 hari terakhir    |
| `year`    | 365 hari (default)  |

---

### GET `/dashboard/summary`

Ambil ringkasan statistik aktivitas pengguna: total activity, activity yang selesai, dan total focus time dari jadwal (`schedule`) yang memiliki `startTime` dan `endTime`.

**Query Parameters**

| Param    | Type   | Description                                   |
| -------- | ------ | --------------------------------------------- |
| `period` | string | Rentang waktu (`today`, `week`, `month`, `3month`, `year`) — default: `year` |

**Contoh request:**

```
GET /api/dashboard/summary?period=week
Authorization: Bearer <accessToken>
```

**Response `200`**

```json
{
  "success": true,
  "message": "Dashboard summary fetched successfully",
  "data": {
    "period": "week",
    "totalActivities": 12,
    "doneActivities": 8,
    "focusTimeMinutes": 270,
    "focusTimeHours": 4.5
  }
}
```

**Field Keterangan**

| Field               | Tipe    | Keterangan                                                      |
| ------------------- | ------- | --------------------------------------------------------------- |
| `period`            | string  | Periode yang dipakai                                            |
| `totalActivities`   | integer | Jumlah semua activity dalam periode                             |
| `doneActivities`    | integer | Jumlah activity dengan status `done`                            |
| `focusTimeMinutes`  | integer | Total durasi (menit) activity `schedule` yang punya jam         |
| `focusTimeHours`    | float   | Konversi `focusTimeMinutes` ke jam (2 desimal)                 |

---

### GET `/dashboard/heatmap`

Ambil data jumlah activity per hari dalam rentang waktu tertentu. Cocok untuk UI *Activity Tracker / Contribution Graph*.

**Query Parameters**

| Param    | Type   | Description                                   |
| -------- | ------ | --------------------------------------------- |
| `period` | string | Rentang waktu (`today`, `week`, `month`, `3month`, `year`) — default: `year` |

**Contoh request:**

```
GET /api/dashboard/heatmap?period=year
Authorization: Bearer <accessToken>
```

**Response `200`**

```json
{
  "success": true,
  "message": "Heatmap data fetched successfully",
  "data": [
    { "date": "2026-01-05", "count": 3 },
    { "date": "2026-01-06", "count": 1 },
    { "date": "2026-02-14", "count": 5 },
    { "date": "2026-03-11", "count": 2 }
  ]
}
```

> Hanya tanggal yang memiliki activity yang akan muncul dalam array (tanggal tanpa activity tidak ditampilkan). Data diurutkan berdasarkan tanggal secara ascending.

---



> 🔒 Membutuhkan header `Authorization`.

### POST `/ai/parse`

Kirim teks natural ke Gemini AI dan terima data terstruktur sebagai **preview**. **Tidak menyimpan ke database** — frontend harus konfirmasi dulu sebelum save.

**Form Fill Example**

| Field    | Input Type | Contoh Nilai                     |
| -------- | ---------- | -------------------------------- |
| `prompt` | textarea   | _(lihat contoh prompt di bawah)_ |

---

**Contoh Prompt 1 — Campuran schedule & catatan**

```
Besok jam 9 pagi ada meeting zoom dengan tim, terus jam 2 siang
kerjain laporan bulanan, dan catat: deadline project A tanggal 25
```

```json
{
  "prompt": "Besok jam 9 pagi ada meeting zoom dengan tim, terus jam 2 siang kerjain laporan bulanan, dan catat: deadline project A tanggal 25"
}
```

---

**Contoh Prompt 2 — Hanya task prioritas tinggi**

```
Hari ini harus selesaikan revisi desain UI, prioritas tinggi
```

```json
{ "prompt": "Hari ini harus selesaikan revisi desain UI, prioritas tinggi" }
```

---

**Contoh Prompt 3 — Jadwal dengan link Zoom**

```
Jumat jam 3 sore ada sesi mentoring via zoom https://zoom.us/j/123456789
```

```json
{
  "prompt": "Jumat jam 3 sore ada sesi mentoring via zoom https://zoom.us/j/123456789"
}
```

---

**Contoh Prompt 4 — Hanya catatan**

```
Catat: struktur folder backend sudah diubah ke modular, lihat file app.js
```

```json
{
  "prompt": "Catat: struktur folder backend sudah diubah ke modular, lihat file app.js"
}
```

---

**Response `200`**

```json
{
  "success": true,
  "message": "AI response parsed successfully",
  "data": {
    "type": "mixed",
    "activities": [
      {
        "title": "Meeting dengan tim",
        "description": null,
        "type": "schedule",
        "date": "2026-02-23",
        "startTime": "09:00",
        "endTime": null,
        "priority": null,
        "linkUrl": null,
        "status": "pending",
        "source": "ai",
        "userId": "64f1a2b3c4d5e6f7a8b9c0d1"
      }
    ],
    "notes": [
      {
        "title": "Deadline",
        "content": "Deadline project A tanggal 25",
        "relatedDate": "2026-02-25",
        "isPinned": false,
        "source": "ai",
        "userId": "64f1a2b3c4d5e6f7a8b9c0d1"
      }
    ]
  }
}
```

**Error Responses**

| Status | Code               | Penyebab                            |
| ------ | ------------------ | ----------------------------------- |
| `400`  | `VALIDATION_ERROR` | `prompt` kosong atau tidak dikirim  |
| `502`  | `AI_ERROR`         | Gemini API tidak bisa dihubungi     |
| `422`  | `AI_PARSE_ERROR`   | Gemini mengembalikan bukan JSON     |
| `422`  | `AI_SCHEMA_ERROR`  | JSON dari Gemini tidak sesuai skema |

---

## Health

### GET `/health`

Cek apakah server berjalan. Tidak perlu auth.

**Response `200`**

```json
{
  "success": true,
  "message": "API is running"
}
```

---

## Error Codes

| HTTP | Code                    | Keterangan                                  |
| ---- | ----------------------- | ------------------------------------------- |
| 400  | `VALIDATION_ERROR`      | Field wajib tidak dikirim atau tidak valid  |
| 400  | `PASSWORD_MISMATCH`     | Password dan konfirmasi password tidak sama |
| 401  | `UNAUTHORIZED`          | Tidak ada token                             |
| 401  | `TOKEN_EXPIRED`         | Access token sudah expired                  |
| 401  | `INVALID_TOKEN`         | Token tidak valid / rusak                   |
| 401  | `INVALID_CREDENTIALS`   | Email atau password salah                   |
| 403  | `FORBIDDEN`             | User tidak punya akses ke resource ini      |
| 404  | `NOT_FOUND`             | Data tidak ditemukan                        |
| 409  | `CONFLICT`              | Data duplikat (email sudah terdaftar)       |
| 422  | `AI_PARSE_ERROR`        | AI mengembalikan non-JSON                   |
| 422  | `AI_SCHEMA_ERROR`       | JSON dari AI gagal validasi skema           |
| 502  | `AI_ERROR`              | Gagal memanggil Gemini API                  |
| 500  | `INTERNAL_SERVER_ERROR` | Error tak terduga di server                 |
