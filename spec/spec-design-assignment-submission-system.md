---
title: Design Specification — Assignment Submission and Management System
version: 1.0
date_created: 2026-06-21
owner: Project Team
tags: design, fullstack, assignment-management, academic
---

# Introduction

This specification defines the architecture, components, data contracts, and acceptance criteria for the Assignment Submission and Management System (ASMS). It is intended for development teams implementing the system and serves as the single source of truth for system behavior and constraints.

## 1. Purpose & Scope

**Purpose:** To specify a web-based system that enables students to submit assignments, lecturers to create and grade assignments, and both parties to track submissions, feedback, and grades through a centralized platform.

**Scope:** The specification covers all functional modules — authentication, assignment management, submission handling, grading and feedback, and notifications. It excludes full e-learning features (live lectures, video streaming, plagiarism detection, mobile-native apps).

**Audience:** Developers, testers, project managers, and stakeholders reviewing technical design.

**Assumptions:**
- Users have access to a modern web browser and internet connection.
- The institution provides SQL Server database access.
- User roles are limited to Student and Lecturer; administrator functions are out of scope for this version.

## 2. Definitions

| Term | Definition |
|------|------------|
| ASMS | Assignment Submission and Management System |
| Lecturer | User role that creates assignments, grades submissions, and provides feedback |
| Student | User role that submits assignments and views grades and feedback |
| Assignment | A task created by a lecturer with a title, description, due date, and optional file attachments |
| Submission | A file or set of files uploaded by a student in response to an assignment |
| Grade | A numerical or letter score assigned to a submission by a lecturer |
| Feedback | Text comments provided by a lecturer on a student's submission |
| Deadline | The date and time after which submissions are flagged as late |
| JWT | JSON Web Token used for authentication and session management |
| REST | Representational State Transfer — API architectural style used for client-server communication |
| SQL | Structured Query Language — used to interact with the database |
| SPA | Single Page Application — the frontend architecture pattern |

## 3. Requirements, Constraints & Guidelines

### 3.1 Functional Requirements

- **REQ-AUTH-001**: The system shall support user registration with name, email, password, and role (student or lecturer).
- **REQ-AUTH-002**: The system shall authenticate users via email and password and issue a JWT token valid for 24 hours.
- **REQ-AUTH-003**: The system shall restrict access to endpoints based on user role.
- **REQ-ASN-001**: Lecturers shall be able to create assignments with title, description, due date, and optional file attachment.
- **REQ-ASN-002**: Lecturers shall be able to edit and delete their own assignments.
- **REQ-ASN-003**: Students shall view a list of all assignments with their deadlines and submission status.
- **REQ-SUB-001**: Students shall submit one or more files for an assignment before the deadline.
- **REQ-SUB-002**: Students shall be able to resubmit files before the deadline (previous submission is replaced).
- **REQ-SUB-003**: Submissions after the deadline shall be marked as "late" automatically.
- **REQ-GRD-001**: Lecturers shall be able to view all submissions for their assignments.
- **REQ-GRD-002**: Lecturers shall assign a grade and optional text feedback to each submission.
- **REQ-GRD-003**: Students shall view their grades and feedback once released by the lecturer.
- **REQ-NOT-001**: The system shall display confirmation messages upon successful submission.
- **REQ-NOT-002**: The system shall display error messages when operations fail.

### 3.2 Non-Functional Requirements

- **REQ-NFR-001**: The frontend shall render within 3 seconds on a standard broadband connection.
- **REQ-NFR-002**: The API shall respond to requests within 2 seconds under normal load.
- **REQ-NFR-003**: The system shall support at least 100 concurrent users.
- **REQ-NFR-004**: All passwords shall be hashed using bcrypt with a minimum cost factor of 10.
- **REQ-NFR-005**: All API communication shall occur over HTTPS.
- **REQ-NFR-006**: File uploads shall be limited to 10 MB per file.

### 3.3 Constraints

- **CON-001**: The frontend must use React with TypeScript.
- **CON-002**: The backend must use Node.js with Express.
- **CON-003**: The database must be Microsoft SQL Server.
- **CON-004**: Authentication must use JWT (no session-based auth).
- **CON-005**: File storage must be on the server filesystem (not cloud storage) for this version.

### 3.4 Guidelines

- **GUD-001**: Use functional components with hooks in React; avoid class components.
- **GUD-002**: Follow RESTful naming conventions for API endpoints.
- **GUD-003**: Use environment variables for all configuration (database connection, JWT secret, file upload paths).
- **GUD-004**: Validate all inputs on both client and server sides.
- **GUD-005**: Return consistent JSON error responses with `{ error: string, details?: string }` format.

## 4. Interfaces & Data Contracts

