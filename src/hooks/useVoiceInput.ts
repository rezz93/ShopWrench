import { useState, useEffect, useRef, useCallback } from 'react';
import { parseSpokenVin, mergeVinSequences } from '../utils/natoPhonetic';

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
  const [isAiRecording, setIsAiRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // References for speech recognition and fallback recording
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isListeningRef = useRef(false);
  const isAiRecordingRef = useRef(false);

  // Confirmed text/VIN across paused speech bursts
  const confirmedVinRef = useRef('');
  const latestBurstVinRef = useRef('');
  const completedGeneralHistoryRef = useRef('');
  const latestGeneralBurstRef = useRef('');

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

  // Transcribe recorded audio with server Gemini AI
  const transcribeAudioWithAi = useCallback(async (audioBlob: Blob, recordedMime: string) => {
    if (audioBlob.size < 400) {
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    try {
      const base64Data = await blobToBase64(audioBlob);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

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
        } else {
          throw new Error(data.error || 'Server could not transcribe audio.');
        }
      } else {
        throw new Error(`HTTP Error ${res.status}`);
      }
    } catch (err: any) {
      console.warn('AI audio transcription error:', err);
      const msg = 'Could not transcribe audio. Please try speaking again or use live typing.';
      setErrorMessage(msg);
      if (onErrorRef.current) onErrorRef.current(msg);
    } finally {
      setIsProcessing(false);
    }
  }, [mode]);

  // Start direct MediaRecorder for Gemini AI analysis
  const startAiRecording = useCallback(async () => {
    if (isAiRecordingRef.current) return;
    if (!navigator?.mediaDevices?.getUserMedia) {
      const msg = 'Microphone access is not supported in this browser.';
      setErrorMessage(msg);
      if (onErrorRef.current) onErrorRef.current(msg);
      return;
    }

    try {
      // Stop live recognition if active
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
      setIsListening(false);
      isListeningRef.current = false;

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
        transcribeAudioWithAi(audioBlob, mimeType);
      };

      recorder.start(500);
      mediaRecorderRef.current = recorder;
      isAiRecordingRef.current = true;
      setIsAiRecording(true);
      setErrorMessage(null);
    } catch (err: any) {
      console.warn('AI media recording launch error:', err);
      const msg = 'Microphone permission was blocked. Please check browser permissions.';
      setErrorMessage(msg);
      if (onErrorRef.current) onErrorRef.current(msg);
      isAiRecordingRef.current = false;
      setIsAiRecording(false);
    }
  }, [stopMediaStream, transcribeAudioWithAi]);

  const stopAiRecording = useCallback(() => {
    isAiRecordingRef.current = false;
    setIsAiRecording(false);
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

  // Live SpeechRecognition with mathematical zero-duplication
  const startListening = useCallback(async () => {
    if (isListeningRef.current) return;
    setErrorMessage(null);
    setTranscript('');
    confirmedVinRef.current = '';
    latestBurstVinRef.current = '';
    completedGeneralHistoryRef.current = '';
    latestGeneralBurstRef.current = '';
    audioChunksRef.current = [];

    const win = typeof window !== 'undefined' ? (window as unknown as IWindow) : null;
    const SpeechRecognitionAPI = win?.SpeechRecognition || win?.webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      try {
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
          let currentSessionText = '';
          let isFinal = false;

          // Sequential read across all results for this active session
          for (let i = 0; i < event.results.length; ++i) {
            const res = event.results[i];
            if (res && res[0]) {
              const chunk = res[0].transcript || '';
              if (chunk) {
                currentSessionText += ' ' + chunk;
              }
              if (res.isFinal) {
                isFinal = true;
              }
            }
          }

          currentSessionText = currentSessionText.trim();
          if (!currentSessionText) return;

          if (mode === 'vin') {
            // 1. Parse current burst into VIN characters using robust phonetic map
            const burstVin = parseSpokenVin(currentSessionText);
            latestBurstVinRef.current = burstVin;

            // 2. Mathematically merge with confirmed prior history (prevents Android duplication)
            const mergedVin = mergeVinSequences(confirmedVinRef.current, burstVin);

            setTranscript(mergedVin);
            if (onResultRef.current) {
              onResultRef.current(mergedVin, isFinal);
            }

            // Auto-stop if complete 17 characters achieved
            if (mergedVin.length >= 17) {
              try {
                recognition.stop();
              } catch {
                // ignore
              }
              isListeningRef.current = false;
              setIsListening(false);
            }
          } else {
            // General speech mode: smart deduplication across restarts
            latestGeneralBurstRef.current = currentSessionText;
            let fullText = currentSessionText;

            if (completedGeneralHistoryRef.current) {
              const prev = completedGeneralHistoryRef.current.trim();
              if (currentSessionText.toLowerCase().startsWith(prev.toLowerCase())) {
                fullText = currentSessionText;
              } else {
                fullText = `${prev} ${currentSessionText}`.trim();
              }
            }

            setTranscript(fullText);
            if (onResultRef.current) {
              onResultRef.current(fullText, isFinal);
            }
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.warn('SpeechRecognition status:', event.error);
          if (event.error === 'no-speech') {
            return;
          }
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            // Fall back to AI audio recording
            console.info('Switching to MediaRecorder audio recording');
            startAiRecording();
            return;
          }
        };

        recognition.onend = () => {
          if (isListeningRef.current) {
            // Commit latest burst into confirmed history
            if (mode === 'vin') {
              if (latestBurstVinRef.current) {
                confirmedVinRef.current = mergeVinSequences(
                  confirmedVinRef.current,
                  latestBurstVinRef.current
                );
                latestBurstVinRef.current = '';
              }
            } else {
              if (latestGeneralBurstRef.current) {
                const prev = completedGeneralHistoryRef.current.trim();
                const curr = latestGeneralBurstRef.current.trim();
                if (!prev.toLowerCase().includes(curr.toLowerCase())) {
                  completedGeneralHistoryRef.current = prev ? `${prev} ${curr}` : curr;
                }
                latestGeneralBurstRef.current = '';
              }
            }

            // Keep listening if user hasn't tapped stop
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
        console.warn('Could not start SpeechRecognition, starting AI audio recording fallback:', err);
      }
    }

    // Fallback: Launch AI audio recording
    startAiRecording();
  }, [continuous, lang, mode, startAiRecording]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    latestBurstVinRef.current = '';
    latestGeneralBurstRef.current = '';

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

    if (isAiRecordingRef.current) {
      stopAiRecording();
    }
  }, [stopAiRecording]);

  const toggleListening = useCallback(() => {
    if (isListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    confirmedVinRef.current = '';
    latestBurstVinRef.current = '';
    completedGeneralHistoryRef.current = '';
    latestGeneralBurstRef.current = '';
    setErrorMessage(null);
    audioChunksRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      isAiRecordingRef.current = false;
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
    isAiRecording,
    isProcessing,
    transcript,
    isSupported,
    errorMessage,
    startListening,
    stopListening,
    toggleListening,
    startAiRecording,
    stopAiRecording,
    resetTranscript,
  };
}

