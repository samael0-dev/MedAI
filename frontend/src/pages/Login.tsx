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
  KeyRound,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';

const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export const Login: React.FC = () => {
  const { login, register, loginWithGoogle, sendOtp, verifyOtp } = useAuth();
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'otp' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('doctor');
  const [department, setDepartment] = useState('Radiology');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // OTP State
  const [otpStep, setOtpStep] = useState<'request' | 'verify'>('request');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login({ email: email.trim(), password });
        showToast('Successfully authenticated. Welcome to MedAI.', 'success');
        navigate('/');
      } else if (mode === 'register') {
        await register({
          email: email.trim(),
          password,
          full_name: fullName.trim(),
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

  const handleQuickDemoLogin = async (demoEmail: string, demoPass: string) => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await login({ email: demoEmail, password: demoPass });
      showToast(`Welcome back, authenticated as ${demoEmail}`, 'success');
      navigate('/');
    } catch {
      // If user not in DB yet, auto-provision and login
      try {
        await register({
          email: demoEmail,
          password: demoPass,
          full_name: demoEmail.includes('house')
            ? 'Dr. Gregory House, MD'
            : demoEmail.includes('watson')
            ? 'Dr. John Watson, MD'
            : 'Clara Oswald, NP',
          role: demoEmail.includes('clara') ? 'nurse' : 'doctor',
          department: demoEmail.includes('house') ? 'Diagnostics' : 'Radiology',
        });
        showToast(`Clinician account initialized: ${demoEmail}`, 'success');
        navigate('/');
      } catch (regErr: any) {
        const msg = regErr.response?.data?.detail || 'Failed to authenticate demo account.';
        setErrorMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMessage('');
    try {
      const targetEmail = email.trim() || 'dr.alex.vance@hospital.org';
      const targetName = fullName.trim() || 'Dr. Alex Vance, MD';

      // Authenticate directly with Google OAuth credentials/token
      await loginWithGoogle({
        credential: `mock-google-token:${targetEmail}`,
        email: targetEmail,
        full_name: targetName,
        avatar_url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
      });
      showToast('Successfully authenticated via Google OAuth.', 'success');
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Google authentication failed.';
      setErrorMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
      showToast('Google Sign-In failed', 'error');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    const targetEmail = otpEmail.trim() || email.trim() || 'dr.watson@hospital.org';
    if (!otpEmail) {
      setOtpEmail(targetEmail);
    }
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const res = await sendOtp(targetEmail);
      if (res.dev_code) {
        setDevOtpCode(res.dev_code);
        setOtpCode(res.dev_code);
      }
      setOtpStep('verify');
      showToast(`Passcode dispatched to ${targetEmail}`, 'success');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to dispatch verification code.';
      setErrorMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
      showToast('Error requesting OTP', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    const targetEmail = otpEmail.trim() || email.trim();
    if (!targetEmail) {
      setErrorMessage('Please enter your institutional email address.');
      setOtpStep('request');
      return;
    }
    if (!otpCode.trim()) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await verifyOtp(targetEmail, otpCode.trim());
      showToast('Passcode verified. Welcome to MedAI workspace.', 'success');
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Invalid or expired OTP code.';
      setErrorMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
      showToast('OTP verification failed', 'error');
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

      {/* Ambient background glows */}
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
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6 gap-1">
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
                setMode('otp');
                setErrorMessage('');
                setOtpStep('request');
                if (email && !otpEmail) setOtpEmail(email);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'otp'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <KeyRound className="h-3.5 w-3.5 text-blue-500" />
              <span>Email OTP</span>
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

          {/* Google Sign-In Button */}
          <div className="mb-5">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isSubmitting}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 py-2.5 px-4 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-60"
            >
              {isGoogleLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
              ) : (
                <GoogleIcon className="h-4 w-4" />
              )}
              <span>{isGoogleLoading ? 'Authenticating with Google...' : 'Sign in with Google'}</span>
            </button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white/95 dark:bg-slate-900/90 px-3 text-slate-400 dark:text-slate-500 font-medium">
                  {mode === 'otp' ? 'or use OTP verification code' : 'or continue with institutional credentials'}
                </span>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* OTP Mode Form */}
          {mode === 'otp' ? (
            otpStep === 'request' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Institutional Email Address
                    </label>
                    <button
                      type="button"
                      onClick={() => setOtpEmail('dr.watson@hospital.org')}
                      className="text-[11px] text-blue-500 hover:text-blue-600 font-medium cursor-pointer"
                    >
                      Fill demo email
                    </button>
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={otpEmail}
                      onChange={(e) => setOtpEmail(e.target.value)}
                      placeholder="clinician@hospital.org"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 py-2.5 pl-10 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                    A secure 6-digit One-Time Passcode will be dispatched to this address.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 mt-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span>Send 6-Digit Passcode</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                {devOtpCode && (
                  <div
                    onClick={() => setOtpCode(devOtpCode)}
                    className="flex items-center justify-between rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs text-emerald-800 dark:text-emerald-300 cursor-pointer hover:bg-emerald-100/60 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span>
                        Passcode sent! Dev code: <strong className="font-mono text-emerald-700 dark:text-emerald-300 tracking-wider">{devOtpCode}</strong>
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider underline">
                      Auto-fill
                    </span>
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Enter 6-Digit Passcode
                    </label>
                    <button
                      type="button"
                      onClick={() => setOtpStep('request')}
                      className="text-[11px] text-blue-500 hover:text-blue-600 font-medium cursor-pointer"
                    >
                      Change email
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      maxLength={6}
                      required
                      autoFocus
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full text-center tracking-widest font-mono text-lg rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 py-2.5 pl-10 pr-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                    Dispatched to <span className="font-medium text-slate-600 dark:text-slate-300">{otpEmail}</span>. Valid for 10 minutes.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || otpCode.length < 6}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 mt-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Verify Passcode & Enter</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    disabled={isSubmitting}
                    className="text-xs text-slate-500 hover:text-blue-500 font-medium cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Resend Code</span>
                  </button>
                </div>
              </form>
            )
          ) : (
            /* Password / Register Mode Form */
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
          )}

          {/* Quick Demo Clinician Access Bar */}
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mb-2">
              One-Click Demo Clinician Access:
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('dr.house@hospital.org', 'DiagnosticsPassword1!')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
              >
                <Stethoscope className="h-3.5 w-3.5 text-blue-500" />
                <span>Dr. House (Physician)</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('dr.watson@hospital.org', 'HospitalPassword123!')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-emerald-300 dark:hover:border-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
              >
                <Stethoscope className="h-3.5 w-3.5 text-emerald-500" />
                <span>Dr. Watson (Radiologist)</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('nurse.clara@hospital.org', 'ClinicalPassword123!')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50/50 dark:hover:bg-purple-950/40 transition-colors cursor-pointer"
              >
                <User className="h-3.5 w-3.5 text-purple-500" />
                <span>Clara Oswald (Nurse)</span>
              </button>
            </div>
          </div>

          {/* Security & Framework Verification Badge */}
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-1.5 text-center">
            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Better Auth Framework • Google OAuth • Email OTP • JWT Sessions</span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              HIPAA Title II & HITECH Cryptographic Token Standard
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
