'use client';

import { Video, Sparkles } from 'lucide-react';

export default function AvatarPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-muted/30">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-6">
          <Video className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          AI Avatar Coming Soon
        </h1>
        <p className="text-muted-foreground mb-6">
          Create AI-powered video avatars for your content. This feature is
          currently under development.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <Sparkles className="w-4 h-4" />
          In Development
        </div>
      </div>
    </div>
  );
}
