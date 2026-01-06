'use client';

import { useReactionContext } from '@/context/ReactionContext';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check, RotateCcw } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function ImageSelector() {
  const { state, selectImage, generateVideo, generateImages } = useReactionContext();
  const { session, selectedReaction, isLoading } = state;
  const generatedImages = session?.generatedImages || [];

  const handleSelectImage = async (imageId: string) => {
    await selectImage(imageId);
  };

  const handleContinue = async () => {
    await generateVideo();
  };

  const handleRegenerate = async () => {
    await generateImages();
  };

  // Helper to get full image URL
  const getImageUrl = (url: string) => {
    if (url.startsWith('/')) {
      return `${API_URL}${url}`;
    }
    return url;
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <p className="text-muted-foreground">
          Select the best image that matches your avatar. This will be used to generate your
          reaction video.
        </p>
      </div>

      {/* Original First Frame Reference */}
      {selectedReaction && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            Original Reaction First Frame
          </h4>
          <div className="w-32 h-32 relative rounded-lg overflow-hidden border bg-muted mx-auto sm:mx-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getImageUrl(selectedReaction.firstFrameUrl)}
              alt="Original first frame"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Generated Images Grid */}
      <div>
        <h4 className="text-sm font-medium mb-3">Generated Avatar Images</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {generatedImages.map((image, index) => (
            <div
              key={image.id}
              className={`
                relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200
                ${
                  image.selected
                    ? 'border-primary ring-2 ring-primary/20 shadow-lg'
                    : 'border-muted hover:border-primary/50'
                }
              `}
              onClick={() => handleSelectImage(image.id)}
            >
              <div className="aspect-[9/16] relative bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getImageUrl(image.imageUrl)}
                  alt={`Generated option ${index + 1}`}
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Selected indicator */}
                {image.selected && (
                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                    <Check className="w-5 h-5 text-primary-foreground" />
                  </div>
                )}

                {/* Option number */}
                <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-black/60 text-white text-sm font-medium">
                  Option {index + 1}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t">
        <Button variant="outline" onClick={handleRegenerate} disabled={isLoading}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Regenerate Images
        </Button>

        <Button
          onClick={handleContinue}
          disabled={!session?.selectedImageUrl || isLoading}
          size="lg"
        >
          Generate Video
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Help text */}
      <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
        <p>
          <strong>Tip:</strong> Choose the image that best matches your avatar's appearance and is
          positioned naturally in the scene. If none look right, try regenerating for new options.
        </p>
      </div>
    </div>
  );
}
