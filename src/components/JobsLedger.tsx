import React, { useState } from 'react';
import {
  Wrench,
  Search,
  Plus,
  Car,
  Package,
  Clock,
  User,
  ArrowRight,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ChevronRight,
  Filter,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';
import { deleteJob, updateJob, deleteCompletedJobs, deleteMultipleJobs } from '../services/storage';
import { Job, JobStatus } from '../types';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface JobsLedgerProps {
  jobs: Job[];
  onSelectJob: (job: Job) => void;
  onNavigateToIntake: () => void;
  onRefreshJobs: () => void;
}

export const JobsLedger: React.FC<JobsLedgerProps> = ({
  jobs,
  onSelectJob,
  onNavigateToIntake,
  onRefreshJobs,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Active' | 'In Progress' | 'Waiting on Parts' | 'Completed' | 'All'>('Active');
  const [copiedVinId, setCopiedVinId] = useState<string | null>(null);

  // Deletion modal state
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [isDeletingCompleted, setIsDeletingCompleted] = useState(false);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);

  // Multi-select state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);

  // Filter jobs
  const filteredJobs = jobs.filter((job) => {
    // Status filter
    if (statusFilter === 'Active' && job.status === 'Completed') return false;
    if (statusFilter === 'In Progress' && job.status !== 'In Progress') return false;
    if (statusFilter === 'Waiting on Parts' && job.status !== 'Waiting on Parts') return false;
    if (statusFilter === 'Completed' && job.status !== 'Completed') return false;

    // Search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const v = job.vehicle_details;
    const vehicleStr = `${v.year} ${v.make} ${v.model} ${v.engine} ${v.drivetrain}`.toLowerCase();
    const customerStr = job.customer_name.toLowerCase();
    const vinStr = job.vin.toLowerCase();
    const notesStr = (job.service_notes || '').toLowerCase();
    const partsStr = job.parts_list.map((p) => p.part_name.toLowerCase()).join(' ');

    return (
      vehicleStr.includes(q) ||
      customerStr.includes(q) ||
      vinStr.includes(q) ||
      notesStr.includes(q) ||
      partsStr.includes(q)
    );
  });

  const activeCount = jobs.filter((j) => j.status !== 'Completed').length;
  const waitingPartsCount = jobs.filter((j) => j.status === 'Waiting on Parts').length;
  const inProgressCount = jobs.filter((j) => j.status === 'In Progress').length;
  const completedCount = jobs.filter((j) => j.status === 'Completed').length;

  const handleCopyVin = (e: React.MouseEvent, vin: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(vin);
    setCopiedVinId(id);
    setTimeout(() => setCopiedVinId(null), 2000);
  };

  const handlePromptDelete = (e: React.MouseEvent, job: Job) => {
    e.stopPropagation();
    setJobToDelete(job);
  };

  const handleConfirmSingleDelete = () => {
    if (jobToDelete) {
      deleteJob(jobToDelete.id);
      setJobToDelete(null);
      setSelectedJobIds((prev) => prev.filter((id) => id !== jobToDelete.id));
      onRefreshJobs();
    }
  };

  const handleConfirmCompletedDelete = () => {
    deleteCompletedJobs();
    setIsDeletingCompleted(false);
    setSelectedJobIds((prev) => {
      const remainingIds = new Set(jobs.filter((j) => j.status !== 'Completed').map((j) => j.id));
      return prev.filter((id) => remainingIds.has(id));
    });
    onRefreshJobs();
  };

  const handleConfirmBatchDelete = () => {
    if (selectedJobIds.length > 0) {
      deleteMultipleJobs(selectedJobIds);
      setSelectedJobIds([]);
      setIsDeletingSelected(false);
      setSelectionMode(false);
      onRefreshJobs();
    }
  };

  const toggleJobSelection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedJobIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisible = () => {
    const visibleIds = filteredJobs.map((j) => j.id);
    const allSelected = visibleIds.every((id) => selectedJobIds.includes(id));
    if (allSelected) {
      setSelectedJobIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedJobIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleQuickStatusCycle = (e: React.MouseEvent, job: Job) => {
    e.stopPropagation();
    let next: JobStatus = 'In Progress';
    if (job.status === 'In Progress') next = 'Waiting on Parts';
    else if (job.status === 'Waiting on Parts') next = 'Completed';
    else next = 'In Progress';

    updateJob(job.id, { status: next });
    onRefreshJobs();
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header & Quick Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Active Jobs Ledger
                </h1>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {activeCount} Active
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-0.5">
                Work orders, vehicle diagnostic specs, and parts checklists
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Multi-select toggle button */}
            {jobs.length > 0 && (
              <button
                type="button"
                id="toggle-select-mode-btn"
                onClick={() => {
                  setSelectionMode(!selectionMode);
                  if (selectionMode) setSelectedJobIds([]);
                }}
                className={`min-h-[48px] px-3.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  selectionMode
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                <span>{selectionMode ? 'Cancel Selection' : 'Select Jobs'}</span>
              </button>
            )}

            {/* Clear Completed Jobs Button */}
            {completedCount > 0 && (
              <button
                type="button"
                id="clear-completed-jobs-btn"
                onClick={() => setIsDeletingCompleted(true)}
                className="min-h-[48px] px-3.5 rounded-xl bg-slate-950 hover:bg-rose-950/40 text-rose-300 border border-rose-900/50 hover:border-rose-700/80 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="Remove all completed repair jobs"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Remove Completed ({completedCount})</span>
              </button>
            )}

            <button
              id="ledger-new-intake-btn"
              onClick={onNavigateToIntake}
              className="min-h-[48px] px-5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 border border-amber-400 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              <span>New Intake Scanner</span>
            </button>
          </div>
        </div>

        {/* Batch Selection Action Bar */}
        {selectionMode && (
          <div className="mt-4 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 flex-wrap animate-fade-in">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSelectAllVisible}
                className="text-xs font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1.5 cursor-pointer"
              >
                <CheckSquare className="w-4 h-4" />
                <span>
                  {filteredJobs.every((j) => selectedJobIds.includes(j.id)) && filteredJobs.length > 0
                    ? 'Deselect All'
                    : 'Select All Visible'}
                </span>
              </button>
              <span className="text-xs text-slate-400 font-medium">
                {selectedJobIds.length} job{selectedJobIds.length === 1 ? '' : 's'} selected
              </span>
            </div>

            {selectedJobIds.length > 0 && (
              <button
                type="button"
                id="batch-delete-jobs-btn"
                onClick={() => setIsDeletingSelected(true)}
                className="min-h-[38px] px-4 rounded-lg bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Selected ({selectedJobIds.length})</span>
              </button>
            )}
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="mt-5 pt-5 border-t border-slate-800 flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <input
              id="jobs-search-input"
              type="text"
              placeholder="Search by customer, VIN, vehicle make/model, or part..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-h-[48px] pl-11 pr-4 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-200 px-2 py-1"
              >
                Clear
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {(
              [
                { key: 'Active', label: `Active (${activeCount})` },
                { key: 'In Progress', label: `In Progress (${inProgressCount})` },
                { key: 'Waiting on Parts', label: `Waiting Parts (${waitingPartsCount})` },
                { key: 'Completed', label: `Completed (${completedCount})` },
                { key: 'All', label: `All (${jobs.length})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                id={`filter-${tab.key.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => setStatusFilter(tab.key)}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                  statusFilter === tab.key
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Jobs Grid / List */}
      {filteredJobs.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 mx-auto">
            <Car className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">No repair jobs found</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              {searchQuery
                ? `No jobs match "${searchQuery}". Try clearing search filters.`
                : 'There are currently no repair jobs in this view.'}
            </p>
          </div>
          <button
            onClick={onNavigateToIntake}
            className="min-h-[48px] px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm inline-flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Intake First Vehicle</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.map((job) => {
            const v = job.vehicle_details;
            const neededParts = job.parts_list.filter((p) => p.status === 'Needed').length;
            const orderedParts = job.parts_list.filter((p) => p.status === 'Ordered').length;
            const arrivedParts = job.parts_list.filter((p) => p.status === 'Arrived').length;
            const isSelected = selectedJobIds.includes(job.id);

            return (
              <div
                key={job.id}
                id={`job-card-${job.id}`}
                onClick={() => {
                  if (selectionMode) {
                    toggleJobSelection({ stopPropagation: () => {} } as React.MouseEvent, job.id);
                  } else {
                    onSelectJob(job);
                  }
                }}
                className={`bg-slate-900 hover:bg-slate-850 border-2 rounded-2xl p-5 shadow-lg transition-all duration-150 cursor-pointer flex flex-col justify-between group relative ${
                  isSelected
                    ? 'border-amber-400 bg-slate-850 shadow-amber-500/10'
                    : 'border-slate-800 hover:border-amber-500/50'
                }`}
              >
                {/* Top Row: Customer & Status */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      {selectionMode && (
                        <button
                          type="button"
                          onClick={(e) => toggleJobSelection(e, job.id)}
                          className="mt-1 text-amber-400 hover:text-amber-300"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 fill-amber-400/20" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-500" />
                          )}
                        </button>
                      )}
                      <div className="min-w-0">
                        <span className="text-xs text-slate-400 font-medium block">Customer</span>
                        <h3 className="text-lg font-black text-white truncate tracking-tight group-hover:text-amber-300 transition">
                          {job.customer_name}
                        </h3>
                      </div>
                    </div>

                    {/* Quick Status Cycle Pill */}
                    <button
                      type="button"
                      onClick={(e) => handleQuickStatusCycle(e, job)}
                      title="Click to cycle status"
                      className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wider border flex items-center gap-1.5 shrink-0 transition ${
                        job.status === 'In Progress'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                          : job.status === 'Waiting on Parts'
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 hover:bg-sky-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          job.status === 'In Progress'
                            ? 'bg-amber-400 animate-pulse'
                            : job.status === 'Waiting on Parts'
                            ? 'bg-sky-400'
                            : 'bg-emerald-400'
                        }`}
                      />
                      <span>{job.status}</span>
                    </button>
                  </div>

                  {/* Vehicle Heading & Specs */}
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-200 font-bold text-base truncate">
                      <Car className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        {v.year} {v.make} {v.model}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-medium truncate">
                      <span>{v.engine}</span>
                      <span>•</span>
                      <span>{v.drivetrain}</span>
                    </div>
                  </div>

                  {/* VIN Badge with Quick Copy */}
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-950/40 rounded-lg border border-slate-800/80 text-xs">
                    <div className="font-mono text-slate-400 truncate mr-2">
                      VIN: <span className="text-slate-300 font-semibold">{job.vin}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleCopyVin(e, job.vin, job.id)}
                      className="text-slate-400 hover:text-amber-300 flex items-center gap-1 text-[11px] font-bold"
                      title="Copy VIN"
                    >
                      {copiedVinId === job.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Diagnostic Notes snippet if present */}
                  {job.service_notes && (
                    <p className="text-xs text-slate-400 line-clamp-2 italic bg-slate-950/30 p-2 rounded border border-slate-800/50">
                      &quot;{job.service_notes}&quot;
                    </p>
                  )}
                </div>

                {/* Bottom Row: Parts Summary & Open Workspace CTA */}
                <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                      <Package className="w-4 h-4 text-amber-400" />
                      <span>{job.parts_list.length} Parts</span>
                    </div>

                    <div className="flex items-center gap-1.5 font-bold">
                      {neededParts > 0 && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {neededParts} Needed
                        </span>
                      )}
                      {orderedParts > 0 && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          {orderedParts} Ordered
                        </span>
                      )}
                      {arrivedParts > 0 && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {arrivedParts} Arrived
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Oversized Open Workspace Button */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      id={`open-workspace-btn-${job.id}`}
                      onClick={() => onSelectJob(job)}
                      className="flex-1 min-h-[48px] px-4 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 active:bg-amber-600 text-white font-bold text-sm border border-slate-700 hover:border-amber-400 flex items-center justify-center gap-2 transition"
                    >
                      <span>Open Workspace</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      id={`delete-job-btn-${job.id}`}
                      onClick={(e) => handlePromptDelete(e, job)}
                      className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-950 hover:bg-rose-950/80 active:bg-rose-900 text-slate-500 hover:text-rose-400 border border-slate-800 hover:border-rose-800 transition cursor-pointer"
                      title={`Delete job for ${job.customer_name}`}
                      aria-label={`Delete job for ${job.customer_name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Single Job Deletion */}
      <DeleteConfirmModal
        isOpen={!!jobToDelete}
        onClose={() => setJobToDelete(null)}
        onConfirm={handleConfirmSingleDelete}
        title="Delete Repair Job?"
        itemName={
          jobToDelete
            ? `${jobToDelete.vehicle_details.year} ${jobToDelete.vehicle_details.make} ${jobToDelete.vehicle_details.model}`
            : undefined
        }
        itemSubtext={
          jobToDelete
            ? `Customer: ${jobToDelete.customer_name} • VIN: ${jobToDelete.vin}`
            : undefined
        }
        confirmButtonText="Delete Repair Job"
      />

      {/* Confirmation Modal for Clearing Completed Jobs */}
      <DeleteConfirmModal
        isOpen={isDeletingCompleted}
        onClose={() => setIsDeletingCompleted(false)}
        onConfirm={handleConfirmCompletedDelete}
        title="Remove All Completed Jobs?"
        itemName={`Remove ${completedCount} completed repair jobs`}
        itemSubtext="All vehicles marked as Completed will be permanently deleted from the active ledger."
        confirmButtonText={`Remove ${completedCount} Completed Jobs`}
      />

      {/* Confirmation Modal for Batch Deleting Selected Jobs */}
      <DeleteConfirmModal
        isOpen={isDeletingSelected}
        onClose={() => setIsDeletingSelected(false)}
        onConfirm={handleConfirmBatchDelete}
        title="Remove Selected Jobs?"
        itemName={`Remove ${selectedJobIds.length} selected repair jobs`}
        itemSubtext="The selected jobs will be permanently deleted from your shop ledger."
        confirmButtonText={`Delete ${selectedJobIds.length} Jobs`}
      />
    </div>
  );
};

