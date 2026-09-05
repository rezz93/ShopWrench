import { useState, useEffect, useRef, useCallback } from 'react';

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
  const { onResult, onError, continuous = false, lang = 'en-US', mode = 'general' } = options;

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // References for live streams, recording, and speech recognition
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isListeningRef = useRef(false);
  const liveTranscriptRef = useRef('');

  // Check overall voice support: either native MediaDevices/getUserMedia OR SpeechRecognition
  const isSupported = typeof window !== 'undefined' && (
    Boolean(navigator?.mediaDevices?.getUserMedia) ||
    Boolean((window as unknown as IWindow).SpeechRecognition || (window as unknown as IWindow).webkitSpeechRecognition)
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
        // ignore track stop error
      }
      mediaStreamRef.current = null;
    }
  }, []);

  // Initialize SpeechRecognition if available (used for real-time live preview)
  useEffect(() => {
    const win = typeof window !== 'undefined' ? (window as unknown as IWindow) : null;
    const SpeechRecognitionAPI = win?.SpeechRecognition || win?.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = continuous;
      recognition.interimResults = true;
      recognition.lang = lang;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let currentInterim = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const text = result[0]?.transcript || '';
          if (result.isFinal) {
            finalChunk += text;
          } else {
            currentInterim += text;
          }
        }

        const combined = (finalChunk || currentInterim).trim();
        if (combined) {
          liveTranscriptRef.current = combined;
          setTranscript(combined);
          if (onResult) {
            onResult(combined, Boolean(finalChunk));
          }
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        // Do NOT crash or stop recording if SpeechRecognition throws not-allowed/service-not-allowed.
        // In Chrome/Chromium, Web Speech API connects to Google cloud servers and often errors in iframes,
        // WebAPKs, or certain networks even when the microphone is fully allowed!
        // The hardware MediaRecorder continues seamlessly in the background.
        console.warn('Browser SpeechRecognition notice (falling back to native audio + Gemini AI):', event.error);
        if (event.error === 'no-speech') {
          // Non-critical, user just paused speaking
          return;
        }
      };

      recognition.onend = () => {
        // Recognition completed or paused
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('Could not initialize SpeechRecognition preview:', err);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
      stopMediaStream();
    };
  }, [continuous, lang, onResult, stopMediaStream]);

  // Transcribe recorded audio with server Gemini AI
  const transcribeAudioChunks = useCallback(async (audioBlob: Blob, recordedMime: string) => {
    if (audioBlob.size < 400) {
      // Audio is empty or silence
      if (liveTranscriptRef.current) {
        return;
      }
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
          const resultText = mode === 'vin' && data.vin ? data.vin : (data.transcript || '');
          if (resultText) {
            setTranscript(resultText);
            setErrorMessage(null);
            if (onResult) {
              onResult(resultText, true);
            }
          }
        }
      }
    } catch (err: any) {
      console.warn('Server audio transcription failed, falling back to local result if available:', err);
      if (!liveTranscriptRef.current) {
        const msg = 'Could not process audio. Please try speaking again.';
        setErrorMessage(msg);
        if (onError) onError(msg);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [mode, onResult, onError]);

  const startListening = useCallback(async () => {
    if (isListeningRef.current) return;
    setErrorMessage(null);
    setTranscript('');
    liveTranscriptRef.current = '';
    audioChunksRef.current = [];

    // Step 1: Request microphone hardware access via MediaDevices
    let stream: MediaStream | null = null;
    if (navigator?.mediaDevices?.getUserMedia) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        mediaStreamRef.current = stream;
      } catch (mediaErr: any) {
        console.warn('getUserMedia audio error:', mediaErr);
        let friendly = 'Microphone access was denied in browser settings.';
        if (mediaErr?.name === 'NotAllowedError' || mediaErr?.name === 'PermissionDeniedError') {
          friendly = 'Microphone permission is blocked. Please tap the lock/tune icon in your browser address bar and set Microphone to Allow.';
        } else if (mediaErr?.name === 'NotFoundError' || mediaErr?.name === 'DevicesNotFoundError') {
          friendly = 'No microphone device was detected on your system.';
        }
        setErrorMessage(friendly);
        if (onError) onError(friendly);
        return;
      }
    }

    // Step 2: Initialize MediaRecorder if stream is available
    if (stream && typeof MediaRecorder !== 'undefined') {
      try {
        let mimeType = 'audio/webm';
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/aac')) {
          mimeType = 'audio/aac';
        }

        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          stopMediaStream();
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          transcribeAudioChunks(audioBlob, mimeType);
        };

        recorder.start(250); // Slice every 250ms
        mediaRecorderRef.current = recorder;
      } catch (recErr) {
        console.warn('Could not start MediaRecorder:', recErr);
      }
    }

    // Step 3: Try browser Web Speech recognition concurrently for real-time visual streaming feedback
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (speechErr: any) {
        // If already started or browser blocked, ignore since MediaRecorder is actively running
        console.warn('Web Speech recognition start notice:', speechErr?.message || speechErr);
      }
    }

    isListeningRef.current = true;
    setIsListening(true);
  }, [onError, stopMediaStream, transcribeAudioChunks]);

  const stopListening = useCallback(() => {
    if (!isListeningRef.current) return;
    isListeningRef.current = false;
    setIsListening(false);

    // Stop Web Speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    // Stop MediaRecorder (which automatically triggers onstop and transcribes audio)
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
    liveTranscriptRef.current = '';
    setErrorMessage(null);
    audioChunksRef.current = [];
  }, []);

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
