# Assignment Submission and Management System

A full-stack web application for managing academic assignments — from creation and submission to grading, feedback, and record keeping. Built with React, Node.js, and Express, supporting both SQL Server and PostgreSQL.

## Features

- **Role-based access** — Students, Lecturers, and Admin dashboards
- **Assignment lifecycle** — Create, submit, grade, and provide feedback
- **Rubric-based grading** — Custom criteria with per-criterion scoring
- **Group submissions** — Multiple students can collaborate on a submission
- **Email notifications** — Deadline reminders and grade alerts via SMTP
- **Audit logging** — Track all significant actions across the system
- **Analytics** — Grade distribution, averages, and submission statistics

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts |
| Backend | Node.js, Express 5 |
| Database | SQL Server (local) / PostgreSQL (production) |
| Auth | JWT with bcrypt password hashing |
| Email | Nodemailer (SMTP) |

## Project Structure

```
AssignmentSubmissionManagementSystem/
├── fullstack-app/
│   ├── backend/
│   │   ├── config/          # Database & env configuration
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/       # Auth & role middleware
│   │   ├── models/          # Database query functions
│   │   ├── routes/          # Express route definitions
│   │   ├── scripts/         # Migration & utility scripts
│   │   ├── services/        # Business logic (reminders, etc.)
│   │   └── utils/           # Email, audit logging, notifications
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── components/  # Reusable UI components (shadcn/ui)
│   │   │   ├── pages/       # Route pages (Dashboard, Assignments, etc.)
│   │   │   ├── context/     # React context (Auth)
│   │   │   ├── services/    # API client (Axios)
│   │   │   └── types/       # TypeScript type definitions
│   │   └── ...
│   └── database/            # Schema & migration SQL files
├── spec/                    # Design documents
└── render.yaml              # Render deployment config
```

## Getting Started

### Prerequisites

- Node.js 22+
- SQL Server (local development)
- npm

### Local Setup

```bash
# 1. Clone and install backend dependencies
cd fullstack-app/backend
npm install

# 2. Install frontend dependencies
cd ../frontend
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your SQL Server credentials

# 4. Run database migrations
cd ../backend
node scripts/migrate.js

# 5. Start the backend (runs on port 5000)
npm run dev

# 6. In a separate terminal, start the frontend (runs on port 5173)
cd ../frontend
npm run dev
```

### Database Options

The app supports two database backends controlled by the `DB_TYPE` environment variable:

#### SQL Server (local development)

Set `DB_TYPE=mssql` (default) and provide:

| Variable | Description |
|---|---|
| `DB_SERVER` | SQL Server host |
| `DB_PORT` | SQL Server port (default 1433) |
| `DB_DATABASE` | Database name |
| `DB_USER` | Database user |
| `DB_PASSWORD` | Database password |

#### PostgreSQL (production / Render)

Set `DB_TYPE=postgres` and provide:

| Variable | Description |
|---|---|
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port (default 5432) |
| `DB_DATABASE` | Database name |
| `DB_USER` | Database user |
| `DB_PASSWORD` | Database password |
| `DB_SSL` | Set to `true` for SSL connections |

## Deployment (Render)

This project includes a `render.yaml` for one-click deployment on Render.

1. Push this repo to GitHub
2. In Render dashboard, create a **Blueprint** from the repo
3. Render will auto-create:
   - A web service (Node.js)
   - A free PostgreSQL database
4. Set the required environment variables (`DB_TYPE=postgres`, `JWT_SECRET`, email credentials)
5. After deployment, run migrations via Render Shell:

```bash
cd backend && node scripts/migrate.js
```

## API Overview

All API routes are prefixed with `/api`:

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Register a new user |
| POST | `/api/auth/login` | — | Login |
| GET | `/api/assignments` | Bearer | List assignments |
| POST | `/api/assignments` | Lecturer | Create assignment |
| POST | `/api/submissions` | Student | Submit assignment |
| GET | `/api/grades` | Bearer | View grades |
| POST | `/api/grades` | Lecturer | Grade submission |

## Database Schema

The full schema is available in:
- `database/schema.sql` — SQL Server
- `database/schema.postgres.sql` — PostgreSQL
