import { UGCReactionSession, IUGCReactionSession } from '../models/ugc-reaction.model';
import { reactionService } from './reaction.service';
import { falService } from './fal.service';

export interface UGCReactionSessionData {
  sessionId: string;
  name?: string;
  stage?:
    | 'upload'
    | 'select'
    | 'generating-images'
    | 'select-image'
    | 'generating-video'
    | 'complete'
    | 'error';
  avatarImageUrl?: string;
  avatarImageBase64?: string;
  selectedReactionId?: string;
  generatedImages?: Array<{
    id: string;
    imageUrl: string;
    selected: boolean;
  }>;
  selectedImageUrl?: string;
  generatedVideoUrl?: string;
  generatedVideoBase64?: string;
  error?: string;
}

export interface UGCReactionListItem {
  sessionId: string;
  name: string;
  stage: string;
  createdAt: Date;
  updatedAt: Date;
}

class UGCReactionService {
  /**
   * Create a new UGC reaction session
   */
  async create(sessionId: string, name?: string): Promise<IUGCReactionSession> {
    const session = new UGCReactionSession({
      sessionId,
      name: name || 'Untitled Reaction',
      stage: 'upload',
    });
    return session.save();
  }

  /**
   * Get a session by ID
   */
  async getById(sessionId: string): Promise<IUGCReactionSession | null> {
    return UGCReactionSession.findOne({ sessionId });
  }

  /**
   * Update a session
   */
  async update(
    sessionId: string,
    data: Partial<UGCReactionSessionData>
  ): Promise<IUGCReactionSession | null> {
    return UGCReactionSession.findOneAndUpdate({ sessionId }, { $set: data }, { new: true });
  }

  /**
   * Delete a session
   */
  async delete(sessionId: string): Promise<boolean> {
    const result = await UGCReactionSession.deleteOne({ sessionId });
    return result.deletedCount === 1;
  }

  /**
   * List all sessions with pagination
   */
  async list(
    page: number = 1,
    limit: number = 20
  ): Promise<{ sessions: UGCReactionListItem[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      UGCReactionSession.find()
        .select('sessionId name stage createdAt updatedAt')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      UGCReactionSession.countDocuments(),
    ]);

    return {
      sessions: sessions.map((s) => ({
        sessionId: s.sessionId,
        name: s.name,
        stage: s.stage,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Upload avatar and store it
   */
  async uploadAvatar(
    sessionId: string,
    base64Data: string,
    mimeType: string = 'image/jpeg'
  ): Promise<IUGCReactionSession | null> {
    // Upload to FAL storage to get a URL
    const avatarUrl = await falService.uploadToFal(base64Data, mimeType);

    return this.update(sessionId, {
      avatarImageUrl: avatarUrl,
      avatarImageBase64: base64Data,
      stage: 'select',
    });
  }

  /**
   * Select a reaction from the library
   */
  async selectReaction(sessionId: string, reactionId: string): Promise<IUGCReactionSession | null> {
    const reaction = await reactionService.getById(reactionId);
    if (!reaction) {
      throw new Error(`Reaction not found: ${reactionId}`);
    }

    return this.update(sessionId, {
      selectedReactionId: reactionId,
    });
  }

  /**
   * Generate avatar images using Gemini two-image pose transfer
   */
  async generateAvatarImages(sessionId: string): Promise<IUGCReactionSession | null> {
    const session = await this.getById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (!session.avatarImageBase64) {
      throw new Error('No avatar image uploaded');
    }

    if (!session.selectedReactionId) {
      throw new Error('No reaction selected');
    }

    const reaction = await reactionService.getById(session.selectedReactionId);
    if (!reaction) {
      throw new Error(`Reaction not found: ${session.selectedReactionId}`);
    }

    // Update stage to generating
    await this.update(sessionId, { stage: 'generating-images' });

    try {
      // Generate images using Gemini two-image pose transfer
      // Passes avatar (identity) and first frame (pose) to create matched output
      const result = await falService.generateAvatarImages(
        session.avatarImageBase64, // User's avatar (identity reference)
        reaction.firstFrameUrl, // Reaction first frame (pose reference)
        'image/jpeg', // Avatar mime type
        3 // Generate 3 variations
      );

      // Update session with generated images
      return this.update(sessionId, {
        generatedImages: result.images.map((img) => ({
          ...img,
          selected: false,
        })),
        stage: 'select-image',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.update(sessionId, {
        stage: 'error',
        error: `Failed to generate images: ${errorMessage}`,
      });
      throw error;
    }
  }

  /**
   * Select a generated image for video creation
   */
  async selectImage(sessionId: string, imageId: string): Promise<IUGCReactionSession | null> {
    const session = await this.getById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const selectedImage = session.generatedImages?.find((img) => img.id === imageId);
    if (!selectedImage) {
      throw new Error(`Image not found: ${imageId}`);
    }

    // Update all images to mark selected one
    const updatedImages = session.generatedImages?.map((img) => ({
      ...img,
      selected: img.id === imageId,
    }));

    return this.update(sessionId, {
      generatedImages: updatedImages,
      selectedImageUrl: selectedImage.imageUrl,
    });
  }

  /**
   * Generate reaction video using Kling 2.6
   */
  async generateVideo(sessionId: string): Promise<IUGCReactionSession | null> {
    const session = await this.getById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (!session.selectedImageUrl) {
      throw new Error('No image selected');
    }

    if (!session.selectedReactionId) {
      throw new Error('No reaction selected');
    }

    const reaction = await reactionService.getById(session.selectedReactionId);
    if (!reaction) {
      throw new Error(`Reaction not found: ${session.selectedReactionId}`);
    }

    // Update stage to generating video
    await this.update(sessionId, { stage: 'generating-video' });

    try {
      // If video URL is local, we need to upload it to FAL first
      let videoUrl = reaction.videoUrl;
      if (videoUrl.startsWith('/reactions-library/')) {
        console.log('Uploading local video to FAL storage...');
        const fs = await import('fs');
        const path = await import('path');

        const relativePath = videoUrl.replace('/reactions-library/', '');
        const fullPath = path.join(__dirname, '..', '..', 'reactions-library', relativePath);

        if (!fs.existsSync(fullPath)) {
          throw new Error(`Video file not found: ${fullPath}`);
        }

        const videoBuffer = fs.readFileSync(fullPath);
        const videoBase64 = videoBuffer.toString('base64');

        // Determine mime type from extension
        const ext = path.extname(fullPath).toLowerCase();
        const mimeType =
          ext === '.mov' ? 'video/quicktime' : ext === '.webm' ? 'video/webm' : 'video/mp4';

        videoUrl = await falService.uploadToFal(videoBase64, mimeType);
        console.log('Video uploaded to FAL:', videoUrl);
      }

      // Generate video using Kling 2.6
      const result = await falService.generateReactionVideo(session.selectedImageUrl, videoUrl);

      // Update session with generated video
      return this.update(sessionId, {
        generatedVideoUrl: result.videoUrl,
        stage: 'complete',
        name: `Reaction: ${reaction.name}`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.update(sessionId, {
        stage: 'error',
        error: `Failed to generate video: ${errorMessage}`,
      });
      throw error;
    }
  }
}

export const ugcReactionService = new UGCReactionService();
