import { useState, useEffect, type FormEvent } from 'react'
import api from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DEPARTMENTS, STUDENT_LEVELS, LECTURER_LEVEL_SCOPES } from '@/constants/academic'
import { UserPlus } from 'lucide-react'
import { toast } from 'sonner'

const roleLabels: Record<string, string> = {
  student: 'Student',
  lecturer: 'Lecturer',
  admin: 'Admin',
}

type Role = 'student' | 'lecturer' | 'admin'

interface CreateUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Roles the current user is allowed to create. The first entry is the default.
  allowedRoles: Role[]
  onCreated?: () => void
}

export default function CreateUserDialog({ open, onOpenChange, allowedRoles, onCreated }: CreateUserDialogProps) {
  const { user: currentUser } = useAuth()
  const isLecturerCreator = currentUser?.role === 'lecturer' && allowedRoles.length === 1 && allowedRoles[0] === 'student'
  const lecturerDept = isLecturerCreator ? (currentUser?.department || '') : ''

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>(allowedRoles[0])
  const [studentId, setStudentId] = useState('')
  const [staffId, setStaffId] = useState('')
  const [selectedDept, setSelectedDept] = useState('')
  const [customDept, setCustomDept] = useState('')
  const [programme, setProgramme] = useState('')
  const [level, setLevel] = useState('')
  const [levelScope, setLevelScope] = useState<string>('both')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)

  const effectiveDepartment = isLecturerCreator && lecturerDept
    ? lecturerDept
    : selectedDept === 'OTHER' ? customDept.trim() : selectedDept

  useEffect(() => {
    if (isLecturerCreator && lecturerDept && open) {
      setSelectedDept(lecturerDept)
    }
  }, [isLecturerCreator, lecturerDept, open])

  const reset = () => {
    setName(''); setEmail(''); setRole(allowedRoles[0])
    setStudentId(''); setStaffId(''); setSelectedDept(''); setCustomDept(''); setProgramme(''); setLevel(''); setLevelScope('both'); setPhone('')
  }

  const handleClose = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/users', {
        name, email, role,
        studentId: role === 'student' ? studentId : undefined,
        staffId: role === 'lecturer' ? staffId : undefined,
        department: effectiveDepartment || undefined,
        programme: role === 'student' ? programme : undefined,
        level: role === 'student' ? level : undefined,
        levelScope: role === 'lecturer' ? levelScope : undefined,
        phone: phone || undefined,
      })
      toast.success('Account created. The user will receive a verification email with a temporary password.')
      reset()
      onOpenChange(false)
      onCreated?.()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { details?: string } } })?.response?.data?.details
      toast.error(msg || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add User
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cu-name">Full Name</Label>
            <Input id="cu-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cu-email">Email</Label>
            <Input id="cu-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@fpi.edu.ng" required />
          </div>

          <div className="rounded-md border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
            A temporary password is generated automatically and sent to the user&apos;s email. They will be asked to set their own password on first login.
          </div>

          {allowedRoles.length > 1 ? (
            <div className="space-y-1.5">
              <Label htmlFor="cu-role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger id="cu-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {allowedRoles.map((r) => (
                    <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Input value={roleLabels[role]} disabled />
            </div>
          )}

          {role === 'student' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="cu-student-id">Student ID / Matric Number</Label>
                <Input id="cu-student-id" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="e.g. ND/ICT/2024/0001" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cu-programme">Programme</Label>
                <Input id="cu-programme" value={programme} onChange={(e) => setProgramme(e.target.value)} placeholder="e.g. Computer Science" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cu-level">Level</Label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger id="cu-level"><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>
                    {STUDENT_LEVELS.map((l) => (<SelectItem key={l} value={l}>{l}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {role === 'lecturer' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="cu-staff-id">Staff ID</Label>
                <Input id="cu-staff-id" value={staffId} onChange={(e) => setStaffId(e.target.value)} placeholder="e.g. FPI/STAFF/001" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cu-scope">Teaching Scope</Label>
                <Select value={levelScope} onValueChange={setLevelScope}>
                  <SelectTrigger id="cu-scope"><SelectValue placeholder="Select teaching scope" /></SelectTrigger>
                  <SelectContent>
                    {LECTURER_LEVEL_SCOPES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Select whether this lecturer teaches ND only, HND only, or both.</p>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="cu-dept">Department</Label>
            {isLecturerCreator && lecturerDept ? (
              <>
                <Input id="cu-dept" value={lecturerDept} disabled />
                <p className="text-xs text-muted-foreground">Students you create are automatically assigned to your department ({lecturerDept}).</p>
              </>
            ) : (
              <>
                <Select value={selectedDept} onValueChange={setSelectedDept}>
                  <SelectTrigger id="cu-dept"><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                    <SelectItem value="OTHER">Other (Specify manually)</SelectItem>
                  </SelectContent>
                </Select>
                {selectedDept === 'OTHER' && (
                  <Input
                    className="mt-1.5"
                    value={customDept}
                    onChange={(e) => setCustomDept(e.target.value)}
                    placeholder="Type department name..."
                    required
                  />
                )}
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cu-phone">Phone Number</Label>
            <Input id="cu-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 08031234567" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={loading}>Cancel</Button>
            <Button type="submit" pending={loading} className="gap-2">
              <UserPlus className="h-4 w-4" />
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
