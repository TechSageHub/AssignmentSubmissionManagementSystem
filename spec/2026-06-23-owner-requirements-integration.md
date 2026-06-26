---
title: Owner Requirements Integration — Assignment Submission and Management System
version: 1.0
date_created: 2026-06-23
based_on: PROJECT_PROPOSAL.md, spec-design-assignment-submission-system.md
status: draft
---

# Owner Requirements Integration

## 1. Purpose

This spec defines the changes needed to extend the existing Assignment Submission and Management System to meet the full set of requirements provided by the project owner. It is a delta spec — it describes only what changes from the current implementation.

**Branding:** The system is branded as **Federal Polytechnic Ilaro (FPI) Assignment Submission System** (FPI-ASMS). The institution logo (`fpi-logo.png`) replaces all previous branding icons throughout the UI — Sidebar, Login page, Register page, and favicon.

## 2. Summary of Changes

| Area | Change | Impact |
|------|--------|--------|
| Database | Add columns to Users, Assignments; new Notifications table | Schema migration |
| Backend | New notification endpoints, auth accepts username OR email, seeded public content | ~4 new routes, auth update |
| Frontend | 3 new public pages, notification UI, extended registration forms, route restructure | ~6 new components/pages |
| Auth | `username` field added; login accepts email OR username | Backward-compatible |
| Layout | Unauthenticated → public pages; Authenticated → dashboard | Route reorg |

## 3. Database Changes

### 3.1 Users Table — Additional Columns

```sql
ALTER TABLE Users ADD
    username NVARCHAR(100) NULL UNIQUE,
    student_id NVARCHAR(50) NULL,       -- matric number (students only)
    staff_id NVARCHAR(50) NULL,          -- staff ID (lecturers only)
    department NVARCHAR(100) NULL,
    programme NVARCHAR(100) NULL,        -- e.g. Computer Science
    level NVARCHAR(20) NULL,             -- ND I, ND II, HND I, HND II
    phone NVARCHAR(20) NULL,
    is_active BIT DEFAULT 1;
```

- `username` is auto-generated on registration as a slug of the name + random suffix if duplicate
- Columns are nullable and role-appropriate (students fill student_id/programme/level; lecturers fill staff_id/department)
- `is_active` enables admin user suspension

### 3.2 Assignments Table — Additional Columns

```sql
ALTER TABLE Assignments ADD
    course_code NVARCHAR(20) NULL,
    course_title NVARCHAR(200) NULL;
```

- Both are optional; displayed on assignment cards and detail pages

### 3.3 New Table: Notifications

```sql
CREATE TABLE Notifications (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    type NVARCHAR(50) NOT NULL,  -- 'assignment_created', 'grade_released', 'submission_confirmed', 'deadline_reminder'
    title NVARCHAR(200) NOT NULL,
    message NVARCHAR(MAX),
    link NVARCHAR(500),          -- optional deep link e.g. /assignments/5
    is_read BIT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Notifications_User FOREIGN KEY (user_id) REFERENCES Users(id)
);

CREATE INDEX IX_Notifications_user_id ON Notifications(user_id);
CREATE INDEX IX_Notifications_unread ON Notifications(user_id, is_read);
```

## 4. Backend Changes

### 4.1 Auth — Username Support

- **POST /api/auth/login**: accept `username` OR `email` in the request body. If the input contains `@`, treat as email; otherwise treat as username.
- **POST /api/auth/register**: accept optional `username` field. If not provided, auto-generate from `name` (lowercase, replace spaces with dots, append random 4-digit suffix if duplicate).
- `GET /api/auth/me`: return new user fields (username, student_id, staff_id, department, programme, level, phone)

### 4.2 New Notification Endpoints

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/api/notifications` | Yes | All | List user's notifications (paginated, newest first) |
| GET | `/api/notifications/unread-count` | Yes | All | Get count of unread notifications |
| PUT | `/api/notifications/:id/read` | Yes | All | Mark single notification as read |
| PUT | `/api/notifications/read-all` | Yes | All | Mark all notifications as read |

Query params for GET: `?page=1&limit=20&unread=true` (filter to unread only).

### 4.3 Notification Hooks

Inject notification creation calls into existing controllers:

| Trigger | Notification Type | Recipient(s) | Link |
|---------|-------------------|--------------|------|
| Assignment created | `assignment_created` | All students | `/assignments/:id` |
| Submission received | `submission_confirmed` | Submitting student | `/submissions/:id` |
| Grade released | `grade_released` | Submission student | `/submissions/:submissionId` |
| Grade updated | `grade_released` | Submission student | `/submissions/:submissionId` |
| Deadline approaching (cron) | `deadline_reminder` | Students who haven't submitted | `/assignments/:id` |

Notifications are created in the same transaction/request as the triggering action.

### 4.4 Assets — Institution Logo

- Download the FPI logo from `https://www.federalpolyilaro.edu.ng/images/logo.png`
- Save as `frontend/public/fpi-logo.png`
- Update `index.html` title to "FPI - Assignment Submission System"
- Replace `favicon.svg` references with favicon generated from the logo (or keep as-is)

### 4.5 System Config Table

Add a `SystemConfig` table to store institution info for public pages:

```sql
CREATE TABLE SystemConfig (
    [key] NVARCHAR(100) PRIMARY KEY,
    [value] NVARCHAR(MAX)
);
```

Seed with:
- `institution_name` — e.g. "Federal Polytechnic"
- `institution_logo` — path to logo file
- `institution_address` — physical address
- `institution_email` — contact email
- `institution_phone` — contact phone
- `about_content` — HTML/markdown content for About page
- `about_purpose`, `about_objectives`, `about_benefits` — structured about sections

