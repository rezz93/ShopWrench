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
  PenLine,
  ChevronRight,
  Tag,
  Check,
} from 'lucide-react';
import { decodeVinApi, SAMPLE_VINS } from '../services/nhtsa';
import { createNewJob } from '../services/storage';
import { DecodeVinResponse, Job } from '../types';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { VoiceInputButton } from './VoiceInputButton';
import { VoiceVinModal } from './VoiceVinModal';
import { parseSpokenVin, formatAndParseVin } from '../utils/natoPhonetic';

interface VinIntakeScannerProps {
  onJobCreated: (newJob: Job) => void;
  onNavigateToLedger: () => void;
}

// Popular quick chips for manual vehicle entry
const POPULAR_YEARS = [
  '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018',
  '2017', '2016', '2015', '2012', '2010', '2005', '2000', '1995'
];

const POPULAR_MAKES = [
  'Ford', 'Chevrolet', 'Toyota', 'Honda', 'GMC', 'Ram', 'Jeep',
  'Subaru', 'Nissan', 'Dodge', 'Hyundai', 'Kia', 'BMW', 'Volkswagen'
];

const POPULAR_STYLES = [
  'Crew Cab', 'Extended Cab', 'Regular Cab', 'Sedan', 'SUV', 'Crossover',
  'Coupe', 'Hatchback', 'Wagon', 'Van / Minivan', 'Convertible'
];

const COMMON_ENGINES = [
  '5.3L V8', '3.5L V6 Turbo', '2.0L 4-Cyl Turbo', '2.5L 4-Cyl',
  '3.6L V6', '5.0L V8', '5.7L V8 HEMI', '6.7L Turbo Diesel', 'Electric / EV'
];

const DRIVETRAIN_OPTIONS = ['4WD / 4x4', 'AWD', 'FWD', 'RWD', 'Standard'];
const FUEL_OPTIONS = ['Gasoline', 'Diesel', 'Hybrid', 'Electric', 'Flex Fuel'];

