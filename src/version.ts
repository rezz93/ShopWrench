// RULE: Increment version by 0.0.1 on every code change (e.g. 1.4.1 -> 1.4.2)
export interface VersionInfo {
  version: string;
  releaseDate: string;
  build: string;
  changes: string[];
}

export const APP_VERSION_INFO: VersionInfo = {
  version: '1.4.17',
  releaseDate: '2026-09-05',
  build: 'rev-2026.09.05-v12',
  changes: [
    'Speak VIN App Mic: retry the Android speech-session restart with a short delay so a rejected restart no longer requires re-tapping the mic',
    'Speak VIN App Mic now keeps listening through pauses on Android until all 17 characters are captured, Stop is tapped, or 10s of silence passes; re-tapping the mic appends to the existing VIN instead of replacing it',
    'Resolved Android Chrome & phone audio-focus collision with Spotify: removed aggressive onend speech recognition restart loop that previously caused music to oscillate and cut out',
    'Separated App Microphone from Phone Keyboard Microphone with 3 clear modes: App Live Mic (hands-free), Gemini AI Audio (shop & Spotify music-proof), and Phone Keyboard Mic',
    'Fixed phone keyboard voice dictation: enhanced formatAndParseVin to seamlessly parse spaced words, NATO phonetics, and double/triple multipliers from Gboard/iOS keyboard dictation into clean 17-digit VINs without character truncation',
    'Fixed critical phonetic parsing bug where "DOUBLE ZERO" was erroneously converting to "W0" by implementing smart multipliers for double/triple digits and compound tens numbers',
    'Added automatic soft-keyboard dismissal when activating hands-free voice recognition to prevent dual-microphone conflicts between keyboard and browser',
    'Added live status feedback badge confirming instant conversion from phone keyboard speech into clean VIN format',
    'Added Manual Vehicle Entry mode to start new jobs with Year, Make, Model, Style & Engine without requiring a 17-digit VIN',
    'Provided tactile quick-chips for common model years (2000-2025), popular shop makes (Ford, Chevy, Toyota, Honda, GMC, Ram, etc.), body styles (Crew Cab, Extended Cab, Sedan, SUV, etc.), and engine displacements',
    'Integrated voice dictation for all manual vehicle input fields (Make, Model, Style, Engine, Customer Name, Symptoms, Parts)',
    'Added live interactive Vehicle Preview card showing dynamic year/make/model/style specifications as the technician types',
    'Made VIN completely optional across all parts catalogs (RockAuto, OEM dealership portals, Google Shopping, eBay) with automatic Year/Make/Model fallback',
    'Added comprehensive OEM Parts & Schematics Lookup module directly under active vehicle jobs',
    'Auto-detects vehicle make to launch official dealership OEM factory catalogs (GM Genuine, Ford Motorcraft, Mopar, Toyota, Honda, Nissan, Subaru, etc.) with prefilled VIN',
    'Added 1-click OEM Exploded Assembly Schematics, Genuine Brand-New OEM eBay inventory, and Local Dealership Wholesale Counter finder',
    'Integrated Gemini AI OEM Specs & Part # Assistant for authentic factory part numbers, superseded numbers, bolt torque specs, and OEM fluid capacities',
    'Added 1-tap "+ Add to Job" button to immediately add discovered OEM parts to the active job scratchpad',
    'Added OEM punch-out sourcing button to individual part checklist items',
    'Removed all email authentication requirements and legacy email methods; app operates on 100% zero-login instant Firestore synchronization',
    'Updated documentation to clarify zero-login device linking via direct URL',
    'Fixed Android Chrome speech repetition bug with mathematical mergeVinSequences suffix/prefix overlap deduplication',
    'Solved PC and Preview pane VIN speech misinterpretation by adding comprehensive phonetic letter homophones ("bee", "tee", "aitch", "gee"), number words, and compound tokens to WORD_TO_CHAR_MAP',
    'Added Gemini AI Multimodal Audio Scanner tab to Voice VIN modal for 100% accurate audio decoding in loud shop environments',
    'Added live character backspace control and real-time 17-character validation in Voice VIN modal',
    'Resolved Cloud Run / Publish startup failure by adding server.ts esbuild bundling to production build script (generates dist/server.cjs)',
    'Single-Operator Zero-Login Live Cloud Sync: Jobs, parts, and VIN records sync in real-time between Phone & PC via Firestore shop_jobs without login friction',
    'Streamlined Cloud Sync Modal into a zero-barrier Device & URL manager with 1-click copy link and home screen installation guidance',
    'Auto-stop on VIN complete: microphone automatically finishes once all 17 valid characters are captured',
    'Real-time Live VIN Dictation: Direct inline microphone button in VIN input field streams characters as spoken',
    'Fixed Web Speech audio pipeline conflict by decoupling getUserMedia lock from speech recognition stream',
    'Real-time NATO phonetic & digit parsing for any length (1-17 characters) with instant UI synchronization',
    'Hybrid Voice Recognition: Gemini AI multimodal audio transcription failover for Android, Chrome, and desktop PWA',
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
