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

      const prompt = `You are a vehicle intake and VIN OCR extraction specialist for an automotive repair shop.
The user has photographed a vehicle VIN plate, which may be located on:
1. The dashboard viewed through the lower driver-side windshield (metal plate or stamped text).
2. The vehicle door-jamb sticker.
3. Vehicle registration / title / work order document.

Analyze the image carefully:
- Find and extract the 17-character Vehicle Identification Number (VIN).
- Standard North American / ISO VINs are exactly 17 characters long, containing capital letters and numbers (excluding letters I, O, and Q to prevent confusion with 1, 0).
- If characters are partially obscured or reflective due to windshield glass, apply automotive VIN OCR correction (e.g. O -> 0, I -> 1, Q -> 0).
- Return the cleaned 17-character VIN in uppercase without spaces, hyphens, or extra symbols.
- If you find multiple numbers or text, pick the one that matches standard 17-character automotive VIN structure. If no 17-character VIN is identifiable, extract the closest candidate.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
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

      const text = response.text;
      if (!text) {
        return res.status(500).json({ error: 'No response generated from OCR model.' });
      }

      const result = JSON.parse(text.trim());
      // Clean extracted VIN string
      if (result.vin) {
        result.vin = result.vin.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
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
