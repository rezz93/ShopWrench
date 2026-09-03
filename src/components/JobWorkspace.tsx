import React, { useState } from 'react';
import {
  ArrowLeft,
  Wrench,
  Car,
  Gauge,
  Copy,
  Check,
  ExternalLink,
  Plus,
  Trash2,
  Clock,
  User,
  CheckCircle2,
  Package,
  Sparkles,
  ShoppingBag,
  Share2,
  Store,
  Activity,
  Search,
} from 'lucide-react';
import {
  addPartToJob,
  cyclePartStatus,
  deletePartFromJob,
  updateJob,
  updatePartStatus,
  deleteJob,
} from '../services/storage';
import { Job, JobStatus, PartItem, PartStatus } from '../types';
import { PartsSupplierModal } from './PartsSupplierModal';
import { AUTO_PARTS_STORES, formatPartSearchQuery } from '../services/partsStores';
import { VoiceInputButton } from './VoiceInputButton';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface JobWorkspaceProps {
  job: Job;
  onBack: () => void;
  onJobUpdated: (updated: Job) => void;
  onDeleteJob?: (jobId: string) => void;
  onOpenObdLookup?: (job: Job) => void;
}

const COMMON_PARTS_SUGGESTIONS = [
  'Front Brake Pads',
  'Front Brake Rotors',
  'Rear Brake Pads',
  'Engine Oil Filter',
  'Cabin Air Filter',
  'Spark Plug Set',
  'Serpentine Belt',
  'O2 Sensor (Upstream)',
  'Alternator',
  'Starter Motor',
  'Battery',
  'Thermostat & Gasket',
];