### 4.1 API Endpoints

#### Authentication

| Method | Endpoint | Auth Required | Role | Description |
|--------|----------|---------------|------|-------------|
| POST | `/api/auth/register` | No | — | Register a new user |
| POST | `/api/auth/login` | No | — | Authenticate and return JWT |
| GET | `/api/auth/me` | Yes | All | Get current user profile |

#### Assignments

| Method | Endpoint | Auth Required | Role | Description |
|--------|----------|---------------|------|-------------|
| POST | `/api/assignments` | Yes | Lecturer | Create assignment |
| GET | `/api/assignments` | Yes | All | List assignments (all for lecturer, assigned for student) |
| GET | `/api/assignments/:id` | Yes | All | Get assignment details |
| PUT | `/api/assignments/:id` | Yes | Lecturer | Update assignment |
| DELETE | `/api/assignments/:id` | Yes | Lecturer | Delete assignment |

#### Submissions

| Method | Endpoint | Auth Required | Role | Description |
|--------|----------|---------------|------|-------------|
| POST | `/api/assignments/:id/submit` | Yes | Student | Submit files for assignment |
| GET | `/api/assignments/:id/submissions` | Yes | Lecturer | Get all submissions for assignment |
| GET | `/api/submissions/mine` | Yes | Student | Get current user's submissions |
| GET | `/api/submissions/:submissionId` | Yes | All | Get submission details |

#### Grades

| Method | Endpoint | Auth Required | Role | Description |
|--------|----------|---------------|------|-------------|
| PUT | `/api/submissions/:submissionId/grade` | Yes | Lecturer | Assign grade and feedback |
| GET | `/api/submissions/:submissionId/grade` | Yes | All | Get grade for a submission |

### 4.2 Database Schema

```
Table: Users
├── id              INT           PK, IDENTITY
├── name            NVARCHAR(100) NOT NULL
├── email           NVARCHAR(255) NOT NULL UNIQUE
├── password_hash   NVARCHAR(255) NOT NULL
├── role            NVARCHAR(20)  NOT NULL CHECK (role IN ('student', 'lecturer'))
├── created_at      DATETIME2     DEFAULT GETDATE()
└── updated_at      DATETIME2     DEFAULT GETDATE()

Table: Assignments
├── id              INT           PK, IDENTITY
├── lecturer_id     INT           FK → Users.id
├── title           NVARCHAR(200) NOT NULL
├── description     NVARCHAR(MAX)
├── due_date        DATETIME2     NOT NULL
├── file_path       NVARCHAR(500) -- optional reference file
├── created_at      DATETIME2     DEFAULT GETDATE()
└── updated_at      DATETIME2     DEFAULT GETDATE()

Table: Submissions
├── id              INT           PK, IDENTITY
├── assignment_id   INT           FK → Assignments.id
├── student_id      INT           FK → Users.id
├── file_path       NVARCHAR(500) NOT NULL
├── original_name   NVARCHAR(255) NOT NULL
├── submitted_at    DATETIME2     DEFAULT GETDATE()
├── is_late         BIT           DEFAULT 0
└── updated_at      DATETIME2     DEFAULT GETDATE()

Table: Grades
├── id              INT           PK, IDENTITY
├── submission_id   INT           FK → Submissions.id, UNIQUE
├── score           DECIMAL(5,2)  NOT NULL
├── feedback        NVARCHAR(MAX)
├── graded_at       DATETIME2     DEFAULT GETDATE()
└── updated_at      DATETIME2     DEFAULT GETDATE()
```

**Relationships:**
- A User (lecturer) has many Assignments.
- An Assignment belongs to one User (lecturer).
- A Submission belongs to one Assignment and one User (student).
- An Assignment has many Submissions.
- A Submission has one Grade.

### 4.3 API Request/Response Examples

**POST /api/auth/register**

```json
// Request
{
  "name": "John Doe",
  "email": "john@university.edu",
  "password": "securePassword123",
  "role": "student"
}

// Response 201
{
  "id": 1,
  "name": "John Doe",
  "email": "john@university.edu",
  "role": "student",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**POST /api/assignments**

```json
// Request
{
  "title": "Database Design Project",
  "description": "Design an ER diagram for a library management system.",
  "due_date": "2026-07-15T23:59:00Z"
}

