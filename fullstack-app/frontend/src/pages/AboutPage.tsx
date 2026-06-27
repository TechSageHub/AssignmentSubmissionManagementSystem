import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Target, Eye, Award } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/fpi-logo.png" alt="FPI Logo" className="h-9 w-9 object-contain" />
            <span className="text-lg font-bold tracking-tight text-slate-900">
              FPI <span className="text-indigo-600">ASMS</span>
            </span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link to="/login">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500">Sign In</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="border-b bg-slate-50 py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Link>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">About the System</h1>
            <p className="mt-4 text-lg text-slate-600 leading-relaxed">
              The Federal Polytechnic Ilaro Assignment Submission System is a web-based platform designed to digitize and streamline the entire assignment lifecycle, from creation and submission to grading and feedback.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-16">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Target className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Purpose</h2>
              </div>
              <p className="text-slate-600 leading-relaxed">
                The system provides a centralized digital platform for students and lecturers at Federal Polytechnic Ilaro
                to manage the complete lifecycle of academic assignments. It replaces fragmented manual processes such as paper
                submissions, email chains, and messaging platforms with a secure, organized, and efficient digital workflow.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
                  <Eye className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Objectives</h2>
              </div>
              <ul className="space-y-4 text-slate-600">
                {[
                  'Provide a secure and standardized channel for assignment submission',
                  'Enable lecturers to create, manage, and grade assignments efficiently',
                  'Give students real-time access to grades and feedback',
                  'Automate deadline enforcement and late submission detection',
                  'Maintain organized records of all submissions and grades',
                  'Reduce administrative overhead and paperwork',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-50 text-xs font-bold text-green-600">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Award className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Benefits</h2>
              </div>
              <div className="grid gap-6 sm:grid-cols-3">
                {[
                  { title: 'For Students', items: ['Submit from anywhere', 'Track deadlines', 'View grades instantly'] },
                  { title: 'For Lecturers', items: ['Streamlined grading', 'Automated notifications', 'Organized records'] },
                  { title: 'For the Institution', items: ['Digital record keeping', 'Reduced paperwork', 'Standardized workflow'] },
                ].map((group) => (
                  <div key={group.title} className="rounded-xl border bg-white p-6">
                    <h3 className="font-semibold text-slate-900 mb-3">{group.title}</h3>
                    <ul className="space-y-2">
                      {group.items.map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-slate-900 py-8 text-sm text-slate-400">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p>&copy; {new Date().getFullYear()} Federal Polytechnic Ilaro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
