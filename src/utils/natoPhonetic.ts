/**
 * Converts speech-to-text words, phonetic alphabet (NATO/Aviation),
 * spoken letters, homophones, and numbers into clean VIN alphanumeric characters.
 */

// Comprehensive phonetic map matching natural spoken automotive VIN dictation
const WORD_TO_CHAR_MAP: Record<string, string> = {
  // Numbers 0 - 9
  'ZERO': '0',
  'OH': '0',
  'O': '0',
  'NIL': '0',
  'ONE': '1',
  'WON': '1',
  'FIRST': '1',
  'TWO': '2',
  'TO': '2',
  'TOO': '2',
  'SECOND': '2',
  'THREE': '3',
  'TREE': '3',
  'THIRD': '3',
  'FOUR': '4',
  'FOR': '4',
  'FORE': '4',
  'FOURTH': '4',
  'FIVE': '5',
  'FIFTH': '5',
  'SIX': '6',
  'SIXTH': '6',
  'SEVEN': '7',
  'SEVENTH': '7',
  'EIGHT': '8',
  'ATE': '8',
  'EIGHTH': '8',
  'NINE': '9',
  'NINER': '9',
  'NINTH': '9',

  // Compound 10-19 numbers (when speech engine groups digits)
  'TEN': '10',
  'ELEVEN': '11',
  'TWELVE': '12',
  'THIRTEEN': '13',
  'FOURTEEN': '14',
  'FIFTEEN': '15',
  'SIXTEEN': '16',
  'SEVENTEEN': '17',
  'EIGHTEEN': '18',
  'NINETEEN': '19',

  // Tens numbers
  'TWENTY': '20',
  'THIRTY': '30',
  'FORTY': '40',
  'FIFTY': '50',
  'SIXTY': '60',
  'SEVENTY': '70',
  'EIGHTY': '80',
  'NINETY': '90',

  // Letter A
  'A': 'A',
  'AY': 'A',
  'EY': 'A',
  'ALPHA': 'A',
  'ALFA': 'A',
  'ADAM': 'A',
  'APPLE': 'A',
  'ABLE': 'A',

  // Letter B
  'B': 'B',
  'BE': 'B',
  'BEE': 'B',
  'BRAVO': 'B',
  'BOY': 'B',
  'BAKER': 'B',

  // Letter C
  'C': 'C',
  'SEE': 'C',
  'SEA': 'C',
  'SI': 'C',
  'CHARLIE': 'C',
  'CHARLES': 'C',
  'CAT': 'C',

  // Letter D
  'D': 'D',
  'DEE': 'D',
  'DELTA': 'D',
  'DAVID': 'D',
  'DOG': 'D',

  // Letter E
  'E': 'E',
  'EE': 'E',
  'ECHO': 'E',
  'EDWARD': 'E',
  'EASY': 'E',

  // Letter F
  'F': 'F',
  'EF': 'F',
  'EFF': 'F',
  'FOXTROT': 'F',
  'FOX': 'F',
  'FRANK': 'F',

  // Letter G
  'G': 'G',
  'GEE': 'G',
  'JI': 'G',
  'GOLF': 'G',
  'GEORGE': 'G',
  'GIRL': 'G',

  // Letter H
  'H': 'H',
  'AITCH': 'H',
  'EITCH': 'H',
  'HACH': 'H',
  'HOTEL': 'H',
  'HENRY': 'H',
  'HARRY': 'H',

  // Letters I, O, Q (Not valid in ISO 3779, automatically normalized)
  'INDIA': '1',
  'IDA': '1',
  'EYE': '1',
  'OSCAR': '0',
  'OCEAN': '0',
  'QUEBEC': '0',
  'QUEEN': '0',

  // Letter J
  'J': 'J',
  'JAY': 'J',
  'JULIET': 'J',
  'JULIETT': 'J',
  'JOHN': 'J',

  // Letter K
  'K': 'K',
  'KAY': 'K',
  'KILO': 'K',
  'KING': 'K',

  // Letter L
  'L': 'L',
  'EL': 'L',
  'ELL': 'L',
  'LIMA': 'L',
  'LINCOLN': 'L',

  // Letter M
  'M': 'M',
  'EM': 'M',
  'MIKE': 'M',
  'MARY': 'M',

  // Letter N
  'N': 'N',
  'EN': 'N',
  'NOVEMBER': 'N',
  'NORA': 'N',
  'NANCY': 'N',

  // Letter P
  'P': 'P',
  'PEE': 'P',
  'PEA': 'P',
  'PAPA': 'P',
  'PAUL': 'P',
  'PETER': 'P',

  // Letter R
  'R': 'R',
  'AR': 'R',
  'ARE': 'R',
  'OUR': 'R',
  'ROMEO': 'R',
  'ROBERT': 'R',
  'RED': 'R',

  // Letter S
  'S': 'S',
  'ES': 'S',
  'ESS': 'S',
  'SIERRA': 'S',
  'SAM': 'S',
  'SUGAR': 'S',

  // Letter T
  'T': 'T',
  'TEE': 'T',
  'TEA': 'T',
  'TANGO': 'T',
  'TOM': 'T',
  'THOMAS': 'T',

  // Letter U
  'U': 'U',
  'YOU': 'U',
  'UNIFORM': 'U',
  'UNION': 'U',
  'UNCLE': 'U',

  // Letter V
  'V': 'V',
  'VEE': 'V',
  'VICTOR': 'V',
  'VICTORY': 'V',

  // Letter W
  'W': 'W',
  'DOUBLE': 'W',
  'DOUBLEU': 'W',
  'DOUBLE-U': 'W',
  'WHISKEY': 'W',
  'WILLIAM': 'W',
  'WATER': 'W',

  // Letter X
  'X': 'X',
  'EX': 'X',
  'XRAY': 'X',
  'X-RAY': 'X',

  // Letter Y
  'Y': 'Y',
  'WHY': 'Y',
  'WYE': 'Y',
  'YANKEE': 'Y',
  'YELLOW': 'Y',
  'YOUNG': 'Y',

  // Letter Z
  'Z': 'Z',
  'ZEE': 'Z',
  'ZED': 'Z',
  'ZULU': 'Z',
  'ZEBRA': 'Z',
};

