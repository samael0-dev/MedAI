import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  Stethoscope,
  Building2,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';

export const Login: React.FC = () => {
  const { login, register } = useAuth();
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('doctor');
  const [department, setDepartment] = useState('Radiology');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login({ email, password });
        showToast('Successfully authenticated. Welcome to MedAI.', 'success');
        navigate('/');
      } else {
        await register({
          email,
          password,
          full_name: fullName,
          role,
          department,
        });
        showToast('Clinician account created and verified.', 'success');
        navigate('/');
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        (mode === 'login' ? 'Failed to authenticate. Please check your credentials.' : 'Registration failed.');
      setErrorMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
      showToast(typeof msg === 'string' ? msg : 'Authentication error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden transition-colors">
      {/* Theme Toggle Button */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleTheme}
          type="button"
          aria-label="Toggle theme"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 shadow-md backdrop-blur-md transition-all text-xs font-medium cursor-pointer"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="h-4 w-4 text-amber-400" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="h-4 w-4 text-blue-400" />
              <span>Dark Mode</span>
            </>
          )}
        </button>
      </div>

      {/* Decorative ambient background */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-lg shadow-blue-500/25">
            <Stethoscope className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">MedAI</span>
        </div>
        <h2 className="text-center text-xl font-semibold tracking-tight text-slate-100">
          Clinical Diagnostics Portal
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          HIPAA Title II & HITECH Compliant Medical Workspace
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg relative z-10 px-4 sm:px-0">
        <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl py-8 px-6 shadow-2xl shadow-black/40 rounded-3xl border border-slate-200/50 dark:border-slate-800 sm:px-10 transition-colors">
          {/* Mode Switcher Tabs */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage('');
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Staff Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage('');
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Register Clinician
            </button>
          </div>

          {errorMessage && (
            <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Full Legal Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Dr. Jane Doe, MD"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 py-2.5 pl-10 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Role / Credential
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 py-2.5 px-3 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    >
                      <option value="doctor" className="bg-white dark:bg-slate-800">Physician</option>
                      <option value="radiologist" className="bg-white dark:bg-slate-800">Radiologist</option>
                      <option value="researcher" className="bg-white dark:bg-slate-800">Genomics Researcher</option>
                      <option value="nurse" className="bg-white dark:bg-slate-800">Nurse / Practitioner</option>
                      <option value="admin" className="bg-white dark:bg-slate-800">Administrator</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Department
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="e.g. Oncology"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 py-2.5 pl-8 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Institutional Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="clinician@hospital.org"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 py-2.5 pl-10 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 py-2.5 pl-10 pr-10 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 mt-2 cursor-pointer"
            >
              <span>{mode === 'login' ? 'Sign In to Workspace' : 'Complete Registration'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>Encrypted with SHA-256 JWT & Bcrypt Salts</span>
          </div>
        </div>
      </div>
    </div>
  );
};
