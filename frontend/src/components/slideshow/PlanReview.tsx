'use client';

import { useState } from 'react';
import { useSlideshowContext } from '@/context/SlideshowContext';
import { useSlideshowGenerator } from '@/hooks/useSlideshowGenerator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Play,
  Loader2,
  Pencil,
  Image as ImageIcon,
  ChevronRight,
} from 'lucide-react';

export function PlanReview() {
  const { session, updatePlan } = useSlideshowContext();
  const { isLoading, generateImages } = useSlideshowGenerator();
  const [expandedSlide, setExpandedSlide] = useState<number | null>(1);

  if (!session?.plans?.length) return null;

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left - Plan List */}
      <div className="w-[400px] border-r bg-card overflow-y-auto">
        <div className="p-4 border-b">
          <p className="text-sm text-muted-foreground">
            Review and edit your slide plans before generating images
          </p>
        </div>

        <div className="divide-y">
          {session.plans.map((plan) => (
            <div
              key={plan.slideNumber}
              className={`cursor-pointer transition-colors ${
                expandedSlide === plan.slideNumber
                  ? 'bg-primary/5'
                  : 'hover:bg-muted'
              }`}
              onClick={() => setExpandedSlide(plan.slideNumber)}
            >
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${
                      expandedSlide === plan.slideNumber
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {plan.slideNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {plan.suggestedOverlay || `Slide ${plan.slideNumber}`}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {plan.imagePrompt.slice(0, 60)}...
                    </p>
                  </div>
                  <ChevronRight
                    className={`w-5 h-5 text-muted-foreground transition-transform ${
                      expandedSlide === plan.slideNumber ? 'rotate-90' : ''
                    }`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Generate Button */}
        <div className="p-4 border-t bg-muted/50">
          <Button
            onClick={generateImages}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Images...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Generate All Images
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Right - Edit Panel */}
      <div className="flex-1 bg-muted/30 overflow-y-auto">
        {expandedSlide ? (
          <div className="p-6 max-w-2xl mx-auto">
            {(() => {
              const plan = session.plans.find((p) => p.slideNumber === expandedSlide);
              if (!plan) return null;

              return (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-lg font-semibold">
                      {plan.slideNumber}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">
                        Slide {plan.slideNumber}
                      </h2>
                      <p className="text-sm text-muted-foreground">Edit the details below</p>
                    </div>
                  </div>

                  {/* Image Prompt */}
                  <div className="bg-card rounded-xl p-5 space-y-5 shadow-sm border">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-card-foreground">
                        <ImageIcon className="w-4 h-4" />
                        Image Prompt
                      </div>
                      <Textarea
                        value={plan.imagePrompt}
                        onChange={(e) =>
                          updatePlan(plan.slideNumber, { imagePrompt: e.target.value })
                        }
                        placeholder="Describe the image you want AI to generate..."
                        className="min-h-[120px] resize-none"
                      />
                      <p className="text-xs text-muted-foreground">
                        Be specific about style, lighting, composition, and mood
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-card-foreground">
                        <Pencil className="w-4 h-4" />
                        Text Overlay (Optional)
                      </div>
                      <Input
                        value={plan.suggestedOverlay || ''}
                        onChange={(e) =>
                          updatePlan(plan.slideNumber, { suggestedOverlay: e.target.value })
                        }
                        placeholder="Short text to display on the slide"
                      />
                    </div>
                  </div>

                  {/* Preview Card */}
                  <div className="bg-card rounded-xl p-5 shadow-sm border">
                    <h3 className="text-sm font-medium text-card-foreground mb-3">Preview</h3>
                    <div className="aspect-[9/16] max-w-[200px] mx-auto bg-muted rounded-lg flex items-center justify-center">
                      <div className="text-center p-4">
                        <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">
                          Image will be generated
                        </p>
                        {plan.suggestedOverlay && (
                          <p className="mt-4 text-sm font-medium text-muted-foreground">
                            &quot;{plan.suggestedOverlay}&quot;
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a slide to edit
          </div>
        )}
      </div>
    </div>
  );
}
