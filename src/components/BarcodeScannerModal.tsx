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
  FileImage,
  Upload,
  Layers,
  ArrowRight,
  Eye,
  Info,
} from 'lucide-react';
import { SAMPLE_VINS } from '../services/nhtsa';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  defaultMode?: 'dashboard' | 'barcode';
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  defaultMode = 'dashboard',
}) => {
  const [activeMode, setActiveMode] = useState<'dashboard' | 'barcode'>(defaultMode);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBarcodeScanning, setIsBarcodeScanning] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [scannedVin, setScannedVin] = useState<string | null>(null);
  const [capturedSnapshot, setCapturedSnapshot] = useState<string | null>(null);
  const [ocrNotes, setOcrNotes] = useState<string | null>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Barcode scanner ref
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'vin-barcode-scanner-viewport';

  // Dashboard OCR camera refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reset when opened
  useEffect(() => {
    if (!isOpen) {
      cleanupAllCameras();
      return;
    }

    setErrorMsg(null);
    setScannedVin(null);
    setCapturedSnapshot(null);
    setOcrNotes(null);
    setIsCameraActive(false);

    if (activeMode === 'barcode') {
      startBarcodeScanner();
    } else {
      startDashboardOcrCamera();
    }

    return () => {
      cleanupAllCameras();
    };
  }, [isOpen, activeMode]);

  // Clean up all camera feeds
  const cleanupAllCameras = async () => {
    // 1. Stop HTML5 barcode scanner
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
    setIsBarcodeScanning(false);

    // 2. Stop raw MediaStream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Start Barcode Scanner (html5-qrcode) with fallback
  const startBarcodeScanner = async () => {
    await cleanupAllCameras();
    setErrorMsg(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const element = document.getElementById(readerElementId);
      if (!element) return;

      const formatsToSupport = [
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.DATA_MATRIX,
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.EAN_13,
      ];

      const html5QrCode = new Html5Qrcode(readerElementId, {
        formatsToSupport,
        verbose: false,
      });
      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          return {
            width: Math.floor(viewfinderWidth * 0.85),
            height: Math.floor(Math.min(viewfinderHeight * 0.5, 140)),
          };
        },
        aspectRatio: 1.333,
      };

      let started = false;
      // 1. Try environment camera first
      try {
        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            const clean = decodedText.trim().replace(/[^A-Za-z0-9]/g, '').toUpperCase();
            if (clean.length >= 10) {
              handleVinDetected(clean);
            }
          },
          () => {}
        );
        started = true;
      } catch (e1) {
        console.warn('Barcode environment camera failed, trying available cameras list:', e1);
        // 2. Try enumerating any available cameras
        const cameras = await Html5Qrcode.getCameras().catch(() => []);
        if (cameras && cameras.length > 0) {
          await html5QrCode.start(
            cameras[0].id,
            config,
            (decodedText) => {
              const clean = decodedText.trim().replace(/[^A-Za-z0-9]/g, '').toUpperCase();
              if (clean.length >= 10) {
                handleVinDetected(clean);
              }
            },
            () => {}
          );
          started = true;
        } else {
          throw new Error('Requested device not found');
        }
      }

      if (started) {
        setIsBarcodeScanning(true);
        setIsCameraActive(true);
      }
    } catch (err: unknown) {
      console.warn('Barcode camera start error:', err);
      setIsBarcodeScanning(false);
      setIsCameraActive(false);
      const msg = err instanceof Error ? err.message : String(err);
      handleCameraError(msg);
    }
  };

  // Start Dashboard OCR Camera Stream with cascading fallbacks
  const startDashboardOcrCamera = async () => {
    await cleanupAllCameras();
    setErrorMsg(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera device API is not supported in this browser.');
      }

      let stream: MediaStream | null = null;

      // Strategy 1: Rear camera with high resolution
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch (err1) {
        console.warn('High-res environment camera failed, falling back to basic facingMode:', err1);
        // Strategy 2: Basic environment facingMode
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false,
          });
        } catch (err2) {
          console.warn('Basic environment facingMode failed, falling back to any video input:', err2);
          // Strategy 3: Any video device (webcam, front cam, USB camera)
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      if (stream) {
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch (playErr) {
            console.warn('Video playback notice:', playErr);
          }
        }
        setIsCameraActive(true);
      }
    } catch (err: unknown) {
      console.warn('Dashboard camera start notice:', err);
      setIsCameraActive(false);
      const msg = err instanceof Error ? err.message : String(err);
      handleCameraError(msg);
    }
  };

  const handleCameraError = (rawMsg: string) => {
    const msg = rawMsg.toLowerCase();
    if (
      msg.includes('permission') ||
      msg.includes('notallowederror') ||
      msg.includes('denied')
    ) {
      setErrorMsg('Camera permission denied. Please allow camera access in browser settings.');
    } else if (
      msg.includes('not found') ||
      msg.includes('notfounderror') ||
      msg.includes('devicesnotfounderror') ||
      msg.includes('requested device not found') ||
      msg.includes('no camera') ||
      msg.includes('overconstrained')
    ) {
      setErrorMsg('No physical camera detected on this system. You can upload a photo of the VIN or choose a test vehicle.');
    } else {
      setErrorMsg('Live camera feed unavailable. You can upload a photo of the VIN plate or select a test vehicle.');
    }
  };

  // Helper to extract a valid VIN from OCR recognized text
  const extractVinFromOcrText = (rawText: string): string | null => {
    if (!rawText) return null;
    const cleaned = rawText.toUpperCase().replace(/[\r\n\t]/g, ' ');

    // 1. Check for standard 17-character VIN pattern (alphanumeric without I, O, Q)
    const exactMatches = cleaned.match(/\b([A-HJ-NPR-Z0-9]{17})\b/g);
    if (exactMatches && exactMatches.length > 0) {
      return exactMatches[0];
    }

    // 2. Strip non-alphanumeric and search for consecutive 17 valid chars
    const stripped = rawText.toUpperCase().replace(/[^A-Z0-9]/g, '');
    for (let i = 0; i <= stripped.length - 17; i++) {
      const candidate = stripped.slice(i, i + 17);
      if (!/[IOQ]/.test(candidate)) {
        return candidate;
      }
    }

    // 3. Fallback: 11-17 alphanumeric string
    const fallbackMatches = cleaned.match(/\b([A-HJ-NPR-Z0-9]{11,17})\b/g);
    if (fallbackMatches && fallbackMatches.length > 0) {
      return fallbackMatches[0];
    }

    return null;
  };

  // Perform in-browser client-side OCR on image base64 (Pure Static / No backend required)
  const processImageOcr = async (base64Image: string) => {
    setIsOcrProcessing(true);
    setErrorMsg(null);
    setCapturedSnapshot(base64Image);

    try {
      // Run Tesseract.js client-side in browser
      const result = await recognize(base64Image, 'eng');
      const text = result?.data?.text || '';
      const detectedVin = extractVinFromOcrText(text);

      if (detectedVin && detectedVin.length >= 11) {
        setOcrNotes(`Decoded via in-browser OCR: ${detectedVin}`);
        handleVinDetected(detectedVin);
      } else {
        throw new Error(
          'Could not clearly read a 17-digit VIN plate from this photo. Please hold camera closer to the VIN plate or switch to the Barcode Scanner tab.'
        );
      }
    } catch (err: unknown) {
      console.error('OCR Processing error:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Error extracting VIN from image.');
      setCapturedSnapshot(null);
    } finally {
      setIsOcrProcessing(false);
    }
  };

  // Shutter button: capture current video frame
  const handleCaptureSnapshot = () => {
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
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

      processImageOcr(dataUrl);
    } catch (err) {
      console.error('Snapshot capture error:', err);
      setErrorMsg('Failed to capture frame from video feed. You can upload a photo instead.');
    }
  };

  // File / Photo upload fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        processImageOcr(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag & Drop Handler
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          processImageOcr(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleVinDetected = (detectedVin: string) => {
    setScannedVin(detectedVin);
    try {
      navigator.vibrate?.([100, 50, 100]);
    } catch {
      // ignore
    }

    setTimeout(() => {
      cleanupAllCameras().then(() => {
        onScanSuccess(detectedVin);
      });
    }, 1200);
  };

  const handleSimulateScan = (sampleVin: string) => {
    setScannedVin(sampleVin);
    cleanupAllCameras().then(() => {
      onScanSuccess(sampleVin);
    });
  };

  if (!isOpen) return null;

  return (
    <div
      id="barcode-scanner-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 bg-slate-800/95 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Camera VIN Capture
              </h3>
              <p className="text-xs text-slate-400">
                Dashboard windshield plate OCR or door barcode
              </p>
            </div>
          </div>
          <button
            id="close-scanner-btn"
            onClick={onClose}
            aria-label="Close Scanner"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 border border-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs (Dashboard Windshield vs Door Barcode) */}
        <div className="p-2.5 bg-slate-950/70 border-b border-slate-800 flex gap-2">
          <button
            type="button"
            id="mode-tab-dashboard-ocr"
            onClick={() => setActiveMode('dashboard')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer border ${
              activeMode === 'dashboard'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Eye className="w-4 h-4 shrink-0" />
            <span>Dashboard / Windshield (OCR)</span>
          </button>

          <button
            type="button"
            id="mode-tab-door-barcode"
            onClick={() => setActiveMode('barcode')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer border ${
              activeMode === 'barcode'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Scan className="w-4 h-4 shrink-0" />
            <span>Door-Jamb Barcode</span>
          </button>
        </div>

        {/* Viewport Area */}
        <div className="p-4 flex-1 flex flex-col items-center justify-center overflow-y-auto space-y-3">
          {/* CAMERA FEED CONTAINER */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`w-full relative rounded-xl overflow-hidden bg-slate-950 border-2 min-h-[260px] sm:min-h-[300px] flex items-center justify-center transition-all ${
              isDraggingOver
                ? 'border-amber-400 bg-amber-950/20 ring-4 ring-amber-500/20'
                : 'border-slate-700'
            }`}
          >
            {/* MODE 1: DASHBOARD / WINDSHIELD CAMERA OCR */}
            {activeMode === 'dashboard' && (
              <>
                {/* Live Video Feed when active */}
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className={`w-full h-full object-cover min-h-[260px] sm:min-h-[300px] ${
                    !isCameraActive ? 'hidden' : ''
                  } ${isOcrProcessing ? 'brightness-50' : ''}`}
                />

                {/* Stored Captured Frame Preview */}
                {capturedSnapshot && isOcrProcessing && (
                  <img
                    src={capturedSnapshot}
                    alt="Captured VIN"
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                  />
                )}

                {/* Live Reticle Overlay when Camera is Streaming */}
                {isCameraActive && !scannedVin && !isOcrProcessing && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                    {/* Metal Plate Reticle */}
                    <div className="w-11/12 max-w-sm h-24 border-2 border-dashed border-amber-400/90 rounded-lg relative flex items-center justify-center bg-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                      {/* Corner Accents */}
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-amber-400 -mt-1 -ml-1"></div>
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-amber-400 -mt-1 -mr-1"></div>
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-amber-400 -mb-1 -ml-1"></div>
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-amber-400 -mb-1 -mr-1"></div>

                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 bg-slate-950/90 px-2.5 py-0.5 rounded border border-amber-500/30">
                        Align 17-Digit Dashboard Plate
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-200 bg-slate-950/90 px-3 py-1.5 rounded-full border border-slate-700 shadow-md">
                      <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Aim through driver-side windshield corner</span>
                    </div>
                  </div>
                )}

                {/* Fallback Viewport when Camera is Inactive / Unavailable */}
                {!isCameraActive && !isOcrProcessing && !scannedVin && (
                  <div className="p-6 text-center flex flex-col items-center justify-center max-w-md">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-lg">
                      <FileImage className="w-8 h-8" />
                    </div>
                    <h4 className="text-base font-bold text-white mb-1">
                      {isDraggingOver ? 'Drop Image to Extract VIN' : 'Photo Upload & AI Recognition'}
                    </h4>
                    <p className="text-xs text-slate-400 mb-4 max-w-xs leading-relaxed">
                      Upload or drag &amp; drop a clear snapshot of the vehicle dashboard plate, door jamb sticker, or registration document.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        id="viewport-upload-btn"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer shadow-md"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Select Photo File</span>
                      </button>
                      <button
                        type="button"
                        id="viewport-retry-camera-btn"
                        onClick={startDashboardOcrCamera}
                        className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs sm:text-sm border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry Camera</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* OCR Extracting Loading Overlay */}
                {isOcrProcessing && (
                  <div className="absolute inset-0 bg-slate-950/85 flex flex-col items-center justify-center p-4 text-center z-10 animate-in fade-in duration-150">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-400 mb-3 shadow-[0_0_25px_rgba(245,158,11,0.3)] animate-pulse">
                      <Sparkles className="w-7 h-7 animate-spin" />
                    </div>
                    <h4 className="text-base font-bold text-white">Extracting Vehicle VIN...</h4>
                    <p className="text-xs text-amber-300/90 mt-1 max-w-xs">
                      Optical model parsing stamped digits through glass reflections
                    </p>
                  </div>
                )}
              </>
            )}

            {/* MODE 2: DOOR BARCODE SCANNER (HTML5 QRCODE) */}
            {activeMode === 'barcode' && (
              <>
                <div id={readerElementId} className="w-full overflow-hidden" />

                {isBarcodeScanning && !scannedVin && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                    <div className="w-11/12 h-28 border-2 border-dashed border-amber-400/80 rounded-lg relative flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.25)]">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-amber-400 -mt-1 -ml-1"></div>
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-amber-400 -mt-1 -mr-1"></div>
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-amber-400 -mb-1 -ml-1"></div>
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-amber-400 -mb-1 -mr-1"></div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-amber-300 bg-slate-950/80 px-2 py-0.5 rounded">
                        Align Barcode Here
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-slate-300 bg-slate-950/80 px-3 py-1 rounded-full border border-slate-700">
                      Hold 4-8 inches from door-jamb sticker
                    </p>
                  </div>
                )}

                {!isCameraActive && !scannedVin && (
                  <div className="p-6 text-center flex flex-col items-center justify-center max-w-md">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-lg">
                      <Scan className="w-8 h-8" />
                    </div>
                    <h4 className="text-base font-bold text-white mb-1">Barcode Camera Offline</h4>
                    <p className="text-xs text-slate-400 mb-4 max-w-xs leading-relaxed">
                      No barcode camera detected. Switch to Dashboard OCR or use quick vehicle presets below.
                    </p>
                    <button
                      type="button"
                      onClick={startBarcodeScanner}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry Barcode Camera</span>
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Scanned Success Feedback */}
            {scannedVin && (
              <div className="absolute inset-0 bg-emerald-950/95 flex flex-col items-center justify-center p-4 text-center z-20 animate-in fade-in duration-200">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 mb-3 shadow-[0_0_30px_rgba(16,185,129,0.35)]">
                  <CheckCircle2 className="w-8 h-8 animate-bounce" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  VIN Identified
                </span>
                <p className="font-mono text-xl font-black text-white mt-1 tracking-wider bg-slate-950/60 px-4 py-1.5 rounded-lg border border-emerald-500/30">
                  {scannedVin}
                </p>
                {ocrNotes && <p className="text-[11px] text-emerald-300/80 mt-1.5">{ocrNotes}</p>}
                <p className="text-xs text-slate-300 mt-2 flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>Passing to NHTSA vehicle specs decoder...</span>
                </p>
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

          {/* Action Controls for Dashboard Mode */}
          {activeMode === 'dashboard' && !scannedVin && (
            <div className="w-full flex items-center gap-2">
              {/* Primary Action Button */}
              <button
                type="button"
                id="capture-dashboard-vin-btn"
                onClick={handleCaptureSnapshot}
                disabled={isOcrProcessing}
                className="flex-1 min-h-[50px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black text-sm sm:text-base shadow-lg shadow-amber-500/20 border border-amber-400 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {isOcrProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Processing Image...</span>
                  </>
                ) : isCameraActive ? (
                  <>
                    <Camera className="w-5 h-5" />
                    <span>Capture &amp; Extract VIN</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    <span>Upload VIN Photo</span>
                  </>
                )}
              </button>

              {/* Upload Photo Secondary Button */}
              {isCameraActive && (
                <button
                  type="button"
                  id="upload-vin-photo-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isOcrProcessing}
                  className="min-h-[50px] px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 text-xs sm:text-sm font-semibold border border-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  title="Upload Photo of VIN Plate"
                >
                  <Upload className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">Upload</span>
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

          {/* Quick-Test Vehicle Presets for quick shop testing */}
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
                  onClick={() => handleSimulateScan(sample.vin)}
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

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Supports Windshield plates, Door-Jamb barcodes &amp; Documents
          </span>
          <button
            id="cancel-scanner-footer-btn"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 text-xs sm:text-sm font-semibold border border-slate-600 transition cursor-pointer"
          >
            Cancel &amp; Return to Intake
          </button>
        </div>
      </div>
    </div>
  );
};
