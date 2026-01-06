import { Schema, model, Document } from 'mongoose';

/**
 * UGC Reaction Session Model
 * Tracks the state of a UGC reaction creation session
 */

// Sub-schema for generated avatar images
const GeneratedImageSchema = new Schema(
  {
    id: { type: String, required: true },
    imageUrl: { type: String, required: true },
    selected: { type: Boolean, default: false },
  },
  { _id: false }
);

export interface IUGCReactionSession extends Document {
  sessionId: string;
  name: string;
  stage:
    | 'upload'
    | 'select'
    | 'generating-images'
    | 'select-image'
    | 'generating-video'
    | 'complete'
    | 'error';
  avatarImageUrl?: string;
  avatarImageBase64?: string; // Store avatar as base64 for persistence
  selectedReactionId?: string;
  generatedImages?: Array<{
    id: string;
    imageUrl: string;
    selected: boolean;
  }>;
  selectedImageUrl?: string;
  generatedVideoUrl?: string;
  generatedVideoBase64?: string; // Store video as base64 for persistence
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UGCReactionSessionSchema = new Schema<IUGCReactionSession>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: 'Untitled Reaction' },
    stage: {
      type: String,
      enum: [
        'upload',
        'select',
        'generating-images',
        'select-image',
        'generating-video',
        'complete',
        'error',
      ],
      default: 'upload',
    },
    avatarImageUrl: { type: String },
    avatarImageBase64: { type: String },
    selectedReactionId: { type: String },
    generatedImages: [GeneratedImageSchema],
    selectedImageUrl: { type: String },
    generatedVideoUrl: { type: String },
    generatedVideoBase64: { type: String },
    error: { type: String },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
UGCReactionSessionSchema.index({ createdAt: -1 });
UGCReactionSessionSchema.index({ updatedAt: -1 });

export const UGCReactionSession = model<IUGCReactionSession>(
  'UGCReactionSession',
  UGCReactionSessionSchema
);
