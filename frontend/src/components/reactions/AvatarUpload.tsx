'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useReactionContext } from '@/context/ReactionContext';
import { Button } from '@/components/ui/button';
import { Upload, X, ArrowRight, User } from 'lucide-react';
import Image from 'next/image';

export function AvatarUpload() {
  const { state, setAvatarFile, clearAvatar, uploadAvatar } = useReactionContext();
  const { avatarFile, avatarPreviewUrl, isLoading } = state;

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        setAvatarFile(acceptedFiles[0]);
      }
    },
    [setAvatarFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleContinue = async () => {
    await uploadAvatar();
  };

  return (
    <div className="space-y-6">
      {!avatarFile ? (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
            transition-all duration-200 ease-in-out
            ${
              isDragActive
                ? 'border-primary bg-primary/5 scale-[1.02]'
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
            }
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <User className="w-10 h-10 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-medium">
                {isDragActive ? 'Drop your photo here' : 'Drag and drop a portrait photo'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse • JPG, PNG, WebP up to 10MB
              </p>
            </div>
            <Button variant="secondary" size="sm" className="mt-2">
              <Upload className="w-4 h-4 mr-2" />
              Choose File
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="relative max-w-md mx-auto">
            <div className="aspect-square relative rounded-xl overflow-hidden border shadow-lg">
              {avatarPreviewUrl && (
                <Image src={avatarPreviewUrl} alt="Avatar preview" fill className="object-cover" />
              )}
            </div>
            <Button
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-8 w-8 rounded-full shadow-md"
              onClick={clearAvatar}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              {avatarFile.name} • {(avatarFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
            <Button onClick={handleContinue} disabled={isLoading} size="lg">
              Continue to Select Reaction
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="font-medium text-sm mb-2">Tips for best results:</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Use a clear, front-facing portrait photo</li>
          <li>• Good lighting helps AI match better</li>
          <li>• Avoid photos with multiple people</li>
          <li>• Higher resolution photos produce better results</li>
        </ul>
      </div>
    </div>
  );
}
