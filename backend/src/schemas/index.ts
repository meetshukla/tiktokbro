import * as z from 'zod';

export const SlidePlanSchema = z.object({
  slideNumber: z.number(),
  imagePrompt: z.string(),
  suggestedOverlay: z.string().optional(),
});

export const SlidePlanArraySchema = z.array(SlidePlanSchema);
export type SlidePlan = z.infer<typeof SlidePlanSchema>;

export const RemixPlanSchema = z.object({
  slideNumber: z.number(),
  pinterestQuery: z.string(),
  newOverlayText: z.string(),
  layoutNotes: z.string(),
});

export const RemixPlanArraySchema = z.array(RemixPlanSchema);
export type RemixPlan = z.infer<typeof RemixPlanSchema>;

export const SlideAnalysisSchema = z.object({
  imageDescription: z.string(),
  backgroundType: z.enum(['photo', 'illustration', 'gradient', 'solid', 'collage']),
  backgroundStyle: z.string(),
  extractedText: z.string(),
  textPlacement: z.enum(['top', 'center', 'bottom', 'full-screen', 'multiple-areas', 'none']),
});

export type SlideAnalysis = z.infer<typeof SlideAnalysisSchema>;

export function toGeminiSchema<T extends z.ZodType>(schema: T): Record<string, unknown> {
  return z.toJSONSchema(schema, { target: 'draft-07' }) as Record<string, unknown>;
}
