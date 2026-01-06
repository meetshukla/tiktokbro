import { fal } from '@fal-ai/client';
import { generateAvatarFromReference } from './image.service';

// Initialize FAL client with API key from environment
let initialized = false;

function initFalClient(): void {
  if (!initialized) {
    const apiKey = process.env.FAL_KEY;
    if (!apiKey) {
      throw new Error('FAL_KEY is not set in environment variables');
    }
    fal.config({
      credentials: apiKey,
    });
    initialized = true;
  }
}

export interface GeneratedImage {
  id: string;
  imageUrl: string;
  imageData?: string; // Base64 data for Gemini-generated images
}

export interface ImageGenerationResult {
  images: GeneratedImage[];
}

export interface KlingVideoResult {
  videoUrl: string;
}

/**
 * Upload a base64 image to FAL storage and get a URL
 */
export async function uploadToFal(
  base64Data: string,
  mimeType: string = 'image/jpeg'
): Promise<string> {
  initFalClient();

  // Convert base64 to Blob
  const binaryData = Buffer.from(base64Data, 'base64');
  const blob = new Blob([binaryData], { type: mimeType });
  const file = new File([blob], 'image.jpg', { type: mimeType });

  const url = await fal.storage.upload(file);
  return url;
}

/**
 * Generate avatar images using Gemini with two-image pose transfer
 * - Uses reaction first frame for pose/expression
 * - Uses user's avatar for identity
 * - Generates new image with identity in the pose
 */
export async function generateAvatarImages(
  avatarImageBase64: string,
  poseImageUrl: string,
  avatarMimeType: string = 'image/jpeg',
  count: number = 3
): Promise<ImageGenerationResult> {
  const images: GeneratedImage[] = [];

  // Generate multiple images using Gemini with two-image reference
  for (let i = 0; i < count; i++) {
    try {
      console.log(`Generating avatar image ${i + 1}/${count} using Gemini two-image reference...`);

      // Use the pose transfer function with both images
      const imageData = await generateAvatarFromReference(
        poseImageUrl, // Image A: pose and expression from reaction first frame
        avatarImageBase64, // Image B: identity from user's avatar
        avatarMimeType
      );

      // Upload to FAL storage to get a URL (needed for Kling)
      const imageUrl = await uploadToFal(imageData, 'image/png');

      images.push({
        id: `generated-${i + 1}`,
        imageUrl,
        imageData, // Keep base64 for display in frontend
      });

      console.log(`Avatar image ${i + 1} generated successfully`);
    } catch (error) {
      console.error(`Error generating image ${i + 1}:`, error);
      // Continue with other images if one fails
    }
  }

  if (images.length === 0) {
    throw new Error('Failed to generate any avatar images');
  }

  return { images };
}

/**
 * Generate reaction video using Kling 2.6 Motion Control
 * Transfers motion from reaction video to the generated avatar image
 */
export async function generateReactionVideo(
  avatarImageUrl: string,
  reactionVideoUrl: string,
  prompt?: string
): Promise<KlingVideoResult> {
  initFalClient();

  const result = await fal.subscribe('fal-ai/kling-video/v2.6/standard/motion-control', {
    input: {
      image_url: avatarImageUrl,
      video_url: reactionVideoUrl,
      prompt: prompt || 'A person performing the action naturally',
      keep_original_sound: true,
      character_orientation: 'video' as const,
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === 'IN_PROGRESS' && update.logs) {
        update.logs.map((log) => log.message).forEach(console.log);
      }
    },
  });

  const resultData = result.data as { video?: { url: string } };
  if (!resultData.video?.url) {
    throw new Error('Failed to generate reaction video');
  }

  return {
    videoUrl: resultData.video.url,
  };
}

/**
 * Check the status of a queued FAL request
 */
export async function checkFalQueueStatus(
  endpoint: string,
  requestId: string
): Promise<{ status: string; result?: unknown }> {
  initFalClient();

  const status = await fal.queue.status(endpoint, {
    requestId,
    logs: true,
  });

  return {
    status: status.status,
    result:
      status.status === 'COMPLETED' ? await fal.queue.result(endpoint, { requestId }) : undefined,
  };
}

export const falService = {
  uploadToFal,
  generateAvatarImages,
  generateReactionVideo,
  checkFalQueueStatus,
};
