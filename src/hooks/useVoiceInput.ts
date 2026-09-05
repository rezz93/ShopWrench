import { useState, useEffect, useRef, useCallback } from 'react';
import { parseSpokenVin } from '../utils/natoPhonetic';

// SpeechRecognition type definitions for cross-browser support
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export interface UseVoiceInputOptions {
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  continuous?: boolean;
  lang?: string;
  mode?: 'general' | 'vin';
}

export function useVoiceInput(options: UseVoiceInputOptions = {}) {
  const { onResult, onError, continuous = true, lang = 'en-US', mode = 'general' } = options;

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // References for speech recognition and fallback recording
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isListeningRef = useRef(false);
  const completedHistoryRef = useRef('');
  const latestSessionTextRef = useRef('');

  // Stable refs for callbacks to prevent re-instantiation loops
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Check overall voice support
  const isSupported = typeof window !== 'undefined' && (
    Boolean((window as unknown as IWindow).SpeechRecognition || (window as unknown as IWindow).webkitSpeechRecognition) ||
    Boolean(navigator?.mediaDevices?.getUserMedia)
  );

  // Helper to convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Safe cleanup of media stream tracks
  const stopMediaStream = useCallback(() => {
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch {
        // ignore
      }
      mediaStreamRef.current = null;
    }
  }, []);

  // Transcribe recorded audio with server Gemini AI (fallback mode)
  const transcribeFallbackAudio = useCallback(async (audioBlob: Blob, recordedMime: string) => {
    if (audioBlob.size < 400) {
      return;
    }

    setIsProcessing(true);
    try {
      const base64Data = await blobToBase64(audioBlob);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const res = await fetch('/api/transcribe-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: base64Data,
          mimeType: recordedMime || 'audio/webm',
          mode,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          let resultText = data.transcript || '';
          if (mode === 'vin') {
            const cleanVin = data.vin || parseSpokenVin(resultText);
            resultText = cleanVin || resultText.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17);
          }
          if (resultText) {
            setTranscript(resultText);
            setErrorMessage(null);
            if (onResultRef.current) {
              onResultRef.current(resultText, true);
            }
          }
        }
      }
    } catch (err: any) {
      console.warn('Server fallback transcription error:', err);
      const msg = 'Could not process audio. Please try speaking again.';
      setErrorMessage(msg);
      if (onErrorRef.current) onErrorRef.current(msg);
    } finally {
      setIsProcessing(false);
    }
  }, [mode]);

  // Fallback recorder if Web Speech is unavailable or errors
  const startMediaRecorderFallback = useCallback(async () => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      const msg = 'Microphone access is not supported in this browser.';
      setErrorMessage(msg);
      if (onErrorRef.current) onErrorRef.current(msg);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }
      }

      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stopMediaStream();
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        transcribeFallbackAudio(audioBlob, mimeType);
      };

      recorder.start(500);
      mediaRecorderRef.current = recorder;
      isListeningRef.current = true;
      setIsListening(true);
      setErrorMessage(null);
    } catch (err: any) {
      console.warn('Fallback media recording error:', err);
      const msg = 'Microphone permission was blocked or unavailable.';
      setErrorMessage(msg);
      if (onErrorRef.current) onErrorRef.current(msg);
      isListeningRef.current = false;
      setIsListening(false);
    }
  }, [stopMediaStream, transcribeFallbackAudio]);

  const startListening = useCallback(async () => {
    if (isListeningRef.current) return;
    setErrorMessage(null);
    setTranscript('');
    completedHistoryRef.current = '';
    latestSessionTextRef.current = '';
    audioChunksRef.current = [];

    const win = typeof window !== 'undefined' ? (window as unknown as IWindow) : null;
    const SpeechRecognitionAPI = win?.SpeechRecognition || win?.webkitSpeechRecognition;

    // 1. Primary: Native SpeechRecognition for immediate, real-time live typing
    if (SpeechRecognitionAPI) {
      try {
        // Clean up any stale recognition session
        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch {
            // ignore
          }
          recognitionRef.current = null;
        }

        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = continuous;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.lang = lang;

        recognition.onstart = () => {
          isListeningRef.current = true;
          setIsListening(true);
          setErrorMessage(null);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let fullSessionText = '';
          let isFinal = false;

          // Standard W3C SpeechRecognition: event.results holds all transcript chunks for this session.
          // Reading sequentially from index 0 to results.length - 1 extracts the exact transcript without duplicate compounding.
          for (let i = 0; i < event.results.length; ++i) {
            const result = event.results[i];
            if (result && result[0]) {
              const text = result[0].transcript || '';
              if (text) {
                fullSessionText += ' ' + text;
              }
              if (result.isFinal) {
                isFinal = true;
              }
            }
          }

          fullSessionText = fullSessionText.trim();
          if (!fullSessionText) return;

          // Handle multi-session continuation if Android or Chrome restarted after a pause
          let rawCombined = fullSessionText;
          if (completedHistoryRef.current) {
            const prev = completedHistoryRef.current.trim();
            // Prevent duplication if the new session repeats the previous text
            if (fullSessionText.toLowerCase().startsWith(prev.toLowerCase())) {
              rawCombined = fullSessionText;
            } else if (prev.toLowerCase().endsWith(fullSessionText.toLowerCase())) {
              rawCombined = prev;
            } else {
              rawCombined = `${prev} ${fullSessionText}`.trim();
            }
          }

          latestSessionTextRef.current = fullSessionText;

          let processed = rawCombined;
          if (mode === 'vin') {
            const natoParsed = parseSpokenVin(rawCombined);
            processed = natoParsed || rawCombined.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17);
          }

          setTranscript(processed);
          if (onResultRef.current) {
            onResultRef.current(processed, isFinal);
          }

          // Auto-stop in VIN mode once a complete 17-character VIN is captured
          if (mode === 'vin' && processed.length >= 17) {
            try {
              recognition.stop();
            } catch {
              // ignore
            }
            isListeningRef.current = false;
            setIsListening(false);
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.warn('SpeechRecognition notice:', event.error);
          if (event.error === 'no-speech') {
            // Non-fatal pause in speech
            return;
          }
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            // Fall back to MediaRecorder + Gemini
            console.info('Switching to MediaRecorder audio fallback due to Web Speech restrictions');
            startMediaRecorderFallback();
            return;
          }
          if (event.error === 'network') {
            // On network failure with Web Speech, fall back to backend Gemini
            startMediaRecorderFallback();
            return;
          }
        };

        recognition.onend = () => {
          if (isListeningRef.current) {
            // Save current session text to completed history to maintain continuity across silent pauses
            if (latestSessionTextRef.current) {
              const prev = completedHistoryRef.current.trim();
              const curr = latestSessionTextRef.current.trim();
              if (!prev.toLowerCase().includes(curr.toLowerCase())) {
                completedHistoryRef.current = prev ? `${prev} ${curr}` : curr;
              }
              latestSessionTextRef.current = '';
            }

            // Auto-restart if user hasn't explicitly stopped
            try {
              recognition.start();
            } catch {
              setIsListening(false);
              isListeningRef.current = false;
            }
          } else {
            setIsListening(false);
            isListeningRef.current = false;
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
        isListeningRef.current = true;
        setIsListening(true);
        return;
      } catch (err) {
        console.warn('Could not launch SpeechRecognition, trying MediaRecorder fallback:', err);
      }
    }

    // 2. Fallback: If SpeechRecognitionAPI is not available
    startMediaRecorderFallback();
  }, [continuous, lang, mode, startMediaRecorderFallback]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    completedHistoryRef.current = '';
    latestSessionTextRef.current = '';

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        stopMediaStream();
      }
    } else {
      stopMediaStream();
    }
  }, [stopMediaStream]);

  const toggleListening = useCallback(() => {
    if (isListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    completedHistoryRef.current = '';
    latestSessionTextRef.current = '';
    setErrorMessage(null);
    audioChunksRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
      stopMediaStream();
    };
  }, [stopMediaStream]);

  return {
    isListening,
    isProcessing,
    transcript,
    isSupported,
    errorMessage,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript,
  };
}
