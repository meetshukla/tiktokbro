'use client';

import { useEffect } from 'react';
import { ReactionProvider, useReactionContext } from '@/context/ReactionContext';
import { AvatarUpload } from '@/components/reactions/AvatarUpload';
import { ReactionLibrary } from '@/components/reactions/ReactionLibrary';
import { ImageSelector } from '@/components/reactions/ImageSelector';
import { VideoProgress } from '@/components/reactions/VideoProgress';
import { VideoPreview } from '@/components/reactions/VideoPreview';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function ReactionCreatorContent() {
  const { state, initSession, loadReactions, loadCategories, reset, clearError } =
    useReactionContext();
  const { session, isLoading, loadingMessage, error } = state;

  useEffect(() => {
    // Initialize session and load reactions on mount
    const init = async () => {
      await Promise.all([initSession(), loadReactions(), loadCategories()]);
    };
    init();
  }, [initSession, loadReactions, loadCategories]);

  const renderStage = () => {
    if (!session) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center text-muted-foreground">
            <p>Initializing session...</p>
          </div>
        </div>
      );
    }

    switch (session.stage) {
      case 'upload':
        return <AvatarUpload />;
      case 'select':
        return <ReactionLibrary />;
      case 'generating-images':
        return (
          <VideoProgress
            title="Generating Avatar Images"
            description="Using Nano Banana Pro to create matched images..."
            estimatedTime="30-60 seconds"
          />
        );
      case 'select-image':
        return <ImageSelector />;
      case 'generating-video':
        return (
          <VideoProgress
            title="Generating Reaction Video"
            description="Using Kling 2.6 to transfer motion..."
            estimatedTime="2-5 minutes"
          />
        );
      case 'complete':
        return <VideoPreview />;
      case 'error':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <Alert variant="destructive" className="max-w-md">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{session.error || 'An unexpected error occurred'}</AlertDescription>
            </Alert>
            <Button onClick={reset} variant="outline">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Start Over
            </Button>
          </div>
        );
      default:
        return <AvatarUpload />;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">UGC Reaction Creator</h1>
        <p className="text-muted-foreground mt-2">
          Create personalized reaction videos with your avatar
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={clearError}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {session?.stage === 'upload' && 'Step 1: Upload Your Avatar'}
                {session?.stage === 'select' && 'Step 2: Choose a Reaction'}
                {session?.stage === 'generating-images' && 'Step 3: Generating Images'}
                {session?.stage === 'select-image' && 'Step 4: Select Your Image'}
                {session?.stage === 'generating-video' && 'Step 5: Creating Video'}
                {session?.stage === 'complete' && 'Complete! 🎉'}
                {session?.stage === 'error' && 'Error'}
              </CardTitle>
              <CardDescription>
                {session?.stage === 'upload' &&
                  'Upload a portrait photo of the person you want to create a reaction video for'}
                {session?.stage === 'select' && 'Browse and select a reaction from our library'}
                {session?.stage === 'generating-images' &&
                  'AI is generating your avatar in the reaction scene'}
                {session?.stage === 'select-image' &&
                  'Choose the best generated image for your video'}
                {session?.stage === 'generating-video' &&
                  'Creating your personalized reaction video'}
                {session?.stage === 'complete' && 'Your reaction video is ready to download'}
                {session?.stage === 'error' && 'Something went wrong'}
              </CardDescription>
            </div>
            {session &&
              session.stage !== 'upload' &&
              session.stage !== 'generating-images' &&
              session.stage !== 'generating-video' && (
                <Button variant="outline" size="sm" onClick={reset}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Start Over
                </Button>
              )}
          </div>
        </CardHeader>
        <CardContent>{renderStage()}</CardContent>
      </Card>
    </div>
  );
}

export default function ReactionsPage() {
  return (
    <ReactionProvider>
      <ReactionCreatorContent />
    </ReactionProvider>
  );
}
