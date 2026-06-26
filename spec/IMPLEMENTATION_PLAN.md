# Implementation Plan — Assignment Submission and Management System

## Phase 1: Project Setup & Configuration

### 1.1 Backend — Initialize Server
- [ ] 1.1.1 Create folder structure: `routes/`, `controllers/`, `models/`, `middleware/`, `config/`, `uploads/`
- [ ] 1.1.2 Set up Express server in `index.js` with JSON body parser and CORS
- [ ] 1.1.3 Create `.env` file with `PORT`, `DB_SERVER`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `UPLOAD_PATH`
- [ ] 1.1.4 Create `config/db.js` — SQL Server connection pool using `mssql`
- [ ] 1.1.5 Create `config/env.js` — load and validate environment variables
- [ ] 1.1.6 Add `npm run dev` script with `nodemon` for auto-restart
- [ ] 1.1.7 Test server starts and connects to database

### 1.2 Frontend — Initialize SPA
- [ ] 1.2.1 Install dependencies: `react-router-dom`, `axios`
- [ ] 1.2.2 Create folder structure: `pages/`, `components/`, `context/`, `services/`, `types/`, `hooks/`
- [ ] 1.2.3 Set up React Router in `App.tsx` with route definitions
- [ ] 1.2.4 Create `services/api.ts` — Axios instance with base URL and interceptors
- [ ] 1.2.5 Add Vite proxy config in `vite.config.ts` to forward `/api` to backend
- [ ] 1.2.6 Configure TypeScript path aliases (e.g., `@/` → `src/`)
- [ ] 1.2.7 Remove default Vite starter content from `App.tsx` and `App.css`

---

## Phase 2: Database Setup

### 2.1 Schema Creation
- [ ] 2.1.1 Write `database/schema.sql` — `CREATE TABLE Users` with all columns and constraints
- [ ] 2.1.2 Write `database/schema.sql` — `CREATE TABLE Assignments` with FK to Users
- [ ] 2.1.3 Write `database/schema.sql` — `CREATE TABLE Submissions` with FKs to Assignments and Users
- [ ] 2.1.4 Write `database/schema.sql` — `CREATE TABLE Grades` with FK to Submissions, UNIQUE constraint
- [ ] 2.1.5 Add index on `Users.email` for fast login lookups
- [ ] 2.1.6 Add index on `Submissions.assignment_id` for lecturer queries
- [ ] 2.1.7 Write `database/seed.sql` — sample lecturer and student accounts

---

## Phase 3: Backend — Authentication Module

### 3.1 Auth — Model & Middleware
- [ ] 3.1.1 Create `models/user.js` — `findByEmail()`, `createUser()`, `findById()` using parameterized queries
- [ ] 3.1.2 Create `middleware/auth.js` — JWT verification middleware that decodes token and attaches `req.user`
- [ ] 3.1.3 Create `middleware/requireRole.js` — role-checking middleware factory

### 3.2 Auth — Controller & Routes
- [ ] 3.2.1 Create `controllers/authController.js` — `register()` with bcrypt hashing, email uniqueness check
- [ ] 3.2.2 Create `controllers/authController.js` — `login()` with credential verification and JWT generation
- [ ] 3.2.3 Create `controllers/authController.js` — `getMe()` returning current user profile
- [ ] 3.2.4 Create `routes/auth.js` — wire up POST `/register`, POST `/login`, GET `/me`
- [ ] 3.2.5 Mount `/api/auth` in `index.js`
- [ ] 3.2.6 Test all three endpoints manually

### 3.3 Auth — Validation
- [ ] 3.3.1 Add name, email, password, role validation for registration
- [ ] 3.3.2 Add email format validation (regex)
- [ ] 3.3.3 Add password minimum length check (8 characters)
- [ ] 3.3.4 Add role validation — only accept `student` or `lecturer`

---

## Phase 4: Backend — Assignment Module

### 4.1 Assignment — Model
- [ ] 4.1.1 Create `models/assignment.js` — `create()`, `findAll()`, `findById()`, `update()`, `delete()`
- [ ] 4.1.2 `findAll()` accepts role filter: lecturers see their own, students see all

### 4.2 Assignment — Controller & Routes
- [ ] 4.2.1 Create `controllers/assignmentController.js` — `createAssignment()` with validation
- [ ] 4.2.2 Create `controllers/assignmentController.js` — `getAssignments()` with role-based filtering
- [ ] 4.2.3 Create `controllers/assignmentController.js` — `getAssignment()` by ID
- [ ] 4.2.4 Create `controllers/assignmentController.js` — `updateAssignment()` with ownership check
- [ ] 4.2.5 Create `controllers/assignmentController.js` — `deleteAssignment()` with ownership check
- [ ] 4.2.6 Create `routes/assignments.js` — wire up CRUD endpoints
- [ ] 4.2.7 Mount `/api/assignments` in `index.js`
- [ ] 4.2.8 Test all five endpoints manually

