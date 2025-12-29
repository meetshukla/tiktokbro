import { getGeminiClient, TEXT_MODEL } from './gemini.service';
import { getSlidePlanPrompt, getSlidePlanUserPrompt, getRemixPlanPrompt } from '../prompts';
import { generateStructuredContent } from '../lib/gemini-structured';
import {
  SlidePlanArraySchema,
  RemixPlanArraySchema,
  type SlidePlan,
  type RemixPlan,
  type SlideAnalysis,
} from '../schemas';

export type { SlidePlan, RemixPlan } from '../schemas';

export async function generateSlidePlan(prompt: string, slideCount: number): Promise<SlidePlan[]> {
  const ai = getGeminiClient();

  const systemPrompt = getSlidePlanPrompt(slideCount);
  const userPrompt = getSlidePlanUserPrompt(prompt, slideCount);

  const plans = await generateStructuredContent(ai, SlidePlanArraySchema, {
    model: TEXT_MODEL,
    contents: [{ role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }],
  });

  return plans.map((plan, index) => ({
    slideNumber: index + 1,
    imagePrompt: plan.imagePrompt || '',
    suggestedOverlay: plan.suggestedOverlay || '',
  }));
}

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

  const plans = await generateStructuredContent(ai, RemixPlanArraySchema, {
    model: TEXT_MODEL,
    contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
  });

  return plans.map((plan, index) => ({
    slideNumber: index + 1,
    pinterestQuery: plan.pinterestQuery || '',
    newOverlayText: plan.newOverlayText || '',
    layoutNotes: plan.layoutNotes || '',
  }));
}
