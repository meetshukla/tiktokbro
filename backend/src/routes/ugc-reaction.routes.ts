import { Router, Request, Response, NextFunction } from 'express';
import { ugcReactionService } from '../services/ugc-reaction.service';

const router = Router();

/**
 * POST /api/ugc-reactions
 * Create a new UGC reaction session
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, name } = req.body;

    if (!sessionId) {
      res.status(400).json({ success: false, error: 'sessionId is required' });
      return;
    }

    const session = await ugcReactionService.create(sessionId, name);
    res.status(201).json({ success: true, data: session });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      res.status(409).json({ success: false, error: 'Session with this ID already exists' });
      return;
    }
    next(error);
  }
});

/**
 * GET /api/ugc-reactions
 * List all UGC reaction sessions with pagination
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const result = await ugcReactionService.list(page, limit);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ugc-reactions/:sessionId
 * Get a specific session
 */
router.get('/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const session = await ugcReactionService.getById(sessionId);

    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/ugc-reactions/:sessionId
 * Update a session
 */
router.patch('/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const data = req.body;

    // Don't allow changing sessionId
    delete data.sessionId;

    const session = await ugcReactionService.update(sessionId, data);

    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/ugc-reactions/:sessionId
 * Delete a session
 */
router.delete('/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const deleted = await ugcReactionService.delete(sessionId);

    if (!deleted) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    res.json({ success: true, message: 'Session deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ugc-reactions/:sessionId/upload
 * Upload avatar image (expects base64 in body)
 */
router.post('/:sessionId/upload', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const { imageData, mimeType } = req.body;

    if (!imageData) {
      res.status(400).json({ success: false, error: 'imageData is required' });
      return;
    }

    const session = await ugcReactionService.uploadAvatar(
      sessionId,
      imageData,
      mimeType || 'image/jpeg'
    );

    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ugc-reactions/:sessionId/select-reaction
 * Select a reaction from the library
 */
router.post(
  '/:sessionId/select-reaction',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const { reactionId } = req.body;

      if (!reactionId) {
        res.status(400).json({ success: false, error: 'reactionId is required' });
        return;
      }

      const session = await ugcReactionService.selectReaction(sessionId, reactionId);

      if (!session) {
        res.status(404).json({ success: false, error: 'Session not found' });
        return;
      }

      res.json({ success: true, data: session });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/ugc-reactions/:sessionId/generate-images
 * Generate avatar images using Nano Banana Pro
 */
router.post(
  '/:sessionId/generate-images',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;

      const session = await ugcReactionService.generateAvatarImages(sessionId);

      if (!session) {
        res.status(404).json({ success: false, error: 'Session not found' });
        return;
      }

      res.json({ success: true, data: session });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/ugc-reactions/:sessionId/select-image
 * Select a generated image for video creation
 */
router.post('/:sessionId/select-image', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const { imageId } = req.body;

    if (!imageId) {
      res.status(400).json({ success: false, error: 'imageId is required' });
      return;
    }

    const session = await ugcReactionService.selectImage(sessionId, imageId);

    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ugc-reactions/:sessionId/generate-video
 * Generate reaction video using Kling 2.6
 */
router.post(
  '/:sessionId/generate-video',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;

      const session = await ugcReactionService.generateVideo(sessionId);

      if (!session) {
        res.status(404).json({ success: false, error: 'Session not found' });
        return;
      }

      res.json({ success: true, data: session });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
