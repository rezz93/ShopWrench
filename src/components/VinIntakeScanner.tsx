import React, { useState } from 'react';
import {
  Search,
  Camera,
  Mic,
  CheckCircle2,
  AlertCircle,
  Car,
  Wrench,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Zap,
  Gauge,
  ShieldCheck,
} from 'lucide-react';
import { decodeVinApi, SAMPLE_VINS } from '../services/nhtsa';
import { createNewJob } from '../services/storage';
import { DecodeVinResponse, Job } from '../types';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { VoiceInputButton } from './VoiceInputButton';
import { VoiceVinModal } from './VoiceVinModal';
import { parseSpokenVin } from '../utils/natoPhonetic';

interface VinIntakeScannerProps {
  onJobCreated: (newJob: Job) => void;
  onNavigateToLedger: () => void;
}

export const VinIntakeScanner: React.FC<VinIntakeScannerProps> = ({
  onJobCreated,
  onNavigateToLedger,
}) => {
  const [vinInput, setVinInput] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [serviceNotes, setServiceNotes] = useState('');
  const [initialPartsText, setInitialPartsText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [decodedData, setDecodedData] = useState<DecodeVinResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  const cleanVin = vinInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  const handleDecode = async (targetVin?: string) => {
    const vinToDecode = (targetVin || cleanVin).trim().toUpperCase();
    if (!vinToDecode) {
      setErrorMsg('Please enter a 17-character VIN or scan a vehicle door sticker barcode.');
      return;
    }

    if (vinToDecode.length !== 17) {
      setErrorMsg(`VIN must be exactly 17 characters (currently ${vinToDecode.length}).`);
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setVinInput(vinToDecode);

    try {
      const result = await decodeVinApi(vinToDecode);
      setDecodedData(result);
    } catch (err: unknown) {
      console.error('Decoding failed:', err);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Failed to decode VIN via NHTSA VPIC. Please check the VIN and network connection.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBarcodeScanned = (scannedVinText: string) => {
    setIsScannerOpen(false);
    setVinInput(scannedVinText);
    // Automatically execute the Milestone 2 NHTSA API decoder loop without requiring a second click
    handleDecode(scannedVinText);
  };

  const handleSelectSample = (sampleVin: string) => {
    setVinInput(sampleVin);
    handleDecode(sampleVin);
  };

  const handleLaunchJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!decodedData) {
      setErrorMsg('Please decode a valid VIN first before launching the job.');
      return;
    }

    // Split initial parts comma-separated or newline
    const initialParts = initialPartsText
      .split(/[\n,]/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const newJob = createNewJob({
      customer_name: customerName || 'Walk-in Customer',
      vin: cleanVin,
      vehicle_details: {
        year: decodedData.year,
        make: decodedData.make,
        model: decodedData.model,
        engine: decodedData.engine,
        drivetrain: decodedData.drivetrain,
        trim: decodedData.trim,
        bodyClass: decodedData.bodyClass,
        fuelType: decodedData.fuelType,
        rawVin: cleanVin,
      },
      service_notes: serviceNotes,
      initial_parts: initialParts,
    });

    // Reset intake form
    setVinInput('');
    setCustomerName('');
    setServiceNotes('');
    setInitialPartsText('');
    setDecodedData(null);

    // Notify parent to open the new job workspace directly
    onJobCreated(newJob);
  };

  const handleReset = () => {
    setVinInput('');
    setDecodedData(null);
    setErrorMsg(null);
    setCustomerName('');
    setServiceNotes('');
    setInitialPartsText('');
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                New Intake &amp; VIN Decoder
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Capture dashboard windshield plate via Camera OCR, scan door barcode, or enter 17-digit VIN
              </p>
            </div>
          </div>

          <button
            id="view-active-jobs-btn"
            onClick={onNavigateToLedger}
            className="self-start sm:self-center min-h-[48px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 text-slate-200 text-sm font-semibold flex items-center gap-2 transition"
          >
            <span>View Active Jobs</span>
            <ArrowRight className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </div>

      {/* Main Intake Form Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xl space-y-6">
        {/* VIN Input & Scanning Controls */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="vin-input-field" className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <span>Vehicle Identification Number (VIN)</span>
              <span className="text-xs font-mono font-normal text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                17 Digits
              </span>
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                id="voice-dictate-vin-btn"
                onClick={() => setIsVoiceModalOpen(true)}
                className="min-h-[36px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 hover:text-white border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                title="Speak VIN (letters, numbers, or NATO phonetic words)"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Speak VIN</span>
              </button>
              {cleanVin.length > 0 && (
                <span className={`text-xs font-mono font-medium ${cleanVin.length === 17 ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {cleanVin.length}/17
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* 17-Digit VIN Input with Direct Voice Dictation */}
            <div className="relative flex-1">
              <input
                id="vin-input-field"
                type="text"
                maxLength={17}
                placeholder="e.g. 1FTFW1ED4MFA12345"
                value={vinInput}
                onChange={(e) => {
                  setVinInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                  if (errorMsg) setErrorMsg(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleDecode();
                  }
                }}
                className="w-full min-h-[54px] px-4 pl-11 pr-28 text-base sm:text-lg font-mono font-bold tracking-wider text-white bg-slate-950 border-2 border-slate-700 rounded-xl focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 placeholder:text-slate-600 transition"
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {vinInput && (
                  <button
                    type="button"
                    onClick={() => setVinInput('')}
                    aria-label="Clear VIN"
                    className="text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 px-2 py-1 rounded cursor-pointer transition"
                  >
                    CLEAR
                  </button>
                )}
                <VoiceInputButton
                  id="voice-vin-direct-inline-btn"
                  size="sm"
                  mode="replace"
                  voiceMode="vin"
                  onTranscript={(text) => {
                    const clean = parseSpokenVin(text) || text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17);
                    if (clean) {
                      setVinInput(clean);
                      if (errorMsg) setErrorMsg(null);
                    }
                  }}
                  title="Speak VIN directly into this field (NATO words or digits supported)"
                />
              </div>
            </div>

            {/* Action Buttons: Decode & Scan */}
            <div className="flex gap-2">
              <button
                id="decode-vin-btn"
                type="button"
                onClick={() => handleDecode()}
                disabled={isLoading || cleanVin.length === 0}
                className="flex-1 sm:flex-initial min-h-[54px] px-6 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-600 disabled:border-slate-800 text-slate-950 font-bold text-base shadow-lg shadow-amber-500/20 border border-amber-400 flex items-center justify-center gap-2 transition cursor-pointer disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Decoding...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 fill-current" />
                    <span>Decode VIN</span>
                  </>
                )}
              </button>

              <button
                id="open-barcode-scanner-btn"
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="flex-1 sm:flex-initial min-h-[54px] px-5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white font-bold text-base border-2 border-slate-600 hover:border-amber-400/60 flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                title="Scan Dashboard Windshield Plate or Door Jamb Barcode via Camera"
              >
                <Camera className="w-5 h-5 text-amber-400" />
                <span className="whitespace-nowrap">Camera Scan / OCR</span>
              </button>

              <button
                id="open-voice-vin-btn"
                type="button"
                onClick={() => setIsVoiceModalOpen(true)}
                className="flex-1 sm:flex-initial min-h-[54px] px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white font-bold text-base border-2 border-slate-600 hover:border-amber-400/60 flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                title="Dictate VIN with voice or spell with NATO phonetics"
              >
                <Mic className="w-5 h-5 text-amber-400" />
                <span className="whitespace-nowrap">Voice VIN</span>
              </button>
            </div>
          </div>

          {/* Quick-Pick Test VIN Chips */}
          <div className="pt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Quick Shop Presets:
            </span>
            {SAMPLE_VINS.map((item) => (
              <button
                key={item.vin}
                type="button"
                id={`sample-preset-${item.vin}`}
                onClick={() => handleSelectSample(item.vin)}
                className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300 hover:border-amber-500/40 text-slate-300 border border-slate-700 transition"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error Feedback */}
        {errorMsg && (
          <div className="p-4 bg-rose-950/60 border border-rose-800 rounded-xl flex items-start gap-3 text-rose-200">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-rose-300 text-sm">Decoding Notice</p>
              <p className="text-xs text-rose-200/90 mt-0.5 leading-relaxed">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Decoded Vehicle Info Card */}
        {decodedData && (
          <div
            id="decoded-vehicle-card"
            className="p-5 sm:p-6 bg-slate-950 border-2 border-amber-500/40 rounded-2xl space-y-5 animate-in fade-in slide-in-from-top-2 duration-200 shadow-xl"
          >
            {/* Header / Verified Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      NHTSA Official Verified Vehicle
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {decodedData.year} {decodedData.make} {decodedData.model}
                    {decodedData.trim ? ` (${decodedData.trim})` : ''}
                  </h3>
                </div>
              </div>

              <div className="font-mono text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 self-start sm:self-auto">
                VIN: <span className="text-amber-400 font-bold">{cleanVin}</span>
              </div>
            </div>

            {/* Spec Attributes Grid (Milestone 2 Specifications) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Year */}
              <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 block font-medium">Model Year</span>
                <span className="text-base font-bold text-white mt-0.5 block">{decodedData.year}</span>
              </div>

              {/* Make & Model */}
              <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 block font-medium">Make / Model</span>
                <span className="text-base font-bold text-white mt-0.5 block truncate">
                  {decodedData.make} {decodedData.model}
                </span>
              </div>

              {/* Displacement / Engine */}
              <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 block font-medium flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-amber-400" />
                  <span>Engine (Displacement)</span>
                </span>
                <span className="text-base font-bold text-amber-400 mt-0.5 block truncate">
                  {decodedData.engine}
                </span>
              </div>

              {/* Drive Type */}
              <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 block font-medium flex items-center gap-1">
                  <Car className="w-3.5 h-3.5 text-sky-400" />
                  <span>Drive Type</span>
                </span>
                <span className="text-base font-bold text-sky-300 mt-0.5 block truncate">
                  {decodedData.drivetrain}
                </span>
              </div>
            </div>

            {/* Job Attachment Form */}
            <form onSubmit={handleLaunchJob} className="space-y-4 pt-3 border-t border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Customer Name */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="customer-name-input" className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Customer Name *
                    </label>
                    <VoiceInputButton
                      id="voice-customer-name"
                      size="sm"
                      mode="replace"
                      onTranscript={(text) => setCustomerName(text)}
                      title="Dictate Customer Name"
                    />
                  </div>
                  <input
                    id="customer-name-input"
                    type="text"
                    required
                    placeholder="e.g. Dave Miller, Sarah Jenkins"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full min-h-[48px] px-4 text-base text-white bg-slate-900 border border-slate-700 rounded-xl focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 placeholder:text-slate-600"
                  />
                </div>

                {/* Service Notes */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="service-notes-input" className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Initial Repair Symptom / Work Order
                    </label>
                    <VoiceInputButton
                      id="voice-service-notes"
                      size="sm"
                      mode="append"
                      currentValue={serviceNotes}
                      onTranscript={(text) => setServiceNotes(text)}
                      title="Dictate Symptoms & Work Order"
                    />
                  </div>
                  <input
                    id="service-notes-input"
                    type="text"
                    placeholder="e.g. Front brakes squealing, 60k tuneup, P0300 misfire"
                    value={serviceNotes}
                    onChange={(e) => setServiceNotes(e.target.value)}
                    className="w-full min-h-[48px] px-4 text-base text-white bg-slate-900 border border-slate-700 rounded-xl focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* Initial Parts Quick Entry (Optional) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="initial-parts-input" className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Initial Parts Needed (Optional - comma separated)
                  </label>
                  <VoiceInputButton
                    id="voice-initial-parts"
                    size="sm"
                    mode="append"
                    currentValue={initialPartsText}
                    onTranscript={(text) => setInitialPartsText(text)}
                    title="Dictate Parts Needed"
                  />
                </div>
                <input
                  id="initial-parts-input"
                  type="text"
                  placeholder="e.g. Front Rotors, Ceramic Brake Pads, Dot 4 Fluid"
                  value={initialPartsText}
                  onChange={(e) => setInitialPartsText(e.target.value)}
                  className="w-full min-h-[48px] px-4 text-base text-white bg-slate-900 border border-slate-700 rounded-xl focus:border-amber-400 focus:outline-none placeholder:text-slate-600"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  id="launch-active-job-btn"
                  type="submit"
                  className="flex-1 min-h-[52px] px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-lg shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <CheckCircle2 className="w-6 h-6" />
                  <span>Launch Active Job</span>
                </button>

                <button
                  type="button"
                  id="reset-intake-btn"
                  onClick={handleReset}
                  className="min-h-[52px] px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Barcode Camera Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleBarcodeScanned}
      />

      {/* Voice VIN Dictation Modal */}
      <VoiceVinModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        initialVin={vinInput}
        onVinConfirmed={(spokenVin) => {
          setVinInput(spokenVin);
          setIsVoiceModalOpen(false);
          if (spokenVin.length === 17) {
            handleDecode(spokenVin);
          }
        }}
      />
    </div>
  );
};
