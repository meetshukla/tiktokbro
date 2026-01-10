import { Schema, model, Document } from 'mongoose';

// Sub-schemas for nested objects
const TextOverlaySchema = new Schema(
  {
    text: { type: String, required: true },
    size: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
    color: { type: String, default: '#ffffff' },
    position: {
      x: { type: Number, default: 50 },
      y: { type: Number, default: 50 },
    },
  },
  { _id: false }
);

const SlidePlanSchema = new Schema(
  {
    slideNumber: { type: Number, required: true },
    imagePrompt: { type: String, required: true },
    suggestedOverlay: { type: String },
  },
  { _id: false }
);

const GeneratedSlideSchema = new Schema(
  {
    id: { type: String, required: true },
    slideNumber: { type: Number, required: true },
    plan: { type: SlidePlanSchema, required: true },
    imageData: { type: String }, // Base64 image data (AI-generated only)
    // Note: editedImageData is NOT saved - regenerated at runtime from imageData + textOverlay
    status: {
      type: String,
      enum: ['pending', 'generating', 'complete', 'error'],
      default: 'pending',
    },
    error: { type: String },
    textOverlay: { type: TextOverlaySchema }, // Settings to regenerate canvas
  },
  { _id: false }
);

const TikTokSlideSchema = new Schema(
  {
    index: { type: Number, required: true },
    imageUrl: { type: String, required: true },
  },
  { _id: false }
);

const TikTokScrapeResultSchema = new Schema(
  {
    originalUrl: { type: String, required: true },
    caption: { type: String, default: '' },
    slides: [TikTokSlideSchema],
    authorName: { type: String },
  },
  { _id: false }
);

const SlideAnalysisSchema = new Schema(
  {
    index: { type: Number, required: true },
    imageDescription: { type: String, default: '' },
    backgroundType: { type: String, default: '' },
    backgroundStyle: { type: String, default: '' },
    extractedText: { type: String, default: '' },
    textPlacement: { type: String, default: '' },
  },
  { _id: false }
);

const PinterestCandidateSchema = new Schema(
  {
    imageUrl: { type: String, required: true },
    pinUrl: { type: String },
    title: { type: String },
  },
  { _id: false }
);

const RemixPlanSchema = new Schema(
  {
    slideNumber: { type: Number, required: true },
    pinterestQuery: { type: String, default: '' },
    newOverlayText: { type: String, default: '' },
    layoutNotes: { type: String, default: '' },
    pinterestCandidates: [PinterestCandidateSchema],
    selectedImageUrl: { type: String },
    textPosition: {
      x: { type: Number },
      y: { type: Number },
    },
    textStyle: {
      x: { type: Number },
      y: { type: Number },
      fontSize: { type: Number },
      color: { type: String },
      backgroundColor: { type: String },
      fontFamily: { type: String },
      textAlign: { type: String, enum: ['left', 'center', 'right'] },
    },
  },
  { _id: false }
);

const ImageConfigSchema = new Schema(
  {
    aspectRatio: {
      type: String,
      enum: ['9:16', '1:1', '16:9'],
      default: '9:16',
    },
    model: {
      type: String,
      enum: ['imagen-4.0-generate-001', 'imagen-4.0-fast-generate-001'],
      default: 'imagen-4.0-fast-generate-001',
    },
    slideCount: { type: Number, default: 5 },
  },
  { _id: false }
);

// Main Slideshow Session Schema
export interface ISlideshowSession extends Document {
  sessionId: string;
  userId?: string;
  name: string;
  prompt: string;
  stage: string;
  plans: Array<{
    slideNumber: number;
    imagePrompt: string;
    suggestedOverlay?: string;
  }>;
  slides: Array<{
    id: string;
    slideNumber: number;
    plan: {
      slideNumber: number;
      imagePrompt: string;
      suggestedOverlay?: string;
    };
    imageData?: string;
    // editedImageData regenerated at runtime
    status: 'pending' | 'generating' | 'complete' | 'error';
    error?: string;
    textOverlay?: {
      text: string;
      size: 'small' | 'medium' | 'large';
      color: string;
      position: { x: number; y: number };
    };
  }>;
  config: {
    aspectRatio: '9:16' | '1:1' | '16:9';
    model: 'imagen-4.0-generate-001' | 'imagen-4.0-fast-generate-001';
    slideCount: number;
  };
  tiktokData?: {
    originalUrl: string;
    caption: string;
    slides: Array<{ index: number; imageUrl: string }>;
    authorName?: string;
  };
  slideAnalyses?: Array<{
    index: number;
    imageDescription: string;
    backgroundType: string;
    backgroundStyle: string;
    extractedText: string;
    textPlacement: string;
  }>;
  remixPlans?: Array<{
    slideNumber: number;
    pinterestQuery: string;
    newOverlayText: string;
    layoutNotes: string;
    pinterestCandidates?: Array<{
      imageUrl: string;
      pinUrl?: string;
      title?: string;
    }>;
    selectedImageUrl?: string;
    textPosition?: { x: number; y: number };
    textStyle?: {
      x: number;
      y: number;
      fontSize: number;
      color: string;
      backgroundColor: string | null;
      fontFamily: string;
      textAlign: 'left' | 'center' | 'right';
    };
  }>;
  productContext?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SlideshowSessionSchema = new Schema<ISlideshowSession>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, index: true },
    name: { type: String, default: 'Untitled Slideshow' },
    prompt: { type: String, default: '' },
    stage: {
      type: String,
      enum: [
        'prompt',
        'planning',
        'review',
        'generating',
        'editing',
        'complete',
        'importing',
        'analyzing',
        'remix-review',
      ],
      default: 'prompt',
    },
    plans: [SlidePlanSchema],
    slides: [GeneratedSlideSchema],
    config: { type: ImageConfigSchema, required: true },
    tiktokData: { type: TikTokScrapeResultSchema },
    slideAnalyses: [SlideAnalysisSchema],
    remixPlans: [RemixPlanSchema],
    productContext: { type: String },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
SlideshowSessionSchema.index({ createdAt: -1 });
SlideshowSessionSchema.index({ updatedAt: -1 });
SlideshowSessionSchema.index({ userId: 1, updatedAt: -1 });
SlideshowSessionSchema.index({ name: 'text', prompt: 'text' });

export const SlideshowSession = model<ISlideshowSession>(
  'SlideshowSession',
  SlideshowSessionSchema
);
