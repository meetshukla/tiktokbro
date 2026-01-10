import axios from 'axios';

const APIFY_PINTEREST_ACTOR_URL =
  'https://analogous-atlas--custom-pinterest-scrapper.apify.actor/search';

interface ApifyPinterestResult {
  query: string;
  images: string[];
}

interface ApifyPinterestResponse {
  success: boolean;
  data: ApifyPinterestResult[];
}

export class PinterestScraper {
  private apiToken: string;
  private errors: string[] = [];

  constructor() {
    const token = process.env.APIFY_API_KEY;
    if (!token) {
      throw new Error('APIFY_API_KEY is not set in environment variables');
    }
    this.apiToken = token;
  }

  /**
   * Search Pinterest using Apify actor with residential proxy
   */
  async search(query: string, limit = 26): Promise<string[]> {
    try {
      const response = await axios.post<ApifyPinterestResponse>(
        `${APIFY_PINTEREST_ACTOR_URL}?token=${this.apiToken}`,
        { queries: [query] },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );

      if (!response.data.success || !response.data.data?.length) {
        this.errors.push(`No results for query: ${query}`);
        return [];
      }

      const images = response.data.data[0]?.images || [];
      return images.slice(0, limit);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.errors.push(`Search failed: ${message}`);
      return [];
    }
  }

  /**
   * Search multiple queries in a single request (more efficient)
   */
  async searchMultiple(queries: string[]): Promise<Map<string, string[]>> {
    const results = new Map<string, string[]>();

    try {
      const response = await axios.post<ApifyPinterestResponse>(
        `${APIFY_PINTEREST_ACTOR_URL}?token=${this.apiToken}`,
        { queries },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 120000, // 2min timeout for multiple queries
        }
      );

      if (response.data.success && response.data.data) {
        for (const item of response.data.data) {
          results.set(item.query, item.images);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.errors.push(`Multi-search failed: ${message}`);
      console.error('Pinterest Apify multi-search error:', error);
    }

    return results;
  }

  getErrors(): string[] {
    return this.errors;
  }
}

// Factory function to create scraper (handles missing token gracefully)
export function createPinterestScraper(): PinterestScraper | null {
  try {
    return new PinterestScraper();
  } catch {
    console.warn('Pinterest scraper not configured: APIFY_PINTEREST_TOKEN missing');
    return null;
  }
}
