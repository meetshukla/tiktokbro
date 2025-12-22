/**
 * Prompt for generating TikTok slideshow remix plans
 * Creates Pinterest search queries and new overlay text based on original slideshow analysis
 */
export function getRemixPlanPrompt(
  slideDescriptions: string,
  userPrompt: string,
  slideCount: number,
  productContext?: string,
  userGuidance?: string
): string {
  const productSection = productContext
    ? `
PRODUCT TO PROMOTE:
${productContext}
`
    : '';

  const guidanceSection = userGuidance
    ? `
USER GUIDANCE/DIRECTION:
${userGuidance}

IMPORTANT: Follow the user's guidance above when creating the remix. Adapt the content, tone, and approach based on their specific instructions.
`
    : '';

  return `You are a TikTok slideshow remix expert.
${guidanceSection}

Original slideshow analysis:
${slideDescriptions}

${productSection}
STEP 1 - NICHE ANALYSIS:
First, determine if the ORIGINAL slideshow niche matches the TARGET niche (based on product context and user guidance).

Examples of SAME NICHE:
- Original: studytok/college → Target: study apps, planners, student tools
- Original: skincare routine → Target: skincare products
- Original: fitness tips → Target: gym supplements, workout gear
- Original: cooking/recipes → Target: kitchen gadgets, food products

Examples of DIFFERENT NICHE:
- Original: gaming setup → Target: skincare products
- Original: dance trends → Target: study planners
- Original: travel vlog → Target: coding bootcamp

STEP 2 - PINTEREST QUERY DECISION:
- If SAME/SIMILAR NICHE: Use the EXACT imageDescription from original (the aesthetic fits)
- If DIFFERENT NICHE: Generate NEW Pinterest queries that MATCH THE CONTENT of your newOverlayText while keeping similar visual style

For each slide, provide:
1. pinterestQuery - Based on niche analysis above
2. newOverlayText - Create NEW content following the same structure
3. layoutNotes - Match original text placement

Return ONLY a valid JSON array:
[
  {
    "slideNumber": 1,
    "pinterestQuery": "same or new query based on niche match",
    "newOverlayText": "New text following same structure",
    "layoutNotes": "Match original placement"
  }
]

RULES:
- Slide 1 HOOK: Keep the same hook FORMAT. E.g., "the EASIEST way I learned to X" stays as "the EASIEST way I learned to X"
- Middle slides: Create NEW genuine tips/advice following the same narrative arc. These should NOT mention the product - just helpful content.
- Product mention: ONLY where the original mentioned their product (usually last 1-2 slides). Keep it subtle.
- Match the VIBE: casual tone, emoji usage, text length per slide
- Number of slides: ${slideCount}

PINTEREST QUERY GUIDELINES (when generating new queries):
- The pinterestQuery MUST match the TOPIC/CONTENT of your newOverlayText
- If newOverlayText is about studying → query should find study/college aesthetic images
- If newOverlayText is about skincare tips → query should find skincare aesthetic images
- If newOverlayText is about fitness → query should find gym/workout aesthetic images
- Keep the same AESTHETIC STYLE from original (cozy, minimal, dark academia, clean girl, etc.)
- Combine the NEW topic with the original visual mood
- Example: Original "gaming setup with RGB lights" + new text about studying → "aesthetic study desk setup with cozy lighting"

SUBTLE MARKETING:
- 90% of slides = genuine value, tips, relatable content
- Product appears naturally, not forced
- If someone can tell it's an ad, you failed
- The content should work even WITHOUT the product mention

The content should feel like a completely new slideshow that happens to use the same proven structure.`;
}
