import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();

  // Middleware
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Initialize Gemini Client
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in server environment.');
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // OCR VIN Extraction Endpoint
  app.post('/api/ocr-vin', async (req, res) => {
    try {
      const { imageBase64, mimeType = 'image/jpeg' } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: 'Missing imageBase64 payload in request body.' });
      }

      // Strip data URL header if present
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

      const ai = getGeminiClient();

      const prompt = `You are an elite automotive vehicle intake and VIN OCR extraction specialist for an automotive repair shop.
The user has photographed a vehicle VIN plate, which is commonly:
1. The dashboard metal plate viewed through the lower driver-side windshield corner.
2. The vehicle driver door-jamb sticker or B-pillar label.
3. Vehicle registration / title / work order document.

CRITICAL INSTRUCTIONS FOR DASHBOARD WINDSHIELD PLATES:
- Automotive dashboard VIN plates (especially General Motors / GMC / Chevrolet / Ford / Ram / Toyota) frequently feature:
  * A small square 2D DataMatrix barcode on the far left.
  * A manufacturer logo emblem (such as "GM" inside a square) immediately beside the 2D code.
  * The actual 17-character VIN printed or stamped directly to the right of the GM logo (e.g. "1GTH6BEN9J1101728").
- DO NOT include the "GM" logo letters or barcode headers in the VIN!
- Standard ISO 3779 / NHTSA VIN rules:
  * Exactly 17 characters long.
  * Letters I, O, and Q are NEVER present in valid VINs. If a character looks like I or O or Q, it is 1 or 0.
  * The 9th digit is an ISO 3779 mathematical check digit (0-9 or X).
  * The 10th digit is the Model Year (e.g., J = 2018, K = 2019, L = 2020, etc.).
  * For North American vehicles (starting with 1, 2, 3, 4, or 5), positions 12 through 17 are ALWAYS numeric serial digits (e.g. 1101728).
- Windshield reflections: If the photo has sunlight glare, reflections of the photographer/phone, or glass tint, ignore reflections and focus directly on the stamped characters embossed or printed on the recessed metal plate.
- Look at the image carefully and return the cleaned 17-character VIN in uppercase without spaces, hyphens, or extra symbols.`;

      const modelsToTry = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.8-flash'];
      let response: any = null;
      let lastErr: any = null;

      for (const modelName of modelsToTry) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: cleanBase64,
                    },
                  },
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  vin: {
                    type: Type.STRING,
                    description: 'The extracted 17-character VIN in uppercase, or empty string if not found',
                  },
                  confidence: {
                    type: Type.STRING,
                    description: 'high, medium, or low',
                  },
                  detectedLocation: {
                    type: Type.STRING,
                    description: 'dashboard_windshield, door_jamb, document, or unknown',
                  },
                  notes: {
                    type: Type.STRING,
                    description: 'Brief explanation of characters identified or any corrections made',
                  },
                },
                required: ['vin', 'confidence'],
              },
            },
          });
          if (response?.text) {
            break;
          }
        } catch (mErr: any) {
          lastErr = mErr;
          console.warn(`Model ${modelName} failed for OCR VIN:`, mErr?.message || mErr);
        }
      }

      if (!response?.text) {
        throw lastErr || new Error('All AI vision models were temporarily unavailable.');
      }

      const text = response.text;
      if (!text) {
        return res.status(500).json({ error: 'No response generated from OCR model.' });
      }

      const result = JSON.parse(text.trim());
      // Clean extracted VIN string
      if (result.vin) {
        result.vin = result.vin.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        // Strip accidental GM logo or 17V prefix if model included it
        if (result.vin.length > 17) {
          const match17 = result.vin.match(/(?:17V|GM)?([A-HJ-NPR-Z0-9]{17})/);
          if (match17) {
            result.vin = match17[1];
          }
        }
      }

      return res.json({
        success: true,
        ...result,
      });
    } catch (err: unknown) {
      console.error('OCR VIN error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown OCR processing error';
      return res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  });

  // Multimodal Gemini Audio Transcription Endpoint (Universal Voice Dictation & VIN Extraction)
  app.post('/api/transcribe-audio', async (req, res) => {
    try {
      const { audioBase64, mimeType = 'audio/webm', mode = 'general' } = req.body;

      if (!audioBase64) {
        return res.status(400).json({ error: 'Missing audioBase64 payload in request body.' });
      }

      // Strip data URL header if present (e.g. data:audio/webm;codecs=opus;base64,...)
      const cleanBase64 = audioBase64.replace(/^data:audio\/[a-zA-Z0-9.+_-]+;base64,/, '');

      // Normalize mimeType for Gemini: Gemini supports audio/webm, audio/mp4, audio/wav, audio/ogg, audio/mpeg, etc.
      let normalizedMime = mimeType.split(';')[0].trim();
      if (!normalizedMime || !normalizedMime.startsWith('audio/')) {
        normalizedMime = 'audio/webm';
      }

      const ai = getGeminiClient();

      let prompt = '';
      if (mode === 'vin') {
        prompt = `You are an expert automotive VIN voice transcription specialist for an auto repair shop.
The audio is a mechanic, technician, or driver speaking an automotive 17-character Vehicle Identification Number (VIN).
They may speak:
- Alphanumeric characters sequentially (e.g., "1 G T H 6 B E N 9 J 1 1 0 1 7 2 8")
- NATO phonetic alphabet (e.g. "One Golf Tango Hotel Six Bravo Echo November Nine Juliet...")
- Numbers as digits (e.g., "One" -> 1, "Zero" -> 0, "Six" -> 6)
CRITICAL VIN RULES:
1. Valid VINs are exactly 17 characters long.
2. Letters I, O, and Q are NEVER used in any VIN. If you hear "I" or "eye", it is digit 1. If you hear "O" or "oh", it is digit 0.
3. Positions 12 through 17 are always numeric serial digits on North American vehicles (e.g., 1101728).
4. Return the clean 17-character uppercase alphanumeric VIN without spaces or dashes.
Return JSON with:
- "vin": the extracted 17-character VIN in uppercase, or best partial sequence.
- "transcript": the raw words spoken by the user.
- "confidence": "high", "medium", or "low".`;
      } else {
        prompt = `You are an expert automotive voice dictation assistant.
Transcribe the user's spoken voice audio verbatim.
The dictation may include automotive terminology, mechanic inspection notes, customer repair complaints, part names, or diagnostic trouble codes (such as OBD-II codes P0300, P0420).
Return JSON with:
- "transcript": The clean, correctly punctuated, capitalized English transcript of what was spoken.
- "confidence": "high", "medium", or "low".`;
      }

      const modelsToTry = ['gemini-flash-latest', 'gemini-3.6-flash', 'gemini-3.8-flash'];
      let response: any = null;
      let lastErr: any = null;

      for (const modelName of modelsToTry) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      mimeType: normalizedMime,
                      data: cleanBase64,
                    },
                  },
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            config: {
              responseMimeType: 'application/json',
              responseSchema: mode === 'vin' ? {
                type: Type.OBJECT,
                properties: {
                  vin: {
                    type: Type.STRING,
                    description: 'The extracted 17-character VIN in uppercase',
                  },
                  transcript: {
                    type: Type.STRING,
                    description: 'The verbatim transcript of spoken audio',
                  },
                  confidence: {
                    type: Type.STRING,
                    description: 'high, medium, or low',
                  },
                },
                required: ['transcript', 'confidence'],
              } : {
                type: Type.OBJECT,
                properties: {
                  transcript: {
                    type: Type.STRING,
                    description: 'The verbatim transcript of spoken audio',
                  },
                  confidence: {
                    type: Type.STRING,
                    description: 'high, medium, or low',
                  },
                },
                required: ['transcript', 'confidence'],
              },
            },
          });
          if (response?.text) {
            break;
          }
        } catch (mErr: any) {
          lastErr = mErr;
          console.warn(`Model ${modelName} failed for voice audio transcription:`, mErr?.message || mErr);
        }
      }

      if (!response?.text) {
        throw lastErr || new Error('All AI transcription models were temporarily unavailable.');
      }

      let text = response.text.trim();
      if (text.startsWith('```')) {
        text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      }

      let result: any = {};
      try {
        result = JSON.parse(text);
      } catch {
        result = {
          transcript: text,
          vin: text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17),
          confidence: 'medium',
        };
      }

      if (result.vin) {
        result.vin = result.vin.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (result.vin.length > 17) {
          const match17 = result.vin.match(/([A-HJ-NPR-Z0-9]{17})/);
          if (match17) result.vin = match17[1];
        }
      }

      return res.json({
        success: true,
        ...result,
      });
    } catch (err: unknown) {
      console.error('Audio transcription error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown audio transcription error';
      return res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  });

  // OEM Parts & Factory Fitment Lookup Endpoint
  app.post('/api/oem-lookup', async (req, res) => {
    try {
      const { year, make, model, engine = '', vin = '', partQuery = '' } = req.body;

      if (!partQuery && !vin) {
        return res.status(400).json({
          success: false,
          error: 'Please provide either a part name or vehicle details for OEM lookup.',
        });
      }

      const ai = getGeminiClient();

      const prompt = `You are an elite master automotive technician and dealership wholesale parts counter manager.
Provide authentic OEM (Original Equipment Manufacturer) factory parts data, OEM part numbers, and factory mechanical specs for this vehicle:

Vehicle: ${year || ''} ${make || ''} ${model || ''} ${engine ? `(${engine})` : ''}
VIN: ${vin || 'Not specified'}
Requested Component / Assembly: "${partQuery || 'Common replacement parts'}"

Provide:
1. "oemBrand": The factory OEM parts division (e.g., "GM Genuine Parts & ACDelco", "Motorcraft / Ford OE", "Mopar Genuine Parts", "Toyota Genuine Parts", "Honda Genuine Parts", etc.).
2. "oemPartNumbers": An array of probable authentic OEM part numbers for this component with:
   - "partNumber": Standard alphanumeric OEM part number (e.g. "12637629", "DG511", "68197867AB").
   - "brand": Division or manufacturer (e.g. "GM Genuine", "ACDelco OE", "Motorcraft").
   - "description": Exact technical component description.
   - "isSuperseded": Boolean indicating if this is an older superseded number.
3. "supersededNumbers": Array of older part numbers that were replaced or updated by the manufacturer.
4. "torqueSpecs": Key factory torque specifications for this component (e.g. "Water pump bolts: 89 in-lbs", "Caliper bracket bolts: 122 ft-lbs").
5. "fluidAndSpecs": OEM fluid specifications and capacities if related (e.g., "Dex-Cool 50/50 - 13.4 qts", "DOT 4 Brake Fluid", "Dexron VI ATF").
6. "techTips": 2-3 brief professional shop tips, installation bulletins, or gotchas for this repair.

Return strictly JSON matching this structure.`;

      const modelsToTry = ['gemini-3.8-flash', 'gemini-flash-latest'];
      let response: any = null;
      let lastErr: any = null;

      for (const modelName of modelsToTry) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  oemBrand: { type: Type.STRING },
                  partQuery: { type: Type.STRING },
                  oemPartNumbers: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        partNumber: { type: Type.STRING },
                        brand: { type: Type.STRING },
                        description: { type: Type.STRING },
                        isSuperseded: { type: Type.BOOLEAN },
                      },
                      required: ['partNumber', 'brand', 'description'],
                    },
                  },
                  supersededNumbers: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  torqueSpecs: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  fluidAndSpecs: { type: Type.STRING },
                  techTips: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['oemBrand', 'oemPartNumbers'],
              },
            },
          });
          if (response?.text) {
            break;
          }
        } catch (mErr: any) {
          lastErr = mErr;
          console.warn(`Model ${modelName} failed for OEM lookup:`, mErr?.message || mErr);
        }
      }

      if (!response?.text) {
        throw lastErr || new Error('OEM lookup service was temporarily unavailable.');
      }

      let text = response.text.trim();
      if (text.startsWith('```')) {
        text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      }

      const result = JSON.parse(text);

      return res.json({
        success: true,
        data: result,
      });
    } catch (err: unknown) {
      console.error('OEM lookup error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown OEM lookup error';
      return res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  });

  // Vite middleware in dev, static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Auto Shop Job Tracker Server running on http://0.0.0.0:${PORT}`);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
}

startServer();
