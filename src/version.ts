// RULE: Increment version by 0.0.1 on every code change (e.g. 1.4.1 -> 1.4.2)
export interface VersionInfo {
  version: string;
  releaseDate: string;
  build: string;
  changes: string[];
}

export const APP_VERSION_INFO: VersionInfo = {
  version: '1.4.6',
  releaseDate: '2026-09-05',
  build: 'rev-2026.09.05-v1',
  changes: [
    'Hybrid Voice Recognition: Gemini AI multimodal audio transcription failover for Android, Chrome, and desktop PWA',
    'Resolved browser Web Speech permission and network blocks with native hardware MediaRecorder streaming',
    'Dedicated Automotive Voice VIN mode with ISO 3779 17-character validation and NATO phonetic alphabet conversion',
    'Quick-insert shortcut for customer 2018 GMC Canyon (1GTH6BEN9J1101728) in voice and preset selectors',
    'Dashboard VIN Plate OCR: 2-tier Gemini AI Vision + hardened client Tesseract OCR pipeline',
    'ISO 3779 / NHTSA 9th digit checksum verification with real-time badge and safeguard confirmation',
    'Automotive 2D DataMatrix barcode preamble normalization ([)>06, 17V stripping)',
    'Enhanced camera reticle supporting door jamb barcodes, QR codes, and dashboard plates',
    'Anti-glare and high-contrast filters for sunlight and windshield reflections',
    'Resolved [vite] websocket connection error by disabling HMR in dev middleware',
    'Disabled devOptions service worker injection in vite.config.ts',
    'Comprehensive layman README.md guide for phone and PC setup, login, and step-by-step job example',
    'Direct rockauto.com vehicle catalog navigation',
    'Part name auto-copied to clipboard for instant search/filtering',
    'Vehicle and part details carry-over for retail parts stores',
    'Multi-device real-time sync with Firebase cloud database'
  ]
};

export const APP_VERSION = APP_VERSION_INFO.version;
