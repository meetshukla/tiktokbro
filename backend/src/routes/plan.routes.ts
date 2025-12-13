import { Router, Request, Response } from 'express';
import { generateSlidePlan } from '../services/plan.service';
import { GeneratePlanRequest, GeneratePlanResponse } from '../types';

const router = Router();

router.post('/', async (req: Request<{}, GeneratePlanResponse, GeneratePlanRequest>, res: Response<GeneratePlanResponse>) => {
  try {
    const { prompt, slideCount = 5 } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Prompt is required',
      });
      return;
    }

    if (prompt.length < 3) {
      res.status(400).json({
        success: false,
        error: 'Prompt must be at least 3 characters',
      });
      return;
    }

    if (prompt.length > 1000) {
      res.status(400).json({
        success: false,
        error: 'Prompt must be less than 1000 characters',
      });
      return;
    }

    const validSlideCount = Math.min(Math.max(slideCount, 3), 6);

    const plans = await generateSlidePlan(prompt, validSlideCount);

    res.json({
      success: true,
      plans,
    });
  } catch (error) {
    console.error('Error generating plan:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate plan',
    });
  }
});

export default router;
