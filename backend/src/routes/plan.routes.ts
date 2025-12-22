import { Router, Request, Response } from 'express';
import { generateSlidePlan, generateRemixPlan } from '../services/plan.service';
import { GeneratePlanRequest, GeneratePlanResponse } from '../types';
import { SlideAnalysis } from '../services/gemini.service';

const router = Router();

router.post(
  '/',
  async (
    req: Request<{}, GeneratePlanResponse, GeneratePlanRequest>,
    res: Response<GeneratePlanResponse>
  ) => {
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
  }
);

/**
 * POST /api/generate-plan/remix
 * Generate a remix plan based on original slide analyses and new user prompt
 */
router.post('/remix', async (req: Request, res: Response) => {
  try {
    const { analyses, userPrompt, productContext, userGuidance } = req.body;

    if (!analyses || !Array.isArray(analyses) || analyses.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Slide analyses array is required',
      });
    }

    if (!userPrompt || typeof userPrompt !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'User prompt is required',
      });
    }

    const typedAnalyses = analyses as (SlideAnalysis & { index: number })[];
    const remixPlans = await generateRemixPlan(
      typedAnalyses,
      userPrompt,
      productContext,
      userGuidance
    );

    return res.json({
      success: true,
      plans: remixPlans,
    });
  } catch (error) {
    console.error('Error generating remix plan:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate remix plan',
    });
  }
});

export default router;
