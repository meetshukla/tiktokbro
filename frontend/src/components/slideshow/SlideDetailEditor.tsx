'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { GeneratedSlide, TextOverlay } from '@/types';
import { useSlideshowContext } from '@/context/SlideshowContext';
import { useSlideshowGenerator } from '@/hooks/useSlideshowGenerator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  RefreshCw,
  Download,
  Loader2,
  Move,
} from 'lucide-react';

interface SlideDetailEditorProps {
  slide: GeneratedSlide;
  onClose: () => void;
}

const defaultOverlay: TextOverlay = {
  text: '',
  size: 'medium',
  color: '#ffffff',
  position: { x: 50, y: 85 },
};

export function SlideDetailEditor({ slide, onClose }: SlideDetailEditorProps) {
  const { updatePlan, updateTextOverlay } = useSlideshowContext();
  const { regenerateSlide } = useSlideshowGenerator();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Get overlay from slide or use defaults with suggestedOverlay text
  const overlay: TextOverlay = slide.textOverlay || {
    ...defaultOverlay,
    text: slide.plan.suggestedOverlay || '',
  };
  
  const containerRef = useRef<HTMLDivElement>(null);

  const getImageSrc = () => {
    if (slide.editedImageData) return slide.editedImageData;
    if (slide.imageData) return `data:image/png;base64,${slide.imageData}`;
    return null;
  };

  const imageSrc = getImageSrc();
  const isComplete = slide.status === 'complete';

  // Update overlay in context
  const setOverlay = useCallback((updates: Partial<TextOverlay>) => {
    updateTextOverlay(slide.id, { ...overlay, ...updates });
  }, [slide.id, overlay, updateTextOverlay]);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    await regenerateSlide(slide.id);
    setIsRegenerating(false);
  };

  const handleDownload = () => {
    const imageData = slide.editedImageData
      ? slide.editedImageData.replace(/^data:image\/\w+;base64,/, '')
      : slide.imageData;

    if (!imageData) return;

    const link = document.createElement('a');
    link.href = `data:image/png;base64,${imageData}`;
    link.download = `slide-${slide.slideNumber}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOverlayChange = (text: string) => {
    setOverlay({ text });
    updatePlan(slide.slideNumber, { suggestedOverlay: text });
  };

  // Handle mouse/touch drag
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || !containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;

    setOverlay({
      position: {
        x: Math.max(5, Math.min(95, x)),
        y: Math.max(5, Math.min(95, y)),
      }
    });
  }, [isDragging, setOverlay]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Preset positions
  const presetPositions = [
    { label: 'Top', x: 50, y: 10 },
    { label: 'Center', x: 50, y: 50 },
    { label: 'Bottom', x: 50, y: 85 },
  ];

  const textSizeClass = {
    small: 'text-sm',
    medium: 'text-lg',
    large: 'text-2xl',
  }[overlay.size];

  return (
    <div className="flex h-full bg-muted/30">
      {/* Large Preview */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-gray-900">
          {/* Slide Preview */}
          <div 
            ref={containerRef}
            className="relative w-[320px] h-[568px]"
          >
            {!isComplete ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-muted">
                {slide.status === 'generating' || isRegenerating ? (
                  <>
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Generating your image...</p>
                  </>
                ) : slide.status === 'error' ? (
                  <>
                    <p className="text-destructive mb-4">Generation failed</p>
                    <Button onClick={handleRegenerate} variant="outline">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again
                    </Button>
                  </>
                ) : (
                  <p className="text-muted-foreground">Waiting to generate...</p>
                )}
              </div>
            ) : imageSrc ? (
              <>
                <Image
                  src={imageSrc}
                  alt={`Slide ${slide.slideNumber}`}
                  fill
                  className="object-cover"
                />
                {/* Draggable Text Overlay */}
                {overlay.text && (
                  <div
                    onMouseDown={handleDragStart}
                    onTouchStart={handleDragStart}
                    className={`absolute px-4 py-2 cursor-move select-none transition-transform ${
                      isDragging ? 'scale-105' : ''
                    }`}
                    style={{
                      left: `${overlay.position.x}%`,
                      top: `${overlay.position.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    {/* Drag Handle Indicator */}
                    <div className={`absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-black/60 text-white text-xs flex items-center gap-1 transition-opacity ${
                      isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}>
                      <Move className="w-3 h-3" />
                      Drag to move
                    </div>
                    
                    {/* Text Content */}
                    <div
                      className={`${textSizeClass} font-bold text-center drop-shadow-lg whitespace-nowrap`}
                      style={{ 
                        color: overlay.color, 
                        textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)' 
                      }}
                    >
                      {overlay.text}
                    </div>
                    
                    {/* Selection Border when dragging */}
                    {isDragging && (
                      <div className="absolute inset-0 border-2 border-dashed border-white/60 rounded -m-1 pointer-events-none" />
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Slide Number */}
          <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-black/60 text-white text-sm font-medium">
            Slide {slide.slideNumber}
          </div>
        </div>
      </div>

      {/* Edit Panel */}
      <div className="w-80 border-l bg-card p-6 overflow-y-auto">
        <div className="space-y-6">
          {/* Actions */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="w-full"
              >
                {isRegenerating ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1" />
                )}
                Regenerate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={!isComplete}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          </div>

          {/* Image Prompt */}
          <div>
            <Label className="text-sm font-medium text-foreground">Image Prompt</Label>
            <Textarea
              value={slide.plan.imagePrompt}
              onChange={(e) => updatePlan(slide.slideNumber, { imagePrompt: e.target.value })}
              className="mt-2 min-h-[100px] text-sm resize-none"
              placeholder="Describe the image..."
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Edit and regenerate to get a new image
            </p>
          </div>

          {/* Text Overlay */}
          <div>
            <Label className="text-sm font-medium text-foreground">Text Overlay</Label>
            <Input
              value={overlay.text}
              onChange={(e) => handleOverlayChange(e.target.value)}
              className="mt-2"
              placeholder="Add text to your slide..."
            />
          </div>

          {/* Text Style */}
          {overlay.text && (
            <>
              <div>
                <Label className="text-sm font-medium text-foreground">Text Style</Label>
                <div className="mt-2 space-y-3">
                  {/* Size */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-12">Size</span>
                    <div className="flex gap-1 flex-1">
                      {(['small', 'medium', 'large'] as const).map((size) => (
                        <button
                          key={size}
                          onClick={() => setOverlay({ size })}
                          className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                            overlay.size === size
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          {size.charAt(0).toUpperCase() + size.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-12">Color</span>
                    <div className="flex gap-1 flex-1">
                      {['#ffffff', '#000000', '#71717a', '#FFD700', '#00D4FF'].map((color) => (
                        <button
                          key={color}
                          onClick={() => setOverlay({ color })}
                          className={`w-8 h-8 rounded-lg border-2 transition-all ${
                            overlay.color === color
                              ? 'border-primary scale-110'
                              : 'border-muted'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Text Position */}
              <div>
                <Label className="text-sm font-medium text-foreground">Text Position</Label>
                <p className="text-xs text-muted-foreground mt-1 mb-2">
                  Drag text on preview or use presets
                </p>
                <div className="flex gap-2">
                  {presetPositions.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => setOverlay({ position: { x: preset.x, y: preset.y } })}
                      className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                        Math.abs(overlay.position.y - preset.y) < 10 && Math.abs(overlay.position.x - preset.x) < 10
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
