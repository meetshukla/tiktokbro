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

// Text styling saved with each remix plan
export interface TextStyle {
  x: number;
  y: number;
  fontSize: number;
  color: string;
  backgroundColor: string | null;
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right';
}

export interface RemixPlan {
  slideNumber: number;
  pinterestQuery: string;
  newOverlayText: string;
  layoutNotes: string;
  // Pinterest candidates fetched after user triggers search
  pinterestCandidates?: PinterestCandidate[];
  selectedImageUrl?: string;
  // Text position for the overlay (legacy - use textStyle instead)
  textPosition?: { x: number; y: number };
  // Full text styling
  textStyle?: TextStyle;
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
  // Product context for AI to customize overlay text
  productContext?: string;
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
  productContext?: string;
  userGuidance?: string;
}

export interface RemixPlanResponse {
  success: boolean;
  plans?: RemixPlan[];
  error?: string;
}

export interface CreatePlanRequest {
  topic: string;
  slideCount: number;
}

export interface CreatePlanResponse {
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

// Slideshow Persistence Types
export interface SlideshowListItem {
  sessionId: string;
  name: string;
  prompt: string;
  stage: string;
  slideCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SlideshowListResponse {
  success: boolean;
  sessions: SlideshowListItem[];
  total: number;
  pages: number;
}

export interface SlideshowGetResponse {
  success: boolean;
  data?: SlideshowSession;
  error?: string;
}

export interface SlideshowSaveResponse {
  success: boolean;
  data?: SlideshowSession;
  error?: string;
}

export interface SlideshowDeleteResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface SlideshowSearchResponse {
  success: boolean;
  data?: SlideshowListItem[];
  error?: string;
}

// ==================== UGC Reaction Types ====================

export type ReactionStage =
  | 'upload'
  | 'select'
  | 'generating-images'
  | 'select-image'
  | 'generating-video'
  | 'complete'
  | 'error';

export interface Reaction {
  reactionId: string;
  name: string;
  category: string;
  videoUrl: string;
  firstFrameUrl: string; // Also used as thumbnail
  duration: number;
  description?: string;
}

export interface ReactionListItem {
  reactionId: string;
  name: string;
  category: string;
  firstFrameUrl: string; // Used as thumbnail
  videoUrl: string; // Video file for preview
  duration: number;
  description?: string;
}

export interface GeneratedAvatarImage {
  id: string;
  imageUrl: string;
  selected: boolean;
}

export interface PendingJob {
  falRequestId: string;
  falModel: string;
  type: 'images' | 'video';
  status: 'queued' | 'in_progress' | 'complete' | 'error';
  submittedAt: string;
  completedAt?: string;
  error?: string;
  queuePosition?: number;
}

export interface UGCReactionSession {
  sessionId: string;
  name: string;
  stage: ReactionStage;
  avatarImageUrl?: string;
  avatarImageBase64?: string;
  selectedReactionId?: string;
  generatedImages?: GeneratedAvatarImage[];
  selectedImageUrl?: string;
  generatedVideoUrl?: string;
  generatedVideoBase64?: string;
  error?: string;
  pendingJob?: PendingJob;
  createdAt?: string;
  updatedAt?: string;
}

// UGC Reaction API Types
export interface ReactionListResponse {
  success: boolean;
  data?: ReactionListItem[];
  error?: string;
}

export interface ReactionGetResponse {
  success: boolean;
  data?: Reaction;
  error?: string;
}

export interface ReactionCategoriesResponse {
  success: boolean;
  data?: string[];
  error?: string;
}

export interface UGCReactionSessionResponse {
  success: boolean;
  data?: UGCReactionSession;
  error?: string;
}

export interface UGCReactionListResponse {
  success: boolean;
  sessions?: Array<{
    sessionId: string;
    name: string;
    stage: string;
    createdAt: string;
    updatedAt: string;
  }>;
  total?: number;
  pages?: number;
  error?: string;
}