// Response 201
{
  "id": 1,
  "lecturer_id": 2,
  "title": "Database Design Project",
  "description": "Design an ER diagram for a library management system.",
  "due_date": "2026-07-15T23:59:00.000Z",
  "created_at": "2026-06-21T10:00:00.000Z"
}
```

**POST /api/assignments/:id/submit**

```
// Request: multipart/form-data
// Field: files (multiple, up to 10MB each)
// Response 201
{
  "message": "Files submitted successfully",
  "submission": {
    "id": 5,
    "assignment_id": 1,
    "student_id": 1,
    "file_path": "/uploads/assignments/1/student_1_1687345200.pdf",
    "original_name": "project_report.pdf",
    "submitted_at": "2026-06-21T14:30:00.000Z",
    "is_late": false
  }
}
```

### 4.4 Error Response Format

```json
{
  "error": "ValidationError",
  "details": "The title field is required."
}
```

Common error codes: `ValidationError`, `AuthenticationError`, `AuthorizationError`, `NotFoundError`, `FileTooLargeError`.

## 5. Acceptance Criteria

### 5.1 Authentication

- **AC-AUTH-001**: Given a new user with valid registration data, When they submit the registration form, Then a user account is created and a JWT is returned.
- **AC-AUTH-002**: Given an existing email, When a user attempts to register with that email, Then an error is returned indicating the email is already in use.
- **AC-AUTH-003**: Given valid credentials, When a user logs in, Then a JWT token is returned valid for 24 hours.
- **AC-AUTH-004**: Given an invalid email or password, When a user attempts to log in, Then a 401 error is returned.
- **AC-AUTH-005**: Given a protected endpoint, When a request is made without a valid JWT, Then a 401 error is returned.

### 5.2 Assignments

- **AC-ASN-001**: Given a lecturer is authenticated, When they create an assignment with valid data, Then the assignment is stored and returned with a 201 status.
- **AC-ASN-002**: Given a student is authenticated, When they attempt to create an assignment, Then a 403 error is returned.
- **AC-ASN-003**: Given an assignment exists, When a lecturer views the list, Then all assignments are returned. When a student views the list, Then only assignments visible to them are returned.
- **AC-ASN-004**: Given a lecturer owns an assignment, When they update it, Then the changes are persisted.

### 5.3 Submissions

- **AC-SUB-001**: Given a student is authenticated and an assignment exists, When they upload valid files, Then a submission record is created and files are stored on the server.
- **AC-SUB-002**: Given a submission is made after the due date, When the submission is saved, Then `is_late` is set to true.
- **AC-SUB-003**: Given a student has already submitted, When they submit again, Then the previous submission files are replaced with the new ones.
- **AC-SUB-004**: Given a file exceeds 10 MB, When the student attempts to upload, Then an error is returned and the file is rejected.
- **AC-SUB-005**: Given a lecturer views submissions for their assignment, When they request the list, Then all student submissions are returned with file metadata.

### 5.4 Grading

- **AC-GRD-001**: Given a submission exists, When a lecturer assigns a grade and feedback, Then the grade record is created or updated.
- **AC-GRD-002**: Given a student views their submission, When a grade has been assigned, Then they see the score and feedback.
- **AC-GRD-003**: Given a student views their submission, When no grade has been assigned yet, Then they see "Pending" status.

### 5.5 General

- **AC-GEN-001**: The system shall display appropriate loading states during API calls.
- **AC-GEN-002**: The system shall display user-friendly error messages on failure.
- **AC-GEN-003**: The frontend shall redirect unauthenticated users to the login page.

## 6. Test Automation Strategy

- **Test Levels**:
  - **Unit Tests**: Test individual utility functions and validation logic. Use Jest.
  - **Integration Tests**: Test API endpoints with a test database. Use Supertest + Jest.
  - **End-to-End Tests**: Test full user workflows through the UI. Use Playwright.
- **Frameworks**: Jest (unit/integration), Playwright (E2E).
- **Test Data Management**: Use an in-memory SQL Server or a dedicated test database that is reset before each test run.
- **Coverage Requirements**: Minimum 70% code coverage for backend, 50% for frontend.
- **Testing Priorities**:
  1. Authentication flows (register, login, token expiry)
  2. Assignment CRUD operations
  3. File upload and late submission detection
  4. Grading workflow

## 7. Rationale & Context

**Why JWT over sessions:** JWT enables stateless authentication suitable for REST APIs and SPA frontends. Tokens can be stored client-side and attached to requests without server-side session storage, simplifying horizontal scaling.

**Why file system storage over cloud storage:** The initial version targets local deployment. File system storage keeps infrastructure requirements minimal. A migration path to cloud storage (Azure Blob, AWS S3) is possible later by abstracting storage behind an interface.

**Why separate Grades table:** Keeping grades in a separate table allows for future extensions (grade history, multiple graders, rubrics) without modifying the submissions table schema.

**Why server-side late detection:** Relying on the server's clock ensures consistent deadline enforcement regardless of the student's system clock.

## 8. Dependencies & External Integrations

### External Systems
- **EXT-001**: Microsoft SQL Server — Primary database for all persistent data.

### Third-Party Services
- None for the initial version. All functionality is self-contained.

### Infrastructure Dependencies
- **INF-001**: Node.js runtime (v18 LTS or later) — Server-side execution environment.
- **INF-002**: npm or yarn — Package management.

### Technology Platform Dependencies
- **PLT-001**: React 19+ with TypeScript — Frontend framework.
- **PLT-002**: Vite 8+ — Frontend build tool.
- **PLT-003**: Express 5+ — HTTP server framework.
- **PLT-004**: mssql (Node.js driver) — SQL Server database connectivity.
- **PLT-005**: jsonwebtoken — JWT creation and verification.
- **PLT-006**: bcrypt — Password hashing.
- **PLT-007**: multer — File upload handling.
- **PLT-008**: cors — Cross-origin request handling.
- **PLT-009**: dotenv — Environment variable management.
- **PLT-010**: axios (or fetch) — Frontend HTTP client.
- **PLT-011**: react-router-dom (or React Router v7+) — Frontend routing.

## 9. Examples & Edge Cases

```
Edge Case: Student submits exactly at the deadline
- If due_date is 2026-07-15T23:59:00Z and submission time is 2026-07-15T23:59:00Z,
  then is_late = false (submission at or before the deadline is on time).

