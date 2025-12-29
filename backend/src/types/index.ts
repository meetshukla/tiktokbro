import type { SlidePlan as SlidePlanType, RemixPlan as RemixPlanType } from '../schemas';
export type { SlidePlan, RemixPlan } from '../schemas';

type SlidePlan = SlidePlanType;
type RemixPlan = RemixPlanType;

export type WorkflowStage =
  | 'prompt'
  | 'planning'
  | 'review'
  | 'generating'
  | 'editing'
  | 'complete'
  | 'importing'
  | 'analyzing'
  | 'remix-review';

// SlideAnalysis with index for API responses (extends base schema type)
export interface SlideAnalysis {
  index: number;
  imageDescription: string;
  backgroundType: string;
  backgroundStyle: string;
  extractedText: string;
  textPlacement: string;
}

export interface GeneratedSlide {
  id: string;
  slideNumber: number;
  plan: SlidePlan;
  imageData?: string;
  status: 'pending' | 'generating' | 'complete' | 'error';
  error?: string;
  textOverlay?: TextOverlay;
}

export interface TextOverlay {
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  position: { x: number; y: number };
}

export interface ImageConfig {
  aspectRatio: '9:16' | '1:1' | '16:9';
  model: 'imagen-4.0-generate-001' | 'imagen-4.0-fast-generate-001';
  slideCount: number;
}

// TikTok Import Types
export interface TikTokSlide {
  index: number;
  imageUrl: string;
}

export interface TikTokScrapeResult {
  originalUrl: string;
  caption: string;
  slides: TikTokSlide[];
  authorName?: string;
}

export interface PinterestCandidate {
  imageUrl: string;
  pinUrl?: string;
  title?: string;
}

// API Request/Response types
export interface GeneratePlanRequest {
  prompt: string;
  slideCount: number;
}

export interface GeneratePlanResponse {
  success: boolean;
  plans?: SlidePlan[];
  error?: string;
}

export interface GenerateImageRequest {
  imagePrompt: string;
  aspectRatio: '9:16' | '1:1' | '16:9';
  model: string;
}

export interface GenerateImageResponse {
  success: boolean;
  imageData?: string;
  error?: string;
}

export interface TikTokScrapeRequest {
  url: string;
}

export interface TikTokScrapeResponse {
  success: boolean;
  data?: TikTokScrapeResult;
  error?: string;
}

export interface TikTokAnalyzeRequest {
  slides: TikTokSlide[];
}

export interface TikTokAnalyzeResponse {
  success: boolean;
  data?: { analyses: SlideAnalysis[] };
  error?: string;
}

export interface RemixPlanRequest {
  analyses: SlideAnalysis[];
  userPrompt: string;
}

export interface RemixPlanResponse {
  success: boolean;
  plans?: RemixPlan[];
  error?: string;
}

export interface PinterestSearchRequest {
  query: string;
  limit?: number;
}

export interface PinterestSearchResponse {
  success: boolean;
  data?: {
    query: string;
    urls: string[];
    count: number;
  };
  error?: string;
}
