import { Reaction, IReaction } from '../models/reaction.model';

export interface ReactionData {
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
  duration: number;
  description?: string;
}

class ReactionService {
  /**
   * Get all reactions in the library
   */
  async list(): Promise<ReactionListItem[]> {
    const reactions = await Reaction.find()
      .select('reactionId name category firstFrameUrl duration description')
      .sort({ category: 1, name: 1 })
      .lean();

    return reactions.map((r) => ({
      reactionId: r.reactionId,
      name: r.name,
      category: r.category,
      firstFrameUrl: r.firstFrameUrl,
      duration: r.duration,
      description: r.description,
    }));
  }

  /**
   * Get reactions filtered by category
   */
  async getByCategory(category: string): Promise<ReactionListItem[]> {
    const reactions = await Reaction.find({ category })
      .select('reactionId name category firstFrameUrl duration description')
      .sort({ name: 1 })
      .lean();

    return reactions.map((r) => ({
      reactionId: r.reactionId,
      name: r.name,
      category: r.category,
      firstFrameUrl: r.firstFrameUrl,
      duration: r.duration,
      description: r.description,
    }));
  }

  /**
   * Get a single reaction by ID with full details
   */
  async getById(reactionId: string): Promise<IReaction | null> {
    return Reaction.findOne({ reactionId });
  }

  /**
   * Get all unique categories
   */
  async getCategories(): Promise<string[]> {
    const categories = await Reaction.distinct('category');
    return categories.sort();
  }

  /**
   * Create a new reaction (for seeding/admin)
   */
  async create(data: ReactionData): Promise<IReaction> {
    const reaction = new Reaction(data);
    return reaction.save();
  }

  /**
   * Update a reaction
   */
  async update(reactionId: string, data: Partial<ReactionData>): Promise<IReaction | null> {
    return Reaction.findOneAndUpdate({ reactionId }, { $set: data }, { new: true });
  }

  /**
   * Delete a reaction
   */
  async delete(reactionId: string): Promise<boolean> {
    const result = await Reaction.deleteOne({ reactionId });
    return result.deletedCount === 1;
  }

  /**
   * Seed reactions from a folder structure
   * Expects folder structure: reactions-library/{reaction-name}/
   *   - video.mp4
   *   - first-frame.jpg (also used as thumbnail)
   *   - metadata.json (optional)
   */
  async seedFromFolder(baseUrl: string, reactions: ReactionData[]): Promise<number> {
    let count = 0;
    for (const reaction of reactions) {
      const existing = await this.getById(reaction.reactionId);
      if (!existing) {
        await this.create(reaction);
        count++;
      }
    }
    return count;
  }
}

export const reactionService = new ReactionService();
