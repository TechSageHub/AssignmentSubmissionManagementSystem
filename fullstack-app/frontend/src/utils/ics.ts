import type { Assignment } from '@/types'

function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r\n|\r|\n/g, '\\n')
}

function toDateValue(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, '')
}

export function buildAssignmentsIcs(assignments: Assignment[]): string {
  const dateStamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const events = assignments.map((a) =>
    [
      'BEGIN:VEVENT',
      `UID:assignment-${a.id}@assignment-submission-management`,
      `DTSTAMP:${dateStamp}`,
      `DTSTART;VALUE=DATE:${toDateValue(a.due_date)}`,
      `SUMMARY:${escapeText(`Due: ${a.title}`)}`,
      ...(a.course_code ? [`DESCRIPTION:${escapeText(a.course_code)}`] : []),
      `URL:${window.location.origin}/assignments/${a.id}`,
      'END:VEVENT',
    ].join('\r\n'),
  )
  return (
    ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AssignmentSubmissionManagementSystem//Assignment Deadlines//EN', 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR'].join('\r\n') + '\r\n'
  )
}

export function downloadIcs(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}