import { Schema, model, Document } from 'mongoose';

/**
 * Reaction Library Model
 * Stores pre-defined reaction videos with their first frames for the UGC creator
 */
export interface IReaction extends Document {
  reactionId: string;
  name: string;
  category: string;
  videoUrl: string;
  firstFrameUrl: string; // Also used as thumbnail
  duration: number; // in seconds
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReactionSchema = new Schema<IReaction>(
  {
    reactionId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    category: { type: String, required: true, index: true },
    videoUrl: { type: String, required: true },
    firstFrameUrl: { type: String, required: true },
    duration: { type: Number, required: true },
    description: { type: String },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
ReactionSchema.index({ category: 1 });
ReactionSchema.index({ name: 'text', description: 'text' });

export const Reaction = model<IReaction>('Reaction', ReactionSchema);
