import { GoogleGenAI } from '@google/genai';
import axios from 'axios';
import { SLIDE_ANALYSIS_PROMPT } from '../prompts';
import { generateStructuredContent } from '../lib/gemini-structured';
import { SlideAnalysisSchema, type SlideAnalysis } from '../schemas';

export type { SlideAnalysis } from '../schemas';

let ai: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export const TEXT_MODEL = 'gemini-2.0-flash';
export const VISION_MODEL = 'gemini-2.5-pro'; // Best for image analysis
export const IMAGE_MODEL = 'imagen-4.0-generate-001';

export async function analyzeSlideImage(imageUrl: string): Promise<SlideAnalysis> {
  const ai = getGeminiClient();

  const imageResponse = await axios.get(imageUrl, {
    responseType: 'arraybuffer',
    timeout: 30000,
  });
  const base64Image = Buffer.from(imageResponse.data).toString('base64');
  const mimeType = imageResponse.headers['content-type'] || 'image/jpeg';

  const analysis = await generateStructuredContent(ai, SlideAnalysisSchema, {
    model: VISION_MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Image,
            },
          },
          { text: SLIDE_ANALYSIS_PROMPT },
        ],
      },
    ],
  });

  return {
    imageDescription: analysis.imageDescription || '',
    backgroundType: analysis.backgroundType || 'photo',
    backgroundStyle: analysis.backgroundStyle || 'unknown',
    extractedText: analysis.extractedText || '',
    textPlacement: analysis.textPlacement || 'none',
  };
}
