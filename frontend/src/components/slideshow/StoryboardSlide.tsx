'use client';

import Image from 'next/image';
import { GeneratedSlide } from '@/types';
import { Loader2, AlertCircle, RefreshCw, Check } from 'lucide-react';
import { useSlideshowGenerator } from '@/hooks/useSlideshowGenerator';
import { cn } from '@/lib/utils';

interface StoryboardSlideProps {
  slide: GeneratedSlide;
  isSelected: boolean;
  onClick: () => void;
}

export function StoryboardSlide({ slide, isSelected, onClick }: StoryboardSlideProps) {
  const { regenerateSlide } = useSlideshowGenerator();

  const getImageSrc = () => {
    if (slide.editedImageData) return slide.editedImageData;
    if (slide.imageData) return `data:image/png;base64,${slide.imageData}`;
    return null;
  };

  const imageSrc = getImageSrc();

  return (
    <div
      className={cn(
        'relative shrink-0 cursor-pointer transition-all duration-200',
        'rounded-xl overflow-hidden',
        'hover:scale-105 hover:shadow-lg',
        isSelected
          ? 'ring-2 ring-primary ring-offset-2 scale-105 shadow-lg'
          : 'ring-1 ring-border'
      )}
      onClick={onClick}
    >
      {/* Slide Number Badge */}
      <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-black/60 text-white text-xs font-medium flex items-center justify-center">
        {slide.slideNumber}
      </div>

      {/* Status Indicator */}
      {slide.status === 'complete' && slide.editedImageData && (
        <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
          <Check className="w-3 h-3" />
        </div>
      )}

      {/* Slide Content */}
      <div className="w-24 h-[170px] bg-muted">
        {slide.status === 'pending' && (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
            <div className="w-8 h-8 rounded-lg border-2 border-dashed border-muted-foreground/50 flex items-center justify-center mb-2">
              <span className="text-xs">{slide.slideNumber}</span>
            </div>
            <span className="text-[10px]">Pending</span>
          </div>
        )}

        {slide.status === 'generating' && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-primary/5">
            <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
            <span className="text-[10px] text-primary">Creating...</span>
          </div>
        )}

        {slide.status === 'error' && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-red-50">
            <AlertCircle className="h-5 w-5 text-red-500 mb-1" />
            <span className="text-[10px] text-red-500 mb-2">Failed</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                regenerateSlide(slide.id);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded bg-white border border-red-200 text-[10px] text-red-600 hover:bg-red-50"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        )}

        {slide.status === 'complete' && imageSrc && (
          <div className="relative w-full h-full">
            <Image
              src={imageSrc}
              alt={`Slide ${slide.slideNumber}`}
              fill
              className="object-cover"
            />
            {/* Overlay Text Preview */}
            {slide.plan.suggestedOverlay && (
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-linear-to-t from-black/60 to-transparent">
                <p className="text-[9px] text-white font-medium line-clamp-2 text-center">
                  {slide.plan.suggestedOverlay}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
