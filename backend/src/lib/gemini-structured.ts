import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import * as z from 'zod';
import { toGeminiSchema } from '../schemas';

interface StructuredRequestOptions {
  model: string;
  contents: Array<{
    role: string;
    parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
  }>;
}

export async function generateStructuredContent<T extends z.ZodType>(
  ai: GoogleGenAI,
  schema: T,
  options: StructuredRequestOptions,
  { maxRetries = 2, delayMs = 500 } = {}
): Promise<z.infer<T>> {
  const jsonSchema = toGeminiSchema(schema);

  let lastError: Error | null = null;
  let lastResponse: string | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      let contents = options.contents;

      if (attempt > 0 && lastError && lastResponse) {
        const retryMessage = `Your previous response failed validation with error: "${lastError.message}". 
Please try again and ensure your response exactly matches the required JSON schema.
Your previous response was:
${lastResponse.substring(0, 500)}${lastResponse.length > 500 ? '...' : ''}`;

        contents = [
          ...options.contents,
          {
            role: 'user',
            parts: [{ text: retryMessage }],
          },
        ];
      }

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: options.model,
        contents,
        config: {
          responseMimeType: 'application/json',
          responseSchema: jsonSchema,
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error('Empty response from Gemini');
      }

      lastResponse = text;
      const parsed = JSON.parse(text);
      const validated = schema.parse(parsed);

      return validated;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        console.error(`Structured content generation failed after ${maxRetries + 1} attempts`);
        console.error('Last error:', lastError.message);
        console.error('Last response:', lastResponse?.substring(0, 500));
        throw new Error(`Failed to generate valid structured content: ${lastError.message}`);
      }

      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
      }

      console.warn(`Attempt ${attempt + 1} failed, retrying... Error: ${lastError.message}`);
    }
  }

  throw new Error('Unexpected: retry loop exited without result');
}
