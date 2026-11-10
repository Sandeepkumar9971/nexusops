import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Menu, ChevronDown, LogOut, Settings, Sun, Moon } from 'lucide-react'
import { useAuth } from '../../app/providers/AuthProvider'
import { useTheme } from '../../app/providers/ThemeProvider'
import Breadcrumb from './Breadcrumb'
import GlobalSearch from './GlobalSearch'
import NotificationPanel from './NotificationPanel'

export default function Navbar({ onMenuClick }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const initial = (user?.name || user?.email || 'U').charAt(0).toUpperCase()

  const handleLogout = () => {
    setMenuOpen(false)
    logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-sm md:px-6 dark:border-white/10 dark:bg-[rgba(16,26,43,0.75)] dark:backdrop-blur-xl">
      <button className="text-slate-500 md:hidden dark:text-slate-400" onClick={onMenuClick} aria-label="Open menu">
        <Menu size={22} />
      </button>
      <div className="hidden min-w-0 flex-1 overflow-hidden md:block">
        <Breadcrumb />
      </div>

      <div className="flex shrink-0 items-center justify-end gap-3">
        <GlobalSearch />

        <button
          onClick={toggleTheme}
          className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100"
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <NotificationPanel />

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-sm font-semibold text-white shadow-sm shadow-blue-500/30 ring-2 ring-white dark:ring-navy-sidebar">
              {initial}
            </div>
            <ChevronDown size={16} className="text-slate-400 dark:text-slate-500" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-20 mt-2 w-56 animate-scale-in overflow-hidden rounded-xl border border-slate-200/80 bg-white py-1 shadow-soft-lg dark:border-white/10 dark:bg-[rgba(22,34,53,0.97)] dark:backdrop-blur-xl">
              <div className="border-b border-slate-100 px-3 py-2.5 dark:border-white/10">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{user?.name || 'Account'}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
              </div>
              <Link
                to="/settings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"
              >
                <Settings size={16} />
                Settings
              </Link>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                <LogOut size={16} />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