### 4.3 Assignment — Validation
- [ ] 4.3.1 Validate title is non-empty and ≤ 200 characters
- [ ] 4.3.2 Validate due_date is a valid future date
- [ ] 4.3.3 Ensure only lecturers can create/update/delete assignments

---

## Phase 5: Backend — Submission Module

### 5.1 Submission — Model
- [ ] 5.1.1 Create `models/submission.js` — `create()`, `findByAssignment()`, `findByStudent()`, `findById()`, `deletePreviousSubmission()`
- [ ] 5.1.2 `create()` determines `is_late` by comparing `submitted_at` with assignment `due_date`

### 5.2 Submission — File Upload
- [ ] 5.2.1 Configure `multer` with destination `uploads/assignments/:id/`, file size limit (10MB)
- [ ] 5.2.2 Generate unique filenames using timestamp + original extension
- [ ] 5.2.3 Create `uploads/` directory if it doesn't exist
- [ ] 5.2.4 Add `.gitkeep` and add `uploads/` to `.gitignore`

### 5.3 Submission — Controller & Routes
- [ ] 5.3.1 Create `controllers/submissionController.js` — `submitAssignment()` with file handling and resubmission logic
- [ ] 5.3.2 Create `controllers/submissionController.js` — `getSubmissionsByAssignment()` for lecturers
- [ ] 5.3.3 Create `controllers/submissionController.js` — `getMySubmissions()` for students
- [ ] 5.3.4 Create `controllers/submissionController.js` — `getSubmission()` by ID
- [ ] 5.3.5 Create `routes/submissions.js` — wire up endpoints
- [ ] 5.3.6 Mount `/api/assignments/:id/submit` and `/api/submissions` in `index.js`
- [ ] 5.3.7 Test submission with valid file, late submission, resubmission, oversized file

### 5.4 Submission — Validation
- [ ] 5.4.1 Reject submissions for non-existent assignments
- [ ] 5.4.2 Reject submissions from users who are not students
- [ ] 5.4.3 Reject empty uploads (no files or 0-byte files)
- [ ] 5.4.4 Reject files exceeding 10 MB

---

## Phase 6: Backend — Grade Module

### 6.1 Grade — Model
- [ ] 6.1.1 Create `models/grade.js` — `upsert()`, `findBySubmission()`, `findByStudent()`

### 6.2 Grade — Controller & Routes
- [ ] 6.2.1 Create `controllers/gradeController.js` — `gradeSubmission()` with score validation and feedback
- [ ] 6.2.2 Create `controllers/gradeController.js` — `getGrade()` for a submission
- [ ] 6.2.3 Create `routes/grades.js` — wire up PUT and GET
- [ ] 6.2.4 Mount routes in `index.js`
- [ ] 6.2.5 Test grading workflow

### 6.3 Grade — Validation
- [ ] 6.3.1 Validate score is a number between 0 and 100
- [ ] 6.3.2 Ensure only the assignment owner (lecturer) can grade
- [ ] 6.3.3 Ensure feedback is optional (can be null)

---

## Phase 7: Frontend — Authentication UI

### 7.1 Auth — Context & Types
- [ ] 7.1.1 Create `types/index.ts` — `User`, `AuthResponse`, `LoginCredentials`, `RegisterData` interfaces
- [ ] 7.1.2 Create `context/AuthContext.tsx` — provider with user state, login, register, logout, token persistence in localStorage
- [ ] 7.1.3 Create `hooks/useAuth.ts` — convenience hook wrapping AuthContext

### 7.2 Auth — Pages
- [ ] 7.2.1 Create `pages/LoginPage.tsx` — email/password form, error display, redirect on success
- [ ] 7.2.2 Create `pages/RegisterPage.tsx` — name/email/password/role form, validation, redirect on success
- [ ] 7.2.3 Style both pages with basic CSS (centered card layout)

### 7.3 Auth — Protected Routes
- [ ] 7.3.1 Create `components/ProtectedRoute.tsx` — redirect to login if not authenticated
- [ ] 7.3.2 Create `components/LecturerRoute.tsx` — redirect if user is not a lecturer
- [ ] 7.3.3 Apply protected routes in `App.tsx`

---

## Phase 8: Frontend — Layout & Navigation

### 8.1 Layout
- [ ] 8.1.1 Create `components/Navbar.tsx` — logo, nav links, user name, logout button
- [ ] 8.1.2 Create `components/Layout.tsx` — Navbar + main content area
- [ ] 8.1.3 Apply Layout wrapper in route definitions

