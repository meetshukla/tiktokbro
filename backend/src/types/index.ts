export type WorkflowStage = 'prompt' | 'planning' | 'review' | 'generating' | 'editing' | 'complete';

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
