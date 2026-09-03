import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  Cloud,
  CheckCircle2,
  Smartphone,
  Laptop,
  ArrowRight,
  LogOut,
  RefreshCw,
  X,
  AlertCircle,
  ShieldCheck,
  Mail,
  Lock,
  UserPlus,
  LogIn,
  Copy,
  Check,
  Info,
  Server,
} from 'lucide-react';
import {
  loginWithGoogle,
  loginWithEmail,
  registerWithEmail,
  logoutUser,
} from '../services/firebase';
import { uploadLocalJobsToCloud } from '../services/storage';
import { APP_VERSION_INFO } from '../version';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onUserChanged: (user: User | null) => void;
  totalJobsCount: number;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChanged,
  totalJobsCount,
}) => {
  const [authMode, setAuthMode] = useState<'google' | 'email-login' | 'email-signup'>('google');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const user = await loginWithGoogle();
      onUserChanged(user);
      setSyncStatus('Connecting and syncing with cloud...');
      await uploadLocalJobsToCloud(user.uid);
      setSyncStatus('Sync complete!');
      setTimeout(() => setSyncStatus(null), 3000);
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      console.error('Sign-in error:', error);
      if (error.code !== 'auth/popup-closed-by-user') {
        if (error.code === 'auth/unauthorized-domain') {
          setErrorMsg('Firebase Error (auth/unauthorized-domain): This app domain is not yet whitelisted in your Firebase Console. In Firebase Console > Authentication > Settings > Authorized Domains, add the current app hostname (e.g. *.run.app).');
        } else if (error.code === 'auth/operation-not-allowed') {
          setErrorMsg('Firebase Error (auth/operation-not-allowed): Google Sign-In is not enabled. In Firebase Console > Authentication > Sign-in method, click "Google" and enable it.');
        } else {
          setErrorMsg(error.message || 'Failed to sign in. Please try again.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      let user: User;
      if (authMode === 'email-signup') {
        user = await registerWithEmail(email, password);
      } else {
        user = await loginWithEmail(email, password);
      }

      onUserChanged(user);
      setSyncStatus('Connecting and syncing with cloud...');
      await uploadLocalJobsToCloud(user.uid);
      setSyncStatus('Sync complete!');
      setTimeout(() => setSyncStatus(null), 3000);
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      console.error('Email auth error:', error);
      if (error.code === 'auth/operation-not-allowed') {
        setErrorMsg('Firebase Error (auth/operation-not-allowed): Email/Password login is not enabled. In Firebase Console > Authentication > Sign-in method, enable "Email/Password".');
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setErrorMsg('Invalid email or password.');
      } else if (error.code === 'auth/email-already-in-use') {
        setErrorMsg('Account with this email already exists. Click "Log In" instead.');
      } else if (error.code === 'auth/weak-password') {
        setErrorMsg('Password should be at least 6 characters.');
      } else {
        setErrorMsg(error.message || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await logoutUser();
      onUserChanged(null);
      setSyncStatus(null);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setErrorMsg(error.message || 'Failed to sign out');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const count = await uploadLocalJobsToCloud(currentUser.uid);
      setSyncStatus(`Uploaded ${count} jobs to cloud!`);
      setTimeout(() => setSyncStatus(null), 3000);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setErrorMsg(error.message || 'Manual sync failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">
                Phone &amp; PC Cloud Sync
              </h2>
              <p className="text-xs text-slate-400">
                Real-time synchronization across your shop phone &amp; PC
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Mechanism Graphic */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
          <div className="flex flex-col items-center gap-1">
            <Smartphone className="w-6 h-6 text-amber-400" />
            <span className="font-semibold">Phone in Bay</span>
            <span className="text-[10px] text-slate-500">Scan VIN &amp; Parts</span>
          </div>
          <div className="flex flex-col items-center gap-1 text-slate-500">
            <div className="flex items-center gap-1">
              <ArrowRight className="w-4 h-4 text-emerald-400 animate-pulse" />
              <Cloud className="w-5 h-5 text-emerald-400" />
              <ArrowRight className="w-4 h-4 text-emerald-400 animate-pulse" />
            </div>
            <span className="text-[10px] text-emerald-400 font-bold">Instant Sync</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Laptop className="w-6 h-6 text-cyan-400" />
            <span className="font-semibold">Shop PC</span>
            <span className="text-[10px] text-slate-500">Service Desk View</span>
          </div>
        </div>

        {/* Current State & Action */}
        {currentUser ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-emerald-400">
                    Live Sync Active
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className="text-sm font-bold text-white truncate">
                  {currentUser.email || currentUser.displayName || 'Technician Account'}
                </p>
                <p className="text-xs text-slate-400">
                  {totalJobsCount} work order{totalJobsCount === 1 ? '' : 's'} linked in cloud
                </p>
              </div>
            </div>

            {syncStatus && (
              <p className="text-xs font-bold text-emerald-400 text-center animate-pulse">
                {syncStatus}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleManualSync}
                disabled={isLoading}
                className="flex-1 min-h-[44px] px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Force Resync</span>
              </button>

              <button
                onClick={handleSignOut}
                disabled={isLoading}
                className="min-h-[44px] px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                Log in on both your phone &amp; PC:
              </p>
              <p className="text-slate-300">
                Use the <strong>same account</strong> (Google or Email/Password) on both devices. All your VIN scans and jobs will stay synced in real time.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Option 1: 1-Click Google Sign-In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full min-h-[48px] px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-3 transition shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isLoading ? 'Signing In...' : 'Continue with Google'}</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-slate-900 px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Or Use Email &amp; Password
              </span>
              <div className="border-t border-slate-800 w-full" />
            </div>

            {/* Option 2: Email & Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-3">
              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setAuthMode('email-login')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    authMode !== 'email-signup'
                      ? 'bg-slate-800 text-amber-400 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('email-signup')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    authMode === 'email-signup'
                      ? 'bg-slate-800 text-amber-400 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Create New Account
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="technician@example.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[44px] px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer border border-slate-700 disabled:opacity-50"
              >
                {authMode === 'email-signup' ? (
                  <>
                    <UserPlus className="w-4 h-4 text-amber-400" />
                    <span>{isLoading ? 'Creating...' : 'Create Account & Start Sync'}</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 text-amber-400" />
                    <span>{isLoading ? 'Logging In...' : 'Log In & Start Sync'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Firebase Project Info & App Version Tracking */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                Firebase Project &amp; Version
              </span>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              v{APP_VERSION_INFO.version}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Firebase Project ID</span>
                <span className="font-mono text-slate-200 font-semibold text-[11px]">project-28aa91bf-2468-45a9-912</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard('project-28aa91bf-2468-45a9-912', 'proj')}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
              >
                {copiedKey === 'proj' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'proj' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">App Domain (for Auth Whitelist)</span>
                <span className="font-mono text-slate-200 font-semibold text-[11px]">ais-dev-tfper6psn5hqifvuhyslqd-116799203877.us-east1.run.app</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard('ais-dev-tfper6psn5hqifvuhyslqd-116799203877.us-east1.run.app', 'domain')}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
              >
                {copiedKey === 'domain' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'domain' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/50 text-[11px] text-slate-400 leading-relaxed">
            <p className="flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Finding your project:</strong> In Google Firebase Console (<em>console.firebase.google.com</em>), look for <strong>project-28aa91bf-2468-45a9-912</strong> (Project #966351303642).
              </span>
            </p>
          </div>
        </div>

        <div className="pt-1 text-center">
          <button
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-300 transition cursor-pointer"
          >
            Close &amp; continue in local mode
          </button>
        </div>
      </div>
    </div>
  );
};
