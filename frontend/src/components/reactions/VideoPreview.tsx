'use client';

import { useReactionContext } from '@/context/ReactionContext';
import { Button } from '@/components/ui/button';
import { Download, RefreshCcw, Share2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export function VideoPreview() {
  const { state, reset } = useReactionContext();
  const { session } = state;
  const videoUrl = session?.generatedVideoUrl;

  const handleDownload = async () => {
    if (!videoUrl) return;

    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ugc-reaction-${session?.sessionId || 'video'}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Video downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download video');
      console.error('Download error:', error);
    }
  };

  const handleShare = async () => {
    if (!videoUrl) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'My UGC Reaction Video',
          url: videoUrl,
        });
      } else {
        await navigator.clipboard.writeText(videoUrl);
        toast.success('Video URL copied to clipboard!');
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        toast.error('Failed to share video');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Success message */}
      <div className="flex items-center justify-center gap-2 text-green-600 mb-4">
        <CheckCircle className="w-6 h-6" />
        <span className="font-medium">Your reaction video is ready!</span>
      </div>

      {/* Video player */}
      <div className="max-w-md mx-auto">
        <div className="aspect-[9/16] relative rounded-xl overflow-hidden bg-black shadow-2xl">
          {videoUrl ? (
            <video
              src={videoUrl}
              controls
              autoPlay
              loop
              className="absolute inset-0 w-full h-full object-contain"
              playsInline
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/50">
              Video not available
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <Button onClick={handleDownload} size="lg" className="min-w-[160px]">
          <Download className="w-4 h-4 mr-2" />
          Download Video
        </Button>

        <Button onClick={handleShare} variant="outline" size="lg" className="min-w-[160px]">
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      </div>

      {/* Create another */}
      <div className="flex justify-center pt-4 border-t">
        <Button variant="ghost" onClick={reset}>
          <RefreshCcw className="w-4 h-4 mr-2" />
          Create Another Reaction
        </Button>
      </div>

      {/* Tips */}
      <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
        <h4 className="font-medium text-foreground mb-2">What's next?</h4>
        <ul className="space-y-1">
          <li>• Download and post directly to YouTube Shorts, Instagram Reels, or TikTok</li>
          <li>• Add your own captions or text overlays in your editing app</li>
          <li>• Create variations with different reactions from our library</li>
        </ul>
      </div>
    </div>
  );
}
