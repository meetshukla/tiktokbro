import { getGeminiClient, TEXT_MODEL, SlideAnalysis } from './gemini.service';
import { SlidePlan } from '../types';
import { getSlidePlanPrompt, getSlidePlanUserPrompt, getRemixPlanPrompt } from '../prompts';

export interface RemixPlan {
  slideNumber: number;
  pinterestQuery: string;
  newOverlayText: string;
  layoutNotes: string;
}

/**
 * Fix literal newlines inside JSON strings from LLM responses
 * LLMs often return JSON with actual line breaks inside string values
 */
function fixJsonNewlines(jsonStr: string): string {
  let fixed = '';
  let inString = false;
  let escaped = false;
  for (const char of jsonStr) {
    if (escaped) {
      fixed += char;
      escaped = false;
      continue;
    }
    if (char === '\\') {
      fixed += char;
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      fixed += char;
      continue;
    }
    if (inString && char === '\n') {
      fixed += '\\n';
      continue;
    }
    if (inString && char === '\r') {
      fixed += '\\r';
      continue;
    }
    fixed += char;
  }
  return fixed;
}

export async function generateSlidePlan(prompt: string, slideCount: number): Promise<SlidePlan[]> {
  const ai = getGeminiClient();

  const systemPrompt = getSlidePlanPrompt(slideCount);
  const userPrompt = getSlidePlanUserPrompt(prompt, slideCount);

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: [{ role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }],
  });

  const text = response.text;
  if (!text) {
    throw new Error('No response from Gemini');
  }

  // Extract JSON from response (handle potential markdown code blocks)
  let jsonStr = text;
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  } else {
    // Try to find JSON array directly
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      jsonStr = arrayMatch[0];
    }
  }

  // Fix literal newlines inside JSON strings
  jsonStr = fixJsonNewlines(jsonStr);

  try {
    const plans: SlidePlan[] = JSON.parse(jsonStr);

    // Validate structure
    if (!Array.isArray(plans) || plans.length === 0) {
      throw new Error('Invalid response structure');
    }

    return plans.map((plan, index) => ({
      slideNumber: index + 1,
      imagePrompt: plan.imagePrompt || '',
      suggestedOverlay: plan.suggestedOverlay || '',
    }));
  } catch {
    console.error('Failed to parse Gemini response:', text);
    throw new Error('Failed to parse slide plan from AI response');
  }
}

/**
 * Generate a remix plan based on original slide analyses and user's new topic
 * Returns Pinterest search queries and new overlay text for each slide
 */
export async function generateRemixPlan(
  originalAnalyses: (SlideAnalysis & { index: number })[],
  userPrompt: string,
  productContext?: string,
  userGuidance?: string
): Promise<RemixPlan[]> {
  const ai = getGeminiClient();

  const slideDescriptions = originalAnalyses
    .map(
      (a, i) =>
        `Slide ${i + 1}:
  - imageDescription: "${a.imageDescription}"
  - Background: ${a.backgroundType} (${a.backgroundStyle})
  - Text: "${a.extractedText}" at ${a.textPlacement}`
    )
    .join('\n\n');

  const systemPrompt = getRemixPlanPrompt(
    slideDescriptions,
    userPrompt,
    originalAnalyses.length,
    productContext,
    userGuidance
  );

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
  });

  const text = response.text;
  if (!text) {
    throw new Error('No response from Gemini');
  }

  // Extract JSON from response
  let jsonStr = text;
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  } else {
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      jsonStr = arrayMatch[0];
    }
  }

  // Fix literal newlines inside JSON strings from LLM responses
  jsonStr = fixJsonNewlines(jsonStr);

  try {
    const plans: RemixPlan[] = JSON.parse(jsonStr);

    if (!Array.isArray(plans) || plans.length === 0) {
      throw new Error('Invalid response structure');
    }

    return plans.map((plan, index) => ({
      slideNumber: index + 1,
      pinterestQuery: plan.pinterestQuery || '',
      newOverlayText: plan.newOverlayText || '',
      layoutNotes: plan.layoutNotes || '',
    }));
  } catch {
    console.error('Failed to parse Gemini remix response:', text);
    throw new Error('Failed to parse remix plan from AI response');
  }
}
