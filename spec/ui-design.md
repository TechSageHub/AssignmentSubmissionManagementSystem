# UI/UX Design: Assignment Submission Management System

## Design Philosophy

Modern, clean SaaS-style interface inspired by Linear, Notion, and Stripe. Minimalist layout with plenty of whitespace, professional typography, and subtle interactions.

---

## Color Palette

| Token               | Hex       | Usage                              |
| ------------------- | --------- | ---------------------------------- |
| `--primary`         | `#6366f1` | Buttons, links, active states      |
| `--primary-foreground` | `#ffffff` | Text on primary backgrounds      |
| `--accent`          | `#4f46e5` | Hover states, focus rings          |
| `--background`      | `#f8fafc` | Page background                    |
| `--card`            | `#ffffff` | Cards, modals, dropdowns           |
| `--border`          | `#e2e8f0` | Dividers, outlines                 |
| `--text`            | `#0f172a` | Primary body text                  |
| `--text-muted`      | `#64748b` | Secondary labels                   |
| `--success`         | `#22c55e` | Submitted, verified badges         |
| `--warning`         | `#eab308` | Pending, late badges               |
| `--danger`          | `#ef4444` | Errors, deletions                  |

---

## Typography

- **Font:** Inter (Google Fonts) — clean, modern, highly legible
- **Scale:**
  - `h1`: 30px / 700 — page titles
  - `h2`: 20px / 600 — section headers
  - `h3`: 16px / 600 — card titles
  - `body`: 14px / 400 — default text
  - `small`: 12px / 500 — labels, timestamps, badges
- **Line height:** 1.5 body, 1.2 headings
- **Letter spacing:** -0.02em for headings, normal for body

---

## Layout Structure

```
+---------------------------------------------------+
|  Sidebar (desktop) / Mobile nav                   |
|  +-------+  +-----------------------------------+ |
|  | Logo  |  | Top bar (breadcrumb, user menu)   | |
|  |       |  +-----------------------------------+ |
|  | Nav   |  |                                   | |
|  |       |  | Main content area                 | |
|  |       |  | (max-width container, padded)     | |
|  |       |  |                                   | |
|  +-------+  +-----------------------------------+ |
+---------------------------------------------------+
```

- **Desktop (>=1024px):** Fixed sidebar (240px) + scrollable content
- **Tablet (768-1023px):** Collapsible sidebar, hamburger toggle
- **Mobile (<768px):** Bottom tab bar or full-screen drawer

---

## Navigation Design

### Sidebar Items (role-aware)

| Icon              | Label            | Path                  | Roles         |
| ----------------- | ---------------- | --------------------- | ------------- |
| LayoutDashboard   | Dashboard        | `/`                   | All           |
| ClipboardList     | Assignments      | `/assignments`        | All           |
| PlusCircle        | Create Assignment| `/assignments/new`    | Lecturer      |
| FileText          | My Submissions   | `/my-submissions`     | Student       |

### Sidebar Footer
- User avatar + name + role badge
- Logout button

### Active State
- Left border accent (2px indigo) + subtle background highlight

---

## Dashboard Design

### Lecturer Dashboard
- **Stats cards** (4 across): Total assignments, total submissions, pending grading, average score
- **Recent submissions** table — last 5 ungraded submissions
- **Quick actions:** Create assignment, grade latest
- **Chart:** Submissions over time (simple bar chart with CSS)

### Student Dashboard
- **Stats cards:** Pending assignments, submitted, graded, overdue
- **Upcoming deadlines** list
- **Recent grades** table

---

## Student Pages

### Assignments List (`/assignments`)
- Table with: Title, Due Date, Status, Score, Action button
- Search bar + filter dropdown (All / Pending / Submitted / Graded)

### Assignment Detail (`/assignments/:id`)
- Two-panel layout:
  - **Left:** Description, due date, lecturer, file
  - **Right:** Submission form (file upload + notes) or status card

### My Submissions (`/my-submissions`)
- Table of user's submissions: assignment name, date, grade, feedback

---

## Lecturer Pages

### My Assignments (`/assignments`)
- Table: Title, Due Date, Submissions count, Actions (Edit, View, Delete)

### Create/Edit Assignment (`/assignments/new`, `/:id/edit`)
- Full-page form: Title, Description, Due date picker, File attachment
- Right sidebar with tips

### Assignment Submissions (`/assignments/:id/submissions`)
- Grid of submission cards: student name, date, late badge, score, grade button

### Grade Submission (`/submissions/:id/grade`)
- Split view:
  - **Left:** Student submission preview (file + notes)
  - **Right:** Score input + feedback textarea + submit

---

## Assignment Submission Workflow

1. Student browses assignments → clicks "Submit"
2. Sees assignment details + drag-and-drop file upload zone
3. Uploads file (validated: type, size ≤ 10MB)
4. Optional: adds submission notes
5. Clicks "Submit" → confirmation toast → redirects to "My Submissions"
6. Badge updates from "Pending" → "Submitted"

---

## Grading & Feedback Workflow

1. Lecturer sees submission in "Pending Grading" list
2. Clicks "Grade" → split view with file preview
3. Enters score (0-100) + written feedback
4. Submits → toast success → grade visible to student immediately
5. Student sees score + feedback on submission detail page

---

## Mobile Responsiveness

| Breakpoint   | Behavior                                     |
| ------------ | -------------------------------------------- |
| >=1024px     | Full sidebar + content                       |
| 768-1023px   | Collapsed sidebar (icon-only), hamburger     |
| <768px       | Bottom nav bar or full-screen drawer         |
| Tables       | → Cards (stack vertically on mobile)         |
| Forms        | → Full-width, no side panels                 |
| Modals       | → Full-screen sheets on mobile               |

---

## Component Library (shadcn/ui)

| Component      | Where Used                                      |
| -------------- | ----------------------------------------------- |
| `Button`       | Everywhere — default, outline, ghost, destructive|
| `Card`         | Dashboard stats, submission cards, details      |
| `Input`        | All form fields                                 |
| `Textarea`     | Description, feedback fields                    |
| `Label`        | Form field labels                               |
| `Select`       | Filters, role selection                         |
| `Table`        | Assignment lists, submission lists              |
| `Badge`        | Status indicators                               |
| `Avatar`       | User avatar in sidebar                          |
| `Sheet`        | Mobile navigation drawer                        |
| `Dialog`       | Confirmation dialogs (delete, etc.)             |
| `Toast` (Sonner)| Success/error notifications                    |
| `Separator`    | Visual dividers                                 |
| `Skeleton`     | Loading states                                  |
| `DropdownMenu` | User menu (avatar dropdown)                     |
