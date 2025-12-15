export type WorkflowStage = 'prompt' | 'planning' | 'review' | 'generating' | 'editing' | 'complete' | 'importing' | 'analyzing' | 'remix-review';

export interface SlidePlan {
  slideNumber: number;
  imagePrompt: string;
  suggestedOverlay?: string;
}

export interface GeneratedSlide {
  id: string;
  slideNumber: number;
  plan: SlidePlan;
  imageData?: string;
  editedImageData?: string; // Canvas with text overlay exported as data URL
  status: 'pending' | 'generating' | 'complete' | 'error';
  error?: string;
  textOverlay?: TextOverlay;
}

export interface TextOverlay {
  text: string;
  size: 'small' | 'medium' | 'large';
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

export interface SlideAnalysis {
  index: number;
  imageDescription: string;
  backgroundType: string;
  backgroundStyle: string;
  extractedText: string;
  textPlacement: string;
}

export interface RemixPlan {
  slideNumber: number;
  pinterestQuery: string;
  newOverlayText: string;
  layoutNotes: string;
  // Pinterest candidates fetched after user triggers search
  pinterestCandidates?: PinterestCandidate[];
  selectedImageUrl?: string;
  // Text position for the overlay
  textPosition?: { x: number; y: number };
}

export interface PinterestCandidate {
  imageUrl: string;
  pinUrl?: string;
  title?: string;
}

export interface SlideshowSession {
  id: string;
  prompt: string;
  stage: WorkflowStage;
  plans: SlidePlan[];
  slides: GeneratedSlide[];
  config: ImageConfig;
  // TikTok import data
  tiktokData?: TikTokScrapeResult;
  slideAnalyses?: SlideAnalysis[];
  remixPlans?: RemixPlan[];
}

// API types
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