export const VinIntakeScanner: React.FC<VinIntakeScannerProps> = ({
  onJobCreated,
  onNavigateToLedger,
}) => {
  // Intake mode: 'vin' for barcode/OCR/NHTSA decoder, 'manual' for direct Year/Make/Model/Style entry
  const [intakeMode, setIntakeMode] = useState<'vin' | 'manual'>('vin');

  // VIN Mode State
  const [vinInput, setVinInput] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [serviceNotes, setServiceNotes] = useState('');
  const [initialPartsText, setInitialPartsText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [decodedData, setDecodedData] = useState<DecodeVinResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // Manual Vehicle Entry State
  const [manualYear, setManualYear] = useState('');
  const [manualMake, setManualMake] = useState('');
  const [manualModel, setManualModel] = useState('');
  const [manualStyle, setManualStyle] = useState(''); // Body Style / Trim (Crew Cab, Sedan, SUV, etc.)
  const [manualEngine, setManualEngine] = useState('');
  const [manualDrivetrain, setManualDrivetrain] = useState('4WD / 4x4');
  const [manualFuel, setManualFuel] = useState('Gasoline');
  const [manualOptionalVin, setManualOptionalVin] = useState('');
  const [keyboardSpeechNotice, setKeyboardSpeechNotice] = useState(false);

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
    // Automatically execute NHTSA API decoder loop without requiring a second click
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
        style: decodedData.bodyClass || decodedData.trim || '',
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

  // Launch job using manually entered vehicle info (No VIN required)
  const handleLaunchManualJob = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanYear = manualYear.trim();
    const cleanMake = manualMake.trim();
    const cleanModel = manualModel.trim();
    const cleanCustomer = customerName.trim();

    if (!cleanYear) {
      setErrorMsg('Please enter or select a vehicle Model Year (e.g. 2021).');
      return;
    }
    if (!cleanMake) {
      setErrorMsg('Please enter or select a vehicle Make (e.g. Ford, Chevrolet, Toyota).');
      return;
    }
    if (!cleanModel) {
      setErrorMsg('Please enter the vehicle Model (e.g. F-150, Silverado, Camry).');
      return;
    }

    // Split initial parts comma-separated or newline
    const initialParts = initialPartsText
      .split(/[\n,]/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const cleanOptionalVin = manualOptionalVin.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    const newJob = createNewJob({
      customer_name: cleanCustomer || 'Walk-in Customer',
      vin: cleanOptionalVin,
      vehicle_details: {
        year: cleanYear,
        make: cleanMake,
        model: cleanModel,
        style: manualStyle.trim(),
        trim: manualStyle.trim(),
        bodyClass: manualStyle.trim() || 'Standard Body Style',
        engine: manualEngine.trim() || 'Standard Engine',
        drivetrain: manualDrivetrain.trim() || 'Standard Drive',
        fuelType: manualFuel.trim() || 'Gasoline',
        rawVin: cleanOptionalVin || 'Manual Entry (No VIN)',
      },
      service_notes: serviceNotes,
      initial_parts: initialParts,
    });

    // Reset manual form
    setManualYear('');
    setManualMake('');
    setManualModel('');
    setManualStyle('');
    setManualEngine('');
    setManualOptionalVin('');
    setCustomerName('');
    setServiceNotes('');
    setInitialPartsText('');
    setErrorMsg(null);

    // Transition directly into the active job workspace
    onJobCreated(newJob);
  };

  const handleReset = () => {
    setVinInput('');
    setDecodedData(null);
    setErrorMsg(null);
    setCustomerName('');
    setServiceNotes('');
    setInitialPartsText('');
    setManualYear('');
    setManualMake('');
    setManualModel('');
    setManualStyle('');
    setManualEngine('');
    setManualOptionalVin('');
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
                New Vehicle Job Intake
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Scan VIN barcode/plate OCR, or manually enter Year, Make, Model &amp; Style without needing a VIN
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

      {/* Mode Switcher Tabs: VIN Scanner vs. Manual Vehicle Entry */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-md">
        <button
          type="button"
          id="intake-mode-vin-tab"
          onClick={() => {
            setIntakeMode('vin');
            setErrorMsg(null);
          }}
          className={`min-h-[50px] px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 transition cursor-pointer ${
            intakeMode === 'vin'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-black'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>VIN Scanner &amp; Decoder</span>
        </button>

        <button
          type="button"
          id="intake-mode-manual-tab"
          onClick={() => {
            setIntakeMode('manual');
            setErrorMsg(null);
          }}
          className={`min-h-[50px] px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 transition cursor-pointer ${
            intakeMode === 'manual'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-black'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <PenLine className="w-4 h-4" />
          <span>Manual Vehicle Entry (No VIN Needed)</span>
        </button>
      </div>

      {/* MODE 1: VIN SCANNER & DECODER */}
      {intakeMode === 'vin' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xl space-y-6 animate-in fade-in duration-150">
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
                  onClick={() => {
                    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
                      document.activeElement.blur();
                    }
                    setIsVoiceModalOpen(true);
                  }}
                  className="min-h-[36px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 hover:text-white border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                  title="Speak VIN (App Mic, Gemini AI, or Phone Keyboard)"
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
                  maxLength={80}
                  placeholder="e.g. 1FTFW1ED4MFA12345 or speak letters..."
                  value={vinInput}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const { vin, isConvertedFromSpeech } = formatAndParseVin(raw);
                    setVinInput(vin);
                    if (isConvertedFromSpeech) {
                      setKeyboardSpeechNotice(true);
                      setTimeout(() => setKeyboardSpeechNotice(false), 5000);
                    }
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
                      onClick={() => {
                        setVinInput('');
                        setKeyboardSpeechNotice(false);
                      }}
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
                      const { vin } = formatAndParseVin(text);
                      if (vin) {
                        setVinInput(vin);
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
                  onClick={() => {
                    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
                      document.activeElement.blur();
                    }
                    setIsVoiceModalOpen(true);
                  }}
                  className="flex-1 sm:flex-initial min-h-[54px] px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white font-bold text-base border-2 border-slate-600 hover:border-amber-400/60 flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                  title="Dictate VIN with voice or spell with NATO phonetics"
                >
                  <Mic className="w-5 h-5 text-amber-400" />
                  <span className="whitespace-nowrap">Voice VIN</span>
                </button>
              </div>
            </div>

            {/* Keyboard Speech Converted Notice */}
            {keyboardSpeechNotice && (
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800/80 px-3.5 py-2 rounded-xl animate-in fade-in duration-150">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Converted spoken words/spaces from your phone keyboard into a clean VIN! ({cleanVin.length}/17)</span>
              </div>
            )}

            {/* Phone Dictation Guidance */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-0.5">
              <span>
                💡 <strong>Phone Tip:</strong> Tap the box &amp; press 🎙️ on your <strong>phone keyboard</strong> to dictate, or tap <strong>Speak VIN</strong> for the hands-free app mic.
              </span>
            </div>

            {/* Helper: Switch to Manual Entry if No VIN */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pt-1 border-t border-slate-800/80">
              <span>Don&apos;t have a 17-digit VIN or working on a custom/classic vehicle?</span>
              <button
                type="button"
                id="switch-to-manual-prompt-btn"
                onClick={() => {
                  setIntakeMode('manual');
                  setErrorMsg(null);
                }}
                className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer transition underline underline-offset-2"
              >
                <span>Switch to Manual Vehicle Entry (Year / Make / Model / Style)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
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
                <p className="font-semibold text-rose-300 text-sm">Notice</p>
                <p className="text-xs text-rose-200/90 mt-0.5 leading-relaxed">{errorMsg}</p>
                <button
                  type="button"
                  onClick={() => setIntakeMode('manual')}
                  className="mt-2 text-xs font-bold text-amber-300 hover:text-amber-200 underline flex items-center gap-1"
                >
                  <span>Or start this job using Manual Vehicle Entry without a VIN</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
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

              {/* Spec Attributes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 block font-medium">Model Year</span>
                  <span className="text-base font-bold text-white mt-0.5 block">{decodedData.year}</span>
                </div>

                <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 block font-medium">Make / Model</span>
                  <span className="text-base font-bold text-white mt-0.5 block truncate">
                    {decodedData.make} {decodedData.model}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 block font-medium flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5 text-amber-400" />
                    <span>Engine</span>
                  </span>
                  <span className="text-base font-bold text-amber-400 mt-0.5 block truncate">
                    {decodedData.engine}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 block font-medium flex items-center gap-1">
                    <Car className="w-3.5 h-3.5 text-sky-400" />
                    <span>Drive Type</span>
                  </span>
                  <span className="text-base font-bold text-sky-300 mt-0.5 block truncate">
                    {decodedData.drivetrain || 'Standard'}
                  </span>
                </div>
              </div>

              {/* Secondary Details (Trim, Body Style, Fuel) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/80">
                  <span className="text-slate-400">Trim Level: </span>
                  <span className="text-slate-200 font-semibold">{decodedData.trim || 'Standard Series'}</span>
                </div>
                <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/80">
                  <span className="text-slate-400">Body Style: </span>
                  <span className="text-slate-200 font-semibold">{decodedData.bodyClass || 'Passenger'}</span>
                </div>
                <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/80">
                  <span className="text-slate-400">Fuel System: </span>
                  <span className="text-slate-200 font-semibold">{decodedData.fuelType || 'Gasoline'}</span>
                </div>
              </div>

              {/* Work Order & Customer Launch Form */}
              <form onSubmit={handleLaunchJob} className="pt-4 border-t border-slate-800 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="customer-name-field" className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Customer Name *
                      </label>
                      <VoiceInputButton
                        id="voice-customer-name-btn"
                        size="sm"
                        mode="replace"
                        onTranscript={(text) => setCustomerName(text)}
                        title="Dictate Customer Name"
                      />
                    </div>
                    <input
                      id="customer-name-field"
                      type="text"
                      required
                      placeholder="e.g. John Doe, Miller Fleet #4"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full min-h-[48px] px-4 text-base text-white bg-slate-900 border border-slate-700 rounded-xl focus:border-amber-400 focus:outline-none placeholder:text-slate-600"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="service-notes-field" className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Initial Symptom / Work Order
                      </label>
                      <VoiceInputButton
                        id="voice-service-notes-btn"
                        size="sm"
                        mode="replace"
                        onTranscript={(text) => setServiceNotes(text)}
                        title="Dictate Repair Symptoms"
                      />
                    </div>
                    <input
                      id="service-notes-field"
                      type="text"
                      placeholder="e.g. Grinding brakes, check engine light P0300"
                      value={serviceNotes}
                      onChange={(e) => setServiceNotes(e.target.value)}
                      className="w-full min-h-[48px] px-4 text-base text-white bg-slate-900 border border-slate-700 rounded-xl focus:border-amber-400 focus:outline-none placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="initial-parts-field" className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Initial Parts Needed (Optional, comma-separated)
                    </label>
                    <VoiceInputButton
                      id="voice-initial-parts-btn"
                      size="sm"
                      mode="append"
                      onTranscript={(text) => {
                        setInitialPartsText((prev) => (prev ? `${prev}, ${text}` : text));
                      }}
                      title="Dictate Parts Needed"
                    />
                  </div>
                  <input
                    id="initial-parts-field"
                    type="text"
                    placeholder="e.g. Front Brake Rotors, Ceramic Brake Pads, Oil Filter"
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
      )}

      {/* MODE 2: MANUAL VEHICLE ENTRY (NO VIN REQUIRED) */}
      {intakeMode === 'manual' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xl space-y-6 animate-in fade-in duration-150">
          {/* Header Description & Switcher Link */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                  Manual Entry Mode
                </span>
                <span className="text-xs text-slate-400">No VIN Required</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white mt-1">
                Enter Vehicle Year, Make, Model &amp; Style
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                All RockAuto, OEM Dealership, and Google Shopping catalogs will search using these vehicle specs
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIntakeMode('vin')}
              className="self-start sm:self-center text-xs font-semibold px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 transition cursor-pointer shrink-0"
            >
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              <span>Have a VIN? Switch to Scanner</span>
            </button>
          </div>

          {/* Error Feedback */}
          {errorMsg && (
            <div className="p-4 bg-rose-950/60 border border-rose-800 rounded-xl flex items-start gap-3 text-rose-200">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-rose-300 text-sm">Entry Requirement</p>
                <p className="text-xs text-rose-200/90 mt-0.5 leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLaunchManualJob} className="space-y-6">
            {/* Primary Vehicle Specifications Grid */}
            <div className="space-y-5">
              {/* Row 1: Model Year & Make */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Field 1: Model Year */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="manual-year-input" className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                      <span>Model Year *</span>
                      <span className="text-slate-500 font-normal">(e.g. 2022)</span>
                    </label>
                    <VoiceInputButton
                      id="voice-manual-year-btn"
                      size="sm"
                      mode="replace"
                      onTranscript={(text) => {
                        const digits = text.replace(/[^0-9]/g, '');
                        if (digits) setManualYear(digits.slice(0, 4));
                      }}
                      title="Speak Year"
                    />
                  </div>
                  <input
                    id="manual-year-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    required
                    placeholder="e.g. 2022"
                    value={manualYear}
                    onChange={(e) => {
                      setManualYear(e.target.value.replace(/[^0-9]/g, ''));
                      if (errorMsg) setErrorMsg(null);
                    }}
                    className="w-full min-h-[50px] px-4 text-base font-bold text-white bg-slate-950 border-2 border-slate-700 rounded-xl focus:border-amber-400 focus:outline-none placeholder:text-slate-600 font-mono"
                  />
                  {/* Quick Year Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {POPULAR_YEARS.slice(0, 10).map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => setManualYear(yr)}
                        className={`text-[11px] font-semibold px-2 py-1 rounded-lg transition cursor-pointer ${
                          manualYear === yr
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80'
                        }`}
                      >
                        {yr}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Field 2: Vehicle Make */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="manual-make-input" className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                      <span>Vehicle Make *</span>
                      <span className="text-slate-500 font-normal">(Manufacturer)</span>
                    </label>
                    <VoiceInputButton
                      id="voice-manual-make-btn"
                      size="sm"
                      mode="replace"
                      onTranscript={(text) => setManualMake(text)}
                      title="Speak Make"
                    />
                  </div>
                  <input
                    id="manual-make-input"
                    type="text"
                    required
                    placeholder="e.g. Ford, Chevrolet, Toyota, Honda..."
                    value={manualMake}
                    onChange={(e) => {
                      setManualMake(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    className="w-full min-h-[50px] px-4 text-base font-bold text-white bg-slate-950 border-2 border-slate-700 rounded-xl focus:border-amber-400 focus:outline-none placeholder:text-slate-600"
                  />
                  {/* Quick Make Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {POPULAR_MAKES.map((mk) => (
                      <button
                        key={mk}
                        type="button"
                        onClick={() => setManualMake(mk)}
                        className={`text-[11px] font-semibold px-2 py-1 rounded-lg transition cursor-pointer ${
                          manualMake.toLowerCase() === mk.toLowerCase()
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80'
                        }`}
                      >
                        {mk}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 2: Model & Style / Trim */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Field 3: Vehicle Model */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="manual-model-input" className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                      <span>Vehicle Model *</span>
                      <span className="text-slate-500 font-normal">(e.g. F-150, Silverado, Camry)</span>
                    </label>
                    <VoiceInputButton
                      id="voice-manual-model-btn"
                      size="sm"
                      mode="replace"
                      onTranscript={(text) => setManualModel(text)}
                      title="Speak Model"
                    />
                  </div>
                  <input
                    id="manual-model-input"
                    type="text"
                    required
                    placeholder="e.g. F-150, Silverado 1500, Camry, Civic, Sierra..."
                    value={manualModel}
                    onChange={(e) => {
                      setManualModel(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    className="w-full min-h-[50px] px-4 text-base font-bold text-white bg-slate-950 border-2 border-slate-700 rounded-xl focus:border-amber-400 focus:outline-none placeholder:text-slate-600"
                  />
                </div>

                {/* Field 4: Vehicle Style / Trim / Body Style (Explicitly requested) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="manual-style-input" className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                      <span>Style / Trim / Body Style *</span>
                      <span className="text-amber-400 font-normal">(e.g. Crew Cab, Sedan, SUV)</span>
                    </label>
                    <VoiceInputButton
                      id="voice-manual-style-btn"
                      size="sm"
                      mode="replace"
                      onTranscript={(text) => setManualStyle(text)}
                      title="Speak Vehicle Style"
                    />
                  </div>
                  <input
                    id="manual-style-input"
                    type="text"
                    placeholder="e.g. Crew Cab, Extended Cab, Sedan, SUV, Limited, XLT..."
                    value={manualStyle}
                    onChange={(e) => setManualStyle(e.target.value)}
                    className="w-full min-h-[50px] px-4 text-base font-bold text-white bg-slate-950 border-2 border-slate-700 rounded-xl focus:border-amber-400 focus:outline-none placeholder:text-slate-600"
                  />
                  {/* Quick Style Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {POPULAR_STYLES.map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setManualStyle(st)}
                        className={`text-[11px] font-semibold px-2 py-1 rounded-lg transition cursor-pointer ${
                          manualStyle.toLowerCase() === st.toLowerCase()
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 3: Engine Displacement & Drivetrain */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Field 5: Engine / Displacement */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="manual-engine-input" className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-amber-400" />
                      <span>Engine / Displacement (Optional)</span>
                    </label>
                    <VoiceInputButton
                      id="voice-manual-engine-btn"
                      size="sm"
                      mode="replace"
                      onTranscript={(text) => setManualEngine(text)}
                      title="Speak Engine Displacement"
                    />
                  </div>
                  <input
                    id="manual-engine-input"
                    type="text"
                    placeholder="e.g. 5.3L V8, 3.5L V6 Turbo, 2.0L 4-Cyl, 6.7L Diesel..."
                    value={manualEngine}
                    onChange={(e) => setManualEngine(e.target.value)}
                    className="w-full min-h-[48px] px-4 text-sm font-semibold text-white bg-slate-950 border border-slate-700 rounded-xl focus:border-amber-400 focus:outline-none placeholder:text-slate-600"
                  />
                  {/* Quick Engine Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {COMMON_ENGINES.map((eng) => (
                      <button
                        key={eng}
                        type="button"
                        onClick={() => setManualEngine(eng)}
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg transition cursor-pointer ${
                          manualEngine === eng
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80'
                        }`}
                      >
                        {eng}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Field 6: Drivetrain & Fuel Type */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5">
                      Drivetrain (Optional)
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {DRIVETRAIN_OPTIONS.map((dt) => (
                        <button
                          key={dt}
                          type="button"
                          onClick={() => setManualDrivetrain(dt)}
                          className={`min-h-[40px] px-2 text-xs font-bold rounded-xl transition cursor-pointer text-center ${
                            manualDrivetrain === dt
                              ? 'bg-sky-500 text-slate-950 shadow-md font-black'
                              : 'bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          {dt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5">
                      Fuel System (Optional)
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {FUEL_OPTIONS.map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setManualFuel(f)}
                          className={`min-h-[38px] px-2 text-xs font-semibold rounded-xl transition cursor-pointer text-center ${
                            manualFuel === f
                              ? 'bg-emerald-500 text-slate-950 font-bold'
                              : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Field 7: Optional Partial or Classic VIN */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="manual-opt-vin-input" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    <span>VIN (Optional - leave blank if unknown or none)</span>
                  </label>
                  <VoiceInputButton
                    id="voice-manual-opt-vin-btn"
                    size="sm"
                    mode="replace"
                    voiceMode="vin"
                    onTranscript={(text) => {
                      const { vin } = formatAndParseVin(text);
                      setManualOptionalVin(vin);
                    }}
                    title="Speak Optional VIN"
                  />
                </div>
                <input
                  id="manual-opt-vin-input"
                  type="text"
                  maxLength={80}
                  placeholder="Leave empty, or speak/enter partial or classic VIN..."
                  value={manualOptionalVin}
                  onChange={(e) => {
                    const { vin } = formatAndParseVin(e.target.value);
                    setManualOptionalVin(vin);
                  }}
                  className="w-full min-h-[44px] px-4 text-xs font-mono text-white bg-slate-900 border border-slate-700/80 rounded-lg focus:border-amber-400 focus:outline-none placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Live Vehicle Preview Card */}
            {(manualYear || manualMake || manualModel) && (
              <div className="p-4 bg-slate-950 border-2 border-amber-500/40 rounded-xl space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    Target Vehicle Preview (Ready to Launch)
                  </span>
                  <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-bold">
                    Manual Specification
                  </span>
                </div>
                <div className="text-lg sm:text-xl font-black text-white">
                  {manualYear || 'Year'} {manualMake || 'Make'} {manualModel || 'Model'}
                  {manualStyle ? (
                    <span className="text-amber-400 ml-2 font-bold text-base">({manualStyle})</span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span>Engine: <strong className="text-slate-200">{manualEngine || 'Standard Engine'}</strong></span>
                  <span>•</span>
                  <span>Drive: <strong className="text-slate-200">{manualDrivetrain}</strong></span>
                  <span>•</span>
                  <span>Fuel: <strong className="text-slate-200">{manualFuel}</strong></span>
                  {manualOptionalVin && (
                    <>
                      <span>•</span>
                      <span className="font-mono text-amber-300">VIN: {manualOptionalVin}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Customer & Work Order Details */}
            <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Customer &amp; Work Order Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="manual-customer-name" className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Customer Name *
                    </label>
                    <VoiceInputButton
                      id="voice-manual-customer-btn"
                      size="sm"
                      mode="replace"
                      onTranscript={(text) => setCustomerName(text)}
                      title="Dictate Customer Name"
                    />
                  </div>
                  <input
                    id="manual-customer-name"
                    type="text"
                    required
                    placeholder="e.g. Jane Smith, Ace Fleet Services"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full min-h-[48px] px-4 text-base text-white bg-slate-900 border border-slate-700 rounded-xl focus:border-amber-400 focus:outline-none placeholder:text-slate-600"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="manual-service-notes" className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Initial Symptom / Work Order
                    </label>
                    <VoiceInputButton
                      id="voice-manual-notes-btn"
                      size="sm"
                      mode="replace"
                      onTranscript={(text) => setServiceNotes(text)}
                      title="Dictate Repair Symptoms"
                    />
                  </div>
                  <input
                    id="manual-service-notes"
                    type="text"
                    placeholder="e.g. Brake grinding on front right, oil service, tune-up"
                    value={serviceNotes}
                    onChange={(e) => setServiceNotes(e.target.value)}
                    className="w-full min-h-[48px] px-4 text-base text-white bg-slate-900 border border-slate-700 rounded-xl focus:border-amber-400 focus:outline-none placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="manual-initial-parts" className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Initial Parts Needed (Optional, comma-separated)
                  </label>
                  <VoiceInputButton
                    id="voice-manual-parts-btn"
                    size="sm"
                    mode="append"
                    onTranscript={(text) => {
                      setInitialPartsText((prev) => (prev ? `${prev}, ${text}` : text));
                    }}
                    title="Dictate Parts Needed"
                  />
                </div>
                <input
                  id="manual-initial-parts"
                  type="text"
                  placeholder="e.g. Front Ceramic Brake Pads, Rotors, Serpentine Belt, Spark Plugs"
                  value={initialPartsText}
                  onChange={(e) => setInitialPartsText(e.target.value)}
                  className="w-full min-h-[48px] px-4 text-base text-white bg-slate-900 border border-slate-700 rounded-xl focus:border-amber-400 focus:outline-none placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Launch Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                id="launch-manual-job-btn"
                type="submit"
                className="flex-1 min-h-[52px] px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-lg shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <CheckCircle2 className="w-6 h-6" />
                <span>Launch Active Job (Manual Entry)</span>
              </button>

              <button
                type="button"
                id="reset-manual-intake-btn"
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
