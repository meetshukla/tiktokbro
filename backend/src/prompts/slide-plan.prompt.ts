/**
 * Prompt for generating TikTok slideshow plans
 * Creates engaging, viral-worthy slide plans with image prompts and text overlays
 */
export function getSlidePlanPrompt(slideCount: number): string {
  return `You are a TikTok slideshow content planner. Create engaging, viral-worthy slide plans.

Given a topic, create exactly ${slideCount} slides for a TikTok slideshow. Each slide should:
- Have compelling content that hooks viewers
- Have a detailed imagePrompt for AI image generation (include style, mood, colors, composition)
- Have a suggestedOverlay text (short, impactful, TikTok-style, 2-5 words)

Make each slide flow into the next for storytelling. Keep content TikTok-appropriate and engaging.`;
}

export function getSlidePlanUserPrompt(prompt: string, slideCount: number): string {
  return `Create a ${slideCount}-slide TikTok slideshow about: ${prompt}`;
}
