import React, { useState, useEffect } from 'react';
import { Mic, MicOff, AlertCircle, CheckCircle2, RotateCcw, Check, Sparkles, X, Volume2 } from 'lucide-react';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { parseSpokenVin } from '../utils/natoPhonetic';

interface VoiceVinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVinConfirmed: (vin: string) => void;
  initialVin?: string;
}

export const VoiceVinModal: React.FC<VoiceVinModalProps> = ({
  isOpen,
  onClose,
  onVinConfirmed,
  initialVin = '',
}) => {
  const [spokenText, setSpokenText] = useState('');
  const [parsedVin, setParsedVin] = useState(initialVin);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { isListening, isSupported, startListening, stopListening, toggleListening } = useVoiceInput({
    continuous: true,
    onResult: (transcript) => {
      setSpokenText(transcript);
      const converted = parseSpokenVin(transcript);
      if (converted) {
        setParsedVin(converted);
      }
    },
    onError: (err) => {
      setErrorMessage(err);
    },
  });

  // Auto-start microphone when opened
  useEffect(() => {
    if (isOpen) {
      setSpokenText('');
      setParsedVin(initialVin);
      setErrorMessage(null);
      if (isSupported) {
        startListening();
      }
    } else {
      stopListening();
    }
  }, [isOpen, initialVin, isSupported, startListening, stopListening]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (parsedVin.length > 0) {
      stopListening();
      onVinConfirmed(parsedVin);
      onClose();
    }
  };

  const handleReset = () => {
    setSpokenText('');
    setParsedVin('');
    setErrorMessage(null);
    startListening();
  };

  return (
    <div
      id="voice-vin-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col p-5 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight">
                Voice VIN Dictation
              </h3>
              <p className="text-xs text-slate-400">
                Speak digits, letters, or NATO phonetics (e.g. &quot;Alpha One Charlie&quot;)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Mic Animation & Status */}
        <div className="flex flex-col items-center justify-center py-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
          <button
            type="button"
            onClick={toggleListening}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xl ${
              isListening
                ? 'bg-rose-500 text-white shadow-rose-500/30 scale-105 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-2 border-slate-600'
            }`}
          >
            {isListening ? (
              <Mic className="w-9 h-9 text-white animate-bounce" />
            ) : (
              <MicOff className="w-9 h-9 text-slate-400" />
            )}
          </button>

          <div className="text-center space-y-1">
            <span
              className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                isListening
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {isListening ? 'Listening to speech...' : 'Microphone Paused (Tap to Speak)'}
            </span>
            {spokenText && (
              <p className="text-xs text-slate-400 italic max-w-sm px-4 truncate">
                &ldquo;{spokenText}&rdquo;
              </p>
            )}
          </div>
        </div>

        {/* Decoded VIN Display */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span>Recognized VIN:</span>
            <span className={`font-mono ${parsedVin.length === 17 ? 'text-emerald-400 font-black' : 'text-amber-400'}`}>
              {parsedVin.length}/17 characters
            </span>
          </div>

          <div className="relative">
            <input
              type="text"
              maxLength={17}
              value={parsedVin}
              onChange={(e) => setParsedVin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="Spoken VIN will appear here..."
              className="w-full text-center font-mono text-xl sm:text-2xl font-black tracking-widest text-white bg-slate-950 border-2 border-amber-500/80 rounded-xl py-3 px-3 shadow-inner focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <p className="text-[11px] text-slate-500 text-center">
            Tap and edit any character above if needed.
          </p>
        </div>

        {/* Error notification & Android Chrome Permission Guide */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-950/70 border border-rose-800 rounded-2xl space-y-2 text-rose-200 text-xs">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-rose-300">Voice Recognition / Permission Error</p>
                <p className="text-rose-200/90 leading-relaxed">{errorMessage}</p>
              </div>
            </div>

            {/* Android PWA / Chrome Permissions Explanation */}
            <div className="pt-2 border-t border-rose-900/60 text-[11px] text-rose-200/80 space-y-1">
              <p className="font-semibold text-rose-300">Why does phone settings show "No permissions"?</p>
              <p className="leading-relaxed">
                Installed web apps on Android inherit permissions from <strong>Google Chrome</strong>, not phone system settings.
              </p>
              <p className="leading-relaxed">
                <strong>To enable:</strong> In Chrome, tap the 🔒 or ⚙ icon in the address bar (or Chrome Menu → Settings → Site settings → Microphone) and tap <strong>Allow</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Quick Insert for Customer Truck */}
        <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-2">
          <div className="text-[11px] text-slate-300">
            <span className="font-bold text-amber-300 block">Customer Truck Detected:</span>
            <span className="font-mono text-xs text-white">1GTH6BEN9J1101728</span>
            <span className="text-slate-400 text-[10px] ml-1.5">(2018 GMC Canyon)</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setParsedVin('1GTH6BEN9J1101728');
              setErrorMessage(null);
            }}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow transition"
          >
            Insert VIN
          </button>
        </div>

        {/* Examples / Help */}
        <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
          <span className="font-bold text-slate-300 flex items-center gap-1">
            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            Tips for accurate speech recognition:
          </span>
          <p className="text-slate-400 leading-relaxed">
            • Speak clearly: <span className="text-amber-300 font-mono">1 G T H 6 B E N 9 J...</span>
            <br />
            • Or NATO words: <span className="text-amber-300">One Golf Tango Hotel Six Bravo...</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleReset}
            className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Clear</span>
          </button>

          <button
            type="button"
            disabled={parsedVin.length === 0}
            onClick={handleConfirm}
            className="flex-1 min-h-[48px] px-6 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:cursor-not-allowed"
          >
            <Check className="w-5 h-5 stroke-[3]" />
            <span>Use This VIN</span>
          </button>
        </div>
      </div>
    </div>
  );
};