Edge Case: Student resubmits after deadline
- If first submission was on time but resubmission is after the deadline,
  then is_late should reflect the latest submission time.

Edge Case: Lecturer deletes assignment with existing submissions
- System should prevent deletion or cascade-delete submissions and grades.
  Decision: Prevent deletion if submissions exist (soft delete or return error).

Edge Case: Empty file upload
- System should reject uploads with no files or with 0-byte files.
```

## 10. Validation Criteria

1. All API endpoints listed in section 4.1 respond with correct HTTP status codes as specified.
2. Database tables match the schema in section 4.2 with correct relationships and constraints.
3. JWT tokens expire after 24 hours and invalidated tokens are rejected.
4. File uploads exceeding 10 MB are rejected with an appropriate error message.
5. Late submissions are correctly flagged based on server time comparison with the assignment due date.
6. Students cannot view submissions or grades of other students.
7. Lecturers cannot modify assignments created by other lecturers.
8. The frontend routes are protected based on authentication status and user role.

## 11. Future Enhancements

The following features are recommended for future iterations:

### 11.1 Admin Role
- **REQ-ADM-001**: The system shall provide an admin dashboard for user management (view, suspend, delete users).
- **REQ-ADM-002**: Admins shall view platform-wide statistics (total users, assignments, submissions, grades).
- **REQ-ADM-003**: Admins shall reset user passwords.

### 11.2 Email Notifications
- **REQ-EML-001**: The system shall send email confirmation upon successful registration.
- **REQ-EML-002**: The system shall email students when a new assignment is published.
- **REQ-EML-003**: The system shall send deadline reminder emails 24 hours before the due date.
- **REQ-EML-004**: The system shall email students when a grade is released.
- **REQ-EML-005**: The system shall send late submission confirmation to the student.

### 11.3 Grading Enhancements
- **REQ-RUB-001**: Lecturers shall create rubrics with named criteria, each with a max score.
- **REQ-RUB-002**: Lecturers shall grade each criterion individually; the total is calculated automatically.
- **REQ-RUB-003**: Students shall see a per-criterion score breakdown.
- **REQ-ANL-001**: Lecturers shall view grade distribution charts (histogram) per assignment.
- **REQ-ANL-002**: Lecturers shall view min, max, average, and median scores per assignment.

### 11.4 Submission Improvements
- **REQ-SUB-004**: Lecturers shall download all submissions for an assignment as a single `.zip` file.
- **REQ-SUB-005**: Students shall form groups (2-3 members) for group submissions.
- **REQ-SUB-006**: All group members shall receive the same grade on a group submission.

### 11.5 Security & Access
- **REQ-PWR-001**: Users shall reset forgotten passwords via an email token flow.
- **REQ-OAU-001**: Users shall log in via Google or Microsoft institutional OAuth.
- **REQ-AUD-001**: The system shall maintain an audit log of all create, update, and delete actions.

### 11.6 Export & Reporting
- **REQ-EXP-001**: Lecturers shall export grade lists as CSV.
- **REQ-EXP-002**: Lecturers shall export grade lists as PDF.

## 12. Related Specifications / Further Reading

- PROJECT_PROPOSAL.md — High-level project overview, objectives, and methodology.
- React documentation: https://react.dev/
- Express documentation: https://expressjs.com/
- SQL Server documentation: https://learn.microsoft.com/en-us/sql/
