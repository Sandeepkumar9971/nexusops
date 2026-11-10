import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, History, FileText, Settings, X, Boxes, ChevronsLeft, ChevronsRight, Bell } from 'lucide-react'
import { moduleRegistry, MODULE_STATUS } from '../../config/moduleRegistry'
import Logo from '../common/Logo'

const platformNav = [{ label: 'Overview', to: '/', icon: LayoutDashboard, end: true }]

const bottomNav = [
  { label: 'Notifications', to: '/notifications', icon: Bell },
  { label: 'Processing History', to: '/history', icon: History },
  { label: 'Reports', to: '/reports', icon: FileText },
  { label: 'Settings', to: '/settings', icon: Settings },
]

function NavItem({ to, icon: Icon, label, end, onClick, collapsed }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
          collapsed ? 'justify-center' : ''
        } ${
          isActive
            ? 'bg-indigo-50 text-indigo-700 dark:bg-blue-500/10 dark:text-blue-400'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`absolute left-0 h-5 w-1 rounded-r-full bg-indigo-600 transition-opacity duration-150 dark:bg-blue-500 ${
              isActive ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <Icon
            size={18}
            className={
              isActive
                ? 'text-indigo-600 dark:text-blue-400'
                : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'
            }
          />
          {!collapsed && <span>{label}</span>}
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar({ isOpen, onClose }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-[1px] md:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed z-40 flex h-full flex-col border-r border-slate-200/80 bg-white transition-[width,transform] duration-200 md:static md:translate-x-0 dark:border-white/10 dark:bg-[rgba(16,26,43,0.85)] dark:backdrop-blur-xl dark:shadow-glass ${
          collapsed ? 'w-[76px]' : 'w-64'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className={`flex items-center gap-2.5 px-4 py-5 ${collapsed ? 'justify-center px-2' : 'justify-between'}`}>
          <div className={`flex items-center gap-2.5 overflow-hidden ${collapsed ? 'justify-center' : ''}`}>
            <Logo size="sm" />
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-base font-semibold leading-tight tracking-tight text-slate-900 dark:text-slate-50">
                  NexusOps
                </p>
                <p className="truncate text-[10.5px] font-medium leading-tight text-slate-400 dark:text-slate-500">
                  Operations Intelligence Platform
                </p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button className="shrink-0 text-slate-500 md:hidden" onClick={onClose} aria-label="Close menu">
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 pb-4">
          {platformNav.map((item) => (
            <NavItem key={item.to} {...item} onClick={onClose} collapsed={collapsed} />
          ))}

          {!collapsed && (
            <div className="mb-2 mt-6 flex items-center gap-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <Boxes size={13} />
              AI Modules
            </div>
          )}
          {collapsed && <div className="my-3 border-t border-slate-200 dark:border-white/10" />}
          {moduleRegistry.map((mod) => {
            if (mod.status === MODULE_STATUS.COMING_SOON) {
              return (
                <div
                  key={mod.id}
                  title={collapsed ? `${mod.name} — Coming soon` : 'Coming soon'}
                  className={`flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 dark:text-slate-600 ${
                    collapsed ? 'justify-center' : 'justify-between'
                  }`}
                >
                  <span className={`flex items-center gap-3 ${collapsed ? '' : ''}`}>
                    <mod.icon size={18} className="text-slate-300 dark:text-slate-700" />
                    {!collapsed && mod.name}
                  </span>
                  {!collapsed && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-white/5 dark:text-slate-500">
                      Soon
                    </span>
                  )}
                </div>
              )
            }
            return (
              <NavItem key={mod.id} to={mod.route} icon={mod.icon} label={mod.name} onClick={onClose} collapsed={collapsed} />
            )
          })}

          <div className="mt-6 space-y-1 border-t border-slate-100 pt-3 dark:border-white/10">
            {bottomNav.map((item) => (
              <NavItem key={item.to} {...item} onClick={onClose} collapsed={collapsed} />
            ))}
          </div>
        </nav>

        <div className="hidden border-t border-slate-100 p-3 md:block dark:border-white/10">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-slate-300 ${
              collapsed ? 'justify-center' : ''
            }`}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
