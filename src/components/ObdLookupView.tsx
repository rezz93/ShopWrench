import React, { useState, useMemo } from 'react';
import {
  Search,
  AlertTriangle,
  Wrench,
  Plus,
  Check,
  Sparkles,
  Info,
  Layers,
  Activity,
  FileText,
  Copy,
  ChevronRight,
  ShieldAlert,
  Flame,
  Gauge,
} from 'lucide-react';
import { COMMON_OBD_CODES, searchObdCodes, ObdCodeDetail, parseObdCode } from '../services/obdCodes';
import { Job } from '../types';
import { VoiceInputButton } from './VoiceInputButton';

interface ObdLookupViewProps {
  activeJob?: Job | null;
  onAddPartToJob?: (partName: string) => void;
  onAttachDiagnosisToJob?: (diagnosisText: string) => void;
  onSelectJobForContext?: () => void;
}

const CATEGORIES = [
  'All Systems',
  'Fuel & Air Metering',
  'Ignition System',
  'Emissions Control',
  'Auxiliary Emissions',
  'ABS & Chassis',
  'Transmission',
  'CAN Network & Comm',
  'Body & Restraints',
];

const POPULAR_CODES = ['P0171', 'P0300', 'P0420', 'P0442', 'P0128', 'P0101', 'C0035', 'U0100'];

