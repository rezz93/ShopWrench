import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  AlertCircle,
  RotateCcw,
  Check,
  X,
  Volume2,
  Loader2,
  Square,
  Sparkles,
  Radio,
  Delete,
  Keyboard,
  Music,
  HelpCircle,
} from 'lucide-react';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { parseSpokenVin, formatAndParseVin } from '../utils/natoPhonetic';

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
  const [activeTab, setActiveTab] = useState<'live' | 'ai' | 'keyboard'>('live');
  const [spokenText, setSpokenText] = useState('');
  const [parsedVin, setParsedVin] = useState(initialVin);
  const [keyboardSpeechDraft, setKeyboardSpeechDraft] = useState('');
  const [convertedNotice, setConvertedNotice] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const keyboardInputRef = useRef<HTMLTextAreaElement | null>(null);

  const {
    isListening,
    isAiRecording,
    isProcessing,
    startListening,
    stopListening,
    startAiRecording,
    stopAiRecording,
  } = useVoiceInput({
    continuous: true,
    mode: 'vin',
    onResult: (transcript) => {
      setSpokenText(transcript);
      if (transcript) {
        setParsedVin(transcript);
        setErrorMessage(null);
      }
    },
    onError: (err) => {
      setErrorMessage(err);
    },
  });

  // Safe reset when modal opens or closes without auto-triggering microphone
  useEffect(() => {
    if (isOpen) {
      setSpokenText('');
      setParsedVin(initialVin);
      setKeyboardSpeechDraft('');
      setConvertedNotice(false);
      setErrorMessage(null);
    } else {
      stopListening();
      stopAiRecording();
    }
  }, [isOpen, initialVin, stopListening, stopAiRecording]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (parsedVin.length > 0) {
      stopListening();
      stopAiRecording();
      onVinConfirmed(parsedVin);
      onClose();
    }
  };

  const handleReset = () => {
    setSpokenText('');
    setParsedVin('');
    setKeyboardSpeechDraft('');
    setConvertedNotice(false);
    setErrorMessage(null);
  };

  const handleBackspace = () => {
    setParsedVin((prev) => prev.slice(0, -1));
  };

  const toggleLiveMic = () => {
    // Blur active elements so phone keyboard dismisses
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    if (isListening) {
      stopListening();
    } else {
      startListening(parsedVin);
    }
  };

  const toggleAiRecording = () => {
    // Blur active elements so phone keyboard dismisses
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    if (isAiRecording) {
      stopAiRecording();
    } else {
      startAiRecording();
    }
  };

  // Handle direct keyboard dictation in the dedicated keyboard tab
  const handleKeyboardDictationInput = (raw: string) => {
    setKeyboardSpeechDraft(raw);
    const { vin, isConvertedFromSpeech } = formatAndParseVin(raw);
    if (vin) {
      setParsedVin(vin);
      if (isConvertedFromSpeech) {
        setConvertedNotice(true);
      }
    }
  };

  return (
    <div
      id="voice-vin-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col p-5 sm:p-6 space-y-4 max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight">
                Speak Vehicle VIN
              </h3>
              <p className="text-xs text-slate-400">
                Choose App Microphone or Phone Keyboard Mic
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

        {/* 3-Way Mode Selector Tabs: App Live Mic vs Gemini AI vs Phone Keyboard Mic */}
        <div className="grid grid-cols-3 p-1 bg-slate-950/90 rounded-xl border border-slate-800 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => {
              stopAiRecording();
              setActiveTab('live');
            }}
            className={`py-2 px-1.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer text-center ${
              activeTab === 'live'
                ? 'bg-amber-500 text-slate-950 font-black shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">⚡ App Mic</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopListening();
              setActiveTab('ai');
            }}
            className={`py-2 px-1.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer text-center ${
              activeTab === 'ai'
                ? 'bg-purple-600 text-white font-black shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">🧠 Gemini AI</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopListening();
              stopAiRecording();
              setActiveTab('keyboard');
              setTimeout(() => keyboardInputRef.current?.focus(), 100);
            }}
            className={`py-2 px-1.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer text-center ${
              activeTab === 'keyboard'
                ? 'bg-sky-500 text-slate-950 font-black shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">⌨️ Phone Mic</span>
          </button>
        </div>

        {/* TAB 1: Live App Mic */}
        {activeTab === 'live' && (
          <div className="flex flex-col items-center justify-center py-5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3 animate-in fade-in duration-150">
            <button
              type="button"
              onClick={toggleLiveMic}
              disabled={isProcessing}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xl ${
                isListening
                  ? 'bg-rose-500 text-white shadow-rose-500/40 scale-105 animate-pulse'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-amber-500/20 hover:scale-105'
              }`}
            >
              {isListening ? (
                <Square className="w-8 h-8 text-white fill-current" />
              ) : (
                <Mic className="w-9 h-9 text-slate-950" />
              )}
            </button>

            <div className="text-center space-y-1">
              <span
                className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                  isListening
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                {isListening
                  ? parsedVin.length > 0
                    ? `Live: ${parsedVin.length}/17 Characters`
                    : 'App Mic Listening... Speak letters or NATO words'
                  : 'Tap Big Mic to Speak'}
              </span>
              {spokenText && (
                <p className="text-xs text-slate-400 italic max-w-sm px-4 truncate">
                  &ldquo;{spokenText}&rdquo;
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              {isListening ? (
                <button
                  type="button"
                  onClick={stopListening}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer transition"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Done Speaking (Release Mic)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => startListening(parsedVin)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 hover:border-amber-400/50 text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer transition"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Start App Microphone</span>
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-500 flex items-center gap-1">
              <span>Keeps listening through pauses. Stops at 17 characters, when you tap Stop, or after 10s of silence. Tap again to add more.</span>
            </p>
          </div>
        )}

        {/* TAB 2: Gemini AI Audio (Best when Spotify or loud shop background noise is playing) */}
        {activeTab === 'ai' && (
          <div className="flex flex-col items-center justify-center py-5 bg-slate-950/80 rounded-2xl border border-purple-900/40 space-y-3 animate-in fade-in duration-150">
            <button
              type="button"
              onClick={toggleAiRecording}
              disabled={isProcessing}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xl ${
                isProcessing
                  ? 'bg-purple-600/30 text-purple-300 border-2 border-purple-400 cursor-wait'
                  : isAiRecording
                  ? 'bg-rose-600 text-white shadow-rose-600/50 scale-105 animate-pulse'
                  : 'bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-purple-600/30 hover:scale-105'
              }`}
            >
              {isProcessing ? (
                <Loader2 className="w-9 h-9 text-purple-300 animate-spin" />
              ) : isAiRecording ? (
                <Square className="w-8 h-8 text-white fill-current" />
              ) : (
                <Sparkles className="w-9 h-9 text-white" />
              )}
            </button>

            <div className="text-center space-y-1">
              <span
                className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                  isProcessing
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : isAiRecording
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-purple-950/60 text-purple-300 border border-purple-800'
                }`}
              >
                {isProcessing
                  ? 'Gemini AI Extracting VIN...'
                  : isAiRecording
                  ? 'Recording Audio... Tap to Stop & Decode'
                  : 'Tap to Record Spoken VIN for AI'}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              {isAiRecording ? (
                <button
                  type="button"
                  onClick={stopAiRecording}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer transition"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop & Decode with AI</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startAiRecording}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-700 hover:border-purple-400 text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Record for AI Analysis</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-purple-300/80 bg-purple-950/40 px-3 py-1.5 rounded-xl border border-purple-900/50 text-center max-w-sm">
              <Music className="w-3.5 h-3.5 shrink-0 text-purple-400" />
              <span>
                <strong>Best when Spotify or shop music is playing:</strong> Single-stream recording avoids audio ducking oscillation and isolates spoken VIN from music.
              </span>
            </div>
          </div>
        )}

        {/* TAB 3: Phone Keyboard Microphone Direct Helper */}
        {activeTab === 'keyboard' && (
          <div className="p-4 bg-slate-950/80 rounded-2xl border border-sky-800/40 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0 mt-0.5">
                <Keyboard className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-sky-300">
                  Using the Microphone on Your Phone&apos;s Keyboard?
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Tap the box below to open your phone keyboard, then press the <strong>🎙️ microphone key on your keyboard</strong> (e.g. Gboard, Samsung, iPhone). Speak digits, letters, or NATO words—we automatically convert them to clean VIN!
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <textarea
                ref={keyboardInputRef}
                rows={2}
                value={keyboardSpeechDraft}
                onChange={(e) => handleKeyboardDictationInput(e.target.value)}
                placeholder="Tap here, then press 🎙️ on your phone keyboard to dictate..."
                className="w-full text-xs font-sans text-white bg-slate-900 border border-sky-500/40 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent placeholder:text-slate-500 resize-none"
              />
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">
                  {convertedNotice ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Converted speech to VIN format!
                    </span>
                  ) : (
                    <span>Example: &ldquo;1 G T H 6 bravo echo 9...&rdquo;</span>
                  )}
                </span>
                {keyboardSpeechDraft && (
                  <button
                    type="button"
                    onClick={() => {
                      setKeyboardSpeechDraft('');
                      setConvertedNotice(false);
                    }}
                    className="text-sky-400 hover:text-white font-bold cursor-pointer"
                  >
                    Clear Text
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Decoded VIN Display */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span>Recognized VIN:</span>
            <span
              className={`font-mono ${
                parsedVin.length === 17
                  ? 'text-emerald-400 font-black'
                  : 'text-amber-400'
              }`}
            >
              {parsedVin.length}/17 characters
            </span>
          </div>

          <div className="relative flex items-center">
            <input
              type="text"
              maxLength={80}
              value={parsedVin}
              onChange={(e) => {
                const { vin } = formatAndParseVin(e.target.value);
                setParsedVin(vin);
              }}
              placeholder="Spoken VIN will appear here..."
              className="w-full text-center font-mono text-xl sm:text-2xl font-black tracking-widest text-white bg-slate-950 border-2 border-amber-500/80 rounded-xl py-3 px-10 shadow-inner focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            {parsedVin.length > 0 && (
              <button
                type="button"
                onClick={handleBackspace}
                title="Backspace (Remove last character)"
                className="absolute right-3 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <Delete className="w-4 h-4" />
              </button>
            )}
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
              <div className="space-y-1 flex-1">
                <p className="font-bold text-rose-300">Microphone Notice</p>
                <p className="text-rose-200/90 leading-relaxed">{errorMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Android PWA / Chrome Permissions Explanation */}
            <div className="pt-2 border-t border-rose-900/60 text-[11px] text-rose-200/80 space-y-1">
              <p className="font-semibold text-rose-300">Microphone Setup in Chrome:</p>
              <p className="leading-relaxed">
                In Chrome address bar, tap the <strong>tune/lock icon (⚙ / 🔒)</strong> → <strong>Permissions</strong> → Set <strong>Microphone</strong> to <strong>Allow</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Examples / Help */}
        <div className="p-2.5 bg-slate-950/50 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
          <span className="font-bold text-slate-300 flex items-center gap-1">
            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            Tips for maximum speech accuracy:
          </span>
          <p className="text-slate-400 leading-relaxed">
            • Speak digits/letters: <span className="text-amber-300 font-mono">1 G T H 6 B E N 9 J...</span>
            <br />
            • Or NATO words: <span className="text-amber-300">One Golf Tango Hotel Six Bravo...</span>
            <br />
            • Background music? Switch to <strong>🧠 Gemini AI</strong> or use <strong>⌨️ Phone Mic</strong>.
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


