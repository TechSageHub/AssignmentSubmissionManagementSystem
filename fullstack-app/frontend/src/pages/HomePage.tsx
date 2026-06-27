import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { GraduationCap, ClipboardList, CheckCircle2, TrendingUp, ArrowRight, Users, Clock } from 'lucide-react'

const features = [
  { icon: ClipboardList, title: 'Submit Online', description: 'Upload assignments digitally from anywhere with an internet connection.' },
  { icon: CheckCircle2, title: 'Instant Feedback', description: 'Receive grades and feedback from lecturers as soon as they are released.' },
  { icon: TrendingUp, title: 'Track Progress', description: 'Monitor your submission status, deadlines, and academic performance.' },
  { icon: Clock, title: 'Deadline Alerts', description: 'Get notified about upcoming deadlines and late submissions automatically.' },
]

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/fpi-logo.png" alt="FPI Logo" className="h-9 w-9 object-contain" />
            <span className="text-lg font-bold tracking-tight text-slate-900">
              FPI <span className="text-indigo-600">ASMS</span>
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link to="/about" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">About</Link>
            <Link to="/contact" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Contact</Link>
            <Link to="/login">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-sm shadow-sm">Sign In</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 flex items-center justify-center gap-3">
              <img src="/fpi-logo.png" alt="FPI Logo" className="h-16 w-16 rounded-2xl bg-white/10 p-2 backdrop-blur" />
              <div className="text-left">
                <p className="text-sm font-medium text-indigo-200">Federal Polytechnic Ilaro</p>
                <p className="text-2xl font-bold text-white">Assignment Submission System</p>
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Streamline Your Academic{' '}
              <span className="text-indigo-400">Workflow</span>
            </h1>
            <p className="mt-6 text-lg text-indigo-200/80 leading-relaxed">
              A centralized platform for students and lecturers at Federal Polytechnic Ilaro to create, submit, grade, and manage academic assignments efficiently.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link to="/login">
                <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-base shadow-lg shadow-indigo-500/25 h-12 px-8">
                  Sign In
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/about">
                <Button size="lg" variant="outline" className="border-indigo-400/30 bg-transparent text-white hover:bg-white/10 h-12 px-8 text-base">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Everything You Need</h2>
            <p className="mt-3 text-lg text-slate-500">A complete assignment management solution for modern education.</p>
          </div>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div key={feature.title} className="group rounded-xl border bg-white p-6 transition-all duration-200 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 mb-4 group-hover:bg-indigo-100 transition-colors">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Designed for Everyone</h2>
            <p className="mt-3 text-lg text-slate-500">Tailored experiences for students and lecturers.</p>
          </div>
          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            <div className="rounded-xl border bg-white p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">For Students</h3>
              </div>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                  Browse and submit assignments with file uploads
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                  Track submission status and deadlines
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                  View grades and detailed feedback
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                  Receive deadline reminders and notifications
                </li>
              </ul>
            </div>
            <div className="rounded-xl border bg-white p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">For Lecturers</h3>
              </div>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                  Create and manage assignments with rubrics
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                  View and download student submissions
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                  Grade with structured feedback and rubrics
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                  View analytics and generate reports
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-600 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-white">Ready to Get Started?</h2>
          <p className="mt-4 text-lg text-indigo-100">Sign in to the Federal Polytechnic Ilaro Assignment Submission System. Accounts are provided by your department administrator.</p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link to="/login">
              <Button size="lg" className="bg-white text-indigo-600 hover:bg-indigo-50 h-12 px-8 text-base shadow-lg">
                Sign In
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-slate-900 py-12 text-sm text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <img src="/fpi-logo.png" alt="FPI Logo" className="h-8 w-8 object-contain" />
              <span className="text-sm font-semibold text-white">Federal Polytechnic Ilaro</span>
            </div>
            <div className="flex gap-6">
              <Link to="/about" className="hover:text-white transition-colors">About</Link>
              <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
              <Link to="/login" className="hover:text-white transition-colors">Login</Link>
            </div>
            <p>&copy; {new Date().getFullYear()} Federal Polytechnic Ilaro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
