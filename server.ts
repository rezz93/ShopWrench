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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Auto Shop Job Tracker Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
