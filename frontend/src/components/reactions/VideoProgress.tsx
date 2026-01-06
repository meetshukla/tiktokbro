'use client';

import { Loader2 } from 'lucide-react';

interface VideoProgressProps {
  title: string;
  description: string;
  estimatedTime: string;
}

export function VideoProgress({ title, description, estimatedTime }: VideoProgressProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] py-12">
      {/* Animated loader */}
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full border-4 border-muted flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
        {/* Pulsing ring */}
        <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-ping" />
      </div>

      {/* Text content */}
      <div className="text-center space-y-2 max-w-md">
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
        <p className="text-sm text-muted-foreground/70 mt-4">
          Estimated time: <span className="font-medium">{estimatedTime}</span>
        </p>
      </div>

      {/* Progress indicator dots */}
      <div className="flex gap-2 mt-8">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>

      {/* Info box */}
      <div className="mt-8 p-4 bg-muted/50 rounded-lg max-w-md text-center">
        <p className="text-sm text-muted-foreground">
          Please don't close this page. AI generation is happening on our servers. You'll be
          automatically redirected when complete.
        </p>
      </div>
    </div>
  );
}
