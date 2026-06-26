import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MapPin, Mail, Phone, Clock } from 'lucide-react'

const contactInfo = [
  { icon: MapPin, label: 'Address', value: 'PMB 50, Ilaro, Ogun State, Nigeria' },
  { icon: Mail, label: 'Email', value: 'info@federalpolyilaro.edu.ng' },
  { icon: Phone, label: 'Phone', value: '+234-803-000-0000' },
  { icon: Clock, label: 'Support Hours', value: 'Monday - Friday, 8:00 AM - 4:00 PM (WAT)' },
]

export default function ContactPage() {
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
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500">Get Started</Button>
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
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">Contact Us</h1>
            <p className="mt-4 text-lg text-slate-600 leading-relaxed">
              Have questions or need help? Get in touch with the support team.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 sm:grid-cols-2">
              {contactInfo.map((item) => (
                <div key={item.label} className="flex items-start gap-4 rounded-xl border bg-white p-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{item.label}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 rounded-xl border bg-slate-50 p-8 text-center">
              <h2 className="text-xl font-semibold text-slate-900">Need Technical Support?</h2>
              <p className="mt-2 text-sm text-slate-500">
                If you're experiencing issues with the Assignment Submission System, please contact the ICT department or send an email to the support desk.
              </p>
              <div className="mt-6 flex items-center justify-center gap-4">
                <Link to="mailto:info@federalpolyilaro.edu.ng">
                  <Button className="bg-indigo-600 hover:bg-indigo-500">
                    <Mail className="mr-2 h-4 w-4" />
                    Send Email
                  </Button>
                </Link>
                <Link to="/">
                  <Button variant="outline">Back to Home</Button>
                </Link>
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
