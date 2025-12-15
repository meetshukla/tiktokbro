'use client';

import { useState, useEffect } from 'react';
import { useSlideshowContext } from '@/context/SlideshowContext';
import { useSlideshowGenerator } from '@/hooks/useSlideshowGenerator';
import { PlanReview } from './PlanReview';
import { RemixPlanReview } from './RemixPlanReview';
import { PromptPanel } from './PromptPanel';
import { Wand2, Check } from 'lucide-react';

export function Storyboard() {
  const { session, reset } = useSlideshowContext();
  const { isLoading } = useSlideshowGenerator();

  const isReviewStage = session?.stage === 'review';
  const isRemixReviewStage = session?.stage === 'remix-review';
  const isCompleteStage = session?.stage === 'complete';
  const isPromptStage = !session || session.stage === 'prompt' || session.stage === 'planning' || session.stage === 'importing' || session.stage === 'analyzing';

  return (
    <div className="flex flex-col h-full">
      {/* Main Content */}
      {isPromptStage ? (
        <div className="flex h-full">
          <div className="w-[400px] border-r">
            <PromptPanel />
          </div>
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
                <Wand2 className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                Import from TikTok
              </h2>
              <p className="text-muted-foreground">
                Import a TikTok Photo Mode slideshow and remix it with similar images from Pinterest
              </p>
            </div>
          </div>
        </div>
      ) : isRemixReviewStage ? (
        <RemixPlanReview />
      ) : isReviewStage ? (
        <PlanReview />
      ) : isCompleteStage ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/10 mb-4">
              <Check className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Download Complete!
            </h2>
            <p className="text-muted-foreground mb-4">
              Your slides have been downloaded. Check your downloads folder.
            </p>
            <button 
              onClick={reset}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Create Another
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
