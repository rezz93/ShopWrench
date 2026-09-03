export interface VersionInfo {
  version: string;
  releaseDate: string;
  build: string;
  changes: string[];
}

export const APP_VERSION_INFO: VersionInfo = {
  version: '1.4.0',
  releaseDate: '2026-09-03',
  build: 'rev-2026.09.03-p2',
  changes: [
    'Vehicle and part details carry-over for AutoZone, O\'Reilly, and Advance Auto Parts',
    'Direct Product Link (Bypass Redirect) for immediate indexed store results',
    'Automatic search query copy to clipboard for rapid 1-click paste into parts sites',
    'Standardized mechanic shorthand terms (e.g. temp sensor -> Engine Coolant Temperature Sensor)',
    '1-Click Google Shopping price comparison across all retail suppliers',
    'Multi-device real-time sync with Firebase cloud database'
  ]
};

export const APP_VERSION = APP_VERSION_INFO.version;
