import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  Menu,
  CheckCircle2,
  AlertTriangle,
  User,
  Shield,
  LogOut,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const getInitials = (name?: string) => {
    if (!name) return 'MD';
    const parts = name.replace(/^Dr\.\s*/i, '').trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  };

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notifications = [
    {
      id: 1,
      title: 'Critical finding flagged',
      description: 'Patient James Kowalski CT scan reveals 14mm solitary nodule',
      time: '12m ago',
      type: 'critical',
    },
    {
      id: 2,
      title: 'AI inference complete',
      description: 'Eleanor Vance chest X-ray confidence 94.2% (Pneumonia)',
      time: '45m ago',
      type: 'info',
    },
    {
      id: 3,
      title: 'Drug interaction warning',
      description: 'Warfarin + Aspirin co-prescription flagged for review',
      time: '2h ago',
      type: 'warning',
    },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/scan-results?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-18 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md sm:px-6">
      {/* Left: Mobile Toggle & Global Search */}
      <div className="flex flex-1 items-center gap-3 md:gap-4">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search scans, MRN, patients, or biomarkers..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-10 pr-12 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-3 focus:ring-blue-500/10"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 shadow-2xs hidden sm:inline-block">
            ↵ Enter
          </kbd>
        </form>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* AI System Status */}
        <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 text-xs font-medium text-emerald-800 md:flex">
          <Sparkles className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
          <span>AI Engine: Active</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
        </div>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            aria-label="View notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs">
              3
            </span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl z-50">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-slate-900 text-sm">Clinical Alerts</h4>
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                    3 New
                  </span>
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  Mark all read
                </button>
              </div>

              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto mt-2">
                {notifications.map((item) => (
                  <div key={item.id} className="py-3 hover:bg-slate-50/80 px-2 rounded-xl transition-colors">
                    <div className="flex items-start gap-2.5">
                      {item.type === 'critical' ? (
                        <div className="h-2 w-2 mt-1.5 rounded-full bg-rose-500 shrink-0"></div>
                      ) : item.type === 'warning' ? (
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-slate-800">{item.title}</p>
                          <span className="text-[10px] text-slate-400">{item.time}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-100 text-center">
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    navigate('/scan-results');
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  View All Scan Results →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown or Sign In */}
        {user ? (
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-1.5 sm:px-3 hover:bg-slate-100 transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-semibold text-xs shadow-2xs">
                {getInitials(user.full_name)}
              </div>
              <div className="hidden text-left sm:block">
                <div className="text-xs font-semibold text-slate-900 leading-tight">{user.full_name}</div>
                <div className="text-[10px] font-medium text-slate-500 capitalize">{user.department || user.role}</div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <p className="text-xs font-semibold text-slate-900">{user.full_name}</p>
                  <p className="text-[11px] text-slate-500">{user.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 capitalize">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate('/admin');
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  Staff Profile
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate('/admin');
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  <Shield className="h-4 w-4 text-slate-400" />
                  Security & Audit Logs
                </button>
                <div className="my-1 border-t border-slate-100"></div>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                    navigate('/login');
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="h-4 w-4 text-rose-500" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            <User className="h-3.5 w-3.5" />
            <span>Staff Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
