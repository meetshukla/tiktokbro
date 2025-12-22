'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useSlideshowGenerator } from '@/hooks/useSlideshowGenerator';
import { ImageConfig } from '@/types';
import { Loader2, Download, Sparkles, Copy, Lightbulb } from 'lucide-react';

interface PromptPanelProps {
  sessionId?: string;
}

export function PromptPanel({ sessionId }: PromptPanelProps) {
  const { session, isLoading, importFromTikTok } = useSlideshowGenerator();
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [remixMode, setRemixMode] = useState(true); // Default to remix mode
  const [userGuidance, setUserGuidance] = useState('');
  const [config] = useState<ImageConfig>({
    aspectRatio: '9:16',
    model: 'imagen-4.0-generate-001',
    slideCount: 5,
  });

  const handleImport = () => {
    if (!tiktokUrl.trim()) return;
    importFromTikTok(tiktokUrl, config, remixMode, userGuidance.trim() || undefined);
  };

  const isDisabled =
    isLoading || (session?.stage && !['prompt', 'importing', 'analyzing'].includes(session.stage));

  // TikTok URL input
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b">
        <h1 className="text-lg font-semibold text-foreground">Import TikTok</h1>
        <p className="text-sm text-muted-foreground mt-1">Import a Photo Mode slideshow to remix</p>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* TikTok URL Input */}
        <div className="space-y-3">
          <Label htmlFor="tiktokUrl" className="text-sm font-medium text-foreground">
            TikTok Photo Mode URL
          </Label>
          <Input
            id="tiktokUrl"
            placeholder="https://www.tiktok.com/@user/photo/1234567890"
            value={tiktokUrl}
            onChange={(e) => setTiktokUrl(e.target.value)}
            disabled={isDisabled}
          />
          <p className="text-xs text-muted-foreground">Paste a TikTok Photo Mode slideshow URL</p>
        </div>

        {/* Mode Toggle */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-foreground">Import Mode</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRemixMode(false)}
              disabled={isDisabled}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                !remixMode
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Copy className="size-4" />
                <span className="font-medium text-sm">Copy</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Keep original text exactly as-is. Good for templates.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setRemixMode(true)}
              disabled={isDisabled}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                remixMode
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="size-4" />
                <span className="font-medium text-sm">Remix</span>
              </div>
              <p className="text-xs text-muted-foreground">
                AI rewrites for your product. Subtle marketing.
              </p>
            </button>
          </div>
        </div>

        {/* AI Guidance Box - Only shown in remix mode */}
        {remixMode && (
          <div className="space-y-3">
            <Label
              htmlFor="userGuidance"
              className="text-sm font-medium text-foreground flex items-center gap-2"
            >
              <Lightbulb className="size-4 text-amber-500" />
              Guide the AI (optional)
            </Label>
            <Textarea
              id="userGuidance"
              placeholder="e.g., Make it more casual and fun, focus on skincare benefits, target young professionals, use humor..."
              value={userGuidance}
              onChange={(e) => setUserGuidance(e.target.value)}
              disabled={isDisabled}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Tell the AI what direction, tone, or style you want for the remix
            </p>
          </div>
        )}

        {/* What happens */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <p className="text-sm font-medium">How it works:</p>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>We scrape the slideshow images</li>
            <li>AI analyzes each slide&apos;s style and content</li>
            {remixMode ? (
              <li>AI rewrites text to subtly promote your product</li>
            ) : (
              <li>Original text is preserved exactly</li>
            )}
            <li>We auto-search Pinterest for similar images</li>
            <li>You pick images and edit text</li>
          </ol>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t">
        <Button
          onClick={handleImport}
          disabled={!tiktokUrl.trim() || !tiktokUrl.includes('tiktok.com') || isDisabled}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {remixMode ? 'Importing & Remixing...' : 'Importing...'}
            </>
          ) : (
            <>
              {remixMode ? (
                <Sparkles className="mr-2 h-4 w-4" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {remixMode ? 'Import & Remix' : 'Import Slideshow'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
