import { Router, Request, Response } from 'express';
import axios from 'axios';
import { generateImage } from '../services/image.service';
import { GenerateImageRequest, GenerateImageResponse } from '../types';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Proxy endpoint for loading external images (bypasses CORS) - requires auth to prevent abuse
router.get('/proxy', requireAuth, async (req: Request, res: Response) => {
  const imageUrl = req.query.url as string;

  if (!imageUrl) {
    res.status(400).send('URL parameter required');
    return;
  }

  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    const contentType = response.headers['content-type'] || 'image/jpeg';
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.set('Access-Control-Allow-Origin', '*'); // Allow canvas to load with crossOrigin
    res.send(Buffer.from(response.data));
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).send('Failed to fetch image');
  }
});

router.post(
  '/',
  requireAuth,
  async (
    req: Request<{}, GenerateImageResponse, GenerateImageRequest>,
    res: Response<GenerateImageResponse>
  ) => {
    try {
      const { imagePrompt, aspectRatio = '9:16', model } = req.body;

      if (!imagePrompt || typeof imagePrompt !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Image prompt is required',
        });
        return;
      }

      if (imagePrompt.length < 3) {
        res.status(400).json({
          success: false,
          error: 'Image prompt must be at least 3 characters',
        });
        return;
      }

      const validAspectRatios = ['9:16', '1:1', '16:9'] as const;
      const validAspectRatio = validAspectRatios.includes(
        aspectRatio as (typeof validAspectRatios)[number]
      )
        ? (aspectRatio as '9:16' | '1:1' | '16:9')
        : '9:16';

      const imageData = await generateImage(imagePrompt, validAspectRatio, model);

      res.json({
        success: true,
        imageData,
      });
    } catch (error) {
      console.error('Image generation failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate image',
      });
    }
  }
);

export default router;
