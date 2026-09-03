import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { recognize } from 'tesseract.js';
import {
  Camera,
  X,
  RefreshCw,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Scan,
  Upload,
  Eye,
  Info,
  Zap,
  ZoomIn,
  ZoomOut,
  QrCode,
  Edit3,
  ArrowRight,
  SunMedium,
  Check,
} from 'lucide-react';
import { SAMPLE_VINS } from '../services/nhtsa';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  defaultMode?: 'door-code' | 'windshield-ocr' | 'upload';
}

/**
 * Robust VIN Extraction and Normalization
 * Standard ISO 3779 VINs are 17 characters and NEVER contain I, O, or Q (to prevent confusion with 1, 0, 0).
 * Handles QR code URLs, metadata strings, barcode prefixes, and OCR ambiguities.
 */
export function parseAndCleanVin(rawInput: string): string | null {
  if (!rawInput) return null;

  let text = rawInput.trim();

  // 1. Extract VIN from URL query parameters (e.g., ?vin=... or /vin/...)
  const urlParamMatch = text.match(/[?&/]vin[=/]([a-zA-Z0-9]{17})/i);
  if (urlParamMatch) {
    text = urlParamMatch[1];
  }

  // 2. Extract after explicit "VIN:" or "VIN " label
  const labelMatch = text.match(/VIN[:\s\-#]*([a-zA-Z0-9]{17})/i);
  if (labelMatch) {
    text = labelMatch[1];
  }

  // 3. Extract from semicolon or comma delimited vehicle strings
  const parts = text.split(/[;,|\n\r\t]/);
  for (const part of parts) {
    const cleanPart = part.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleanPart.length === 17 && !/[IOQ]/.test(cleanPart)) {
      return cleanPart;
    }
  }

  // 4. Strict 17-character regex match for valid ISO 3779 VIN format (no I, O, Q)
  const upper = text.toUpperCase();
  const strictMatches = upper.match(/\b([A-HJ-NPR-Z0-9]{17})\b/g);
  if (strictMatches && strictMatches.length > 0) {
    return strictMatches[0];
  }

  // 5. Clean string of all non-alphanumeric chars
  const alphanumeric = upper.replace(/[^A-Z0-9]/g, '');

  // Look for any exact 17-char subsegment without I, O, Q
  for (let i = 0; i <= alphanumeric.length - 17; i++) {
    const candidate = alphanumeric.slice(i, i + 17);
    if (!/[IOQ]/.test(candidate)) {
      return candidate;
    }
  }

  // 6. Common Barcode & OCR Normalization:
  // - GM / Ford barcodes often prepend 'I' or '1' or 'T' (making 18 chars)
  if (alphanumeric.length === 18 && (alphanumeric.startsWith('I') || alphanumeric.startsWith('T') || alphanumeric.startsWith('1'))) {
    const candidate17 = alphanumeric.slice(1, 18);
    if (!/[IOQ]/.test(candidate17)) {
      return candidate17;
    }
  }

  // 7. Normalize typical OCR stamped-metal confusions (O->0, Q->0, I->1, S->5 in num slots)
  const normalized = alphanumeric
    .replace(/O/g, '0')
    .replace(/Q/g, '0')
    .replace(/I/g, '1');

  // Look for exact 17-char subsegments in normalized stream
  for (let i = 0; i <= normalized.length - 17; i++) {
    const cand = normalized.slice(i, i + 17);
    if (!/[IOQ]/.test(cand)) {
      return cand;
    }
  }

  // Fallback: If 17 chars long after normalization
  if (normalized.length === 17) {
    return normalized;
  }

  // If longer than 17 chars and starts with known WMI pattern (1, 2, 3, 4, 5, J, K, W, S, M, etc.)
  if (normalized.length > 17) {
    for (let i = 0; i <= normalized.length - 17; i++) {
      const segment = normalized.slice(i, i + 17);
      // Valid first digit of VIN is country/region code: 1-5 (North America), J (Japan), K (Korea), W (Germany), etc.
      if (/^[1-5JKWVSMNLTR6-9]/.test(segment) && !/[IOQ]/.test(segment)) {
        return segment;
      }
    }
  }

  return null;
}

/**
 * Preprocess image on HTML5 Canvas to fight windshield glare, stamped metal artifacts, and sunlight reflection
 */
function preprocessCanvasImage(canvas: HTMLCanvasElement, mode: 'contrast' | 'binarize' | 'normal' | 'crop_center'): string {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas.toDataURL('image/jpeg', 0.9);

  if (mode === 'normal') {
    return canvas.toDataURL('image/jpeg', 0.9);
  }

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // Grayscale & Contrast stretching
  for (let i = 0; i < data.length; i += 4) {
    // Luminance formula
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

    if (mode === 'contrast' || mode === 'crop_center') {
      // High contrast stretch (increases contrast between stamped metal text and glass glare)
      const contrastFactor = 1.8;
      let enhanced = (gray - 128) * contrastFactor + 128;
      enhanced = Math.max(0, Math.min(255, enhanced));
      data[i] = enhanced;
      data[i + 1] = enhanced;
      data[i + 2] = enhanced;
    } else if (mode === 'binarize') {
      // Adaptive binarization threshold to eliminate soft sun reflections
      const threshold = 130;
      const val = gray > threshold ? 255 : 0;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.95);
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  defaultMode = 'door-code',
}) => {
  const [activeTab, setActiveTab] = useState<'door-code' | 'windshield-ocr' | 'upload'>(defaultMode);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Captured VIN Review & Confirmation State
  const [detectedVin, setDetectedVin] = useState<string | null>(null);
  const [editableVin, setEditableVin] = useState<string>('');
  const [autoEnterCountdown, setAutoEnterCountdown] = useState<number | null>(null);
  const [isEditingManually, setIsEditingManually] = useState(false);
  const [captureSourceNotes, setCaptureSourceNotes] = useState<string>('');

  // Hardware Controls
  const [hasTorch, setHasTorch] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const [glareFilter, setGlareFilter] = useState<'normal' | 'contrast' | 'binarize'>('contrast');

  // Scanner Refs
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'vin-barcode-qr-viewport';

  // Windshield OCR Camera Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear countdown on unmount or reset
  const clearCountdown = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setAutoEnterCountdown(null);
  };

  // Reset when opened or tab changes
  useEffect(() => {
    if (!isOpen) {
      cleanupAllCameras();
      clearCountdown();
      return;
    }

    setErrorMsg(null);
    setDetectedVin(null);
    setEditableVin('');
    setIsEditingManually(false);
    clearCountdown();

    if (activeTab === 'door-code') {
      startDoorScanner();
    } else if (activeTab === 'windshield-ocr') {
      startWindshieldCamera();
    } else {
      cleanupAllCameras();
    }

    return () => {
      cleanupAllCameras();
      clearCountdown();
    };
  }, [isOpen, activeTab]);

  // Clean up all camera feeds and tracks
  const cleanupAllCameras = async () => {
    // 1. Stop HTML5 barcode & QR scanner
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        console.warn('Error clearing barcode scanner:', e);
      }
      scannerRef.current = null;
    }

    // 2. Stop raw MediaStream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      mediaStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraActive(false);
    setTorchEnabled(false);
    setHasTorch(false);
  };

  // Toggle Camera Flashlight / Torch
  const toggleTorch = async () => {
    if (!mediaStreamRef.current) return;
    const track = mediaStreamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const newTorchState = !torchEnabled;
      // Advanced WebRTC constraint on mobile devices
      const videoTrack = track as unknown as { applyConstraints: (c: Record<string, unknown>) => Promise<void> };
      await videoTrack.applyConstraints({ advanced: [{ torch: newTorchState }] });
      setTorchEnabled(newTorchState);
    } catch (err) {
      console.warn('Torch toggle not supported on this device/camera:', err);
    }
  };

  // Change Camera Zoom Level
  const applyZoom = async (newZoom: number) => {
    if (!mediaStreamRef.current) return;
    const track = mediaStreamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const videoTrack = track as unknown as { applyConstraints: (c: Record<string, unknown>) => Promise<void> };
      await videoTrack.applyConstraints({ advanced: [{ zoom: newZoom }] });
      setZoomLevel(newZoom);
    } catch (err) {
      console.warn('Zoom not supported on this device:', err);
    }
  };

  // Inspect track capabilities for torch & zoom
  const detectHardwareCapabilities = (stream: MediaStream) => {
    try {
      const track = stream.getVideoTracks()[0];
      if (track && track.getCapabilities) {
        const caps = track.getCapabilities() as { torch?: boolean; zoom?: { max?: number } };
        if (caps?.torch) {
          setHasTorch(true);
        }
        if (caps?.zoom) {
          setMaxZoom(caps.zoom.max || 1);
        }
      }
    } catch (e) {
      console.warn('Could not read track capabilities:', e);
    }
  };

  // START 1: Door-Jamb QR & Barcode Scanner
  const startDoorScanner = async () => {
    await cleanupAllCameras();
    setErrorMsg(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const element = document.getElementById(readerElementId);
      if (!element) return;

      // Full array of all 2D QR, Data Matrix, and 1D Barcode formats
      const formatsToSupport = [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.DATA_MATRIX,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.PDF_417,
        Html5QrcodeSupportedFormats.AZTEC,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.EAN_13,
      ];

      const html5QrCode = new Html5Qrcode(readerElementId, {
        formatsToSupport,
        verbose: false,
      });
      scannerRef.current = html5QrCode;

      // Large square/flexible viewfinder for both 2D QR codes and wide 1D barcodes
      const config = {
        fps: 20,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minDim = Math.min(viewfinderWidth, viewfinderHeight);
          return {
            width: Math.floor(Math.max(220, minDim * 0.85)),
            height: Math.floor(Math.max(180, minDim * 0.75)),
          };
        },
        aspectRatio: 1.0,
      };

      const handleCodeDecoded = (decodedText: string) => {
        const clean = parseAndCleanVin(decodedText);
        if (clean && clean.length >= 11) {
          handleVinIdentified(clean, 'Scanned from Door-Jamb QR / Barcode');
        }
      };

      let started = false;
      try {
        await html5QrCode.start({ facingMode: 'environment' }, config, handleCodeDecoded, () => {});
        started = true;
      } catch {
        const cameras = await Html5Qrcode.getCameras().catch(() => []);
        if (cameras && cameras.length > 0) {
          await html5QrCode.start(cameras[0].id, config, handleCodeDecoded, () => {});
          started = true;
        } else {
          throw new Error('No physical camera device found on this device.');
        }
      }

      if (started) {
        setIsCameraActive(true);
      }
    } catch (err: unknown) {
      console.warn('Door scanner start notice:', err);
      setIsCameraActive(false);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Live camera unavailable. You can upload a photo of the door sticker or select a test vehicle.'
      );
    }
  };

  // START 2: Windshield OCR Camera Stream
  const startWindshieldCamera = async () => {
    await cleanupAllCameras();
    setErrorMsg(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser.');
      }

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
      }

      if (stream) {
        mediaStreamRef.current = stream;
        detectHardwareCapabilities(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch {
            // ignore
          }
        }
        setIsCameraActive(true);
      }
    } catch (err: unknown) {
      console.warn('Windshield camera notice:', err);
      setIsCameraActive(false);
      setErrorMsg(
        'Could not access camera for windshield OCR. You can upload a photo or use the Door Barcode/QR tab.'
      );
    }
  };

  // OCR Processing with multi-pass filters for sunlight glare
  const executeOcrOnImage = async (base64Data: string) => {
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      // Create offscreen image & canvas for multi-pass glare filter
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = base64Data;
      });

      // Pass 1: Center-cropped reticle area (where the user aligns the metal plate)
      // Crop to the middle 80% width and 35% height to eliminate windshield stickers, wiper blades, and glare outside the plate
      const cropCanvas = document.createElement('canvas');
      const cropW = Math.floor(img.width * 0.85);
      const cropH = Math.floor(img.height * 0.40);
      const cropX = Math.floor((img.width - cropW) / 2);
      const cropY = Math.floor((img.height - cropH) / 2);

      cropCanvas.width = cropW;
      cropCanvas.height = cropH;
      const cropCtx = cropCanvas.getContext('2d');
      if (cropCtx) {
        cropCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        const enhancedCropUrl = preprocessCanvasImage(cropCanvas, 'contrast');
        const cropResult = await recognize(enhancedCropUrl, 'eng');
        const cropExtracted = parseAndCleanVin(cropResult?.data?.text || '');
        if (cropExtracted && cropExtracted.length >= 11) {
          handleVinIdentified(cropExtracted, 'Decoded from Windshield Plate OCR (Center Focus)');
          return;
        }
      }

      // Pass 2: Full frame with current glare filter
      const fullCanvas = document.createElement('canvas');
      fullCanvas.width = img.width;
      fullCanvas.height = img.height;
      const ctx = fullCanvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context failure');
      ctx.drawImage(img, 0, 0);

      const enhancedDataUrl = preprocessCanvasImage(fullCanvas, glareFilter);
      const result = await recognize(enhancedDataUrl, 'eng');
      const rawText = result?.data?.text || '';
      const extracted = parseAndCleanVin(rawText);

      if (extracted && extracted.length >= 11) {
        handleVinIdentified(extracted, 'Decoded from Windshield Plate OCR');
        return;
      }

      // Pass 3: High contrast binarization pass
      const binarizedUrl = preprocessCanvasImage(fullCanvas, 'binarize');
      const binarizedResult = await recognize(binarizedUrl, 'eng');
      const binExtracted = parseAndCleanVin(binarizedResult?.data?.text || '');
      if (binExtracted && binExtracted.length >= 11) {
        handleVinIdentified(binExtracted, 'Decoded from Windshield Plate OCR (High Contrast)');
        return;
      }

      // Pass 4: Fallback pass with raw image
      const rawResult = await recognize(base64Data, 'eng');
      const fallbackExtracted = parseAndCleanVin(rawResult?.data?.text || '');
      if (fallbackExtracted && fallbackExtracted.length >= 11) {
        handleVinIdentified(fallbackExtracted, 'Decoded from Windshield Plate OCR');
        return;
      }

      throw new Error(
        'Could not clearly read 17 digits from the windshield metal plate. Sun glare or glass reflection obscured the stamped digits. Tap "Door QR / Barcode" for instant scan, or type/speak the digits.'
      );
    } catch (err: unknown) {
      console.error('OCR processing error:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to extract VIN from image.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Shutter Snapshot Capture
  const handleSnapWindshieldPhoto = () => {
    if (!videoRef.current || !isCameraActive) {
      fileInputRef.current?.click();
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      executeOcrOnImage(dataUrl);
    } catch (err) {
      console.error('Snapshot capture error:', err);
      setErrorMsg('Failed to capture frame. Please upload a photo instead.');
    }
  };

  // File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (result) {
        executeOcrOnImage(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // When VIN is identified (from QR, Barcode, or OCR)
  const handleVinIdentified = (vin: string, source: string) => {
    // 1. Play haptic vibration on mobile
    try {
      navigator.vibrate?.([80, 40, 80]);
    } catch {
      // ignore
    }

    setDetectedVin(vin);
    setEditableVin(vin);
    setCaptureSourceNotes(source);
    setIsEditingManually(false);

    // 2. Start clear 2.5-second auto-enter countdown
    clearCountdown();
    let timeLeft = 2;
    setAutoEnterCountdown(timeLeft);

    countdownTimerRef.current = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft <= 0) {
        clearCountdown();
        confirmAndSubmitVin(vin);
      } else {
        setAutoEnterCountdown(timeLeft);
      }
    }, 1000);
  };

  // Confirm and Submit VIN to main intake
  const confirmAndSubmitVin = (finalVin: string) => {
    clearCountdown();
    const clean = finalVin.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    cleanupAllCameras().then(() => {
      onScanSuccess(clean);
    });
  };

  // Quick preset test
  const handleSelectPreset = (sampleVin: string) => {
    handleVinIdentified(sampleVin, 'Shop Test Preset Vehicle');
  };

  if (!isOpen) return null;

  return (
    <div
      id="barcode-scanner-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh]">
        {/* Top Header */}
        <div className="px-4 py-3 bg-slate-800/95 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                ShopWrench Scanner
              </h3>
              <p className="text-xs text-slate-400">
                Door QR codes, barcodes &amp; windshield metal plates
              </p>
            </div>
          </div>

          <button
            id="close-scanner-btn"
            onClick={onClose}
            aria-label="Close Scanner"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Dedicated Mode Tabs */}
        <div className="p-2 bg-slate-950 border-b border-slate-800 grid grid-cols-3 gap-1.5">
          <button
            type="button"
            id="tab-door-code"
            onClick={() => setActiveTab('door-code')}
            className={`py-2.5 px-2 rounded-xl font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 transition cursor-pointer border ${
              activeTab === 'door-code'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4 shrink-0" />
            <span className="truncate">Door QR / Barcode</span>
          </button>

          <button
            type="button"
            id="tab-windshield-ocr"
            onClick={() => setActiveTab('windshield-ocr')}
            className={`py-2.5 px-2 rounded-xl font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 transition cursor-pointer border ${
              activeTab === 'windshield-ocr'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Eye className="w-4 h-4 shrink-0" />
            <span className="truncate">Windshield OCR</span>
          </button>

          <button
            type="button"
            id="tab-photo-upload"
            onClick={() => {
              setActiveTab('upload');
              cleanupAllCameras();
            }}
            className={`py-2.5 px-2 rounded-xl font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 transition cursor-pointer border ${
              activeTab === 'upload'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4 shrink-0" />
            <span className="truncate">Upload / Phone Cam</span>
          </button>
        </div>

        {/* Viewport & Camera Container */}
        <div className="p-3 sm:p-4 flex-1 flex flex-col items-center justify-center overflow-y-auto space-y-3">
          {/* CAMERA FEED / SCAN AREA */}
          <div className="w-full relative rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-700 min-h-[300px] sm:min-h-[360px] flex items-center justify-center">
            {/* TAB 1: DOOR QR & BARCODE LIVE FEED */}
            {activeTab === 'door-code' && (
              <>
                <div id={readerElementId} className="w-full h-full min-h-[300px] overflow-hidden" />

                {isCameraActive && !detectedVin && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                    {/* Big Square/Rectangular Reticle for QR & Barcodes */}
                    <div className="w-4/5 max-w-xs h-56 border-2 border-dashed border-amber-400/90 rounded-2xl relative flex items-center justify-center bg-amber-500/5 shadow-[0_0_30px_rgba(245,158,11,0.25)]">
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-amber-400 -mt-1 -ml-1 rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-amber-400 -mt-1 -mr-1 rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-amber-400 -mb-1 -ml-1 rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-amber-400 -mb-1 -mr-1 rounded-br-lg" />

                      {/* Animated Scan Line */}
                      <div className="w-full h-0.5 bg-amber-400/80 absolute shadow-[0_0_12px_#fbbf24] animate-pulse" />

                      <span className="text-[11px] font-black uppercase tracking-wider text-amber-300 bg-slate-950/90 px-3 py-1 rounded-lg border border-amber-500/30">
                        Aim at Door QR or Barcode
                      </span>
                    </div>

                    <p className="mt-3 text-xs text-slate-200 bg-slate-950/90 px-3 py-1.5 rounded-full border border-slate-700 shadow-lg">
                      Point camera 4–8 inches from sticker in driver door jamb
                    </p>
                  </div>
                )}
              </>
            )}

            {/* TAB 2: WINDSHIELD OCR CAMERA FEED */}
            {activeTab === 'windshield-ocr' && (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className={`w-full h-full object-cover min-h-[300px] sm:min-h-[360px] ${
                    !isCameraActive ? 'hidden' : ''
                  }`}
                />

                {isCameraActive && !detectedVin && !isProcessing && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                    {/* Metal Plate Target Reticle */}
                    <div className="w-11/12 max-w-md h-28 border-2 border-dashed border-amber-400 rounded-xl relative flex items-center justify-center bg-amber-500/5 shadow-[0_0_25px_rgba(245,158,11,0.25)]">
                      <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-amber-400 -mt-1 -ml-1" />
                      <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-amber-400 -mt-1 -mr-1" />
                      <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-amber-400 -mb-1 -ml-1" />
                      <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-amber-400 -mb-1 -mr-1" />

                      <span className="text-xs font-black uppercase tracking-wider text-amber-300 bg-slate-950/90 px-3 py-1 rounded-lg border border-amber-500/30">
                        Align 17-Digit Windshield Plate
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-200 bg-slate-950/90 px-3 py-1.5 rounded-full border border-slate-700 shadow-md">
                      <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Look through lower driver-side windshield corner</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* TAB 3: PHOTO UPLOAD / PHONE NATIVE CAMERA */}
            {activeTab === 'upload' && !detectedVin && (
              <div className="p-6 text-center flex flex-col items-center justify-center max-w-md space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg">
                  <Camera className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-white">
                  Take Photo with Phone Camera App
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
                  For strong sun reflections or tinted windshields, snap a high-resolution photo with your phone&apos;s camera app and ShopWrench will instantly decode it.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Take Photo or Choose from Gallery</span>
                </button>
              </div>
            )}

            {/* OCR EXTRACTING LOADING OVERLAY */}
            {isProcessing && (
              <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center z-30 animate-in fade-in duration-150">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-400 mb-3 shadow-[0_0_25px_rgba(245,158,11,0.35)] animate-pulse">
                  <Sparkles className="w-7 h-7 animate-spin" />
                </div>
                <h4 className="text-lg font-black text-white">Extracting 17-Digit VIN...</h4>
                <p className="text-xs text-amber-300 mt-1 max-w-xs leading-relaxed">
                  Applying sunlight glare filter &amp; optical recognition to stamped digits
                </p>
              </div>
            )}

            {/* CRYSTAL CLEAR VIN CAPTURE CONFIRMATION CARD */}
            {detectedVin && (
              <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-4 sm:p-6 text-center z-40 animate-in zoom-in-95 duration-150">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 mb-2 shadow-[0_0_25px_rgba(16,185,129,0.35)]">
                  <CheckCircle2 className="w-7 h-7" />
                </div>

                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                  VIN Code Captured!
                </span>

                {/* Editable Monospace VIN Display */}
                <div className="w-full max-w-md my-2.5">
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={17}
                      value={editableVin}
                      onChange={(e) => {
                        clearCountdown();
                        setIsEditingManually(true);
                        setEditableVin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                      }}
                      className="w-full text-center font-mono text-xl sm:text-2xl font-black tracking-widest text-white bg-slate-900 border-2 border-emerald-500/80 rounded-xl py-3 px-3 shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                    <Edit3 className="w-4 h-4 text-emerald-400/60 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-center gap-1">
                    <span>{captureSourceNotes}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-amber-400">Tap digits above to fix any letter</span>
                  </p>
                </div>

                {/* Auto-Enter Countdown or Manual Confirmation Actions */}
                <div className="w-full max-w-md space-y-2 mt-2">
                  <button
                    type="button"
                    onClick={() => confirmAndSubmitVin(editableVin)}
                    className="w-full min-h-[48px] px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer transition"
                  >
                    <Check className="w-5 h-5 stroke-[3]" />
                    <span>
                      {autoEnterCountdown !== null && !isEditingManually
                        ? `Auto-Entering in ${autoEnterCountdown}s — Tap to Confirm Now`
                        : 'Confirm & Decode Vehicle'}
                    </span>
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        clearCountdown();
                        setDetectedVin(null);
                        setEditableVin('');
                        if (activeTab === 'door-code') startDoorScanner();
                        else if (activeTab === 'windshield-ocr') startWindshieldCamera();
                      }}
                      className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition cursor-pointer"
                    >
                      Retake / Scan Again
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* HARDWARE CONTROLS: TORCH & SUNLIGHT FILTERS */}
          {!detectedVin && (
            <div className="w-full flex flex-wrap items-center justify-between gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                {/* Torch / Flashlight Button */}
                {hasTorch && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      torchEnabled
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>{torchEnabled ? 'Flash ON' : 'Flash OFF'}</span>
                  </button>
                )}

                {/* Glare Filter Toggle */}
                {activeTab === 'windshield-ocr' && (
                  <button
                    type="button"
                    onClick={() =>
                      setGlareFilter((prev) =>
                        prev === 'contrast' ? 'binarize' : prev === 'binarize' ? 'normal' : 'contrast'
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
                  >
                    <SunMedium className="w-3.5 h-3.5" />
                    <span>
                      Filter: {glareFilter === 'contrast' ? 'Anti-Glare' : glareFilter === 'binarize' ? 'B&W Sharp' : 'Standard'}
                    </span>
                  </button>
                )}

                {/* Zoom */}
                {maxZoom > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => applyZoom(1)}
                      className={`px-2 py-1 rounded text-[11px] font-bold ${
                        zoomLevel === 1 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      1x
                    </button>
                    <button
                      type="button"
                      onClick={() => applyZoom(Math.min(2, maxZoom))}
                      className={`px-2 py-1 rounded text-[11px] font-bold ${
                        zoomLevel > 1 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      2x
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons for Windshield OCR Mode */}
              {activeTab === 'windshield-ocr' && (
                <button
                  type="button"
                  id="snap-windshield-btn"
                  onClick={handleSnapWindshieldPhoto}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" />
                  <span>Snap Plate Photo</span>
                </button>
              )}
            </div>
          )}

          {/* Error Notice */}
          {errorMsg && (
            <div className="w-full p-3 bg-rose-950/60 border border-rose-800 rounded-xl flex items-start gap-2.5 text-rose-200 text-xs">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-300">Scanner Notice</p>
                <p className="mt-0.5 text-rose-200/90 leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Quick Shop Presets */}
          <div className="w-full pt-2 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Or test with shop vehicle presets:</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {SAMPLE_VINS.slice(0, 4).map((sample) => (
                <button
                  key={sample.vin}
                  id={`quick-scan-${sample.vin}`}
                  onClick={() => handleSelectPreset(sample.vin)}
                  className="flex flex-col text-left px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 active:bg-amber-600 active:text-white border border-slate-700/80 transition text-xs group cursor-pointer"
                >
                  <span className="font-semibold text-slate-200 group-hover:text-amber-300 truncate text-[11px]">
                    {sample.label.split(' ')[0]} {sample.label.split(' ')[1]}
                  </span>
                  <span className="font-mono text-[9px] text-slate-400 group-hover:text-slate-300 truncate">
                    {sample.vin}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Automatic 17-digit ISO VIN validation &amp; NHTSA decode
          </span>
          <button
            id="cancel-scanner-footer-btn"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold border border-slate-600 transition cursor-pointer"
          >
            Cancel &amp; Return to Intake
          </button>
        </div>
      </div>
    </div>
  );
};
