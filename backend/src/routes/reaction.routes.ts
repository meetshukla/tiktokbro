import { Router, Request, Response, NextFunction } from 'express';
import { reactionService } from '../services/reaction.service';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/reactions
 * List all reactions in the library (requires auth)
 */
router.get('/', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const reactions = await reactionService.list();
    res.json({ success: true, data: reactions });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reactions/categories
 * Get all unique reaction categories (requires auth)
 */
router.get('/categories', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await reactionService.getCategories();
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reactions/category/:category
 * Get reactions filtered by category (requires auth)
 */
router.get(
  '/category/:category',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { category } = req.params;
      const reactions = await reactionService.getByCategory(category);
      res.json({ success: true, data: reactions });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/reactions
 * Create a new reaction in the library (requires auth)
 * Body: { reactionId, name, category, videoUrl, firstFrameUrl, duration, description? }
 */
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reactionId, name, category, videoUrl, firstFrameUrl, duration, description } = req.body;

    if (!reactionId || !name || !category || !videoUrl || !firstFrameUrl || !duration) {
      res.status(400).json({
        success: false,
        error:
          'Missing required fields: reactionId, name, category, videoUrl, firstFrameUrl, duration',
      });
      return;
    }

    const reaction = await reactionService.create({
      reactionId,
      name,
      category,
      videoUrl,
      firstFrameUrl,
      duration,
      description,
    });

    res.status(201).json({ success: true, data: reaction });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      res.status(409).json({ success: false, error: 'Reaction with this ID already exists' });
      return;
    }
    next(error);
  }
});

/**
 * POST /api/reactions/quick-add
 * Quick add a reaction from folder name (requires auth)
 * Body: { folderName, category, name, duration }
 * Will auto-generate URLs based on folder name
 */
router.post('/quick-add', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { folderName, category, name, duration, description } = req.body;

    if (!folderName || !category || !name || !duration) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: folderName, category, name, duration',
      });
      return;
    }

    const baseUrl = `/reactions-library/${folderName}`;
    const reaction = await reactionService.create({
      reactionId: folderName,
      name,
      category,
      videoUrl: `${baseUrl}/video.mp4`,
      firstFrameUrl: `${baseUrl}/first-frame.jpg`,
      duration,
      description,
    });

    res.status(201).json({ success: true, data: reaction });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      res.status(409).json({ success: false, error: 'Reaction with this ID already exists' });
      return;
    }
    next(error);
  }
});

/**
 * GET /api/reactions/:reactionId
 * Get a single reaction by ID (requires auth)
 */
router.get('/:reactionId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reactionId } = req.params;
    const reaction = await reactionService.getById(reactionId);

    if (!reaction) {
      res.status(404).json({ success: false, error: 'Reaction not found' });
      return;
    }

    res.json({ success: true, data: reaction });
  } catch (error) {
    next(error);
  }
});

export default router;
