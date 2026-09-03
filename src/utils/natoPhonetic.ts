/**
 * Converts speech-to-text words, phonetic alphabet (NATO/Aviation),
 * and spoken numbers into clean VIN alphanumeric characters.
 */

const WORD_TO_CHAR_MAP: Record<string, string> = {
  // Numbers
  'ZERO': '0',
  'OH': '0',
  'ONE': '1',
  'WON': '1',
  'TWO': '2',
  'TO': '2',
  'TOO': '2',
  'THREE': '3',
  'TREE': '3',
  'FOUR': '4',
  'FOR': '4',
  'FORE': '4',
  'FIVE': '5',
  'SIX': '6',
  'SEVEN': '7',
  'EIGHT': '8',
  'ATE': '8',
  'NINE': '9',
  'NINER': '9',

  // NATO Phonetic Alphabet & Common Speech Words
  'ALFA': 'A',
  'ALPHA': 'A',
  'ADAM': 'A',
  'APPLE': 'A',
  'BRAVO': 'B',
  'BOY': 'B',
  'BAKER': 'B',
  'CHARLIE': 'C',
  'CHARLES': 'C',
  'CAT': 'C',
  'DELTA': 'D',
  'DAVID': 'D',
  'DOG': 'D',
  'ECHO': 'E',
  'EDWARD': 'E',
  'EASY': 'E',
  'FOXTROT': 'F',
  'FOX': 'F',
  'FRANK': 'F',
  'GOLF': 'G',
  'GEORGE': 'G',
  'GIRL': 'G',
  'HOTEL': 'H',
  'HENRY': 'H',
  'HARRY': 'H',
  // Note: I, O, Q are not valid ISO 3779 VIN characters, but map them just in case
  'INDIA': '1',
  'IDA': '1',
  'JULIET': 'J',
  'JULIETT': 'J',
  'JOHN': 'J',
  'KILO': 'K',
  'KING': 'K',
  'LIMA': 'L',
  'LINCOLN': 'L',
  'MIKE': 'M',
  'MARY': 'M',
  'NOVEMBER': 'N',
  'NORA': 'N',
  'NANCY': 'N',
  'OSCAR': '0',
  'OCEAN': '0',
  'PAPA': 'P',
  'PAUL': 'P',
  'PETER': 'P',
  'QUEBEC': '0',
  'QUEEN': '0',
  'ROMEO': 'R',
  'ROBERT': 'R',
  'RED': 'R',
  'SIERRA': 'S',
  'SAM': 'S',
  'SUGAR': 'S',
  'TANGO': 'T',
  'TOM': 'T',
  'THOMAS': 'T',
  'UNIFORM': 'U',
  'UNION': 'U',
  'UNCLE': 'U',
  'VICTOR': 'V',
  'VICTORY': 'V',
  'WHISKEY': 'W',
  'WILLIAM': 'W',
  'WATER': 'W',
  'XRAY': 'X',
  'X-RAY': 'X',
  'YANKEE': 'Y',
  'YELLOW': 'Y',
  'YOUNG': 'Y',
  'ZULU': 'Z',
  'ZEBRA': 'Z',
};

/**
 * Parses spoken speech into clean 17-character VIN format.
 * Handles single letters, numbers, phonetic names ("One Alpha Baker Charlie Two Four..."),
 * and standard continuous speech without breaking.
 */
export function parseSpokenVin(transcript: string): string {
  if (!transcript) return '';

  // Clean and split words
  const rawWords = transcript.toUpperCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ').split(/\s+/).filter(Boolean);

  let result = '';

  for (const word of rawWords) {
    // 1. Direct word match (e.g. "ALPHA" -> "A", "FOUR" -> "4")
    if (WORD_TO_CHAR_MAP[word]) {
      result += WORD_TO_CHAR_MAP[word];
      continue;
    }

    // 2. Check if word is already an alphanumeric sequence (e.g. "1FTFW1" or "B3")
    const cleanChunk = word.replace(/[^A-Z0-9]/g, '');
    if (cleanChunk.length > 0) {
      result += cleanChunk;
    }
  }

  // Sanitize: convert invalid I, O, Q to valid VIN equivalents
  const sanitized = result
    .toUpperCase()
    .replace(/I/g, '1')
    .replace(/O/g, '0')
    .replace(/Q/g, '0')
    .replace(/[^A-HJ-NPR-Z0-9]/g, '');

  return sanitized.slice(0, 17);
}
