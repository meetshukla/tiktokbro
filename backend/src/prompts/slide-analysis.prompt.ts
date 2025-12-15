/**
 * Prompt for analyzing TikTok slideshow images using Gemini Vision
 * Extracts exact image description, background style, text content, and placement
 */
export const SLIDE_ANALYSIS_PROMPT = `You are analyzing a TikTok slideshow image. These images have TWO distinct layers:
1. A BACKGROUND IMAGE (photo/illustration behind everything)
2. TEXT OVERLAYS (words/sentences ADDED ON TOP by the creator - usually with solid background boxes, shadows, or distinct fonts)

Your job is to SEPARATELY identify each layer. Return ONLY a valid JSON object:

{
  "imageDescription": "3-5 word SIMPLE Pinterest search. Keep it GENERIC and HIGH-LEVEL. Examples: 'college student studying', 'girl on beach sunset', 'coffee shop aesthetic', 'person cooking kitchen'. NO specific details like ceiling types, wall colors, or furniture brands.",
  "backgroundType": "photo | illustration | gradient | solid | collage",
  "backgroundStyle": "The visual aesthetic (cozy, minimalist, dark moody, bright, aesthetic, vintage, etc.)",
  "extractedText": "ONLY the OVERLAY text added by the creator. NOT text that naturally appears in the photo (like text on screens, signs, books, shirts, etc.)",
  "textPlacement": "Where the OVERLAY text appears: top | center | bottom | full-screen | multiple-areas"
}

CRITICAL FOR imageDescription:
- Keep it SIMPLE and GENERIC - we want to find SIMILAR vibes, not exact matches
- 3-5 words MAX
- Focus on: WHO (person type) + WHERE (general location) + VIBE (optional aesthetic word)
- BAD: "student cafeteria with industrial ceiling and fluorescent lights"
- GOOD: "college cafeteria students eating"
- BAD: "woman sitting on sandy beach at golden hour with waves"
- GOOD: "girl beach sunset"

CRITICAL - DISTINGUISHING OVERLAY TEXT vs BACKGROUND TEXT:
- OVERLAY TEXT = Added by creator. Usually has: white/colored background boxes, drop shadows, consistent font style, positioned for readability
- BACKGROUND TEXT = Text that exists IN the photo naturally (laptop screens, phone screens, books, signs, clothing, etc.) - IGNORE THIS

RULES:
1. imageDescription = SIMPLE, GENERIC description of the scene - think "Pinterest search terms"
2. extractedText = ONLY the creator's OVERLAY text (the message they added)
3. If a laptop screen shows Pinterest - that's BACKGROUND, ignore it
4. If there's text in a white box saying "4. i saved time" - that's OVERLAY, extract it
5. Preserve line breaks with \\n in extractedText`;
