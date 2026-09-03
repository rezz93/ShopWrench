import React from 'react';
import { Car, Plus, Activity } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'ledger' | 'intake' | 'workspace' | 'obd';
  setActiveTab: (tab: 'ledger' | 'intake' | 'obd') => void;
  activeJobsCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  activeJobsCount,
}) => {
  return (
    <nav
      id="mobile-bottom-nav"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t-2 border-slate-800 px-2 py-2 pb-safe shadow-[0_-8px_20px_rgba(0,0,0,0.5)]"
    >
      <div className="grid grid-cols-3 gap-1.5 max-w-lg mx-auto">
        {/* Tab 1: Active Jobs Ledger */}
        <button
          id="mobile-nav-tab-ledger"
          onClick={() => setActiveTab('ledger')}
          className={`min-h-[52px] rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 font-bold text-xs sm:text-sm transition cursor-pointer ${
            activeTab === 'ledger' || activeTab === 'workspace'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 border border-slate-800 active:bg-slate-800'
          }`}
        >
          <div className="flex items-center gap-1">
            <Car className="w-4 h-4 sm:w-5 sm:h-5" />
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeTab === 'ledger' || activeTab === 'workspace'
                  ? 'bg-slate-950/20 text-slate-950'
                  : 'bg-slate-800 text-amber-400'
              }`}
            >
              {activeJobsCount}
            </span>
          </div>
          <span>Jobs</span>
        </button>

        {/* Tab 2: New Intake Scanner */}
        <button
          id="mobile-nav-tab-intake"
          onClick={() => setActiveTab('intake')}
          className={`min-h-[52px] rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 font-bold text-xs sm:text-sm transition cursor-pointer ${
            activeTab === 'intake'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 border border-slate-800 active:bg-slate-800'
          }`}
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
          <span>Intake</span>
        </button>

        {/* Tab 3: OBD-II Codes */}
        <button
          id="mobile-nav-tab-obd"
          onClick={() => setActiveTab('obd')}
          className={`min-h-[52px] rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 font-bold text-xs sm:text-sm transition cursor-pointer ${
            activeTab === 'obd'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 border border-slate-800 active:bg-slate-800'
          }`}
        >
          <Activity className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
          <span>OBD-II</span>
        </button>
      </div>
    </nav>
  );
};
