import { Router, Request, Response } from 'express';
import { Settings } from '../models/settings.model';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

const GLOBAL_KEY = 'global';

/**
 * GET /api/settings
 * Get global settings (requires auth)
 */
router.get('/', requireAuth, async (_req: Request, res: Response) => {
  try {
    const settings = await Settings.findOne({ key: GLOBAL_KEY });

    return res.json({
      success: true,
      data: settings || { productContext: '' },
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch settings',
    });
  }
});

/**
 * PUT /api/settings
 * Update global settings (requires auth)
 */
router.put('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { productContext } = req.body;

    const settings = await Settings.findOneAndUpdate(
      { key: GLOBAL_KEY },
      { productContext },
      { new: true, upsert: true }
    );

    return res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update settings',
    });
  }
});

export default router;
