# OMS Backend - Supabase Migration Guide

## Overview

This guide covers the complete migration from MongoDB Atlas + Cloudinary to Supabase (PostgreSQL + S3 Storage).

## Prerequisites

- Node.js 18+ installed
- Supabase account with project created
- Access to Supabase SQL Editor
- (Optional) MongoDB connection for data migration

---

## Quick Start

### Step 1: Setup Supabase Database

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Open your project (`uspedejixdrvxnxufgsx`)
3. Navigate to **SQL Editor**
4. Copy the entire contents of `database/schema.sql`
5. Paste and run in SQL Editor
6. Verify all 9 tables are created in **Table Editor**

### Step 2: Configure Environment

Rename `.env.supabase` to `.env`:

```bash
# Windows
copy .env.supabase .env

# Mac/Linux
cp .env.supabase .env
```

Or manually update your `.env` with:

```env
SUPABASE_URL=https://uspedejixdrvxnxufgsx.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key
SUPABASE_STORAGE_BUCKET=OMS
```

### Step 3: Install Dependencies

```bash
npm install @supabase/supabase-js
```

Or replace `package.json` with `package.supabase.json`:

```bash
# Windows
copy package.supabase.json package.json

# Mac/Linux
cp package.supabase.json package.json

npm install
```

### Step 4: Start the Server

```bash
# Production
npm start

# Development
npm run dev
```

---

## File Structure (New Files)

```
OMS-Backend-main/
├── config/
│   └── supabase.js              # Supabase client & storage helpers
├── database/
│   └── schema.sql               # PostgreSQL schema (run in SQL Editor)
├── services/
│   ├── UserService.js           # User CRUD operations
│   ├── TaskService.js           # Task CRUD operations
│   ├── AttendanceService.js     # Attendance CRUD operations
│   ├── DocumentService.js       # Document CRUD operations
│   ├── EvaluationService.js     # Evaluation CRUD operations
│   ├── MessageService.js        # Message CRUD operations
│   ├── NotificationService.js   # Notification CRUD operations
│   ├── WorkLogService.js        # Work log CRUD operations
│   └── AnnouncementService.js   # Announcement CRUD operations
├── controllers/
│   ├── authController.supabase.js
│   ├── userController.supabase.js
│   ├── taskController.supabase.js
│   ├── attendanceController.supabase.js
│   ├── documentController.supabase.js
│   ├── evaluationController.supabase.js
│   ├── messageController.supabase.js
│   ├── workLogController.supabase.js
│   ├── notificationController.supabase.js
│   └── dashboardController.supabase.js
├── routes/
│   ├── authRoutes.supabase.js
│   ├── userRoutes.supabase.js
│   ├── taskRoutes.supabase.js
│   ├── attendanceRoutes.supabase.js
│   ├── documentRoutes.supabase.js
│   ├── evaluationRoutes.supabase.js
│   ├── messageRoutes.supabase.js
│   ├── announcementRoutes.supabase.js
│   ├── notificationRoutes.supabase.js
│   ├── workLogRoutes.supabase.js
│   └── dashboardRoutes.supabase.js
├── middleware/
│   └── auth.supabase.js         # JWT auth middleware for Supabase
├── scripts/
│   └── migrateToSupabase.js     # MongoDB to Supabase migration script
├── index.supabase.js            # Main entry point for Supabase version
├── .env.supabase                # Supabase environment template
└── package.supabase.json        # Updated package.json
```

---

## Database Schema

### Tables Created

| Table | Description |
|-------|-------------|
| `users` | User accounts (admins, interns) |
| `tasks` | Task assignments and tracking |
| `attendances` | Check-in/out and leave records |
| `documents` | File uploads and sharing |
| `evaluations` | Performance evaluations |
| `messages` | Direct messages between users |
| `announcements` | Company-wide announcements |
| `notifications` | User notifications |
| `worklogs` | Daily work logs |

### Key Changes from MongoDB

| MongoDB | PostgreSQL |
|---------|------------|
| `_id` (ObjectId) | `id` (UUID) |
| camelCase fields | snake_case fields |
| Embedded documents | JSONB columns |
| `$lookup` aggregation | JOIN queries |
| Mongoose populate | Supabase select with relations |

---

## Storage Migration (Cloudinary → Supabase S3)

### Storage Bucket Setup

