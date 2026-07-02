# Lecturer-side enhancement implementation plan

## Overview
This document outlines the next set of lecturer-focused features that would make the assignment submission system more suitable for a polytechnic environment.

## Priority features

### 1. Bulk grading
Purpose:
- Allow lecturers to grade many submissions quickly.
- Reduce repetitive work for large classes.

Planned work:
- Add a bulk-selection action on the submissions list page.
- Support applying a score and feedback to multiple selected submissions.
- Add a confirmation step before bulk updates.

Backend changes:
- Add an endpoint to update multiple grades at once.
- Validate that each selected submission belongs to the lecturer.

Frontend changes:
- Add checkboxes to each submission row.
- Add a "Grade Selected" action.
- Show summary of selected submissions.

Database changes:
- No new table is strictly required for the first version.
- Existing Grades table can be reused.

### 2. Submission status dashboard
Purpose:
- Give lecturers a faster overview of student progress.

Planned work:
- Show counts for:
  - not submitted
  - submitted
  - late
  - graded
  - resubmitted

Backend changes:
- Add analytics endpoints for submission statuses per assignment.

Frontend changes:
- Add cards or summary bars on the lecturer dashboard.
- Show status filters on the submissions page.

Database changes:
- No new table required.
- Use existing Submissions and Grades data.

### 3. File-specific feedback
Purpose:
- Let lecturers give feedback on individual uploaded files.

Planned work:
- Allow lecturers to attach comments to each uploaded file.
- Show these comments next to the file in the submission details view.

Backend changes:
- Add a new table for file comments or feedback.

Suggested table:
- SubmissionFileFeedback
  - id
  - submission_file_id
  - lecturer_id
  - feedback_text
  - created_at

Frontend changes:
- Add a feedback form below each file preview.
- Display previous feedback comments.

### 4. Assignment templates
Purpose:
- Save lecturers time on recurring assignments.

Planned work:
- Let lecturers save a template with:
  - title
  - description
  - due date rules
  - rubric criteria
  - allowed file types
  - submission instructions

Backend changes:
- Add template storage endpoints.

Suggested table:
- AssignmentTemplates
  - id
  - lecturer_id
  - name
  - description
  - content_json
  - created_at

Frontend changes:
- Add a "Use Template" option in the create assignment page.

### 5. Better submission export
Purpose:
- Enable lecturers to download student work more efficiently.

Planned work:
- Improve the ZIP export feature to include:
  - student name
  - matric number or ID if available
  - submission date
  - file names

Backend changes:
- Generate exports with clearer file names.
- Optional: export as grouped folders per student.

Frontend changes:
- Add a download button on the assignment submissions page.

### 6. Project approval workflow
Purpose:
- Support polytechnic project submissions and practical work.

Planned work:
- Add review states such as:
  - pending
  - approved
  - rejected
  - needs revision

Backend changes:
- Add status tracking for each submission.

Suggested table:
- SubmissionReviewStatus
  - id
  - submission_id
  - status
  - reviewed_by
  - reviewed_at
  - comment

Frontend changes:
- Add a status dropdown in the submission details page.

## Suggested implementation order
1. Submission status dashboard
2. Bulk grading
3. File-specific feedback
4. Better submission export
5. Assignment templates
6. Project approval workflow

## Recommended database additions
The following new tables may be added as the feature set grows:
- SubmissionFiles (already added)
- SubmissionFileFeedback
- AssignmentTemplates
- SubmissionReviewStatus

## Notes
These enhancements will make the system more practical for lecturers handling large classes, practical work, and project-based assignments.
