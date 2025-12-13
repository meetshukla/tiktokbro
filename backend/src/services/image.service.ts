import { getGeminiClient } from './gemini.service';

// Use Imagen 4 model for image generation
const IMAGEN_MODEL = 'imagen-4.0-generate-001';

export async function generateImage(
  imagePrompt: string,
  aspectRatio: '9:16' | '1:1' | '16:9' = '9:16',
  model?: string
): Promise<string> {
  const ai = getGeminiClient();

  // Enhance prompt for better TikTok-style images
  const enhancedPrompt = `${imagePrompt}. High quality, vibrant colors, social media style, vertical format optimized for TikTok.`;

  console.log('Calling Imagen API with:');
  console.log('  Model:', model || IMAGEN_MODEL);
  console.log('  Prompt:', enhancedPrompt.substring(0, 100) + '...');
  console.log('  Aspect Ratio:', aspectRatio);

  const response = await ai.models.generateImages({
    model: model || IMAGEN_MODEL,
    prompt: enhancedPrompt,
    config: {
      numberOfImages: 1,
      aspectRatio: aspectRatio,
    },
  });

  console.log('Imagen API response received');

  // Extract image from response
  if (!response.generatedImages || response.generatedImages.length === 0) {
    throw new Error('No images generated');
  }

  const generatedImage = response.generatedImages[0];
  if (!generatedImage.image?.imageBytes) {
    throw new Error('No image data in response');
  }

  console.log('Image generated successfully');
  return generatedImage.image.imageBytes;
}