Your Supabase project already has a bucket named `OMS` configured for:
- Public access
- File size limit: 5MB
- Allowed types: image/jpeg, image/jpg

### File Upload Changes

**Before (Cloudinary):**
```javascript
const { storage } = require('../config/cloudinary');
const upload = multer({ storage });
```

**After (Supabase):**
```javascript
const multer = require('multer');
const { uploadFile } = require('../config/supabase');

const upload = multer({ storage: multer.memoryStorage() });

// In controller:
const fileUrl = await uploadFile(req.file, 'documents');
```

---

## Data Migration

If you have existing data in MongoDB, run the migration script:

```bash
# Ensure both MongoDB and Supabase credentials are in .env
npm run migrate
```

The script will:
1. Connect to MongoDB
2. Connect to Supabase
3. Migrate all collections in order (users first)
4. Map MongoDB ObjectIDs to Supabase UUIDs
5. Print a summary report

**Note:** Files stored in Cloudinary will need to be manually downloaded and re-uploaded to Supabase Storage.

---

## API Endpoints

All API endpoints remain the same! The frontend doesn't need any changes.

### Authentication
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/logout`
- `GET /api/auth/me`
- `PUT /api/auth/updatedetails`
- `PUT /api/auth/updatepassword`

### Users
- `GET /api/users`
- `GET /api/users/:id`
- `POST /api/users`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`
- `GET /api/users/interns`
- `POST /api/users/:id/avatar`

### Tasks
- `GET /api/tasks`
- `GET /api/tasks/:id`
- `POST /api/tasks`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id`
- `POST /api/tasks/:id/comments`
- `GET /api/tasks/stats`

### Attendance
- `POST /api/attendance/check-in`
- `POST /api/attendance/check-out`
- `GET /api/attendance`
- `POST /api/attendance/leave`
- `PUT /api/attendance/:id/approve`
- `GET /api/attendance/stats`

### Documents
- `GET /api/documents`
- `GET /api/documents/:id`
- `POST /api/documents`
- `PUT /api/documents/:id`
- `DELETE /api/documents/:id`
- `GET /api/documents/:id/download`

### Messages
- `GET /api/messages`
- `POST /api/messages`
- `PUT /api/messages/:id/read`
- `GET /api/messages/conversations`

### Announcements
- `GET /api/announcements`
- `POST /api/announcements`
- `PUT /api/announcements/:id/read`

### Notifications
- `GET /api/notifications`
- `PUT /api/notifications/:id/read`
- `PUT /api/notifications/read-all`
- `DELETE /api/notifications/:id`

### Work Logs
- `GET /api/worklogs`
- `GET /api/worklogs/:id`
- `POST /api/worklogs`
- `PUT /api/worklogs/:id`
- `DELETE /api/worklogs/:id`
- `PUT /api/worklogs/:id/feedback`

### Evaluations
- `GET /api/evaluations`
- `GET /api/evaluations/:id`
- `POST /api/evaluations`
- `PUT /api/evaluations/:id`
- `DELETE /api/evaluations/:id`
- `PUT /api/evaluations/:id/publish`

### Dashboard
- `GET /api/dashboard/admin`
- `GET /api/dashboard/intern`

---

## Running Both Versions

You can run either version:

```bash
# Supabase version (new)
npm start
# or
npm run dev

# MongoDB version (legacy)
npm run start:mongo
# or
npm run dev:mongo
```

---

## Troubleshooting

### "relation does not exist" error
Run `database/schema.sql` in Supabase SQL Editor first.

### "Invalid API key" error
Check that `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct in `.env`.

### File upload failing
Ensure the `OMS` bucket exists and is configured as PUBLIC in Supabase Storage.

### JWT errors
Make sure `JWT_SECRET` is the same as your MongoDB version for existing tokens to work.

---

## Cleanup (After Verification)

Once you've verified everything works:

1. Remove MongoDB-related files:
   - `config/db.js`
   - `config/cloudinary.js`
   - `models/` directory
   - Original controllers and routes

2. Update `package.json` to remove:
   - `mongoose`
   - `cloudinary`
   - `multer-storage-cloudinary`

3. Rename files (optional):
   - Remove `.supabase` suffix from controller/route files
   - Update imports in `index.supabase.js`

---

## Support

For issues with:
- **Supabase**: https://supabase.com/docs
- **This migration**: Open an issue in the repository
