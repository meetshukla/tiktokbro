import { Router, Request, Response, NextFunction } from 'express';
import { slideshowService, SlideshowSessionData } from '../services/slideshow.service';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

/**
 * POST /api/slideshows
 * Create a new slideshow session
 */
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: SlideshowSessionData = req.body;

    if (!data.sessionId) {
      res.status(400).json({ success: false, error: 'sessionId is required' });
      return;
    }

    if (!data.config) {
      res.status(400).json({ success: false, error: 'config is required' });
      return;
    }

    // Attach userId from authenticated user
    data.userId = req.user?.userId;

    const session = await slideshowService.create(data);
    res.status(201).json({ success: true, data: session });
  } catch (error) {
    // Handle duplicate key error
    if ((error as { code?: number }).code === 11000) {
      res.status(409).json({ success: false, error: 'Session with this ID already exists' });
      return;
    }
    next(error);
  }
});

/**
 * GET /api/slideshows
 * List all slideshow sessions with pagination (filtered by user)
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const result = await slideshowService.list(page, limit, req.user?.userId);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/slideshows/search
 * Search slideshows by name or prompt (filtered by user)
 */
router.get('/search', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = (req.query.q as string) || '';
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    if (!query.trim()) {
      res.status(400).json({ success: false, error: 'Search query is required' });
      return;
    }

    const sessions = await slideshowService.search(query, limit, req.user?.userId);
    res.json({ success: true, data: sessions });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/slideshows/:sessionId
 * Get a specific slideshow session
 */
router.get('/:sessionId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const session = await slideshowService.getById(sessionId);

    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    // Verify ownership - deny access if no userId (orphaned) or userId doesn't match
    if (!session.userId || session.userId !== req.user?.userId) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/slideshows/:sessionId
 * Update an existing slideshow session
 */
router.put('/:sessionId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const data: Partial<SlideshowSessionData> = req.body;

    // Don't allow changing sessionId or userId
    delete data.sessionId;
    delete data.userId;

    // First check ownership - deny if no userId or doesn't match
    const existing = await slideshowService.getById(sessionId);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }
    if (!existing.userId || existing.userId !== req.user?.userId) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const session = await slideshowService.update(sessionId, data);

    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/slideshows/:sessionId
 * Delete a slideshow session
 */
router.delete(
  '/:sessionId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;

      // First check ownership - deny if no userId or doesn't match
      const existing = await slideshowService.getById(sessionId);
      if (!existing) {
        res.status(404).json({ success: false, error: 'Session not found' });
        return;
      }
      if (!existing.userId || existing.userId !== req.user?.userId) {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }

      await slideshowService.delete(sessionId);
      res.json({ success: true, message: 'Session deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/slideshows/:sessionId/duplicate
 * Duplicate an existing slideshow session
 */
router.post(
  '/:sessionId/duplicate',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const { newSessionId } = req.body;

      if (!newSessionId) {
        res.status(400).json({ success: false, error: 'newSessionId is required' });
        return;
      }

      // First check ownership - deny if no userId or doesn't match
      const existing = await slideshowService.getById(sessionId);
      if (!existing) {
        res.status(404).json({ success: false, error: 'Original session not found' });
        return;
      }
      if (!existing.userId || existing.userId !== req.user?.userId) {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }

      const session = await slideshowService.duplicate(sessionId, newSessionId, req.user?.userId);

      res.status(201).json({ success: true, data: session });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        res.status(409).json({ success: false, error: 'Session with new ID already exists' });
        return;
      }
      next(error);
    }
  }
);

export default router;