### 8.2 Navigation Structure
- [ ] 8.2.1 Student nav: Assignments, My Submissions, Profile
- [ ] 8.2.2 Lecturer nav: Assignments, Create Assignment, Profile
- [ ] 8.2.3 Active link highlighting in Navbar

---

## Phase 9: Frontend — Assignments UI

### 9.1 Lecturer — Assignment Management
- [ ] 9.1.1 Create `pages/CreateAssignmentPage.tsx` — form with title, description, due date inputs
- [ ] 9.1.2 Create `pages/EditAssignmentPage.tsx` — pre-populated form, PUT on submit
- [ ] 9.1.3 Create `pages/MyAssignmentsPage.tsx` — table of lecturer's assignments with edit/delete actions
- [ ] 9.1.4 Add delete confirmation dialog

### 9.2 Student — Assignment View
- [ ] 9.2.1 Create `pages/AssignmentsListPage.tsx` — table of all assignments with title, due date, submission status (Submitted/Pending/Late)
- [ ] 9.2.2 Create `pages/AssignmentDetailPage.tsx` — full assignment details + submit button

### 9.3 Shared — Assignment Card/Row Component
- [ ] 9.3.1 Create `components/AssignmentCard.tsx` — reusable card/row used in both lecturer and student views

---

## Phase 10: Frontend — Submission UI

### 10.1 Student — Submit Assignment
- [ ] 10.1.1 Create `components/FileUpload.tsx` — drag-and-drop file selector, file list display, remove button
- [ ] 10.1.2 Create `pages/SubmitPage.tsx` — assignment info + FileUpload + submit button
- [ ] 10.1.3 Show success/error messages after submission
- [ ] 10.1.4 Disable submit button during upload (loading state)
- [ ] 10.1.5 Display file size warnings before upload

### 10.2 Student — My Submissions
- [ ] 10.2.1 Create `pages/MySubmissionsPage.tsx` — list of student's submissions with assignment title, date, status, grade link

### 10.3 Lecturer — View Submissions
- [ ] 10.3.1 Create `pages/AssignmentSubmissionsPage.tsx` — table of all submissions for one assignment
- [ ] 10.3.2 Each row shows student name, submission date, late badge, grade status, grade/feedback button

---

## Phase 11: Frontend — Grading UI

### 11.1 Lecturer — Grade Submission
- [ ] 11.1.1 Create `pages/GradeSubmissionPage.tsx` — view submitted file (download link), score input, feedback textarea
- [ ] 11.1.2 Show existing grade/feedback if already graded (pre-populated form)
- [ ] 11.1.3 Submit grade via PUT to grade endpoint

### 11.2 Student — View Grade
- [ ] 11.2.1 Create `pages/ViewGradePage.tsx` — display score, feedback, submission details
- [ ] 11.2.2 Show "Pending" state if not yet graded

---

## Phase 12: Frontend — Notifications & Error Handling

### 12.1 User Feedback
- [ ] 12.1.1 Create `components/Alert.tsx` — reusable success/error/info banner
- [ ] 12.1.2 Add auto-dismiss after 5 seconds for success alerts
- [ ] 12.1.3 Add global error boundary component

### 12.2 Loading States
- [ ] 12.2.1 Create `components/LoadingSpinner.tsx`
- [ ] 12.2.2 Add loading state to all pages that fetch data
- [ ] 12.2.3 Disable buttons during async operations

---

## Phase 13: Integration & Testing

### 13.1 Backend Integration Tests
- [ ] 13.1.1 Write test for complete auth flow (register → login → access protected route)
- [ ] 13.1.2 Write test for assignment CRUD lifecycle
- [ ] 13.1.3 Write test for submission with late detection
- [ ] 13.1.4 Write test for grading workflow
- [ ] 13.1.5 Write test for role-based access control (student cannot create assignment, etc.)
- [ ] 13.1.6 Write test for file upload size rejection

### 13.2 Frontend Integration
- [ ] 13.2.1 Connect all pages to actual API endpoints (replace mock data)
- [ ] 13.2.2 Test full flow: Lecturer creates assignment → Student submits → Lecturer grades → Student views grade

### 13.3 Error Handling Polish
- [ ] 13.3.1 Handle network errors gracefully across all pages
- [ ] 13.3.2 Handle 401 responses — auto-redirect to login
- [ ] 13.3.3 Handle 403 responses — show "Access denied" message
- [ ] 13.3.4 Handle 404 responses — show "Not found" message

---

## Phase 14: Polish & Deployment

