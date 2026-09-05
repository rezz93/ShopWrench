import React, { useState } from 'react';
import { Mic, MicOff, AlertCircle, Loader2 } from 'lucide-react';
import { useVoiceInput } from '../hooks/useVoiceInput';

export interface VoiceInputButtonProps {
  id?: string;
  onTranscript: (transcript: string) => void;
  mode?: 'append' | 'replace';
  voiceMode?: 'general' | 'vin';
  currentValue?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  title?: string;
  showLabel?: boolean;
  label?: string;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  id,
  onTranscript,
  mode = 'append',
  voiceMode = 'general',
  currentValue = '',
  className = '',
  size = 'md',
  title = 'Voice Dictation (Speech to Text)',
  showLabel = false,
  label = 'Dictate',
}) => {
  const [toastError, setToastError] = useState<string | null>(null);
  const targetVoiceMode: 'general' | 'vin' = voiceMode === 'vin' ? 'vin' : 'general';

  const { isListening, isProcessing, isSupported, errorMessage, toggleListening } = useVoiceInput({
    mode: targetVoiceMode,
    continuous: true,
    onResult: (text, isFinal) => {
      if (!text) return;
      if (mode === 'replace' || voiceMode === 'vin') {
        // Stream text immediately as spoken
        onTranscript(text);
      } else {
        // Append mode
        if (isFinal) {
          const base = currentValue ? `${currentValue} ` : '';
          onTranscript(`${base}${text}`);
        }
      }
    },
    onError: (err) => {
      setToastError(err);
      setTimeout(() => setToastError(null), 5000);
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isSupported) {
      setToastError('Microphone not supported or blocked in this browser.');
      setTimeout(() => setToastError(null), 5000);
      return;
    }
    toggleListening();
  };

  const sizeClasses = {
    sm: 'h-8 px-2 text-xs',
    md: 'min-h-[44px] px-3 text-xs sm:text-sm',
    lg: 'min-h-[48px] px-4 text-sm font-bold',
  }[size];

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }[size];

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        id={id || 'voice-input-btn'}
        onClick={handleClick}
        disabled={isProcessing}
        title={isProcessing ? 'Transcribing with Gemini AI...' : isListening ? 'Listening... Tap to stop' : title}
        aria-label={isListening ? 'Stop voice recording' : 'Start voice dictation'}
        className={`relative rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer select-none ${
          isProcessing
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-wait'
            : isListening
            ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 border border-rose-400 animate-pulse'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 active:bg-slate-900'
        } ${sizeClasses} ${className}`}
      >
        {isProcessing ? (
          <>
            <Loader2 className={`${iconSizes} text-amber-400 animate-spin`} />
            <span className="text-xs font-bold text-amber-300">Processing...</span>
          </>
        ) : isListening ? (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-200 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
            </span>
            <Mic className={`${iconSizes} text-white animate-bounce`} />
            <span className="text-xs font-black tracking-wide uppercase">Listening</span>
          </>
        ) : (
          <>
            <Mic className={`${iconSizes} text-amber-400`} />
            {showLabel && <span>{label}</span>}
          </>
        )}
      </button>

      {/* Floating error notification */}
      {(toastError || errorMessage) && !isListening && (
        <div
          role="alert"
          className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 w-72 p-3 bg-rose-950/95 border border-rose-500/60 text-rose-200 text-xs rounded-xl shadow-xl flex items-start gap-2 backdrop-blur-sm"
        >
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-rose-200 leading-tight">{toastError || errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setToastError(null)}
            className="text-rose-400 hover:text-white text-xs font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
