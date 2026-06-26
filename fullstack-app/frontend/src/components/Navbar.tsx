import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path ? 'active' : ''

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">FPI - ASMS</Link>
      <div className="navbar-nav">
        {user?.role === 'lecturer' ? (
          <>
            <Link to="/assignments" className={`nav-link ${isActive('/assignments')}`}>
              My Assignments
            </Link>
            <Link to="/assignments/new" className={`nav-link ${isActive('/assignments/new')}`}>
              Create Assignment
            </Link>
          </>
        ) : (
          <>
            <Link to="/assignments" className={`nav-link ${isActive('/assignments')}`}>
              Assignments
            </Link>
            <Link to="/my-submissions" className={`nav-link ${isActive('/my-submissions')}`}>
              My Submissions
            </Link>
          </>
        )}
      </div>
      <div className="navbar-right">
        <span className="navbar-user">{user?.name} ({user?.role})</span>
        <button className="btn btn-secondary btn-sm" onClick={logout}>Logout</button>
      </div>
    </nav>
  )
}