### 14.1 UI Polish
- [ ] 14.1.1 Add responsive design adjustments (mobile-friendly tables)
- [ ] 14.1.2 Add consistent spacing and typography across all pages
- [ ] 14.1.3 Add favicon and page title

### 14.2 Security Hardening
- [ ] 14.2.1 Remove `console.log` statements from production code
- [ ] 14.2.2 Ensure SQL injection protection via parameterized queries (verify all queries)
- [ ] 14.2.3 Set HTTP security headers (helmet middleware)
- [ ] 14.2.4 Add rate limiting to auth endpoints

### 14.3 Deployment Config
- [ ] 14.3.1 Create production build script for frontend (`npm run build`)
- [ ] 14.3.2 Configure Express to serve frontend static files in production
- [ ] 14.3.3 Add `start` script to backend `package.json`
- [ ] 14.3.4 Create `.env.example` with all required variables documented

---

---

## Phase 15: Future Enhancements (Post-MVP)

### 15.1 Admin Dashboard
- [ ] 15.1.1 Add `admin` role to Users table CHECK constraint
- [ ] 15.1.2 Create admin middleware (`requireAdmin.js`)
- [ ] 15.1.3 Create admin controller: list users, suspend user, reset password
- [ ] 15.1.4 Create admin routes (`/api/admin/users`, `/api/admin/stats`)
- [ ] 15.1.5 Create admin frontend pages: User Management, System Stats

### 15.2 Email Notifications (Nodemailer)
- [ ] 15.2.1 Configure nodemailer transporter in `config/email.js`
- [ ] 15.2.2 Create email templates: welcome, assignment published, deadline reminder, grade released
- [ ] 15.2.3 Wire email sending into auth controller (registration) and assignment controller (creation)
- [ ] 15.2.4 Add cron job (node-cron) for daily deadline checks and reminder emails

### 15.3 Grade Analytics & Charts
- [ ] 15.3.1 Create `/api/assignments/:id/analytics` endpoint returning grade distribution data
- [ ] 15.3.2 Install Recharts in frontend
- [ ] 15.3.3 Build grade distribution histogram component
- [ ] 15.3.4 Add stats cards (min, max, avg, median) to assignment detail page for lecturers

### 15.4 Grading Rubrics
- [ ] 15.4.1 Create `Rubrics` table and `RubricCriteria` table in schema
- [ ] 15.4.2 Create rubric CRUD in backend (lecturer-only)
- [ ] 15.4.3 Update grade controller to accept per-criterion scores
- [ ] 15.4.4 Build rubric builder UI and criterion-level grading UI

### 15.5 Bulk Download Submissions
- [ ] 15.5.1 Install `archiver` npm package
- [ ] 15.5.2 Create `/api/assignments/:id/download-all` endpoint that streams a `.zip`
- [ ] 15.5.3 Add "Download All" button to AssignmentSubmissionsPage

### 15.6 Password Reset
- [ ] 15.6.1 Create `/api/auth/forgot-password` endpoint (generates token, sends email)
- [ ] 15.6.2 Create `/api/auth/reset-password` endpoint (validates token, updates password)
- [ ] 15.6.3 Build ForgotPasswordPage and ResetPasswordPage in frontend

### 15.7 Group Submissions
- [ ] 15.7.1 Create `GroupMembers` table (submission_id, user_id)
- [ ] 15.7.2 Update submission controller to accept multiple student IDs
- [ ] 15.7.3 Add group selection UI to submit page

### 15.8 Audit Log
- [ ] 15.8.1 Create `AuditLog` table (user_id, action, entity_type, entity_id, details, timestamp)
- [ ] 15.8.2 Create audit logging middleware or utility function
- [ ] 15.8.3 Add audit entries to all CRUD operations

---

## Summary

| Phase | Tasks | Dependencies |
|-------|-------|-------------|
| 1. Project Setup | 14 | None |
| 2. Database | 7 | Phase 1 |
| 3. Backend Auth | 12 | Phase 1, 2 |
| 4. Backend Assignments | 11 | Phase 3 |
| 5. Backend Submissions | 14 | Phase 4 |
| 6. Backend Grades | 8 | Phase 5 |
| 7. Frontend Auth UI | 8 | Phase 1, 3 |
| 8. Frontend Layout | 5 | Phase 7 |
| 9. Frontend Assignments UI | 7 | Phase 4, 8 |
| 10. Frontend Submission UI | 8 | Phase 5, 8 |
| 11. Frontend Grading UI | 4 | Phase 6, 8 |
| 12. Notifications & Errors | 5 | Phase 7-11 |
| 13. Integration & Testing | 10 | Phase 7-12 |
| 14. Polish & Deploy | 8 | Phase 13 |
| **Total** | **121 tasks** | |
