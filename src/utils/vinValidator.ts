/**
 * VIN Validation, Checksum Verification (ISO 3779 / NHTSA),
 * and Barcode/OCR Normalization Utility.
 */

// Official ISO 3779 / NHTSA character transliteration values
const CHAR_VALUES: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
  0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9,
};

// ISO 3779 positional weights
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

export interface VinChecksumResult {
  valid: boolean;
  expected: string;
  actual: string;
}

/**
 * Validates the 9th check digit of a 17-character VIN using the official ISO 3779 / NHTSA algorithm.
 */
export function validateVinChecksum(vin: string): VinChecksumResult {
  if (!vin || vin.length !== 17) {
    return { valid: false, expected: '', actual: '' };
  }

  const upper = vin.toUpperCase();

  // Letters I, O, Q are strictly illegal in ISO 3779 VINs
  if (/[IOQ]/.test(upper)) {
    return { valid: false, expected: '', actual: upper[8] || '' };
  }

  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const val = CHAR_VALUES[upper[i]];
    if (val === undefined) {
      return { valid: false, expected: '', actual: upper[8] || '' };
    }
    sum += val * WEIGHTS[i];
  }

  const rem = sum % 11;
  const expected = rem === 10 ? 'X' : rem.toString();
  const actual = upper[8];

  return {
    valid: actual === expected,
    expected,
    actual,
  };
}

/**
 * Evaluates a candidate 17-character string against automotive VIN physical standards.
 * Returns a score where >0 indicates a plausible VIN, and >100 indicates high confidence / checksum match.
 * Gibberish strings (e.g. English words, all letters, invalid serials) receive negative scores.
 */
export function scoreVinCandidate(cand: string): number {
  if (!cand || cand.length !== 17) return -100;
  if (/[IOQ]/.test(cand)) return -100;

  // Hallucinated dictionary word check: Automotive VINs NEVER consist solely of letters.
  const digits = (cand.match(/\d/g) || []).length;
  if (digits === 0) return -500; // Zero digits = 100% dictionary word hallucination
  if (digits < 2) return -200;

  let score = 10;

  // Position 1 (WMI Region): 1-5 (North America), J (Japan), K (Korea), S (UK), W (Germany), etc.
  if (/^[1-5JKWVSMNLTR6-9]/.test(cand)) {
    score += 25;
  }

  // North American VIN rule: WMI starting with 1, 2, 3, 4, 5 MUST have numeric serial digits (positions 12-17).
  const isNorthAmerican = /^[1-5]/.test(cand);
  const serialPart = cand.slice(11);
  const isNumericSerial = /^\d{6}$/.test(serialPart);

  if (isNorthAmerican) {
    if (isNumericSerial) {
      score += 40;
    } else {
      score -= 150; // Heavily penalize invalid North American structure
    }
  } else {
    if (isNumericSerial) {
      score += 30;
    }
  }

  // Model year (digit 10): cannot be U, Z, 0, I, O, Q
  if (/^[A-HJ-NPR-TV-Y1-9]$/.test(cand[9])) {
    score += 15;
  }

  // ISO 3779 check digit match (digit 9)
  const check = validateVinChecksum(cand);
  if (check.valid) {
    score += 100;
  }

  return score;
}

/**
 * Normalizes common OCR optical confusions for stamped metal plates:
 * - O -> 0
 * - Q -> 0
 * - I -> 1
 */
export function normalizeOcrConfusions(text: string): string {
  return text
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/O/g, '0')
    .replace(/Q/g, '0')
    .replace(/I/g, '1');
}

/**
 * High-precision VIN parser for Barcodes (QR, DataMatrix, Code 39, Code 128) and OCR text streams.
 * Handles:
 * - ISO/IEC 15434 envelopes (`[)>...`)
 * - AIAG prefixes (`17V`, `V`, `1V`, `VIN:`, `18S`, `1T`, `P`)
 * - Automotive 2D DataMatrix codes on GM, Ford, and Chrysler windshield plates
 * - URL parameters (`?vin=...`)
 * - OCR misidentifications (O/0, I/1, Q/0)
 * - Strict rejection of English word hallucinations (e.g. `PESTEREASEARYSESE`)
 */
export function parseAndCleanVin(rawInput: string): string | null {
  if (!rawInput) return null;

  const text = rawInput.trim();

  // 1. Direct AIAG Prefix match (GM/Ford/Chrysler 2D DataMatrix format)
  // GM DataMatrix barcodes typically encode "[)>...17V<17_CHAR_VIN>..."
  const m17v = text.match(/(?:17V|VIN[:\s\-#]*|1V|V)([A-HJ-NPR-Z0-9]{17})/i);
  if (m17v) {
    const candidate = m17v[1].toUpperCase();
    if (scoreVinCandidate(candidate) > 0) {
      return candidate;
    }
  }

  // 2. URL query parameters (e.g., ?vin=... or /vin/...)
  const urlParamMatch = text.match(/[?&/]vin[=/]([a-zA-Z0-9]{17})/i);
  if (urlParamMatch) {
    const candidate = urlParamMatch[1].toUpperCase();
    if (scoreVinCandidate(candidate) > 0) {
      return candidate;
    }
  }

  // 3. Delimited streams (ISO 15434 separators \x1D, \x1E, newlines, tabs, commas, pipes)
  const parts = text.split(/[\x1D\x1E;,|\n\r\t]/);
  for (const part of parts) {
    const cleanPart = part.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleanPart.length === 17 && scoreVinCandidate(cleanPart) > 0) {
      return cleanPart;
    }
  }

  // 4. Test all 17-character sliding windows across raw and OCR-normalized streams
  const upper = text.toUpperCase();
  const rawClean = upper.replace(/[^A-Z0-9]/g, '');
  const normalizedClean = normalizeOcrConfusions(rawClean);

  const streams = [rawClean, normalizedClean];
  let bestCandidate: string | null = null;
  let highestScore = 0;

  for (const stream of streams) {
    for (let i = 0; i <= stream.length - 17; i++) {
      const windowCand = stream.slice(i, i + 17);
      const candScore = scoreVinCandidate(windowCand);
      if (candScore > highestScore && candScore > 0) {
        highestScore = candScore;
        bestCandidate = windowCand;
      }
    }
  }

  // 5. Common barcode prefix trimming (e.g., prepended 'I', 'T', or '1' creating 18 characters)
  if (!bestCandidate && (rawClean.length === 18 || normalizedClean.length === 18)) {
    const target = normalizedClean.length === 18 ? normalizedClean : rawClean;
    const cand17 = target.slice(1, 18);
    if (scoreVinCandidate(cand17) > 0) {
      return cand17;
    }
  }

  return bestCandidate;
}
