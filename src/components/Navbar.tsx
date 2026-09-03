import React from 'react';
import { User } from 'firebase/auth';
import { Wrench, Car, Plus, Cloud, Activity } from 'lucide-react';

interface NavbarProps {
  activeTab: 'ledger' | 'intake' | 'workspace' | 'obd';
  setActiveTab: (tab: 'ledger' | 'intake' | 'obd') => void;
  activeJobsCount: number;
  currentUser: User | null;
  onOpenCloudSync: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  activeJobsCount,
  currentUser,
  onOpenCloudSync,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Identity */}
        <div
          onClick={() => setActiveTab('ledger')}
          className="flex items-center gap-3 cursor-pointer select-none group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 group-hover:scale-105 transition">
            <Wrench className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg text-white tracking-tight">ShopWrench</span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                PRO
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block font-medium">Auto Tech Job &amp; VIN Tracker</span>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <div className="hidden md:flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
          <button
            id="nav-tab-ledger"
            onClick={() => setActiveTab('ledger')}
            className={`min-h-[44px] px-4.5 rounded-xl text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'ledger' || activeTab === 'workspace'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>Active Jobs Ledger</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'ledger' || activeTab === 'workspace'
                  ? 'bg-slate-950/20 text-slate-950'
                  : 'bg-slate-800 text-amber-400'
              }`}
            >
              {activeJobsCount}
            </span>
          </button>

          <button
            id="nav-tab-intake"
            onClick={() => setActiveTab('intake')}
            className={`min-h-[44px] px-4.5 rounded-xl text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'intake'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Intake Scanner</span>
          </button>

          <button
            id="nav-tab-obd"
            onClick={() => setActiveTab('obd')}
            className={`min-h-[44px] px-4.5 rounded-xl text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'obd'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Activity className="w-4 h-4 stroke-[2.5]" />
            <span>OBD-II Codes</span>
          </button>
        </div>

        {/* System Status & Cloud Sync Button */}
        <div className="flex items-center gap-2">
          <button
            id="btn-cloud-sync"
            onClick={onOpenCloudSync}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
              currentUser
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
            }`}
            title="Configure Phone & PC Sync"
          >
            <Cloud className={`w-4 h-4 ${currentUser ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className="hidden sm:inline">
              {currentUser ? 'Cloud Synced' : 'Sync Phone & PC'}
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                currentUser ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
          </button>
        </div>
      </div>
    </header>
  );
};
