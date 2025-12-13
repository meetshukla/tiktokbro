import { Router, Request, Response } from 'express';
import { generateImage } from '../services/image.service';
import { GenerateImageRequest, GenerateImageResponse } from '../types';

const router = Router();

router.post('/', async (req: Request<{}, GenerateImageResponse, GenerateImageRequest>, res: Response<GenerateImageResponse>) => {
  console.log('\n=== IMAGE GENERATION REQUEST ===');
  console.log('Received at:', new Date().toISOString());
  console.log('Body:', JSON.stringify(req.body, null, 2));

  try {
    const { imagePrompt, aspectRatio = '9:16', model } = req.body;

    if (!imagePrompt || typeof imagePrompt !== 'string') {
      console.log('ERROR: Image prompt is required');
      res.status(400).json({
        success: false,
        error: 'Image prompt is required',
      });
      return;
    }

    if (imagePrompt.length < 3) {
      console.log('ERROR: Image prompt too short');
      res.status(400).json({
        success: false,
        error: 'Image prompt must be at least 3 characters',
      });
      return;
    }

    const validAspectRatios = ['9:16', '1:1', '16:9'] as const;
    const validAspectRatio = validAspectRatios.includes(aspectRatio as typeof validAspectRatios[number])
      ? aspectRatio as '9:16' | '1:1' | '16:9'
      : '9:16';

    console.log('Calling Gemini API for image generation...');
    console.log('Model:', model);
    console.log('Aspect Ratio:', validAspectRatio);

    const imageData = await generateImage(imagePrompt, validAspectRatio, model);

    console.log('SUCCESS: Image generated, size:', imageData.length, 'characters');

    res.json({
      success: true,
      imageData,
    });
  } catch (error) {
    console.error('ERROR generating image:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate image',
    });
  }
});

export default router;
