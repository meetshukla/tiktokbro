'use client';

import { useState } from 'react';
import { useSlideshowContext } from '@/context/SlideshowContext';
import { SlidePlanReview } from './SlidePlanReview';
import { SlideCard } from './SlideCard';
import { SlideEditor } from './SlideEditor';
import { DownloadPanel } from './DownloadPanel';
import { Button } from '@/components/ui/button';
import { Loader2, ImageIcon, ArrowRight, RotateCcw, Sparkles } from 'lucide-react';

export function PreviewPanel() {
  const { session, reset, setStage } = useSlideshowContext();
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);

  // Empty state
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-6">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Create Your First Slideshow
          </h3>
          <p className="text-sm text-muted-foreground">
            Enter a prompt on the left to generate AI-powered slides for your
            TikTok content
          </p>
        </div>
      </div>
    );
  }

  // Planning state
  if (session.stage === 'planning') {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
            <Sparkles className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Creating Your Plan
          </h3>
          <p className="text-sm text-muted-foreground">
            AI is designing slide ideas based on your prompt...
          </p>
          <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto mt-4" />
        </div>
      </div>
    );
  }

  // Review state
  if (session.stage === 'review') {
    return <SlidePlanReview />;
  }

  // Generating state
  if (session.stage === 'generating') {
    const completed = session.slides.filter((s) => s.status === 'complete').length;
    const total = session.slides.length;
    const percentage = Math.round((completed / total) * 100);

    return (
      <div className="flex flex-col h-full p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-foreground">
              Generating Images
            </h2>
            <span className="text-sm font-medium text-primary">
              {percentage}%
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {completed} of {total} slides complete
          </p>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <div className="flex-1 grid grid-cols-3 gap-4 overflow-y-auto">
          {session.slides.map((slide) => (
            <SlideCard key={slide.id} slide={slide} />
          ))}
        </div>
      </div>
    );
  }

  // Editing state
  if (session.stage === 'editing') {
    const selectedSlide = session.slides.find((s) => s.id === selectedSlideId);

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-card">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Edit Slides</h2>
            <p className="text-sm text-muted-foreground">
              Click a slide to add text overlays
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Start Over
            </Button>
            <Button
              size="sm"
              onClick={() => setStage('complete')}
            >
              Done Editing
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Slide thumbnails */}
        <div className="flex gap-3 px-6 py-4 border-b bg-card overflow-x-auto">
          {session.slides.map((slide) => (
            <div
              key={slide.id}
              className="shrink-0 w-20"
              onClick={() => setSelectedSlideId(slide.id)}
            >
              <SlideCard slide={slide} isSelected={slide.id === selectedSlideId} />
            </div>
          ))}
        </div>

        {/* Editor area */}
        <div className="flex-1 overflow-hidden">
          {selectedSlide ? (
            <SlideEditor slide={selectedSlide} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">Select a slide above to edit</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Complete state
  if (session.stage === 'complete') {
    return <DownloadPanel />;
  }

  return null;
}
