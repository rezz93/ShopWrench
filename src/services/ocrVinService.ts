import { createWorker } from 'tesseract.js';
import { parseAndCleanVin, validateVinChecksum, scoreVinCandidate } from '../utils/vinValidator';

export interface OcrVinResult {
  vin: string;
  confidence: 'high' | 'medium' | 'low';
  source: string;
  isValidCheckDigit: boolean;
  notes?: string;
}

/**
 * Preprocess image onto an HTML5 canvas to mitigate sunlight glare,
 * glass reflections, and low-contrast stamped characters.
 */
export function preprocessOcrCanvas(
  canvas: HTMLCanvasElement,
  mode: 'contrast' | 'invert' | 'binarize' | 'normal' = 'contrast'
): string {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas.toDataURL('image/jpeg', 0.95);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;

  // Grayscale & Contrast adjustments
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];

    // Perceptual grayscale luminance
    let gray = 0.299 * r + 0.587 * g + 0.114 * b;

    if (mode === 'contrast') {
      // S-curve contrast stretch
      gray = gray < 128 ? (gray * gray) / 128 : 255 - ((255 - gray) * (255 - gray)) / 128;
      d[i] = gray;
      d[i + 1] = gray;
      d[i + 2] = gray;
    } else if (mode === 'invert') {
      // Invert stamped text (white text on dark background often reads better)
      const inv = 255 - gray;
      d[i] = inv;
      d[i + 1] = inv;
      d[i + 2] = inv;
    } else if (mode === 'binarize') {
      // Sharp high-contrast thresholding
      const binary = gray > 135 ? 255 : 0;
      d[i] = binary;
      d[i + 1] = binary;
      d[i + 2] = binary;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.95);
}

/**
 * Scales down large mobile phone camera photos (which can be 12-48MP / 15MB)
 * to an optimal OCR size (~1600px max dimension, ~250KB).
 * This ensures lightning-fast upload without network timeouts over cellular connections.
 */
export async function resizeImageForOcr(dataUrl: string, maxDim = 1600): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxDim && height <= maxDim) {
        resolve(dataUrl);
        return;
      }
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Executes a high-accuracy, 2-tier OCR extraction:
 * 1. Primary: Server-side Gemini Vision OCR via /api/ocr-vin (best for windshield glare & reflections)
 * 2. Secondary: Tuned client-side Tesseract.js (strictly whitelisted, no dictionary hallucination, for offline/static GitHub Pages)
 */
