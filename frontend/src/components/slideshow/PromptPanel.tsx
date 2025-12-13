'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSlideshowGenerator } from '@/hooks/useSlideshowGenerator';
import { ImageConfig } from '@/types';
import { Loader2, Sparkles, Settings2 } from 'lucide-react';

export function PromptPanel() {
  const { session, isLoading, createPlan } = useSlideshowGenerator();
  const [prompt, setPrompt] = useState('');
  const [config, setConfig] = useState<ImageConfig>({
    aspectRatio: '9:16',
    model: 'imagen-4.0-generate-001',
    slideCount: 5,
  });

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    createPlan(prompt, config);
  };

  const isDisabled = isLoading || (session?.stage && session.stage !== 'prompt');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b">
        <h1 className="text-lg font-semibold text-foreground">New Slideshow</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Describe your viral content idea
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Prompt Input */}
        <div className="space-y-3">
          <Label htmlFor="prompt" className="text-sm font-medium text-foreground">
            Your Prompt
          </Label>
          <Textarea
            id="prompt"
            placeholder="Create a viral slideshow about morning routines that boost productivity, showing aesthetic lifestyle shots..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isDisabled}
            className="min-h-[140px] resize-none"
          />
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">Be specific for better results</p>
            <p className="text-xs text-muted-foreground">{prompt.length}/1000</p>
          </div>
        </div>

        {/* Configuration Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Settings2 className="w-4 h-4" />
            Configuration
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="slideCount" className="text-xs text-muted-foreground">
                Number of Slides
              </Label>
              <Select
                value={config.slideCount.toString()}
                onValueChange={(value) =>
                  setConfig({ ...config, slideCount: parseInt(value) })
                }
                disabled={isDisabled}
              >
                <SelectTrigger id="slideCount">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 slides</SelectItem>
                  <SelectItem value="4">4 slides</SelectItem>
                  <SelectItem value="5">5 slides</SelectItem>
                  <SelectItem value="6">6 slides</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="aspectRatio" className="text-xs text-muted-foreground">
                Aspect Ratio
              </Label>
              <Select
                value={config.aspectRatio}
                onValueChange={(value: '9:16' | '1:1' | '16:9') =>
                  setConfig({ ...config, aspectRatio: value })
                }
                disabled={isDisabled}
              >
                <SelectTrigger id="aspectRatio">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9:16">9:16 (TikTok)</SelectItem>
                  <SelectItem value="1:1">1:1 (Square)</SelectItem>
                  <SelectItem value="16:9">16:9 (Wide)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model" className="text-xs text-muted-foreground">
              AI Model
            </Label>
            <Select
              value={config.model}
              onValueChange={(value: ImageConfig['model']) =>
                setConfig({ ...config, model: value })
              }
              disabled={isDisabled}
            >
              <SelectTrigger id="model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="imagen-4.0-generate-001">
                  Imagen 4 (Quality)
                </SelectItem>
                <SelectItem value="imagen-4.0-fast-generate-001">
                  Imagen 4 Fast
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t">
        <Button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isDisabled}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Plan...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Slideshow
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
