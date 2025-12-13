import { getGeminiClient, TEXT_MODEL } from './gemini.service';
import { SlidePlan } from '../types';

export async function generateSlidePlan(prompt: string, slideCount: number): Promise<SlidePlan[]> {
  const ai = getGeminiClient();

  const systemPrompt = `You are a TikTok slideshow content planner. Create engaging, viral-worthy slide plans.

Given a topic, create exactly ${slideCount} slides for a TikTok slideshow. Each slide should:
- Have compelling content that hooks viewers
- Have a detailed image prompt for AI image generation
- Have suggested text overlay (short, impactful, TikTok-style)

Return ONLY a valid JSON array with this exact structure:
[
  {
    "slideNumber": 1,
    "imagePrompt": "Detailed description for AI image generation - include style, mood, colors, composition",
    "suggestedOverlay": "Short text for overlay (2-5 words)"
  }
]

Make each slide flow into the next for storytelling. Keep content TikTok-appropriate and engaging.`;

  const userPrompt = `Create a ${slideCount}-slide TikTok slideshow about: ${prompt}`;

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: [
      { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }
    ],
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
  } catch (parseError) {
    console.error('Failed to parse Gemini response:', text);
    throw new Error('Failed to parse slide plan from AI response');
  }
}
