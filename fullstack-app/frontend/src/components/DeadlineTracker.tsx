import type { Assignment } from '@/types'
import { Link } from 'react-router-dom'
import { CalendarPlus, CalendarClock, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { buildAssignmentsIcs, downloadIcs } from '@/utils/ics'

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

interface DeadlineTrackerProps {
  assignments: Assignment[]
  submittedAssignmentIds: Set<number>
  loading?: boolean
}

type BucketKey = 'overdue' | 'today' | 'week' | 'later'

const GROUPS: { key: BucketKey; label: string }[] = [
  { key: 'overdue', label: 'Overdue' },
  { key: 'today', label: 'Due Today' },
  { key: 'week', label: 'This Week' },
  { key: 'later', label: 'Upcoming' },
]

export default function DeadlineTracker({ assignments, submittedAssignmentIds, loading }: DeadlineTrackerProps) {
  const todayKey = localDateKey(new Date())
  const nextWeekKey = localDateKey(new Date(Date.now() + 7 * 86400000))

  const buckets: Record<BucketKey, Assignment[]> = { overdue: [], today: [], week: [], later: [] }

  for (const a of assignments) {
    if (submittedAssignmentIds.has(a.id)) continue
    const dueKey = localDateKey(new Date(a.due_date))
    let bucket: BucketKey
    if (dueKey < todayKey) bucket = 'overdue'
    else if (dueKey === todayKey) bucket = 'today'
    else if (dueKey <= nextWeekKey) bucket = 'week'
    else bucket = 'later'
    buckets[bucket].push(a)
  }

  for (const key of Object.keys(buckets) as BucketKey[]) {
    buckets[key].sort((x, y) => new Date(x.due_date).getTime() - new Date(y.due_date).getTime())
  }

  const hasAny = GROUPS.some((g) => buckets[g.key].length > 0)

  const exportIcs = () => {
    const outstanding = assignments.filter((a) => {
      if (submittedAssignmentIds.has(a.id)) return false
      return localDateKey(new Date(a.due_date)) >= todayKey
    })
    if (outstanding.length === 0) return
    void outstanding
    downloadIcs('assignment-deadlines.ics', buildAssignmentsIcs(outstanding))
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle>Deadline Tracker</CardTitle>
        <Button variant="outline" size="sm" className="gap-2" onClick={exportIcs} disabled={!hasAny}>
          <CalendarPlus className="h-4 w-4" />
          Export to calendar
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 rounded" />)}</div>
        ) : !hasAny ? (
          <p className="text-sm text-muted-foreground">All caught up — no outstanding deadlines.</p>
        ) : (
          <div className="space-y-4">
            {GROUPS.map((group) => {
              const items = buckets[group.key]
              if (items.length === 0) return null
              return (
                <div key={group.key}>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</p>
                  <div className="space-y-1">
                    {items.map((a) => (
                      <Link
                        key={a.id}
                        to={`/assignments/${a.id}`}
                        className="flex items-center justify-between gap-2 rounded-lg p-2 text-sm transition-colors hover:bg-muted/50"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          {group.key === 'overdue' ? (
                            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                          ) : (
                            <CalendarClock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          )}
                          <span className="truncate font-medium">{a.title}</span>
                          {a.course_code && <span className="shrink-0 text-xs font-medium text-indigo-500">{a.course_code}</span>}
                        </span>
                        <span className={`shrink-0 text-xs ${group.key === 'overdue' ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {new Date(a.due_date).toLocaleDateString()}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}