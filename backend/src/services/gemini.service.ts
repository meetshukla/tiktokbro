import { GoogleGenAI } from '@google/genai';

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
export const IMAGE_MODEL = 'imagen-4.0-generate-001';
