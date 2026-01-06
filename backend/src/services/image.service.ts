import { getGeminiClient, IMAGE_MODEL } from './gemini.service';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Use Imagen 4 model for image generation
const IMAGEN_MODEL = 'imagen-4.0-generate-001';

// Base URL for serving static files (for converting relative URLs)
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
// Path to reactions library for direct file access
const REACTIONS_LIB_PATH = path.join(__dirname, '..', '..', 'reactions-library');

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

/**
 * Generate avatar image using two reference images:
 * - Image A (poseImageUrl): Source for pose, action, and facial reaction
 * - Image B (identityImageBase64): Identity reference (user's avatar)
 *
 * Uses Gemini's image generation with detailed pose transfer prompt
 */
export async function generateAvatarFromReference(
  poseImageUrl: string,
  identityImageBase64: string,
  identityMimeType: string = 'image/jpeg'
): Promise<string> {
  const ai = getGeminiClient();

  console.log('Generating avatar with two-image reference...');
  console.log('  Pose image URL:', poseImageUrl);

  let poseImageBase64: string;
  let poseMimeType: string;

  // Check if it's a local reactions-library path
  if (poseImageUrl.startsWith('/reactions-library/')) {
    // Read directly from filesystem
    const relativePath = poseImageUrl.replace('/reactions-library/', '');
    const fullPath = path.join(REACTIONS_LIB_PATH, relativePath);

    console.log('  Reading from filesystem:', fullPath);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`Pose image not found: ${fullPath}`);
    }

    const fileBuffer = fs.readFileSync(fullPath);
    poseImageBase64 = fileBuffer.toString('base64');

    // Determine mime type from extension
    const ext = path.extname(fullPath).toLowerCase();
    poseMimeType =
      ext === '.png'
        ? 'image/png'
        : ext === '.jpg' || ext === '.jpeg'
          ? 'image/jpeg'
          : 'image/jpeg';
  } else {
    // Fetch from URL (use BASE_URL if relative)
    const fullUrl = poseImageUrl.startsWith('http') ? poseImageUrl : `${BASE_URL}${poseImageUrl}`;
    console.log('  Fetching from URL:', fullUrl);

    const poseImageResponse = await axios.get(fullUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
    });
    poseImageBase64 = Buffer.from(poseImageResponse.data).toString('base64');
    poseMimeType = poseImageResponse.headers['content-type'] || 'image/jpeg';
  }

  // The detailed pose transfer prompt
  const prompt = `You will be given two images. Image A is the source for pose, action, and facial reaction. Image B is the identity reference. Your task is to generate ONE new image where the person from Image B fully replaces the person in Image A.

Strict rules. No exceptions.

Pose and action lock: Body posture, head angle, shoulder alignment, torso orientation, hand position, finger placement, and micro gestures must match Image A exactly. If the subject is sitting at a desk, standing, leaning, or performing any action, it must be replicated precisely. No reinterpretation. No adjustment. Literal pose transfer only.

Facial expression and reaction lock: Facial expression must match Image A exactly. Eye direction, eyelid openness, eyebrow tension, mouth shape, jaw tension, and emotional intensity must be identical. Expression must come only from Image A. Identity expression from Image B must not leak in.

Identity replacement: Face, hair, skin tone, and identity must come ONLY from Image B. Facial structure must remain stable with no morphing, beautification, aging, or stylization. Identity must look like a real photograph of the same person, not an AI recreation.

Mandatory clothing change: Clothing must be completely different from Image A. Different outfit type, color, and fabric. Clothing must be realistic, everyday wear, properly fitted for the pose. No fashion exaggeration or stylized outfits.

Mandatory background rules: Background must be an indoor room only. A normal, realistic room such as a bedroom, study, dorm, or home office. Minimal objects. Only natural, common items like a desk, chair, wall, window, bed, or lamp. No futuristic elements. No decorative AI looking objects. No surreal lighting. No dramatic composition. The room must look like a real phone photo taken in a real home.

Lighting constraints: Natural lighting only. Soft daylight or standard indoor room light. No cinematic lighting. No rim light. No studio lighting.

Camera consistency: Camera angle, framing, distance, crop, and perspective must match Image A exactly. No zoom. No lens change. No reframing.

Realism enforcement: Ultra realistic. Natural skin texture with imperfections. No filters. No stylization. No painterly effects. No AI generated look.

Artifact prevention: No extra limbs. No warped hands or fingers. No expression drift. No background distortions. No text, UI, overlays, or watermarks.

Output requirements: Generate exactly ONE image. The result must look like a real candid photograph. Clothing and room background must clearly differ from Image A. Pose, expression, and action must be identical to Image A.

Priority order if conflicts occur: Pose, action, and facial expression from Image A. Identity from Image B. Clothing change. Natural indoor room background.`;

  // Use Gemini image generation model with two reference images
  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          { text: 'Image A (pose and expression reference):' },
          {
            inlineData: {
              mimeType: poseMimeType,
              data: poseImageBase64,
            },
          },
          { text: 'Image B (identity reference):' },
          {
            inlineData: {
              mimeType: identityMimeType,
              data: identityImageBase64,
            },
          },
          { text: prompt },
        ],
      },
    ],
    config: {
      responseModalities: ['image', 'text'],
    },
  });

  console.log('Gemini image generation response received');

  // Extract generated image from response
  const candidate = response.candidates?.[0];
  if (!candidate?.content?.parts) {
    throw new Error('No content in response');
  }

  // Find the image part in the response
  for (const part of candidate.content.parts) {
    if (part.inlineData?.data) {
      console.log('Avatar image generated successfully');
      return part.inlineData.data;
    }
  }

  throw new Error('No image data in response');
}