export const JobWorkspace: React.FC<JobWorkspaceProps> = ({
  job,
  onBack,
  onJobUpdated,
  onDeleteJob,
  onOpenObdLookup,
}) => {
  const [partInput, setPartInput] = useState('');
  const [notesInput, setNotesInput] = useState(job.service_notes || '');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [copiedVin, setCopiedVin] = useState(false);
  const [copiedSearchPrompt, setCopiedSearchPrompt] = useState<string | null>(null);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [selectedPartForSupplierModal, setSelectedPartForSupplierModal] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const vehicle = job.vehicle_details;

  const handleConfirmDeleteJob = () => {
    deleteJob(job.id);
    if (onDeleteJob) {
      onDeleteJob(job.id);
    } else {
      onBack();
    }
  };

  // Handle adding a new part
  const handleAddPart = (e?: React.FormEvent, customName?: string) => {
    if (e) e.preventDefault();
    const nameToAdd = (customName || partInput).trim();
    if (!nameToAdd) return;

    addPartToJob(job.id, nameToAdd);
    const updated = {
      ...job,
      parts_list: [
        ...job.parts_list,
        {
          id: `part-${Date.now()}`,
          part_name: nameToAdd,
          status: 'Needed' as PartStatus,
          addedAt: new Date().toISOString(),
        },
      ],
    };
    onJobUpdated(updated);
    setPartInput('');
  };

  // Handle cycling status of a part
  const handleCyclePartStatus = (part: PartItem) => {
    const next = cyclePartStatus(part.status);
    updatePartStatus(job.id, part.id, next);
    const updatedParts = job.parts_list.map((p) =>
      p.id === part.id ? { ...p, status: next } : p
    );
    onJobUpdated({ ...job, parts_list: updatedParts });
  };

  // Handle deleting a part
  const handleDeletePart = (partId: string) => {
    deletePartFromJob(job.id, partId);
    const updatedParts = job.parts_list.filter((p) => p.id !== partId);
    onJobUpdated({ ...job, parts_list: updatedParts });
  };

  // Handle changing job overall status
  const handleChangeJobStatus = (newStatus: JobStatus) => {
    updateJob(job.id, { status: newStatus });
    onJobUpdated({ ...job, status: newStatus });
    setStatusMenuOpen(false);
  };

  // Handle saving service notes
  const handleSaveNotes = () => {
    updateJob(job.id, { service_notes: notesInput });
    onJobUpdated({ ...job, service_notes: notesInput });
    setIsEditingNotes(false);
  };

  // Copy VIN to clipboard
  const handleCopyVin = () => {
    navigator.clipboard.writeText(job.vin);
    setCopiedVin(true);
    setTimeout(() => setCopiedVin(false), 2000);
  };

  // MILESTONE 5: Smart Punch-Out Sourcing Link
  // Grabs active vehicle attributes (Year Make Model Engine) + specific part name,
  // normalizes query using formatPartSearchQuery,
  // copies search query to clipboard with instant visual feedback,
  // and opens target sourcing catalog (RockAuto or Google Shopping).
  const handleFindPart = (partName: string, provider: 'google' | 'rockauto' = 'rockauto') => {
    const { fullQuery } = formatPartSearchQuery(
      vehicle.year,
      vehicle.make,
      vehicle.model,
      vehicle.engine || '',
      partName
    );

    // Copy to system clipboard cleanly
    navigator.clipboard.writeText(fullQuery).then(() => {
      setCopiedSearchPrompt(fullQuery);
      setTimeout(() => setCopiedSearchPrompt(null), 3500);
    });

    // Open target catalog in new tab
    let targetUrl = '';
    if (provider === 'rockauto') {
      // RockAuto search / catalog redirect
      targetUrl = `https://www.google.com/search?q=${encodeURIComponent(`site:rockauto.com ${fullQuery}`)}`;
    } else {
      // Google Shopping direct punch-out
      targetUrl = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(fullQuery)}`;
    }

    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  // Counts
  const neededCount = job.parts_list.filter((p) => p.status === 'Needed').length;
  const orderedCount = job.parts_list.filter((p) => p.status === 'Ordered').length;
  const arrivedCount = job.parts_list.filter((p) => p.status === 'Arrived').length;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          id="back-to-jobs-btn"
          onClick={onBack}
          className="min-h-[48px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-semibold flex items-center gap-2.5 transition cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-amber-400" />
          <span>Back to Jobs Ledger</span>
        </button>

        <div className="flex items-center gap-2.5">
          {/* Delete Job Button */}
          <button
            type="button"
            id="workspace-delete-job-btn"
            onClick={() => setIsDeleteModalOpen(true)}
            className="min-h-[48px] px-3.5 rounded-xl bg-slate-900 hover:bg-rose-950/60 active:bg-rose-900 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-800 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
            title="Delete this repair job"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span className="hidden sm:inline">Delete Job</span>
          </button>

          {/* Status Dropdown / Cycle Pill */}
          <div className="relative">
            <button
              id="change-job-status-btn"
              onClick={() => setStatusMenuOpen(!statusMenuOpen)}
              className={`min-h-[48px] px-4 py-2 rounded-xl font-bold text-sm border flex items-center gap-2 shadow-lg transition cursor-pointer ${
                job.status === 'In Progress'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                  : job.status === 'Waiting on Parts'
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 hover:bg-sky-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  job.status === 'In Progress'
                    ? 'bg-amber-400 animate-pulse'
                    : job.status === 'Waiting on Parts'
                    ? 'bg-sky-400'
                    : 'bg-emerald-400'
                }`}
              />
              <span>Status: {job.status}</span>
            </button>

            {statusMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-30 p-1.5 space-y-1">
                {(['In Progress', 'Waiting on Parts', 'Completed'] as JobStatus[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleChangeJobStatus(st)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-between ${
                      job.status === st
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span>{st}</span>
                    {job.status === st && <Check className="w-4 h-4 text-amber-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vehicle Specification Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                Active Work Order
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Created {new Date(job.created_at).toLocaleDateString()}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {vehicle.year} {vehicle.make} {vehicle.model}
              {vehicle.trim ? ` ${vehicle.trim}` : ''}
            </h1>
            <div className="flex items-center gap-2 text-sm text-slate-300 font-medium">
              <User className="w-4 h-4 text-slate-400" />
              <span>Customer: <strong className="text-white">{job.customer_name}</strong></span>
            </div>
          </div>

          {/* VIN Badge with 1-Tap Copy */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 block font-mono uppercase">Decoded VIN</span>
              <span className="font-mono text-sm font-bold text-amber-400">{job.vin}</span>
            </div>
            <button
              id="copy-vin-btn"
              onClick={handleCopyVin}
              className="min-h-[40px] px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
              title="Copy VIN to clipboard"
            >
              {copiedVin ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Vehicle Specs Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-400 block font-medium flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-amber-400" />
              Engine
            </span>
            <span className="text-sm font-bold text-white mt-0.5 block truncate">
              {vehicle.engine || 'Standard'}
            </span>
          </div>

          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-400 block font-medium flex items-center gap-1">
              <Car className="w-3.5 h-3.5 text-sky-400" />
              Drivetrain
            </span>
            <span className="text-sm font-bold text-sky-300 mt-0.5 block truncate">
              {vehicle.drivetrain || 'Standard'}
            </span>
          </div>

          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-400 block font-medium">Body Style</span>
            <span className="text-sm font-bold text-slate-200 mt-0.5 block truncate">
              {vehicle.bodyClass || 'Passenger'}
            </span>
          </div>

          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-400 block font-medium">Fuel / Induction</span>
            <span className="text-sm font-bold text-slate-200 mt-0.5 block truncate">
              {vehicle.fuelType || 'Gasoline'}
            </span>
          </div>
        </div>

        {/* Repair Symptom & Work Order Notes */}
        <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
              Shop Diagnosis &amp; Work Order Notes
            </span>
            <div className="flex items-center gap-2">
              {onOpenObdLookup && (
                <button
                  id="job-open-obd-lookup-btn"
                  onClick={() => onOpenObdLookup(job)}
                  className="min-h-[34px] px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                >
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                  <span>OBD-II Code Lookup</span>
                </button>
              )}
              {isEditingNotes && (
                <VoiceInputButton
                  id="voice-job-notes-btn"
                  size="sm"
                  mode="append"
                  currentValue={notesInput}
                  onTranscript={(text) => setNotesInput(text)}
                  title="Dictate Notes"
                  showLabel={true}
                  label="Dictate"
                />
              )}
              {!isEditingNotes ? (
                <button
                  onClick={() => setIsEditingNotes(true)}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-200 px-2 py-1 bg-slate-900 rounded border border-slate-800"
                >
                  Edit Notes
                </button>
              ) : (
                <button
                  onClick={handleSaveNotes}
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20"
                >
                  Save
                </button>
              )}
            </div>
          </div>
          {isEditingNotes ? (
            <div className="space-y-2">
              <textarea
                rows={3}
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                placeholder="Enter customer reported symptoms, fault codes (e.g. P0171, P0300), torque specs, or job notes..."
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:border-amber-400 focus:outline-none whitespace-pre-line"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setNotesInput(job.service_notes || '');
                    setIsEditingNotes(false);
                  }}
                  className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNotes}
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 text-slate-950 rounded-lg"
                >
                  Save Notes
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-sm text-slate-300 italic whitespace-pre-line">
                {job.service_notes || 'No specific diagnostic notes recorded yet. Tap Edit Notes or use OBD-II Code Lookup.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MILESTONE 4: Active Jobs Workspace & The Parts Builder */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xl space-y-6">
        {/* Header & Metric Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Parts Scratchpad</h2>
              <p className="text-xs text-slate-400">
                Track parts pipeline and one-click launch punch-out searches
              </p>
            </div>
          </div>

          {/* Parts Status Counter Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30">
              {neededCount} Needed
            </span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-300 border border-sky-500/30">
              {orderedCount} Ordered
            </span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
              {arrivedCount} Arrived
            </span>
          </div>
        </div>

        {/* Add New Part Input Box */}
        <form onSubmit={(e) => handleAddPart(e)} className="space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="add-part-input" className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Add Part to Vehicle Checklist
            </label>
            <VoiceInputButton
              id="voice-add-part-btn"
              size="sm"
              mode="replace"
              onTranscript={(text) => {
                setPartInput(text);
              }}
              title="Dictate Part Name"
              showLabel={true}
              label="Speak Part"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              id="add-part-input"
              type="text"
              placeholder="e.g. Front Rotors, O2 Sensor, Spark Plugs (Type or speak)"
              value={partInput}
              onChange={(e) => setPartInput(e.target.value)}
              className="flex-1 min-h-[50px] px-4 text-base text-white bg-slate-950 border-2 border-slate-700 rounded-xl focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 placeholder:text-slate-600"
            />
            <button
              id="add-part-submit-btn"
              type="submit"
              disabled={!partInput.trim()}
              className="min-h-[50px] px-6 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold text-base border border-amber-400 shadow-md flex items-center justify-center gap-2 transition cursor-pointer disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />
              <span>Add Part</span>
            </button>
          </div>

          {/* Quick Add Suggestions Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 mr-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Quick Add:
            </span>
            {COMMON_PARTS_SUGGESTIONS.slice(0, 6).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleAddPart(undefined, preset)}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 text-slate-300 border border-slate-700 transition"
              >
                + {preset}
              </button>
            ))}
          </div>
        </form>

        {/* Copied Search Feedback Toast */}
        {copiedSearchPrompt && (
          <div className="p-3 bg-amber-950/80 border border-amber-500/60 rounded-xl text-amber-200 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Copied <strong>&quot;{vehicle.year} {vehicle.make} {vehicle.model} {copiedSearchPrompt}&quot;</strong> to clipboard and opened catalog tab!
              </span>
            </div>
            <span className="text-[10px] uppercase font-mono font-bold text-amber-400">Ready to Paste</span>
          </div>
        )}

        {/* Parts Checklist Container */}
        <div className="space-y-3">
          {job.parts_list.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/60 border border-dashed border-slate-800 rounded-xl space-y-2">
              <Package className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-400">No parts on this scratchpad yet</p>
              <p className="text-xs text-slate-500">
                Type a part name above or tap a quick-add chip to build your ordering list.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {job.parts_list.map((part) => {
                const isNeeded = part.status === 'Needed';
                const isOrdered = part.status === 'Ordered';
                const isArrived = part.status === 'Arrived';

                return (
                  <div
                    key={part.id}
                    id={`part-row-${part.id}`}
                    className={`p-3.5 sm:p-4 rounded-xl border-2 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isArrived
                        ? 'bg-emerald-950/20 border-emerald-900/60'
                        : isOrdered
                        ? 'bg-sky-950/20 border-sky-900/60'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    {/* Part Name & Details */}
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => handleCyclePartStatus(part)}
                        aria-label={`Cycle status for ${part.part_name}`}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border transition ${
                          isArrived
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                            : isOrdered
                            ? 'bg-sky-500/20 border-sky-500 text-sky-400'
                            : 'bg-amber-500/20 border-amber-500 text-amber-400'
                        }`}
                        title="Click to cycle status: Needed -> Ordered -> Arrived"
                      >
                        {isArrived ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : isOrdered ? (
                          <ShoppingBag className="w-5 h-5" />
                        ) : (
                          <Clock className="w-5 h-5" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <span
                          className={`text-base font-bold block truncate ${
                            isArrived
                              ? 'text-slate-300 line-through decoration-emerald-500/70'
                              : 'text-white'
                          }`}
                        >
                          {part.part_name}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          Added {new Date(part.addedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Action Controls: Status Cycle Pill, Milestone 5 Find Part, Delete */}
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
                      {/* Interactive Cycle Button / Status selector */}
                      <button
                        id={`cycle-status-btn-${part.id}`}
                        onClick={() => handleCyclePartStatus(part)}
                        className={`min-h-[44px] px-3.5 py-1.5 rounded-lg text-xs font-extrabold uppercase tracking-wider border flex items-center gap-1.5 transition cursor-pointer ${
                          isArrived
                            ? 'bg-emerald-500/30 text-emerald-200 border-emerald-500/60 hover:bg-emerald-500/40'
                            : isOrdered
                            ? 'bg-sky-500/30 text-sky-200 border-sky-500/60 hover:bg-sky-500/40'
                            : 'bg-amber-500/30 text-amber-200 border-amber-500/60 hover:bg-amber-500/40'
                        }`}
                        title="Tap to cycle status (Needed -> Ordered -> Arrived)"
                      >
                        <span>{part.status}</span>
                        <span className="text-[10px] opacity-70 font-mono">⟳</span>
                      </button>

                      {/* Multi-Store Sourcing Launcher */}
                      <div className="flex items-center gap-1">
                        <button
                          id={`find-part-all-stores-${part.id}`}
                          onClick={() => setSelectedPartForSupplierModal(part.part_name)}
                          className="min-h-[44px] px-3.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500 hover:text-slate-950 active:bg-amber-600 text-amber-300 text-xs font-bold border border-amber-500/40 hover:border-amber-400 flex items-center gap-1.5 transition shadow-sm cursor-pointer group"
                          title="Open Local & Online Auto Parts Stores (AutoZone, O'Reilly, Advance, NAPA, RockAuto)"
                        >
                          <Store className="w-3.5 h-3.5 text-amber-400 group-hover:text-slate-950 transition" />
                          <span>Find Stores</span>
                        </button>

                        <button
                          id={`find-part-google-${part.id}`}
                          onClick={() => handleFindPart(part.part_name, 'google')}
                          className="min-h-[44px] px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 text-xs border border-slate-700 transition flex items-center gap-1"
                          title="Compare prices across AutoZone, Advance, O'Reilly & RockAuto on Google Shopping"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold hidden sm:inline">Prices</span>
                        </button>

                        <button
                          id={`find-part-rockauto-${part.id}`}
                          onClick={() => handleFindPart(part.part_name, 'rockauto')}
                          className="min-h-[44px] px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 text-xs border border-slate-700 transition flex items-center gap-1"
                          title="Direct RockAuto catalog search"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold hidden sm:inline">RockAuto</span>
                        </button>
                      </div>

                      {/* Delete Part Button */}
                      <button
                        id={`delete-part-btn-${part.id}`}
                        onClick={() => handleDeletePart(part.id)}
                        aria-label={`Delete ${part.part_name}`}
                        className="w-11 h-11 flex items-center justify-center rounded-lg bg-slate-900 hover:bg-rose-950/60 active:bg-rose-900 text-slate-500 hover:text-rose-400 border border-slate-800 hover:border-rose-800 transition"
                        title="Remove part from checklist"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Job Management / Danger Zone Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="text-sm font-bold text-white">Work Order Management</h4>
          <p className="text-xs text-slate-400">
            Permanently remove this vehicle repair ticket and parts list from the shop ledger.
          </p>
        </div>
        <button
          type="button"
          id="workspace-danger-delete-btn"
          onClick={() => setIsDeleteModalOpen(true)}
          className="min-h-[44px] px-5 rounded-xl bg-slate-950 hover:bg-rose-950/60 active:bg-rose-900 text-rose-300 hover:text-rose-200 border border-rose-900/50 hover:border-rose-700 text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-sm"
        >
          <Trash2 className="w-4 h-4 text-rose-400" />
          <span>Permanently Delete Job</span>
        </button>
      </div>

      {/* Parts Sourcing Stores Modal */}
      {selectedPartForSupplierModal && (
        <PartsSupplierModal
          isOpen={Boolean(selectedPartForSupplierModal)}
          onClose={() => setSelectedPartForSupplierModal(null)}
          vehicle={vehicle}
          partName={selectedPartForSupplierModal}
        />
      )}

      {/* Confirmation Modal for Job Deletion */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDeleteJob}
        title="Delete Repair Job?"
        itemName={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
        itemSubtext={`Customer: ${job.customer_name} • VIN: ${job.vin}`}
        confirmButtonText="Delete Repair Job"
      />
    </div>
  );
};
