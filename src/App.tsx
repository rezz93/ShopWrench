import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { JobsLedger } from './components/JobsLedger';
import { VinIntakeScanner } from './components/VinIntakeScanner';
import { JobWorkspace } from './components/JobWorkspace';
import { ObdLookupView } from './components/ObdLookupView';
import { CloudSyncModal } from './components/CloudSyncModal';
import {
  getStoredJobs,
  addPartToJob,
  updateJob,
  deleteJob,
  setupRealtimeSync,
} from './services/storage';
import { auth, onAuthStateChanged } from './services/firebase';
import { Job } from './types';
import { APP_VERSION } from './version';
import { Wrench, RotateCcw, Database, Cloud } from 'lucide-react';

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeTab, setActiveTab] = useState<'ledger' | 'intake' | 'workspace' | 'obd'>('ledger');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCloudSyncModalOpen, setIsCloudSyncModalOpen] = useState(false);

  // Initialize and listen to Auth state + Cloud Sync
  useEffect(() => {
    // 1. Initial local load
    setJobs(getStoredJobs());

    // 2. Local storage event listener
    const handleStorageUpdate = () => {
      setJobs(getStoredJobs());
    };
    window.addEventListener('autoshop_jobs_updated', handleStorageUpdate);

    // 3. Firebase Auth listener
    let unsubscribeSync: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (unsubscribeSync) {
        unsubscribeSync();
        unsubscribeSync = null;
      }

      if (user) {
        // Connected to Cloud: subscribe to real-time updates
        unsubscribeSync = setupRealtimeSync(user.uid, (cloudJobs) => {
          setJobs(cloudJobs);
        });
      } else {
        // Local mode
        setJobs(getStoredJobs());
      }
    });

    return () => {
      window.removeEventListener('autoshop_jobs_updated', handleStorageUpdate);
      unsubscribeAuth();
      if (unsubscribeSync) unsubscribeSync();
    };
  }, []);

  const refreshJobs = () => {
    setJobs(getStoredJobs());
  };

  const handleJobCreated = (newJob: Job) => {
    refreshJobs();
    setSelectedJobId(newJob.id);
    setActiveTab('workspace');
  };

  const handleSelectJob = (job: Job) => {
    setSelectedJobId(job.id);
    setActiveTab('workspace');
  };

  const handleBackToLedger = () => {
    setActiveTab('ledger');
    setSelectedJobId(null);
    refreshJobs();
  };

  const handleJobUpdated = (_updated: Job) => {
    refreshJobs();
  };

  const handleDeleteJob = (jobId: string) => {
    deleteJob(jobId);
    setSelectedJobId(null);
    setActiveTab('ledger');
    refreshJobs();
  };

  // Find currently selected job
  const selectedJob = selectedJobId ? jobs.find((j) => j.id === selectedJobId) || null : null;
  const activeJobsCount = jobs.filter((j) => j.status !== 'Completed').length;

  const handleAddPartFromObd = (partName: string) => {
    if (!selectedJob) return;
    addPartToJob(selectedJob.id, partName);
    refreshJobs();
  };

  const handleAttachDiagnosisFromObd = (diagnosisText: string) => {
    if (!selectedJob) return;
    const currentNotes = selectedJob.service_notes ? `${selectedJob.service_notes}\n\n` : '';
    const newNotes = `${currentNotes}${diagnosisText}`;
    updateJob(selectedJob.id, { service_notes: newNotes });
    refreshJobs();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 pb-24 md:pb-8">
      {/* Top Sticky Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'ledger') setSelectedJobId(null);
        }}
        activeJobsCount={activeJobsCount}
        currentUser={currentUser}
        onOpenCloudSync={() => setIsCloudSyncModalOpen(true)}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'intake' && (
          <VinIntakeScanner
            onJobCreated={handleJobCreated}
            onNavigateToLedger={() => {
              setActiveTab('ledger');
              setSelectedJobId(null);
            }}
          />
        )}

        {activeTab === 'ledger' && (
          <JobsLedger
            jobs={jobs}
            onSelectJob={handleSelectJob}
            onNavigateToIntake={() => setActiveTab('intake')}
            onRefreshJobs={refreshJobs}
          />
        )}

        {activeTab === 'obd' && (
          <ObdLookupView
            activeJob={selectedJob}
            onAddPartToJob={selectedJob ? handleAddPartFromObd : undefined}
            onAttachDiagnosisToJob={selectedJob ? handleAttachDiagnosisFromObd : undefined}
          />
        )}

        {activeTab === 'workspace' && selectedJob && (
          <JobWorkspace
            job={selectedJob}
            onBack={handleBackToLedger}
            onJobUpdated={handleJobUpdated}
            onDeleteJob={handleDeleteJob}
            onOpenObdLookup={() => setActiveTab('obd')}
          />
        )}

        {activeTab === 'workspace' && !selectedJob && (
          <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl max-w-md mx-auto space-y-4">
            <p className="text-slate-300 font-semibold">Job not found or was removed.</p>
            <button
              onClick={handleBackToLedger}
              className="min-h-[48px] px-6 rounded-xl bg-amber-500 text-slate-950 font-bold cursor-pointer"
            >
              Return to Ledger
            </button>
          </div>
        )}
      </main>

      {/* Footer info & Cloud Sync quick status */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-xs text-slate-500 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-amber-500" />
          <span>ShopWrench Tactile Tech Console</span>
          <span className="font-mono text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-slate-400">
            v{APP_VERSION}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsCloudSyncModalOpen(true)}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition cursor-pointer"
          >
            {currentUser ? (
              <>
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">
                  Cloud Synced ({currentUser.email || 'Google User'})
                </span>
              </>
            ) : (
              <>
                <Database className="w-3.5 h-3.5 text-amber-400" />
                <span>Local Only • Tap to Sync Phone &amp; PC</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              if (window.confirm('Reset all repair jobs to default shop demo data?')) {
                localStorage.removeItem('autoshop_jobs_v1');
                window.location.reload();
              }
            }}
            className="text-slate-500 hover:text-slate-300 underline flex items-center gap-1 transition cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </footer>

      {/* Persistent Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'ledger') setSelectedJobId(null);
        }}
        activeJobsCount={activeJobsCount}
      />

      {/* Cloud Sync Modal */}
      <CloudSyncModal
        isOpen={isCloudSyncModalOpen}
        onClose={() => setIsCloudSyncModalOpen(false)}
        currentUser={currentUser}
        onUserChanged={(user) => {
          setCurrentUser(user);
          refreshJobs();
        }}
        totalJobsCount={jobs.length}
      />
    </div>
  );
}