// Filler words to ignore in spoken streams
const IGNORE_WORDS = new Set([
  'THE',
  'CAR',
  'TRUCK',
  'VEHICLE',
  'VIN',
  'NUMBER',
  'IS',
  'NEXT',
  'AND',
  'WITH',
  'DASH',
  'HYPHEN',
  'SPACE',
  'DOT',
  'PERIOD',
  'PLEASE',
  'LETTER',
  'DIGIT',
  'CAPITAL',
]);

/**
 * Parses spoken speech into clean 17-character VIN format.
 * Handles single letters, numbers, phonetic names ("One Alpha Baker Charlie Two Four..."),
 * letter homophones ("gee tee aitch bee"), and compound numbers ("41BT", "1GTH").
 */
export function parseSpokenVin(transcript: string): string {
  if (!transcript) return '';

  // Clean, normalize and split tokens
  const rawWords = transcript
    .toUpperCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  let result = '';

  for (let i = 0; i < rawWords.length; i++) {
    const word = rawWords[i];

    // 1. Skip explicit conversational filler words
    if (IGNORE_WORDS.has(word)) {
      continue;
    }

    // 2. Direct phonetic / spoken word match
    if (WORD_TO_CHAR_MAP[word]) {
      result += WORD_TO_CHAR_MAP[word];
      continue;
    }

    // 3. Multi-word phrases like "DOUBLE U" -> W
    if (word === 'DOUBLE' && i + 1 < rawWords.length && (rawWords[i + 1] === 'U' || rawWords[i + 1] === 'YOU')) {
      result += 'W';
      i++; // Skip next token
      continue;
    }

    // 4. Token already consists of valid alphanumeric chars (e.g. "1GTH6", "41BT", "B", "7")
    // If it's a short sequence or contains digits, treat each character directly.
    const cleanChars = word.replace(/[^A-Z0-9]/g, '');
    if (cleanChars.length > 0) {
      // If it contains digits (like "41BT" or "1GTH6") or is 1-2 characters, accept it directly
      const hasDigit = /\d/.test(cleanChars);
      if (hasDigit || cleanChars.length <= 2) {
        result += cleanChars;
        continue;
      }
      // If it's a longer pure-word with no digits and not in our map (e.g. "CHEVROLET"), do NOT dump all letters into the VIN
    }
  }

  // Sanitize per ISO 3779 standard (I, O, Q replaced with 1, 0, 0)
  const sanitized = result
    .toUpperCase()
    .replace(/I/g, '1')
    .replace(/O/g, '0')
    .replace(/Q/g, '0')
    .replace(/[^A-HJ-NPR-Z0-9]/g, '');

  return sanitized.slice(0, 17);
}

/**
 * Intelligent non-duplicating sequence merge:
 * Merges previous confirmed VIN characters with incoming speech result,
 * preventing Android Chrome's notorious utterance-repetition and compounding loops.
 */
export function mergeVinSequences(prefix: string, addition: string): string {
  const p = (prefix || '').trim().toUpperCase();
  const a = (addition || '').trim().toUpperCase();

  if (!a) return p;
  if (!p) return a.slice(0, 17);

  // If addition already starts with prefix, addition is the authoritative latest state
  if (a.startsWith(p)) {
    return a.slice(0, 17);
  }

  // If prefix already contains addition completely at the beginning, don't duplicate
  if (p.startsWith(a)) {
    return p.slice(0, 17);
  }

  // Find longest overlapping suffix of prefix that matches the start of addition
  const maxOverlap = Math.min(p.length, a.length);
  for (let len = maxOverlap; len > 0; len--) {
    if (p.endsWith(a.slice(0, len))) {
      const merged = p + a.slice(len);
      return merged.slice(0, 17);
    }
  }

  // No overlap found: append addition to prefix
  const combined = p + a;
  return combined.slice(0, 17);
}

