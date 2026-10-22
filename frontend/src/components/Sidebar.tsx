import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ScanLine,
  UploadCloud,
  Users,
  Settings,
  Pill,
  Calendar,
  Microscope,
  Activity,
  X,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const navItems = [
    { label: 'Dashboard', to: '/', icon: LayoutDashboard },
    { label: 'Scan Analysis', to: '/scan-results', icon: ScanLine },
    { label: 'Upload Scan', to: '/scan-upload', icon: UploadCloud },
    { label: 'Patients', to: '/patients', icon: Users },
    { label: 'Drug Checker', to: '/drug-checker', icon: Pill },
    { label: 'Scheduling', to: '/scheduling', icon: Calendar },
    { label: 'Research', to: '/research', icon: Microscope },
    { label: 'Admin Panel', to: '/admin', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs transition-transform duration-300 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-18 items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800">
          <NavLink to="/" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white shadow-md shadow-blue-500/20">
              <Activity className="h-6 w-6 stroke-[2.4]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Med</span>
                <span className="text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400">AI</span>
                <span className="rounded-full bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                  v2.4
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Clinical Intelligence</p>
            </div>
          </NavLink>

          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mb-3 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Clinical Modules
          </div>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `group flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`h-5 w-5 transition-transform duration-200 group-hover:scale-105 ${
                          isActive ? 'text-white' : 'text-slate-400 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                        }`}
                      />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer Badge / Compliance */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 p-3 shadow-2xs">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">HIPAA Compliant</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">256-bit TLS Encrypted</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
