// RULE: Increment version by 0.0.1 on every code change (e.g. 1.4.1 -> 1.4.2)
export interface VersionInfo {
  version: string;
  releaseDate: string;
  build: string;
  changes: string[];
}

export const APP_VERSION_INFO: VersionInfo = {
  version: '1.4.2',
  releaseDate: '2026-09-03',
  build: 'rev-2026.09.03-p4',
  changes: [
    'Comprehensive layman README.md guide for phone and PC setup, login, and step-by-step job example',
    'Direct rockauto.com vehicle catalog navigation (opens directly on rockauto.com, bypassing Google search)',
    'Part name auto-copied to clipboard for instant search/filtering on RockAuto',
    'Vehicle and part details carry-over for AutoZone, O\'Reilly, and Advance Auto Parts',
    'Direct Product Link (Bypass Redirect) for immediate indexed store results',
    '1-Click Google Shopping price comparison across all retail suppliers',
    'Multi-device real-time sync with Firebase cloud database'
  ]
};

export const APP_VERSION = APP_VERSION_INFO.version;
