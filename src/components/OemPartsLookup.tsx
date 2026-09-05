import React, { useState } from 'react';
import {
  Wrench,
  Search,
  ExternalLink,
  BookOpen,
  Sparkles,
  Check,
  Copy,
  Plus,
  Compass,
  PhoneCall,
  Layers,
  FileText,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Job, PartItem, PartStatus } from '../types';
import { addPartToJob } from '../services/storage';
import {
  getOemPortalForMake,
  buildUniversalOemLinks,
  OemLookupResult,
} from '../services/oemCatalogService';
import { VoiceInputButton } from './VoiceInputButton';

interface OemPartsLookupProps {
  job: Job;
  onJobUpdated: (updated: Job) => void;
}

const COMMON_OEM_ASSEMBLIES = [
  'Water Pump',
  'Starter Motor',
  'Alternator',
  'Front Brake Caliper',
  'Front Brake Pads & Rotors',
  'Wheel Hub & Bearing',
  'Thermostat & Housing',
  'Upstream O2 Sensor',
  'Ignition Coil',
  'Control Arm & Ball Joint',
  'Fuel Pump Assembly',
  'Radiator',
];

export const OemPartsLookup: React.FC<OemPartsLookupProps> = ({ job, onJobUpdated }) => {
  const vehicle = job.vehicle_details;
  const oemPortal = getOemPortalForMake(vehicle.make);

  const [partQuery, setPartQuery] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<OemLookupResult | null>(null);
  const [addedPartKey, setAddedPartKey] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const activePart = partQuery.trim() || 'Engine Parts';
  const universalLinks = buildUniversalOemLinks(
    vehicle.year,
    vehicle.make,
    vehicle.model,
    vehicle.engine || '',
    job.vin,
    activePart
  );

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  // Add OEM part directly to active job
  const handleAddOemPartToJob = (partName: string, partNumber?: string) => {
    const cleanNumber = partNumber ? ` (#${partNumber.trim()})` : '';
    const formatted = `[OEM] ${partName}${cleanNumber}`.trim();

    addPartToJob(job.id, formatted);
    const updatedParts: PartItem[] = [
      ...job.parts_list,
      {
        id: `part-oem-${Date.now()}`,
        part_name: formatted,
        status: 'Needed' as PartStatus,
        addedAt: new Date().toISOString(),
      },
    ];

    onJobUpdated({ ...job, parts_list: updatedParts });

    const key = partNumber || partName;
    setAddedPartKey(key);
    setTimeout(() => setAddedPartKey(null), 2500);
  };

  // Call Gemini AI OEM Assistant
  const handleLookupOemAi = async (customQuery?: string) => {
    const q = (customQuery || partQuery).trim() || 'Common replacement parts';
    setIsLoadingAi(true);
    setAiError(null);

    try {
      const resp = await fetch('/api/oem-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          engine: vehicle.engine || '',
          vin: job.vin,
          partQuery: q,
        }),
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'Failed to lookup OEM specs.');
      }

      setAiResult(data.data);
    } catch (err: any) {
      console.error('OEM Lookup error:', err);
      setAiError(err.message || 'Could not fetch AI OEM part specs.');
    } finally {
      setIsLoadingAi(false);
    }
  };

  return (
    <div
      id="active-job-oem-parts-lookup"
      className="bg-slate-900 border-2 border-amber-500/30 rounded-2xl p-5 sm:p-7 shadow-xl space-y-6"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-white tracking-tight">OEM Parts &amp; Schematics Lookup</h2>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${oemPortal.badgeBg} ${oemPortal.badgeBorder}`}
              >
                {oemPortal.brandName}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Factory dealer parts catalogs, exploded assembly diagrams, OEM part numbers &amp; torque specs
            </p>
          </div>
        </div>

        {/* Toggle Collapse & VIN copy or Manual Specs Badge */}
        <div className="flex items-center gap-2">
          {job.vin ? (
            <button
              type="button"
              onClick={() => handleCopy(job.vin, 'vin')}
              className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition"
              title="Copy 17-digit VIN for dealer portals"
            >
              {copiedText === 'vin' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">VIN Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy VIN</span>
                </>
              )}
            </button>
          ) : (
            <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700">
              Manual Vehicle Spec
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            aria-label={isExpanded ? 'Collapse OEM Lookup' : 'Expand OEM Lookup'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Active Vehicle & Factory Portal Card */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Target Vehicle:</span>
                <span className="text-sm font-extrabold text-white">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </span>
                {vehicle.engine && (
                  <span className="text-xs text-slate-400 font-medium">({vehicle.engine})</span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Factory Division: <strong className="text-slate-200">{oemPortal.manufacturer}</strong> • {oemPortal.tagline}
              </p>
            </div>

            {/* Quick 1-Click Launch Dealer Catalog for this VIN */}
            <div className="flex items-center gap-2 shrink-0">
              <a
                id="btn-open-factory-oem-catalog"
                href={
                  job.vin
                    ? oemPortal.buildVinCatalogUrl(job.vin, activePart)
                    : oemPortal.buildPartCatalogUrl(vehicle.year, vehicle.make, vehicle.model, activePart, vehicle.engine)
                }
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md transition"
                title={`Open official ${oemPortal.portalName}`}
              >
                <span>Launch {oemPortal.portalName}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Component Search Input & Voice Dictation */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="oem-part-search-input" className="text-xs font-bold uppercase tracking-wider text-slate-300">
                OEM Component or Part # to Lookup:
              </label>
              <VoiceInputButton
                id="voice-oem-search-btn"
                size="sm"
                mode="replace"
                onTranscript={(text) => {
                  setPartQuery(text);
                }}
                title="Dictate Part or Assembly Name"
                showLabel={true}
                label="Speak Part"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <input
                  id="oem-part-search-input"
                  type="text"
                  placeholder="e.g. Water Pump, Front Brake Caliper, Starter, 12637629..."
                  value={partQuery}
                  onChange={(e) => setPartQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleLookupOemAi();
                    }
                  }}
                  className="w-full min-h-[48px] px-4 pl-10 text-sm text-white bg-slate-950 border-2 border-slate-700 rounded-xl focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 placeholder:text-slate-600"
                />
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>

              {/* Action: AI OEM Assistant */}
              <button
                id="btn-ai-oem-lookup"
                type="button"
                onClick={() => handleLookupOemAi()}
                disabled={isLoadingAi}
                className="min-h-[48px] px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:from-amber-600 active:to-amber-700 disabled:opacity-60 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer disabled:cursor-not-allowed"
                title="Use AI to look up factory OEM part numbers, torque specs, and fluids"
              >
                {isLoadingAi ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Searching OEM Specs...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>AI OEM Part # &amp; Specs</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Component Selector Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 mr-1">
                <Layers className="w-3 h-3 text-amber-400" />
                Quick Select:
              </span>
              {COMMON_OEM_ASSEMBLIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setPartQuery(item);
                    handleLookupOemAi(item);
                  }}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                    partQuery.toLowerCase() === item.toLowerCase()
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* OEM Sourcing & Diagrams Action Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            {/* 1. Official Exploded Assembly Schematics */}
            <a
              id="btn-oem-exploded-diagrams"
              href={universalLinks.googleDiagrams}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/50 transition group flex flex-col justify-between space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  Exploded Schematics
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition" />
              </div>
              <p className="text-[11px] text-slate-400">
                Official OEM exploded parts diagrams with assembly callouts for &quot;{activePart}&quot;.
              </p>
            </a>

            {/* 2. Brand-New Genuine OEM on eBay */}
            <a
              id="btn-oem-ebay-genuine"
              href={universalLinks.ebayOemNew}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/50 transition group flex flex-col justify-between space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" />
                  Genuine OEM Inventory
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition" />
              </div>
              <p className="text-[11px] text-slate-400">
                Search verified brand-new Genuine OEM parts matching this vehicle and VIN.
              </p>
            </a>

            {/* 3. Dealer Wholesale Parts Counter Map & Call */}
            <a
              id="btn-oem-dealer-parts-counter"
              href={universalLinks.dealerPartsDesk}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/50 transition group flex flex-col justify-between space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <PhoneCall className="w-4 h-4" />
                  Dealer Wholesale Desk
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition" />
              </div>
              <p className="text-[11px] text-slate-400">
                Locate local {vehicle.make} dealership parts counters, phone numbers, and wholesale desks.
              </p>
            </a>

            {/* 4. NHTSA Recalls & Factory TSBs */}
            <a
              id="btn-oem-nhtsa-tsb"
              href={universalLinks.nhtsaTsb}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/50 transition group flex flex-col justify-between space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  NHTSA TSBs &amp; Recalls
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-rose-400 transition" />
              </div>
              <p className="text-[11px] text-slate-400">
                Official safety recalls and Technical Service Bulletins for VIN {job.vin.slice(0, 10)}...
              </p>
            </a>
          </div>

          {/* AI OEM Results Panel */}
          {aiError && (
            <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{aiError} You can still use the 1-click OEM dealer catalog and diagram links above.</span>
            </div>
          )}

          {aiResult && (
            <div className="p-5 rounded-xl bg-slate-950 border border-amber-500/40 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      OEM Factory Breakdown:
                    </span>
                    <span className="text-sm font-extrabold text-white">{aiResult.partQuery}</span>
                  </div>
                  <p className="text-xs text-slate-400">Division: {aiResult.oemBrand}</p>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  AI Fitment Verified
                </span>
              </div>

              {/* Part Numbers List with 1-Tap Add to Job */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-amber-400" />
                  Factory OEM Part Numbers:
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {aiResult.oemPartNumbers.map((part, idx) => {
                    const isAdded = addedPartKey === part.partNumber;
                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-extrabold text-amber-300 select-all">
                              {part.partNumber}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              {part.brand}
                            </span>
                            {part.isSuperseded && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/60">
                                Superseded
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-2">{part.description}</p>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleAddOemPartToJob(part.description || aiResult.partQuery, part.partNumber)}
                            disabled={isAdded}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                              isAdded
                                ? 'bg-emerald-500 text-slate-950'
                                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
                            }`}
                            title="Add this OEM part number to active job checklist"
                          >
                            {isAdded ? (
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

                          <button
                            type="button"
                            onClick={() => handleCopy(part.partNumber, part.partNumber)}
                            className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1 mt-1"
                          >
                            {copiedText === part.partNumber ? (
                              <span className="text-emerald-400">Copied!</span>
                            ) : (
                              <>
                                <Copy className="w-2.5 h-2.5" />
                                <span>Copy #</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Superseded Numbers (if any) */}
              {aiResult.supersededNumbers && aiResult.supersededNumbers.length > 0 && (
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Superseded / Alternate Numbers:
                  </span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {aiResult.supersededNumbers.map((num, i) => (
                      <span
                        key={i}
                        className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 select-all"
                      >
                        {num}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Technical Specifications Grid: Torque & Fluids */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {/* Torque Specs */}
                {aiResult.torqueSpecs && aiResult.torqueSpecs.length > 0 && (
                  <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5" />
                      Factory Torque Specifications:
                    </span>
                    <ul className="text-xs text-slate-300 space-y-1">
                      {aiResult.torqueSpecs.map((spec, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-amber-500">•</span>
                          <span>{spec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Fluid Capacities & Specs */}
                {aiResult.fluidAndSpecs && (
                  <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      OEM Fluid &amp; Capacity Specs:
                    </span>
                    <p className="text-xs text-slate-300 whitespace-pre-line">{aiResult.fluidAndSpecs}</p>
                  </div>
                )}
              </div>

              {/* Tech Tips & Service Bulletins */}
              {aiResult.techTips && aiResult.techTips.length > 0 && (
                <div className="p-3.5 rounded-lg bg-amber-950/20 border border-amber-500/30 space-y-1.5">
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                    Factory Service Notes &amp; Installation Tips:
                  </span>
                  <ul className="text-xs text-slate-300 space-y-1">
                    {aiResult.techTips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-amber-400">✓</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
