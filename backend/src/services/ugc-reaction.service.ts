import { UGCReactionSession, IUGCReactionSession, IPendingJob } from '../models/ugc-reaction.model';
import { reactionService } from './reaction.service';
import { falService } from './fal.service';

export interface UGCReactionSessionData {
  sessionId: string;
  userId?: string;
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
  pendingJob?: IPendingJob | null;
}

export interface UGCReactionListItem {
  sessionId: string;
  userId?: string;
  name: string;
  stage: string;
  createdAt: Date;
  updatedAt: Date;
}

class UGCReactionService {
  /**
   * Create a new UGC reaction session
   */
  async create(sessionId: string, name?: string, userId?: string): Promise<IUGCReactionSession> {
    const session = new UGCReactionSession({
      sessionId,
      userId,
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
   * If userId is provided, only return sessions for that user
   */
  async list(
    page: number = 1,
    limit: number = 20,
    userId?: string
  ): Promise<{ sessions: UGCReactionListItem[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;
    const filter = userId ? { userId } : {};

    const [sessions, total] = await Promise.all([
      UGCReactionSession.find(filter)
        .select('sessionId userId name stage createdAt updatedAt')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      UGCReactionSession.countDocuments(filter),
    ]);

    return {
      sessions: sessions.map((s) => ({
        sessionId: s.sessionId,
        userId: s.userId,
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

    // Update session with reaction and set name to reaction name
    return this.update(sessionId, {
      selectedReactionId: reactionId,
      name: `Reaction: ${reaction.name}`,
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

  // ==================== ASYNC QUEUE METHODS ====================

  /**
   * Submit video generation to FAL queue (non-blocking)
   * Returns immediately with job info for status tracking
   */
  async submitVideoGeneration(
    sessionId: string
  ): Promise<{ sessionId: string; falRequestId: string; status: string }> {
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

      const ext = path.extname(fullPath).toLowerCase();
      const mimeType =
        ext === '.mov' ? 'video/quicktime' : ext === '.webm' ? 'video/webm' : 'video/mp4';

      videoUrl = await falService.uploadToFal(videoBase64, mimeType);
      console.log('Video uploaded to FAL:', videoUrl);
    }

    // Submit to FAL queue (non-blocking)
    const queueResult = await falService.submitVideoToQueue(session.selectedImageUrl, videoUrl);

    // Save pending job to session
    const pendingJob: IPendingJob = {
      falRequestId: queueResult.requestId,
      falModel: 'fal-ai/kling-video/v2.6/standard/motion-control',
      type: 'video',
      status: 'queued',
      submittedAt: new Date(),
    };

    await this.update(sessionId, {
      stage: 'generating-video',
      pendingJob,
    });

    return {
      sessionId,
      falRequestId: queueResult.requestId,
      status: 'queued',
    };
  }

  /**
   * Check the status of a pending job and update session
   */
  async checkJobStatus(
    sessionId: string
  ): Promise<{ status: string; queuePosition?: number; error?: string }> {
    const session = await this.getById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (!session.pendingJob) {
      // No pending job, check if already complete
      if (session.stage === 'complete') {
        return { status: 'complete' };
      }
      if (session.stage === 'select-image' && session.generatedImages?.length) {
        return { status: 'complete' };
      }
      return { status: 'no_job' };
    }

    // Check FAL queue status
    const falStatus = await falService.getQueueStatus(
      session.pendingJob.falModel,
      session.pendingJob.falRequestId
    );

    // Map FAL status to our status
    let status: IPendingJob['status'] = session.pendingJob.status;
    if (falStatus.status === 'IN_QUEUE') {
      status = 'queued';
    } else if (falStatus.status === 'IN_PROGRESS') {
      status = 'in_progress';
    } else if (falStatus.status === 'COMPLETED') {
      status = 'complete';
    } else if (falStatus.status === 'FAILED') {
      status = 'error';
    }

    // Update session if status changed
    if (status !== session.pendingJob.status) {
      await UGCReactionSession.findOneAndUpdate(
        { sessionId },
        {
          $set: {
            'pendingJob.status': status,
            'pendingJob.queuePosition': falStatus.queuePosition,
            ...(status === 'complete' && { 'pendingJob.completedAt': new Date() }),
          },
        }
      );
    }

    return {
      status,
      queuePosition: falStatus.queuePosition,
    };
  }

  /**
   * Fetch the result of a completed job and update session
   */
  async fetchJobResult(sessionId: string): Promise<IUGCReactionSession | null> {
    const session = await this.getById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (!session.pendingJob) {
      throw new Error('No pending job found');
    }

    // Check if job is complete
    const statusResult = await this.checkJobStatus(sessionId);
    if (statusResult.status !== 'complete') {
      throw new Error(`Job not complete. Current status: ${statusResult.status}`);
    }

    // Fetch result from FAL
    const falResult = await falService.getQueueResult(
      session.pendingJob.falModel,
      session.pendingJob.falRequestId
    );

    const resultData = falResult.data as { video?: { url: string } };

    if (session.pendingJob.type === 'video') {
      if (!resultData.video?.url) {
        throw new Error('No video URL in result');
      }

      // Get reaction name for session title
      let reactionName = 'Reaction';
      if (session.selectedReactionId) {
        const reaction = await reactionService.getById(session.selectedReactionId);
        if (reaction) {
          reactionName = reaction.name;
        }
      }

      // Update session with video result
      return this.update(sessionId, {
        generatedVideoUrl: resultData.video.url,
        stage: 'complete',
        name: `Reaction: ${reactionName}`,
        pendingJob: null, // Clear pending job
      });
    }

    // For image jobs (if we add async image generation later)
    return session;
  }

  /**
   * List completed sessions for gallery (only videos)
   * If userId is provided, only return sessions for that user
   */
  async listCompleted(
    page: number = 1,
    limit: number = 20,
    userId?: string
  ): Promise<{
    sessions: Array<UGCReactionListItem & { thumbnailUrl?: string; videoUrl?: string }>;
    total: number;
    pages: number;
  }> {
    const skip = (page - 1) * limit;

    // Show completed videos and drafts with generated images (in-progress work)
    const query: Record<string, unknown> = {
      $or: [
        // Completed videos
        { stage: 'complete', generatedVideoUrl: { $exists: true, $ne: null } },
        // Drafts with generated images (user can resume)
        {
          stage: { $in: ['select-image', 'image-selected'] },
          generatedImages: { $exists: true, $ne: [] },
        },
      ],
    };
    if (userId) {
      query.userId = userId;
    }

    const [sessions, total] = await Promise.all([
      UGCReactionSession.find(query)
        .select(
          'sessionId userId name stage createdAt updatedAt generatedImages generatedVideoUrl selectedImageUrl selectedReactionId'
        )
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      UGCReactionSession.countDocuments(query),
    ]);

    return {
      sessions: sessions.map((s) => ({
        sessionId: s.sessionId,
        userId: s.userId,
        name: s.name,
        stage: s.stage,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        // Use selected image as thumbnail
        thumbnailUrl: s.selectedImageUrl || s.generatedImages?.[0]?.imageUrl,
        videoUrl: s.generatedVideoUrl,
      })),
      total,
      pages: Math.ceil(total / limit),
    };
  }
}

export const ugcReactionService = new UGCReactionService();
