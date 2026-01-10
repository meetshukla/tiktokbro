'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useReactionContext } from '@/context/ReactionContext';
import { useMultiJobPolling, ActiveJob } from '@/hooks/useJobPolling';
import { TaskQueue } from '@/components/reactions/TaskQueue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Search,
  Play,
  Clock,
  Check,
  Upload,
  X,
  User,
  Sparkles,
  Download,
  Share2,
  RefreshCcw,
  Loader2,
  Video,
  Grid3X3,
  Trash2,
  ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import * as api from '@/lib/api-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Reaction type from context
interface ReactionTemplate {
  reactionId: string;
  name: string;
  description?: string;
  category?: string;
  firstFrameUrl: string;
  videoUrl?: string;
}

interface GalleryItem {
  sessionId: string;
  name: string;
  stage: string;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl?: string;
  videoUrl?: string;
}

export function ReactionWorkspace() {
  const {
    state,
    setAvatarFile,
    clearAvatar,
    selectCategory,
    selectReaction,
    generateImages,
    selectImage,
    reset,
    loadSession,
  } = useReactionContext();

  const {
    reactions,
    categories,
    selectedCategory,
    session,
    avatarFile,
    avatarPreviewUrl,
    selectedReaction,
    isLoading,
  } = state;

  // Modal state for reaction preview
  const [previewReaction, setPreviewReaction] = useState<ReactionTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state for gallery video preview
  const [previewGalleryItem, setPreviewGalleryItem] = useState<GalleryItem | null>(null);

  // Gallery state
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);

  // Multi-job polling
  const { jobs, addJob, removeJob } = useMultiJobPolling({
    interval: 3000,
    onComplete: async (sessionId) => {
      toast.success('Video generation complete!');
      try {
        await api.fetchJobResult(sessionId);
        loadGallery(); // Refresh gallery when job completes
      } catch (e) {
        console.error('Failed to fetch job result:', e);
      }
    },
    onError: (_sessionId, error) => {
      toast.error(`Job failed: ${error}`);
    },
  });

  // Derived state
  const hasAvatar = !!avatarFile || !!avatarPreviewUrl;
  const hasReaction = !!selectedReaction;
  const isGeneratingImages = session?.stage === 'generating-images';
  const isGeneratingVideo = session?.stage === 'generating-video';
  const hasGeneratedImages = (session?.generatedImages?.length ?? 0) > 0;
  const hasSelectedImage = !!session?.selectedImageUrl;
  const isComplete = session?.stage === 'complete';
  const canGenerate = hasAvatar && hasReaction && !isGeneratingImages && !isGeneratingVideo;

  // RIGHT PANEL: Show gallery if nothing is active, show workflow if something is active
  const showGallery = !hasAvatar && !hasReaction && !hasGeneratedImages && !isComplete;

  // Load gallery items
  const loadGallery = useCallback(async () => {
    setIsLoadingGallery(true);
    try {
      const response = await api.getGallerySessions();
      if (response.success && response.sessions) {
        setGalleryItems(response.sessions);
      }
    } catch (e) {
      console.error('Failed to load gallery:', e);
    } finally {
      setIsLoadingGallery(false);
    }
  }, []);

  // Load gallery on mount
  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  // Filter reactions
  const filteredReactions = useMemo(() => {
    let filtered = reactions;
    if (selectedCategory) {
      filtered = filtered.filter((r) => r.category === selectedCategory);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) => r.name.toLowerCase().includes(query) || r.description?.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [reactions, selectedCategory, searchQuery]);

  // Dropzone setup
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        setAvatarFile(acceptedFiles[0]);
      }
    },
    [setAvatarFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  // Click reaction thumbnail → open modal preview
  const handleReactionClick = (reaction: ReactionTemplate) => {
    setPreviewReaction(reaction);
  };

  // Select reaction from modal
  const handleConfirmReaction = async () => {
    if (!previewReaction) return;
    await selectReaction(previewReaction.reactionId);
    setPreviewReaction(null);
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    await generateImages();
  };

  const handleSelectImage = async (imageId: string) => {
    await selectImage(imageId);
  };

  const handleGenerateVideo = async () => {
    if (!hasSelectedImage || !session) return;

    try {
      const response = await api.submitVideoGeneration(session.sessionId);
      if (response.success && response.data) {
        addJob({
          id: response.data.falRequestId,
          sessionId: session.sessionId,
          type: 'video',
          reactionName: selectedReaction?.name,
          avatarPreview: avatarPreviewUrl || session.avatarImageUrl,
        });
        toast.success('Video generation started!');
      } else {
        toast.error(response.error || 'Failed to start video generation');
      }
    } catch (_e) {
      toast.error('Failed to submit video generation');
    }
  };

  const handleJobClick = async (job: ActiveJob) => {
    if (job.status === 'complete') {
      // Load session data and show in gallery modal
      try {
        const response = await api.getUGCReactionSession(job.sessionId);
        if (response.success && response.data) {
          setPreviewGalleryItem({
            sessionId: response.data.sessionId,
            name: job.reactionName || 'Untitled',
            stage: response.data.stage,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            thumbnailUrl: response.data.selectedImageUrl,
            videoUrl: response.data.generatedVideoUrl,
          });
        }
      } catch (e) {
        console.error('Failed to load session:', e);
      }
    }
  };

  // Handle gallery item click - open modal for completed, load session for drafts
  const handleViewGalleryItem = async (item: GalleryItem) => {
    if (item.stage === 'complete') {
      // Completed video - show in modal
      setPreviewGalleryItem(item);
    } else {
      // Draft - allow resuming
      await loadSession(item.sessionId);
    }
  };

  const handleDeleteGalleryItem = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!confirm('Delete this reaction? This cannot be undone.')) return;

    try {
      const response = await api.deleteUGCReactionSession(sessionId);
      if (response.success) {
        toast.success('Deleted');
        loadGallery();
      } else {
        toast.error(response.error || 'Failed to delete');
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleDownload = async (videoUrl?: string) => {
    const url = videoUrl || session?.generatedVideoUrl;
    if (!url) return;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `ugc-reaction-${session?.sessionId || 'video'}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success('Video downloaded!');
    } catch {
      toast.error('Failed to download video');
    }
  };

  const handleShare = async (videoUrl?: string) => {
    const url = videoUrl || session?.generatedVideoUrl;
    if (!url) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'My UGC Reaction Video', url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('URL copied to clipboard!');
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        toast.error('Failed to share video');
      }
    }
  };

  // Reset everything and go back to gallery
  const handleViewHistory = async () => {
    await reset();
    loadGallery();
  };

  const handleStartNew = async () => {
    await reset();
  };

  const getImageUrl = (url: string) => (url.startsWith('/') ? `${API_URL}${url}` : url);

  // Job counts
  const activeJobs = jobs.filter((j) => j.status === 'queued' || j.status === 'in_progress');
  const recentJobs = jobs.slice(0, 5);

  return (
    <>
      <div className="h-full flex overflow-hidden">
        {/* ==================== LEFT PANEL (45%) ==================== */}
        <div className="w-[45%] shrink-0 border-r border-border flex flex-col bg-card">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {/* Task Queue */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  Task Queue
                  {activeJobs.length > 0 && (
                    <Badge className="text-[10px] px-1.5 py-0 ml-auto bg-blue-500 text-white border-0">
                      {activeJobs.length} active
                    </Badge>
                  )}
                </h3>
                <TaskQueue jobs={recentJobs} onJobClick={handleJobClick} onRemoveJob={removeJob} />
              </section>

              {/* Source Avatar */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <User className="w-3.5 h-3.5" />
                    Source Avatar
                  </h3>
                  {(avatarFile || session?.avatarImageUrl) &&
                    !isGeneratingImages &&
                    !isGeneratingVideo && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                        onClick={clearAvatar}
                      >
                        <X className="w-3 h-3 mr-1" />
                        Clear
                      </Button>
                    )}
                </div>

                {!avatarFile && !session?.avatarImageUrl ? (
                  <div
                    {...getRootProps()}
                    className={`
                      relative h-28 rounded-xl border-2 border-dashed cursor-pointer
                      flex items-center justify-center gap-4 transition-all
                      ${isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50'}
                    `}
                  >
                    <input {...getInputProps()} />
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-medium">
                        {isDragActive ? 'Drop here' : 'Upload portrait'}
                      </span>
                      <p className="text-xs text-muted-foreground">JPG, PNG up to 10MB</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-green-500/50 bg-green-500/5">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-green-500 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          avatarPreviewUrl ||
                          (session?.avatarImageUrl ? getImageUrl(session.avatarImageUrl) : '')
                        }
                        alt="Your avatar"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Badge className="bg-green-500 text-white border-0 text-xs px-2 py-0.5">
                        <Check className="w-3 h-3 mr-1" />
                        Selected
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {avatarFile?.name || 'Uploaded image'}
                      </p>
                    </div>
                  </div>
                )}
              </section>

              {/* Reaction Library */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Play className="w-3.5 h-3.5" />
                  Reaction Library
                  {selectedReaction && (
                    <Badge variant="secondary" className="text-xs px-2 py-0.5 ml-auto">
                      {selectedReaction.name}
                    </Badge>
                  )}
                </h3>

                {/* Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 pl-9 text-sm"
                  />
                </div>

                {/* Categories */}
                {categories.length > 0 && (
                  <Tabs
                    value={selectedCategory || 'all'}
                    onValueChange={(v) => selectCategory(v === 'all' ? null : v)}
                    className="mb-3"
                  >
                    <TabsList className="h-8 w-full grid grid-cols-3">
                      <TabsTrigger value="all" className="text-xs">
                        All
                      </TabsTrigger>
                      {categories.slice(0, 2).map((cat) => (
                        <TabsTrigger key={cat} value={cat} className="text-xs capitalize">
                          {cat}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                )}

                {/* Reaction Grid - Click to preview */}
                <div className="grid grid-cols-4 gap-3">
                  {filteredReactions.map((reaction) => {
                    const isSelected = selectedReaction?.reactionId === reaction.reactionId;
                    return (
                      <div
                        key={reaction.reactionId}
                        className={`
                          relative cursor-pointer rounded-xl overflow-hidden transition-all group
                          ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'hover:ring-2 hover:ring-primary/50'}
                          ${isGeneratingImages || isGeneratingVideo ? 'pointer-events-none opacity-50' : ''}
                        `}
                        onClick={() => handleReactionClick(reaction)}
                      >
                        <div className="aspect-[9/16] relative bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`${API_URL}${reaction.firstFrameUrl}`}
                            alt={reaction.name}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          {/* Play icon overlay */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Play className="w-8 h-8 text-white fill-white" />
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
                              <Check className="w-4 h-4 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-center py-1.5 truncate px-2 font-medium">
                          {reaction.name}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </ScrollArea>
        </div>

        {/* ==================== RIGHT PANEL (55%) ==================== */}
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          {/* Header */}
          <div className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0">
            <h2 className="text-lg font-semibold">
              {showGallery
                ? 'Your Creations'
                : isComplete
                  ? 'Your Video'
                  : hasGeneratedImages
                    ? 'Select Starting Frame'
                    : 'Create Reaction'}
            </h2>
            {!showGallery && (
              <Button variant="outline" size="sm" onClick={handleViewHistory}>
                <Grid3X3 className="w-4 h-4 mr-2" />
                View History
              </Button>
            )}
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-6">
              {/* ==================== GALLERY VIEW (Default when nothing selected) ==================== */}
              {showGallery && (
                <div>
                  {isLoadingGallery ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : galleryItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                      <Grid3X3 className="w-12 h-12 mb-4 opacity-30" />
                      <p className="text-lg font-medium">No creations yet</p>
                      <p className="text-sm mt-1">
                        Upload an avatar and select a reaction to get started
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {galleryItems.map((item) => (
                        <div
                          key={item.sessionId}
                          className="group relative cursor-pointer rounded-xl overflow-hidden border border-border hover:border-primary/50 hover:shadow-lg transition-all"
                          onClick={() => handleViewGalleryItem(item)}
                        >
                          <div className="aspect-[9/16] relative bg-muted">
                            {item.thumbnailUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={getImageUrl(item.thumbnailUrl)}
                                alt={item.name}
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                {item.stage === 'complete' ? (
                                  <Video className="w-10 h-10 text-muted-foreground/40" />
                                ) : (
                                  <ImageIcon className="w-10 h-10 text-muted-foreground/40" />
                                )}
                              </div>
                            )}
                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              {item.stage === 'complete' ? (
                                <Play className="w-8 h-8 text-white" />
                              ) : (
                                <RefreshCcw className="w-8 h-8 text-white" />
                              )}
                            </div>
                            {/* Delete button */}
                            <button
                              onClick={(e) => handleDeleteGalleryItem(e, item.sessionId)}
                              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 hover:bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-white" />
                            </button>
                            {/* Badge */}
                            {item.stage === 'complete' ? (
                              <div className="absolute bottom-2 left-2">
                                <Badge className="bg-primary text-[10px] px-2 py-0.5">Video</Badge>
                              </div>
                            ) : (
                              <div className="absolute bottom-2 left-2">
                                <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                                  Draft
                                </Badge>
                              </div>
                            )}
                          </div>
                          <div className="p-2.5">
                            <p className="text-xs font-medium truncate">
                              {item.name || 'Untitled'}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ==================== CREATION WORKFLOW ==================== */}
              {!showGallery && (
                <>
                  {/* Reaction selected but no avatar */}
                  {hasReaction && !hasAvatar && !hasGeneratedImages && (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                      <User className="w-16 h-16 mb-4 opacity-20" />
                      <p className="text-lg font-medium">Upload Your Portrait</p>
                      <p className="text-sm mt-1">
                        Add a portrait photo to create your {selectedReaction?.name} reaction
                      </p>
                    </div>
                  )}

                  {/* Avatar uploaded but no reaction */}
                  {hasAvatar && !hasReaction && !hasGeneratedImages && (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                      <Play className="w-16 h-16 mb-4 opacity-20" />
                      <p className="text-lg font-medium">Select a Reaction</p>
                      <p className="text-sm mt-1">Choose a reaction template from the library</p>
                    </div>
                  )}

                  {/* Ready to generate */}
                  {hasReaction && hasAvatar && !hasGeneratedImages && (
                    <div className="max-w-lg mx-auto space-y-6">
                      {/* Preview card */}
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border">
                        <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-primary shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={avatarPreviewUrl || getImageUrl(session?.avatarImageUrl || '')}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-lg font-semibold">{selectedReaction?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Ready to generate preview frames
                          </p>
                        </div>
                      </div>

                      <Button
                        onClick={handleGenerate}
                        disabled={!canGenerate || isLoading}
                        size="lg"
                        className="w-full h-12"
                      >
                        {isGeneratingImages ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Generating... (30-60s)
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5 mr-2" />
                            Generate Preview Frames
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Generated images - select one */}
                  {hasGeneratedImages && !isComplete && (
                    <div className="max-w-2xl mx-auto space-y-6">
                      <p className="text-sm text-muted-foreground text-center">
                        Click on the variation that looks best
                      </p>

                      <div className="grid grid-cols-4 gap-4">
                        {session?.generatedImages?.map((img, idx) => {
                          const isSelected = img.selected;
                          return (
                            <div
                              key={img.id}
                              onClick={() => handleSelectImage(img.id)}
                              className={`
                                relative cursor-pointer rounded-xl overflow-hidden transition-all
                                ${isSelected ? 'ring-4 ring-primary ring-offset-2 ring-offset-background scale-[1.02]' : 'hover:ring-2 hover:ring-primary/50'}
                              `}
                            >
                              <div className="aspect-[9/16] relative bg-muted">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={getImageUrl(img.imageUrl)}
                                  alt={`Option ${idx + 1}`}
                                  className="absolute inset-0 w-full h-full object-cover"
                                />
                                {isSelected && (
                                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                                    <Check className="w-5 h-5 text-primary-foreground" />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex gap-3">
                        <Button
                          onClick={handleGenerate}
                          variant="outline"
                          disabled={isLoading}
                          className="flex-1"
                        >
                          <RefreshCcw className="w-4 h-4 mr-2" />
                          Regenerate
                        </Button>
                        <Button
                          onClick={handleGenerateVideo}
                          disabled={!hasSelectedImage || isLoading || isGeneratingVideo}
                          className="flex-1"
                        >
                          {isGeneratingVideo ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Queued...
                            </>
                          ) : (
                            <>
                              <Video className="w-4 h-4 mr-2" />
                              Generate Video
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Video result */}
                  {isComplete && session?.generatedVideoUrl && (
                    <div className="max-w-md mx-auto space-y-6">
                      <div className="aspect-[9/16] relative rounded-2xl overflow-hidden bg-black shadow-2xl">
                        <video
                          key={session.generatedVideoUrl}
                          src={session.generatedVideoUrl}
                          controls
                          autoPlay
                          loop
                          playsInline
                          className="absolute inset-0 w-full h-full object-contain"
                        />
                      </div>

                      <div className="flex gap-3">
                        <Button onClick={() => handleDownload()} size="lg" className="flex-1">
                          <Download className="w-5 h-5 mr-2" />
                          Download
                        </Button>
                        <Button
                          onClick={() => handleShare()}
                          variant="outline"
                          size="lg"
                          className="flex-1"
                        >
                          <Share2 className="w-5 h-5 mr-2" />
                          Share
                        </Button>
                      </div>

                      <Button onClick={handleStartNew} variant="ghost" className="w-full">
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        Create Another
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* ==================== REACTION PREVIEW MODAL ==================== */}
      <Dialog open={!!previewReaction} onOpenChange={(open) => !open && setPreviewReaction(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>{previewReaction?.name}</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            {/* Video preview */}
            <div className="aspect-[9/16] relative rounded-xl overflow-hidden bg-black mb-4">
              {previewReaction?.videoUrl ? (
                <video
                  key={previewReaction.videoUrl}
                  src={`${API_URL}${previewReaction.videoUrl}`}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-contain"
                />
              ) : previewReaction?.firstFrameUrl ? (
                /* Fallback to first frame if no video */
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`${API_URL}${previewReaction.firstFrameUrl}`}
                  alt={previewReaction.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : null}
            </div>

            {previewReaction?.description && (
              <p className="text-sm text-muted-foreground mb-4">{previewReaction.description}</p>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setPreviewReaction(null)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleConfirmReaction}>
                <Check className="w-4 h-4 mr-2" />
                Use This Reaction
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== GALLERY VIDEO PREVIEW MODAL ==================== */}
      <Dialog
        open={!!previewGalleryItem}
        onOpenChange={(open) => !open && setPreviewGalleryItem(null)}
      >
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>{previewGalleryItem?.name || 'Your Video'}</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            {/* Video preview */}
            <div className="aspect-[9/16] relative rounded-xl overflow-hidden bg-black mb-4">
              {previewGalleryItem?.videoUrl ? (
                <video
                  key={previewGalleryItem.videoUrl}
                  src={previewGalleryItem.videoUrl}
                  autoPlay
                  muted
                  loop
                  controls
                  playsInline
                  className="absolute inset-0 w-full h-full object-contain"
                />
              ) : previewGalleryItem?.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getImageUrl(previewGalleryItem.thumbnailUrl)}
                  alt={previewGalleryItem.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Video className="w-16 h-16 text-muted-foreground/40" />
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground mb-4">
              Created{' '}
              {previewGalleryItem
                ? new Date(previewGalleryItem.createdAt).toLocaleDateString()
                : ''}
            </p>

            <div className="flex gap-3">
              {previewGalleryItem?.videoUrl && (
                <>
                  <Button
                    className="flex-1"
                    onClick={() => handleDownload(previewGalleryItem.videoUrl)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleShare(previewGalleryItem.videoUrl)}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
