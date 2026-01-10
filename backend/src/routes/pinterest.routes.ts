import { Router, Request, Response } from 'express';
import { createPinterestScraper } from '../services/pinterest.service';

const router = Router();

/**
 * POST /api/pinterest/search
 * Search Pinterest for images using Apify actor
 */
router.post('/search', async (req: Request, res: Response) => {
  try {
    const { query, limit = 20 } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required',
      });
    }

    const scraper = createPinterestScraper();
    if (!scraper) {
      return res.status(503).json({
        success: false,
        error: 'Pinterest search is not configured. APIFY_API_KEY is missing.',
      });
    }

    const urls = await scraper.search(query, limit);

    return res.json({
      success: true,
      data: {
        query,
        urls,
        count: urls.length,
      },
    });
  } catch (error) {
    console.error('Pinterest search error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Search failed',
    });
  }
});

/**
 * POST /api/pinterest/search-multiple
 * Search multiple queries in a single request (more efficient)
 */
router.post('/search-multiple', async (req: Request, res: Response) => {
  try {
    const { queries } = req.body;

    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Queries array is required',
      });
    }

    const scraper = createPinterestScraper();
    if (!scraper) {
      return res.status(503).json({
        success: false,
        error: 'Pinterest search is not configured. APIFY_API_KEY is missing.',
      });
    }

    const results = await scraper.searchMultiple(queries);

    return res.json({
      success: true,
      data: Object.fromEntries(results),
    });
  } catch (error) {
    console.error('Pinterest multi-search error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Search failed',
    });
  }
});

export default router;
