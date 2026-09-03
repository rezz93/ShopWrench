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
} from 'lucide-react';
import { loginWithGoogle, logoutUser } from '../services/firebase';
import { uploadLocalJobsToCloud } from '../services/storage';

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
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

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
        setErrorMsg(error.message || 'Failed to sign in. Please try again.');
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
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
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
                Real-time synchronization across all your shop devices
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
                <span>Disconnect</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                How to link your Phone and PC:
              </p>
              <p className="text-slate-300">
                1. Click <strong>Sign in with Google</strong> below on this device.
              </p>
              <p className="text-slate-300">
                2. Open your live app link on your phone/other PC and sign in with the same Google account.
              </p>
              <p className="text-slate-300">
                3. All VIN scans, work orders, and part checklists will sync in real time between both screens automatically!
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

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
              <span>{isLoading ? 'Signing In...' : 'Sign in with Google to Sync'}</span>
            </button>
          </div>
        )}

        <div className="pt-2 text-center">
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