export async function extractVinFromImage(
  base64Data: string,
  mimeType: string = 'image/jpeg',
  onStatusUpdate?: (status: string) => void
): Promise<OcrVinResult> {
  // -------------------------------------------------------------
  // TIER 1: Server-Side AI Vision OCR (/api/ocr-vin)
  // -------------------------------------------------------------
  try {
    onStatusUpdate?.('Optimizing photo & analyzing windshield plate with AI Vision...');

    // Resize image for fast mobile upload and optimal model attention
    const optimizedBase64 = await resizeImageForOcr(base64Data, 1600);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const res = await fetch('/api/ocr-vin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: optimizedBase64, mimeType: 'image/jpeg' }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.vin) {
        const cleaned = parseAndCleanVin(data.vin);
        if (cleaned && cleaned.length === 17 && scoreVinCandidate(cleaned) > 0) {
          const check = validateVinChecksum(cleaned);
          return {
            vin: cleaned,
            confidence: check.valid ? 'high' : (data.confidence as 'high' | 'medium' | 'low') || 'medium',
            source: 'Gemini AI Vision OCR (Dashboard Plate)',
            isValidCheckDigit: check.valid,
            notes: data.notes || 'Identified stamped windshield characters',
          };
        }
      }
    }
  } catch (err) {
    // If backend is not available (e.g. running as static GitHub Pages SPA), fallback gracefully
    console.warn('Server-side OCR unavailable, falling back to local OCR engine:', err);
  }

  // -------------------------------------------------------------
  // TIER 2: Client-Side Tesseract OCR (Hardened against gibberish)
  // -------------------------------------------------------------
  onStatusUpdate?.('Processing image through optical character recognition...');

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image for optical processing'));
    img.src = base64Data;
  });

  let worker;
  try {
    worker = await createWorker('eng');

    // CRITICAL: Configure Tesseract worker to eliminate English dictionary word hallucinations (e.g. "PESTEREASEARYSESE")
    await worker.setParameters({
      // Whitelist only valid ISO 3779 VIN characters (NO I, O, or Q)
      tessedit_char_whitelist: '0123456789ABCDEFGHJKLMNPRSTUVWXYZ',
      // Page segmentation mode 7 = Treat image as a single text line
      tessedit_pageseg_mode: '7' as unknown as number,
      // Disable dictionary DAWGs so it does NOT turn random letters into English words
      load_system_dawg: '0',
      load_freq_dawg: '0',
      load_unambig_dawg: '0',
      load_bazaar_dawg: '0',
      load_number_dawg: '0',
    });

    // Pass A: Center Crop (where the dashboard metal plate sits)
    const cropCanvas = document.createElement('canvas');
    const cropW = Math.floor(img.width * 0.90);
    const cropH = Math.floor(img.height * 0.45);
    const cropX = Math.floor((img.width - cropW) / 2);
    const cropY = Math.floor((img.height - cropH) / 2);

    cropCanvas.width = cropW;
    cropCanvas.height = cropH;
    const cropCtx = cropCanvas.getContext('2d');
    if (cropCtx) {
      cropCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      // Contrast pass
      const contrastUrl = preprocessOcrCanvas(cropCanvas, 'contrast');
      const resContrast = await worker.recognize(contrastUrl);
      const candContrast = parseAndCleanVin(resContrast?.data?.text || '');
      if (candContrast && scoreVinCandidate(candContrast) > 50) {
        const check = validateVinChecksum(candContrast);
        return {
          vin: candContrast,
          confidence: check.valid ? 'high' : 'medium',
          source: 'Client Optical OCR (Enhanced Contrast)',
          isValidCheckDigit: check.valid,
        };
      }

      // Inverted pass (great for stamped metallic letters on dark plate)
      const invertUrl = preprocessOcrCanvas(cropCanvas, 'invert');
      const resInvert = await worker.recognize(invertUrl);
      const candInvert = parseAndCleanVin(resInvert?.data?.text || '');
      if (candInvert && scoreVinCandidate(candInvert) > 50) {
        const check = validateVinChecksum(candInvert);
        return {
          vin: candInvert,
          confidence: check.valid ? 'high' : 'medium',
          source: 'Client Optical OCR (Inverted Light)',
          isValidCheckDigit: check.valid,
        };
      }
    }

    // Pass B: Full Frame High Contrast
    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = img.width;
    fullCanvas.height = img.height;
    const fullCtx = fullCanvas.getContext('2d');
    if (fullCtx) {
      fullCtx.drawImage(img, 0, 0);
      const fullEnhanced = preprocessOcrCanvas(fullCanvas, 'contrast');
      const fullRes = await worker.recognize(fullEnhanced);
      const fullCand = parseAndCleanVin(fullRes?.data?.text || '');
      if (fullCand && scoreVinCandidate(fullCand) > 0) {
        const check = validateVinChecksum(fullCand);
        return {
          vin: fullCand,
          confidence: check.valid ? 'high' : 'low',
          source: 'Client Optical OCR (Full Frame)',
          isValidCheckDigit: check.valid,
        };
      }
    }

    throw new Error(
      'Could not detect a valid 17-digit VIN from the windshield plate image. Sun glare or reflections obscured the stamped characters. Tip: Use "Door QR / Barcode" for 100% instant accuracy, or snap a closer macro photo in the "Upload / Phone Cam" tab.'
    );
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch (termErr) {
        console.warn('Error terminating Tesseract worker:', termErr);
      }
    }
  }
}
