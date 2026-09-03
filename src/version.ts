export interface VersionInfo {
  version: string;
  releaseDate: string;
  build: string;
  changes: string[];
}

export const APP_VERSION_INFO: VersionInfo = {
  version: '1.3.0',
  releaseDate: '2026-09-03',
  build: 'rev-2026.09.03-p1',
  changes: [
    'Fixed Speak VIN voice recognition with phonetic & NATO alphabet parsing',
    'Enhanced windshield plate OCR with center reticle crop and glare filters',
    'Full 2D QR Code & Data Matrix door sticker decoder',
    'Integrated version tracking and Firebase project connection diagnostics',
    'Multi-device real-time sync between shop mobile phone & desktop'
  ]
};

export const APP_VERSION = APP_VERSION_INFO.version;
