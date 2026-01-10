import {
  GeneratePlanRequest,
  GeneratePlanResponse,
  GenerateImageRequest,
  GenerateImageResponse,
  TikTokScrapeRequest,
  TikTokScrapeResponse,
  TikTokAnalyzeRequest,
  TikTokAnalyzeResponse,
  RemixPlanRequest,
  RemixPlanResponse,
  CreatePlanRequest,
  CreatePlanResponse,
  PinterestSearchRequest,
  PinterestSearchResponse,
  SlideshowSession,
  SlideshowListResponse,
  SlideshowGetResponse,
  SlideshowSaveResponse,
  SlideshowDeleteResponse,
  SlideshowSearchResponse,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function generatePlan(request: GeneratePlanRequest): Promise<GeneratePlanResponse> {
  return fetchApi<GeneratePlanResponse>('/generate-plan', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function generateImage(request: GenerateImageRequest): Promise<GenerateImageResponse> {
  return fetchApi<GenerateImageResponse>('/generate-image', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function healthCheck(): Promise<{ status: string; timestamp: string }> {
  return fetchApi('/health');
}

// TikTok Import API
export async function scrapeTikTok(request: TikTokScrapeRequest): Promise<TikTokScrapeResponse> {
  return fetchApi<TikTokScrapeResponse>('/tiktok/scrape', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function analyzeTikTokSlides(
  request: TikTokAnalyzeRequest
): Promise<TikTokAnalyzeResponse> {
  return fetchApi<TikTokAnalyzeResponse>('/tiktok/analyze', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function generateRemixPlan(request: RemixPlanRequest): Promise<RemixPlanResponse> {
  return fetchApi<RemixPlanResponse>('/generate-plan/remix', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function generateCreatePlan(request: CreatePlanRequest): Promise<CreatePlanResponse> {
  return fetchApi<CreatePlanResponse>('/generate-plan/create', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function searchPinterest(
  request: PinterestSearchRequest
): Promise<PinterestSearchResponse> {
  return fetchApi<PinterestSearchResponse>('/pinterest/search', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// ==================== Slideshow Persistence API ====================

/**
 * Save a slideshow session to the database
 */
export async function saveSlideshow(session: SlideshowSession): Promise<SlideshowSaveResponse> {
  return fetchApi<SlideshowSaveResponse>('/slideshows', {
    method: 'POST',
    body: JSON.stringify({
      sessionId: session.id,
      prompt: session.prompt,
      stage: session.stage,
      plans: session.plans,
      slides: session.slides,
      config: session.config,
      tiktokData: session.tiktokData,
      slideAnalyses: session.slideAnalyses,
      remixPlans: session.remixPlans,
      productContext: session.productContext,
    }),
  });
}

/**
 * Update an existing slideshow session
 */
export async function updateSlideshow(session: SlideshowSession): Promise<SlideshowSaveResponse> {
  return fetchApi<SlideshowSaveResponse>(`/slideshows/${session.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      prompt: session.prompt,
      stage: session.stage,
      plans: session.plans,
      slides: session.slides,
      config: session.config,
      tiktokData: session.tiktokData,
      slideAnalyses: session.slideAnalyses,
      remixPlans: session.remixPlans,
      productContext: session.productContext,
    }),
  });
}

/**
 * Get a slideshow session by ID
 */
export async function getSlideshow(sessionId: string): Promise<SlideshowGetResponse> {
  return fetchApi<SlideshowGetResponse>(`/slideshows/${sessionId}`);
}

/**
 * List all slideshow sessions with pagination
 */
export async function listSlideshows(
  page: number = 1,
  limit: number = 20
): Promise<SlideshowListResponse> {
  return fetchApi<SlideshowListResponse>(`/slideshows?page=${page}&limit=${limit}`);
}

/**
 * Search slideshows by name or prompt
 */
export async function searchSlideshows(
  query: string,
  limit: number = 10
): Promise<SlideshowSearchResponse> {
  return fetchApi<SlideshowSearchResponse>(
    `/slideshows/search?q=${encodeURIComponent(query)}&limit=${limit}`
  );
}

/**
 * Delete a slideshow session
 */
export async function deleteSlideshow(sessionId: string): Promise<SlideshowDeleteResponse> {
  return fetchApi<SlideshowDeleteResponse>(`/slideshows/${sessionId}`, {
    method: 'DELETE',
  });
}

/**
 * Duplicate a slideshow session
 */
export async function duplicateSlideshow(
  sessionId: string,
  newSessionId: string
): Promise<SlideshowSaveResponse> {
  return fetchApi<SlideshowSaveResponse>(`/slideshows/${sessionId}/duplicate`, {
    method: 'POST',
    body: JSON.stringify({ newSessionId }),
  });
}

// ==================== Settings API ====================

export interface SettingsResponse {
  success: boolean;
  data?: { productContext: string };
  error?: string;
}

/**
 * Get global settings
 */
export async function getSettings(): Promise<SettingsResponse> {
  return fetchApi<SettingsResponse>('/settings');
}

/**
 * Update global settings
 */
export async function updateSettings(productContext: string): Promise<SettingsResponse> {
  return fetchApi<SettingsResponse>('/settings', {
    method: 'PUT',
    body: JSON.stringify({ productContext }),
  });
}

// ==================== UGC Reaction API ====================

import {
  ReactionListResponse,
  ReactionGetResponse,
  ReactionCategoriesResponse,
  UGCReactionSessionResponse,
  UGCReactionListResponse,
} from '@/types';

/**
 * Get all reactions from the library
 */
export async function fetchReactions(): Promise<ReactionListResponse> {
  return fetchApi<ReactionListResponse>('/reactions');
}

/**
 * Get a single reaction by ID
 */
export async function getReaction(reactionId: string): Promise<ReactionGetResponse> {
  return fetchApi<ReactionGetResponse>(`/reactions/${reactionId}`);
}

/**
 * Get all reaction categories
 */
export async function getReactionCategories(): Promise<ReactionCategoriesResponse> {
  return fetchApi<ReactionCategoriesResponse>('/reactions/categories');
}

/**
 * Get reactions by category
 */
export async function getReactionsByCategory(category: string): Promise<ReactionListResponse> {
  return fetchApi<ReactionListResponse>(`/reactions/category/${encodeURIComponent(category)}`);
}

/**
 * Create a new UGC reaction session
 */
export async function createUGCReactionSession(
  sessionId: string,
  name?: string
): Promise<UGCReactionSessionResponse> {
  return fetchApi<UGCReactionSessionResponse>('/ugc-reactions', {
    method: 'POST',
    body: JSON.stringify({ sessionId, name }),
  });
}

/**
 * Get a UGC reaction session
 */
export async function getUGCReactionSession(
  sessionId: string
): Promise<UGCReactionSessionResponse> {
  return fetchApi<UGCReactionSessionResponse>(`/ugc-reactions/${sessionId}`);
}

/**
 * List all UGC reaction sessions
 */
export async function listUGCReactionSessions(
  page: number = 1,
  limit: number = 20
): Promise<UGCReactionListResponse> {
  return fetchApi<UGCReactionListResponse>(`/ugc-reactions?page=${page}&limit=${limit}`);
}

/**
 * Upload avatar image for a session
 */
export async function uploadAvatarImage(
  sessionId: string,
  imageData: string,
  mimeType: string = 'image/jpeg'
): Promise<UGCReactionSessionResponse> {
  return fetchApi<UGCReactionSessionResponse>(`/ugc-reactions/${sessionId}/upload`, {
    method: 'POST',
    body: JSON.stringify({ imageData, mimeType }),
  });
}

/**
 * Select a reaction from the library
 */
export async function selectReaction(
  sessionId: string,
  reactionId: string
): Promise<UGCReactionSessionResponse> {
  return fetchApi<UGCReactionSessionResponse>(`/ugc-reactions/${sessionId}/select-reaction`, {
    method: 'POST',
    body: JSON.stringify({ reactionId }),
  });
}

/**
 * Generate avatar images using Nano Banana Pro
 */
export async function generateAvatarImages(sessionId: string): Promise<UGCReactionSessionResponse> {
  return fetchApi<UGCReactionSessionResponse>(`/ugc-reactions/${sessionId}/generate-images`, {
    method: 'POST',
  });
}

/**
 * Select a generated image for video creation
 */
export async function selectGeneratedImage(
  sessionId: string,
  imageId: string
): Promise<UGCReactionSessionResponse> {
  return fetchApi<UGCReactionSessionResponse>(`/ugc-reactions/${sessionId}/select-image`, {
    method: 'POST',
    body: JSON.stringify({ imageId }),
  });
}

/**
 * Generate reaction video using Kling 2.6 (LEGACY - blocking)
 */
export async function generateReactionVideo(
  sessionId: string
): Promise<UGCReactionSessionResponse> {
  return fetchApi<UGCReactionSessionResponse>(`/ugc-reactions/${sessionId}/generate-video`, {
    method: 'POST',
  });
}

/**
 * Delete a UGC reaction session
 */
export async function deleteUGCReactionSession(
  sessionId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  return fetchApi(`/ugc-reactions/${sessionId}`, {
    method: 'DELETE',
  });
}

// ==================== Async Queue API ====================

export interface SubmitVideoResponse {
  success: boolean;
  data?: {
    sessionId: string;
    falRequestId: string;
    status: string;
  };
  error?: string;
}

export interface JobStatusResponse {
  success: boolean;
  data?: {
    status: 'queued' | 'in_progress' | 'complete' | 'error' | 'no_job';
    queuePosition?: number;
    error?: string;
  };
  error?: string;
}

export interface GalleryListResponse {
  success: boolean;
  sessions?: Array<{
    sessionId: string;
    name: string;
    stage: string;
    createdAt: string;
    updatedAt: string;
    thumbnailUrl?: string;
    videoUrl?: string;
  }>;
  total?: number;
  pages?: number;
  error?: string;
}

/**
 * Submit video generation to queue (non-blocking)
 * Returns immediately with job info for status tracking
 */
export async function submitVideoGeneration(sessionId: string): Promise<SubmitVideoResponse> {
  return fetchApi<SubmitVideoResponse>(`/ugc-reactions/${sessionId}/submit-video`, {
    method: 'POST',
  });
}

/**
 * Check the status of a pending job
 */
export async function getJobStatus(sessionId: string): Promise<JobStatusResponse> {
  return fetchApi<JobStatusResponse>(`/ugc-reactions/${sessionId}/job-status`);
}

/**
 * Fetch the result of a completed job and update session
 */
export async function fetchJobResult(sessionId: string): Promise<UGCReactionSessionResponse> {
  return fetchApi<UGCReactionSessionResponse>(`/ugc-reactions/${sessionId}/job-result`, {
    method: 'POST',
  });
}

/**
 * Get completed sessions for gallery display
 */
export async function getGallerySessions(
  page: number = 1,
  limit: number = 20
): Promise<GalleryListResponse> {
  return fetchApi<GalleryListResponse>(`/ugc-reactions/gallery?page=${page}&limit=${limit}`);
}