export const ObdLookupView: React.FC<ObdLookupViewProps> = ({
  activeJob,
  onAddPartToJob,
  onAttachDiagnosisToJob,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Systems');
  const [selectedCode, setSelectedCode] = useState<ObdCodeDetail>(COMMON_OBD_CODES['P0171']);
  const [addedParts, setAddedParts] = useState<Record<string, boolean>>({});
  const [attachedDiagnosis, setAttachedDiagnosis] = useState(false);
  const [copiedCodeText, setCopiedCodeText] = useState(false);

  // Search and filter codes
  const filteredCodes = useMemo(() => {
    const results = searchObdCodes(searchQuery);
    if (selectedCategory === 'All Systems') {
      return results;
    }
    return results.filter((c) => c.category === selectedCategory);
  }, [searchQuery, selectedCategory]);

  const handleSelectCode = (codeDetail: ObdCodeDetail) => {
    setSelectedCode(codeDetail);
    setAttachedDiagnosis(false);
  };

  const handleAddPart = (partName: string) => {
    if (onAddPartToJob) {
      onAddPartToJob(partName);
      setAddedParts((prev) => ({ ...prev, [partName]: true }));
      setTimeout(() => {
        setAddedParts((prev) => ({ ...prev, [partName]: false }));
      }, 2000);
    }
  };

  const handleAttachDiagnosis = () => {
    if (onAttachDiagnosisToJob && selectedCode) {
      const textToAppend = `[OBD-II ${selectedCode.code}] ${selectedCode.title}\nSeverity: ${selectedCode.severity}\nSymptoms: ${selectedCode.symptoms.join(', ')}\nProbable Causes: ${selectedCode.probableCauses.join(', ')}`;
      onAttachDiagnosisToJob(textToAppend);
      setAttachedDiagnosis(true);
      setTimeout(() => setAttachedDiagnosis(false), 3000);
    }
  };

  const handleCopyCodeSummary = () => {
    if (!selectedCode) return;
    const summary = `OBD-II ${selectedCode.code}: ${selectedCode.title}\nCategory: ${selectedCode.category}\nSeverity: ${selectedCode.severity}\nDescription: ${selectedCode.description}\nProbable Causes:\n- ${selectedCode.probableCauses.join('\n- ')}\nRecommended Parts:\n- ${selectedCode.recommendedParts.join('\n- ')}`;
    navigator.clipboard.writeText(summary);
    setCopiedCodeText(true);
    setTimeout(() => setCopiedCodeText(false), 2000);
  };

  const getSeverityBadge = (severity: ObdCodeDetail['severity']) => {
    switch (severity) {
      case 'Critical':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'High':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'Moderate':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'Low':
      default:
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  OBD-II Diagnostic Trouble Code Lookup
                </h1>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                  DTC Database
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Decode fault codes, analyze failure symptoms, and 1-tap add recommended repair parts
              </p>
            </div>
          </div>

          {activeJob && (
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-mono">Linked Active Job</span>
                <span className="text-xs font-bold text-white">
                  {activeJob.vehicle_details.year} {activeJob.vehicle_details.make} {activeJob.vehicle_details.model} ({activeJob.customer_name})
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Search Input Bar */}
        <div className="mt-5 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              id="obd-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code (e.g. P0171, P0300) or symptom (e.g. misfire, lean, catalytic, speed sensor)..."
              className="w-full min-h-[52px] pl-12 pr-12 text-base text-white bg-slate-950 border-2 border-slate-700 rounded-xl focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 placeholder:text-slate-500 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded"
              >
                Clear
              </button>
            )}
          </div>
          <VoiceInputButton
            id="voice-obd-search-btn"
            size="lg"
            mode="replace"
            onTranscript={(text) => {
              setSearchQuery(text);
              const upperCode = text.trim().toUpperCase();
              if (COMMON_OBD_CODES[upperCode]) {
                setSelectedCode(COMMON_OBD_CODES[upperCode]);
              }
            }}
            title="Dictate Fault Code or Symptom"
            showLabel={true}
            label="Speak Code"
          />
        </div>

        {/* Popular Quick-Search Code Chips */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Top Tech Codes:
          </span>
          {POPULAR_CODES.map((code) => (
            <button
              key={code}
              id={`quick-code-${code}`}
              onClick={() => {
                setSearchQuery(code);
                if (COMMON_OBD_CODES[code]) {
                  setSelectedCode(COMMON_OBD_CODES[code]);
                }
              }}
              className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 text-slate-300 border border-slate-700 font-mono font-bold transition cursor-pointer"
            >
              {code}
            </button>
          ))}
        </div>

        {/* Category Filter Pills */}
        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main 2-Column Layout (List on Left / Deep Diagnostic Details on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Code Match Results (4 Cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2 max-h-[700px] overflow-y-auto">
          <div className="flex items-center justify-between px-1 pb-2 border-b border-slate-800 text-xs font-semibold text-slate-400">
            <span>Matching Fault Codes ({filteredCodes.length})</span>
            <span>Select to inspect</span>
          </div>

          {filteredCodes.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
              <p className="text-sm font-bold text-white">No database match found</p>
              <p className="text-xs text-slate-400">
                You can still type any standard 5-character OBD code (e.g. P1234, C0035, U0100) to generate architectural diagnostics.
              </p>
            </div>
          ) : (
            filteredCodes.map((item) => {
              const isSelected = selectedCode?.code === item.code;
              return (
                <button
                  key={item.code}
                  id={`obd-item-${item.code}`}
                  onClick={() => handleSelectCode(item)}
                  className={`w-full text-left p-3 rounded-xl border transition flex items-start justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/60 text-white shadow-md'
                      : 'bg-slate-950/70 border-slate-800/80 hover:bg-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-black text-amber-400">
                        {item.code}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getSeverityBadge(item.severity)}`}>
                        {item.severity}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-200 truncate">
                      {item.title}
                    </p>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {item.category}
                    </span>
                  </div>

                  <ChevronRight className={`w-4 h-4 shrink-0 mt-2 transition ${isSelected ? 'text-amber-400 translate-x-0.5' : 'text-slate-600'}`} />
                </button>
              );
            })
          )}
        </div>

        {/* Right Column: Code Detail & Parts Integration (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {selectedCode ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xl space-y-6">
              {/* Header Info */}
              <div className="pb-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-2xl sm:text-3xl font-black text-amber-400">
                      {selectedCode.code}
                    </span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${getSeverityBadge(selectedCode.severity)}`}>
                      {selectedCode.severity} Severity
                    </span>
                    <span className="text-xs font-medium text-slate-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
                      {selectedCode.category}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">
                    {selectedCode.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleCopyCodeSummary}
                    className="min-h-[40px] px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                    title="Copy full DTC diagnostic summary"
                  >
                    {copiedCodeText ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy DTC</span>
                      </>
                    )}
                  </button>

                  {onAttachDiagnosisToJob && activeJob && (
                    <button
                      id="attach-dtc-to-job-btn"
                      onClick={handleAttachDiagnosis}
                      className="min-h-[40px] px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md"
                      title="Attach this trouble code to active work order notes"
                    >
                      {attachedDiagnosis ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Attached to Notes!</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-3.5 h-3.5" />
                          <span>Attach to Job Notes</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Technical Description */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Technical Definition &amp; Logic
                </span>
                <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                  {selectedCode.description}
                </p>
              </div>

              {/* 2-Column: Symptoms & Probable Causes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Symptoms */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5" />
                    Common Symptoms
                  </span>
                  <ul className="space-y-1.5">
                    {selectedCode.symptoms.map((sym, idx) => (
                      <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                        <span className="text-amber-400 text-base leading-none">•</span>
                        <span>{sym}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Probable Causes */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5" />
                    Probable Root Causes
                  </span>
                  <ul className="space-y-1.5">
                    {selectedCode.probableCauses.map((cause, idx) => (
                      <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                        <span className="text-sky-400 text-base leading-none">•</span>
                        <span>{cause}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* RECOMMENDED REPLACEMENT PARTS (With 1-Tap Scratchpad Addition) */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    Recommended Replacement Parts ({selectedCode.recommendedParts.length})
                  </span>
                  {activeJob && (
                    <span className="text-[11px] text-slate-400">
                      Tap + to add directly to {activeJob.customer_name}&apos;s scratchpad
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {selectedCode.recommendedParts.map((partName) => {
                    const isJustAdded = addedParts[partName];
                    return (
                      <div
                        key={partName}
                        className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-2"
                      >
                        <span className="text-xs font-bold text-white truncate">
                          {partName}
                        </span>

                        {onAddPartToJob ? (
                          <button
                            type="button"
                            onClick={() => handleAddPart(partName)}
                            className={`min-h-[36px] px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                              isJustAdded
                                ? 'bg-emerald-500 text-slate-950 shadow-md'
                                : 'bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 border border-slate-700'
                            }`}
                            title="Add to active job parts list"
                          >
                            {isJustAdded ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Added!</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add to Job</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-1 rounded">
                            Standard Fix
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <Info className="w-10 h-10 text-slate-500 mx-auto" />
              <p className="text-base font-bold text-white">Select a code on the left</p>
              <p className="text-xs text-slate-400">
                View technical definitions, symptoms, and instant replacement parts.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