Add a single read-only endpoint: `GET /api/config/public` (no auth) returning all config key-values for the frontend to render public pages.

## 5. Frontend Changes

### 5.1 Route Restructure

```
/                  → HomePage (public)
/about             → AboutPage (public)
/contact           → ContactPage (public)
/login             → LoginPage (public)
/register          → RegisterPage (public)
/forgot-password   → ForgotPasswordPage (public)
/reset-password    → ResetPasswordPage (public)
/dashboard         → DashboardPage (auth required)
/assignments/*     → (auth required, existing)
/my-submissions    → (auth required, existing)
/submissions/*     → (auth required, existing)
/admin             → (auth required, admin only)
```

- Unauthenticated users see public routes + login/register
- Root `/` redirects to `/dashboard` if authenticated, otherwise shows HomePage
- Layout switches: public pages use a minimal header+footer layout; authenticated pages use the existing sidebar layout

### 5.2 New Pages

**HomePage** (`/`)
- Hero section: institution name + logo, system title, tagline, CTA buttons (Login / Register)
- Feature highlights section (3-4 cards: Submit Online, Instant Feedback, Track Progress, Secure)
- Footer with contact info and nav links

**AboutPage** (`/about`)
- Purpose of the system
- Objectives (from project proposal)
- Benefits for students, lecturers, institution
- Institution info

**ContactPage** (`/contact`)
- Institution address
- Email address
- Phone numbers
- Support/help desk info
- Optional: contact form (post-MVP)

### 5.3 Registration Form — Extended Fields

**Student Registration** — add after basic fields:
- Student ID / Matric Number (required)
- Department (dropdown from seeded list)
- Programme (text input)
- Level (dropdown: ND I, ND II, HND I, HND II)
- Phone Number

**Lecturer Registration** — add after basic fields:
- Staff ID (required)
- Department (dropdown from seeded list)
- Phone Number

Both forms retain the existing name/email/password fields and add `username` as an optional display field (auto-generated but editable).

### 5.4 Login — Username or Email

- Update login form label from "Email" to "Email or Username"
- Backend already handles both; no frontend logic change needed beyond label

### 5.5 Notification UI

**Bell Icon in Navbar**
- Bell icon (lucide-react `Bell` / `BellRing`) with unread count badge
- Dropdown shows last 10 notifications
- Each notification has: icon by type, title, message preview, timestamp, link
- "Mark all read" link at bottom
- Clicking a notification marks it read and navigates to link

**Notification Types & Icons**
| Type | Icon |
|------|------|
| `assignment_created` | ClipboardList |
| `submission_confirmed` | FileCheck |
| `grade_released` | Award |
| `deadline_reminder` | Clock |

### 5.6 Assignment Cards — Show Course Info

- Assignment list/detail pages show `course_code` and `course_title` when available
- Create/Edit assignment forms have optional Course Code and Course Title fields

### 5.7 Profile Page — Extended Fields

Create a Profile page (`/profile`) where users can:
- View all their fields (including role-specific ones)
- Edit phone, department, programme, level (student) or department (lecturer)
- Change password (links to existing reset flow)

## 6. Migration Plan

| Step | Description | Dependencies |
|------|-------------|-------------|
| 1 | Run migration: add columns to Users table | — |
| 2 | Run migration: add columns to Assignments table | — |
| 3 | Run migration: create Notifications table | — |
| 4 | Backend: update auth controller (username support) | Step 1 |
| 5 | Backend: create notification controller + routes | Step 3 |
| 6 | Backend: add notification hooks to existing controllers | Step 5 |
| 7 | Frontend: create HomePage, AboutPage, ContactPage | — |
| 8 | Frontend: restructure routes in App.tsx | Step 7 |
| 9 | Frontend: extend registration forms | Step 1 |
| 10 | Frontend: build notification dropdown | Step 5 |
| 11 | Frontend: update login label | — |
| 12 | Frontend: add course fields to assignment forms | Step 2 |
| 13 | Frontend: create Profile page | Step 1 |
| 14 | Test: full flow — register student → view home → submit → get notification → view grade | All |

## 7. Non-Changes (Scope Excluded)

The following from the existing spec remain unchanged:
- Database structure beyond the additions above
- All existing API endpoints and their response formats
- Grading, rubrics, analytics, group submissions, bulk download, audit log — all already built
- Admin dashboard — already built
- Email notifications — already built; in-app complements it

## 8. Acceptance Criteria

- **AC-HOME-001**: Unauthenticated users land on HomePage with institution info, system description, and login/register links.
- **AC-HOME-002**: Authenticated users are redirected from `/` to `/dashboard`.
- **AC-ABOUT-001**: About page shows purpose, objectives, and benefits of the system.
- **AC-CONTACT-001**: Contact page shows institution address, email, and phone.
- **AC-REG-001**: Student registration includes student_id, department, programme, level, phone fields.
- **AC-REG-002**: Lecturer registration includes staff_id, department, phone fields.
- **AC-REG-003**: Username is auto-generated if not provided, unique in the system.
- **AC-LOGIN-001**: Users can log in with either email or username.
- **AC-ASN-001**: Assignments display course_code and course_title when set.
- **AC-NOT-001**: Notifications are created when assignments are published, grades released, and submissions confirmed.
- **AC-NOT-002**: Bell icon shows unread count; dropdown lists recent notifications.
- **AC-NOT-003**: Clicking a notification marks it read and navigates to the relevant page.
- **AC-PRO-001**: Profile page displays all user fields; editable fields can be updated.
