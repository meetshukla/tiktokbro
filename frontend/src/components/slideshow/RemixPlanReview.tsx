'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSlideshowGenerator } from '@/hooks/useSlideshowGenerator';
import { useSlideshowContext } from '@/context/SlideshowContext';
import {
  Loader2,
  Search,
  Check,
  ImageIcon,
  Download,
  ChevronLeft,
  ChevronRight,
  Plus,
  Upload,
  AlignLeft,
  AlignCenter,
  AlignRight,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CanvasEditor,
  CanvasEditorRef,
  TextBox,
  DEFAULT_TEXT_BOX,
  PREVIEW_WIDTH,
  PREVIEW_HEIGHT,
  EXPORT_WIDTH,
  EXPORT_HEIGHT,
} from './CanvasEditor';
import { TEXT_COLORS, getColorStyleVariants, getCurrentVariantIndex } from './CanvasEditor/types';
import { useCanvasRenderer } from './CanvasEditor/useCanvasRenderer';
import JSZip from 'jszip';

export function RemixPlanReview() {
  const { session, setSlides, deleteRemixPlan } = useSlideshowContext();
  const { isLoading, editRemixPlan, searchPinterestForSlide, searchPinterestForAll } =
    useSlideshowGenerator();

  // UI State
  const [activeSlide, setActiveSlide] = useState(1);
  const [searchingSlide, setSearchingSlide] = useState<number | null>(null);

  // Text boxes per slide
  const [textBoxesMap, setTextBoxesMap] = useState<Map<number, TextBox[]>>(new Map());
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  // Uploaded images per slide
  const [uploadedImagesMap, setUploadedImagesMap] = useState<Map<number, string[]>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track failed image URLs to hide them from the grid
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  // Refs
  const hasAutoSearched = useRef(false);
  const canvasEditorRefs = useRef<Map<number, CanvasEditorRef>>(new Map());
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Responsive canvas size
  const [canvasSize, setCanvasSize] = useState({ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT });

  // Canvas renderer for export (can render any slide, not just active one)
  const { render } = useCanvasRenderer({ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT });

  // Derived state
  const currentPlan = session?.remixPlans?.find((p) => p.slideNumber === activeSlide);
  const originalSlide = session?.tiktokData?.slides.find((s) => s.index === activeSlide - 1);

  // Get or initialize text boxes for the current slide
  const currentTextBoxes = useMemo(() => {
    const existing = textBoxesMap.get(activeSlide);
    if (existing) {
      // Return existing text boxes as-is - allow full positioning
      return existing;
    }

    // If not in map but we have overlay text from the plan, restore from saved textStyle
    if (currentPlan?.newOverlayText) {
      const savedStyle = currentPlan.textStyle;
      if (savedStyle) {
        // Restore full styling from saved textStyle
        return [
          {
            id: `text-${activeSlide}-1`,
            text: currentPlan.newOverlayText,
            x: savedStyle.x,
            y: savedStyle.y,
            fontSize: savedStyle.fontSize || DEFAULT_TEXT_BOX.fontSize,
            color: savedStyle.color || DEFAULT_TEXT_BOX.color,
            backgroundColor: savedStyle.backgroundColor ?? DEFAULT_TEXT_BOX.backgroundColor,
            fontFamily: savedStyle.fontFamily || DEFAULT_TEXT_BOX.fontFamily,
            textAlign: savedStyle.textAlign || DEFAULT_TEXT_BOX.textAlign,
          },
        ];
      }
      // Fallback to default with textPosition if available
      return [
        {
          ...DEFAULT_TEXT_BOX,
          id: `text-${activeSlide}-1`,
          text: currentPlan.newOverlayText,
          x: currentPlan.textPosition?.x ?? 50,
          y: currentPlan.textPosition?.y ?? 50,
        },
      ];
    }
    return [];
  }, [textBoxesMap, activeSlide, currentPlan]);

  const selectedText = currentTextBoxes.find((t) => t.id === selectedTextId);

  // Change slide and reset selection
  const changeSlide = useCallback((newSlide: number | ((prev: number) => number)) => {
    setActiveSlide(newSlide);
    setSelectedTextId(null);
  }, []);

  // Calculate responsive canvas size based on container
  useEffect(() => {
    const updateSize = () => {
      if (!canvasContainerRef.current) return;

      const container = canvasContainerRef.current;
      const containerHeight = container.clientHeight - 80;
      const containerWidth = container.clientWidth - 48;

      // 9:16 aspect ratio
      const aspectRatio = 9 / 16;

      // Calculate max dimensions that fit in container
      let width = containerHeight * aspectRatio;
      let height = containerHeight;

      // If too wide, constrain by width instead
      if (width > containerWidth) {
        width = containerWidth;
        height = width / aspectRatio;
      }

      // Clamp to reasonable bounds - smaller for 13" screens
      width = Math.max(250, Math.min(400, width));
      height = Math.max(444, Math.min(711, height));

      setCanvasSize({ width: Math.round(width), height: Math.round(height) });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Auto-search Pinterest on mount
  useEffect(() => {
    if (session?.remixPlans && session.remixPlans.length > 0 && !hasAutoSearched.current) {
      const hasAnyCandidates = session.remixPlans.some(
        (p) => p.pinterestCandidates && p.pinterestCandidates.length > 0
      );
      if (!hasAnyCandidates) {
        hasAutoSearched.current = true;
        searchPinterestForAll();
      }
    }
  }, [session?.remixPlans, searchPinterestForAll]);

  // Auto-select first Pinterest image when available (skip failed images)
  useEffect(() => {
    if (!session?.remixPlans) return;
    session.remixPlans.forEach((plan) => {
      if (plan.pinterestCandidates?.length && !plan.selectedImageUrl) {
        // Find first image that hasn't failed
        const validImage = plan.pinterestCandidates.find((c) => !failedImages.has(c.imageUrl));
        if (validImage) {
          editRemixPlan(plan.slideNumber, { selectedImageUrl: validImage.imageUrl });
        }
      }
    });
  }, [session?.remixPlans, editRemixPlan, failedImages]);

  // Update text boxes for current slide
  const handleTextBoxesChange = useCallback(
    (newTextBoxes: TextBox[]) => {
      setTextBoxesMap((prev) => {
        const newMap = new Map(prev);
        newMap.set(activeSlide, newTextBoxes);
        return newMap;
      });

      // Sync to remix plan - save full text style for first text box
      const combinedText = newTextBoxes.map((b) => b.text).join('\n');
      const firstBox = newTextBoxes[0];
      editRemixPlan(activeSlide, {
        newOverlayText: combinedText,
        textPosition: firstBox ? { x: firstBox.x, y: firstBox.y } : undefined,
        textStyle: firstBox
          ? {
              x: firstBox.x,
              y: firstBox.y,
              fontSize: firstBox.fontSize,
              color: firstBox.color,
              backgroundColor: firstBox.backgroundColor,
              fontFamily: firstBox.fontFamily,
              textAlign: firstBox.textAlign,
            }
          : undefined,
      });
    },
    [activeSlide, editRemixPlan]
  );

  // Handle canvas editor ref
  const setCanvasRef = useCallback((slideNumber: number, ref: CanvasEditorRef | null) => {
    if (ref) {
      canvasEditorRefs.current.set(slideNumber, ref);
    } else {
      canvasEditorRefs.current.delete(slideNumber);
    }
  }, []);

  // Add text box via canvas editor
  const handleAddText = useCallback(() => {
    const ref = canvasEditorRefs.current.get(activeSlide);
    if (ref) {
      ref.addTextBox();
    }
  }, [activeSlide]);

  // Update a specific text box property
  const updateSelectedTextBox = useCallback(
    (updates: Partial<TextBox>) => {
      if (!selectedTextId) return;

      const newTextBoxes = currentTextBoxes.map((box) =>
        box.id === selectedTextId ? { ...box, ...updates } : box
      );
      handleTextBoxesChange(newTextBoxes);
    },
    [selectedTextId, currentTextBoxes, handleTextBoxesChange]
  );

  // Delete selected text box
  const deleteSelectedTextBox = useCallback(() => {
    if (!selectedTextId) return;

    const newTextBoxes = currentTextBoxes.filter((box) => box.id !== selectedTextId);
    handleTextBoxesChange(newTextBoxes);
    setSelectedTextId(null);
  }, [selectedTextId, currentTextBoxes, handleTextBoxesChange]);

  // Apply style to all text boxes across all slides
  const applyStyleToAll = useCallback(() => {
    if (!selectedText || !session?.remixPlans) return;

    const remixPlans = session.remixPlans;
    const styleUpdates = {
      color: selectedText.color,
      backgroundColor: selectedText.backgroundColor,
    };

    // Build all the updates first
    const updates: Array<{ slideNumber: number; boxes: TextBox[] }> = [];

    remixPlans.forEach((plan) => {
      const slideNumber = plan.slideNumber;
      const existingBoxes = textBoxesMap.get(slideNumber);

      let updatedBoxes: TextBox[];
      if (existingBoxes && existingBoxes.length > 0) {
        updatedBoxes = existingBoxes.map((box) => ({ ...box, ...styleUpdates }));
      } else if (plan.newOverlayText) {
        const savedStyle = plan.textStyle;
        updatedBoxes = [
          {
            ...DEFAULT_TEXT_BOX,
            id: `text-${slideNumber}-1`,
            text: plan.newOverlayText,
            x: savedStyle?.x ?? plan.textPosition?.x ?? 50,
            y: savedStyle?.y ?? plan.textPosition?.y ?? 50,
            fontSize: savedStyle?.fontSize || DEFAULT_TEXT_BOX.fontSize,
            fontFamily: savedStyle?.fontFamily || DEFAULT_TEXT_BOX.fontFamily,
            textAlign: savedStyle?.textAlign || DEFAULT_TEXT_BOX.textAlign,
            ...styleUpdates,
          },
        ];
      } else {
        return;
      }

      updates.push({ slideNumber, boxes: updatedBoxes });
    });

    // Update local state
    setTextBoxesMap((prev) => {
      const newMap = new Map(prev);
      updates.forEach(({ slideNumber, boxes }) => {
        newMap.set(slideNumber, boxes);
      });
      return newMap;
    });

    // Sync to session (outside of state setter)
    updates.forEach(({ slideNumber, boxes }) => {
      const firstBox = boxes[0];
      if (firstBox) {
        editRemixPlan(slideNumber, {
          textStyle: {
            x: firstBox.x,
            y: firstBox.y,
            fontSize: firstBox.fontSize,
            color: firstBox.color,
            backgroundColor: firstBox.backgroundColor,
            fontFamily: firstBox.fontFamily,
            textAlign: firstBox.textAlign,
          },
        });
      }
    });
  }, [selectedText, session, textBoxesMap, editRemixPlan]);

  // Apply alignment to all text boxes across all slides
  const applyAlignmentToAll = useCallback(() => {
    if (!selectedText || !session?.remixPlans) return;

    const remixPlans = session.remixPlans;
    const alignmentUpdates = {
      textAlign: selectedText.textAlign,
      x: selectedText.x,
    };

    // Build all the updates first
    const updates: Array<{ slideNumber: number; boxes: TextBox[] }> = [];

    remixPlans.forEach((plan) => {
      const slideNumber = plan.slideNumber;
      const existingBoxes = textBoxesMap.get(slideNumber);

      let updatedBoxes: TextBox[];
      if (existingBoxes && existingBoxes.length > 0) {
        updatedBoxes = existingBoxes.map((box) => ({ ...box, ...alignmentUpdates }));
      } else if (plan.newOverlayText) {
        const savedStyle = plan.textStyle;
        updatedBoxes = [
          {
            ...DEFAULT_TEXT_BOX,
            id: `text-${slideNumber}-1`,
            text: plan.newOverlayText,
            y: savedStyle?.y ?? plan.textPosition?.y ?? 50,
            fontSize: savedStyle?.fontSize || DEFAULT_TEXT_BOX.fontSize,
            color: savedStyle?.color || DEFAULT_TEXT_BOX.color,
            backgroundColor: savedStyle?.backgroundColor ?? DEFAULT_TEXT_BOX.backgroundColor,
            fontFamily: savedStyle?.fontFamily || DEFAULT_TEXT_BOX.fontFamily,
            ...alignmentUpdates,
          },
        ];
      } else {
        return;
      }

      updates.push({ slideNumber, boxes: updatedBoxes });
    });

    // Update local state
    setTextBoxesMap((prev) => {
      const newMap = new Map(prev);
      updates.forEach(({ slideNumber, boxes }) => {
        newMap.set(slideNumber, boxes);
      });
      return newMap;
    });

    // Sync to session (outside of state setter)
    updates.forEach(({ slideNumber, boxes }) => {
      const firstBox = boxes[0];
      if (firstBox) {
        editRemixPlan(slideNumber, {
          textStyle: {
            x: firstBox.x,
            y: firstBox.y,
            fontSize: firstBox.fontSize,
            color: firstBox.color,
            backgroundColor: firstBox.backgroundColor,
            fontFamily: firstBox.fontFamily,
            textAlign: firstBox.textAlign,
          },
        });
      }
    });
  }, [selectedText, session, textBoxesMap, editRemixPlan]);

  // Apply font size to all text boxes across all slides
  const applyFontSizeToAll = useCallback(() => {
    if (!selectedText || !session?.remixPlans) return;

    const remixPlans = session.remixPlans;
    const fontSizeUpdate = { fontSize: selectedText.fontSize };

    // Build all the updates first
    const updates: Array<{ slideNumber: number; boxes: TextBox[] }> = [];

    remixPlans.forEach((plan) => {
      const slideNumber = plan.slideNumber;
      const existingBoxes = textBoxesMap.get(slideNumber);

      let updatedBoxes: TextBox[];
      if (existingBoxes && existingBoxes.length > 0) {
        updatedBoxes = existingBoxes.map((box) => ({ ...box, ...fontSizeUpdate }));
      } else if (plan.newOverlayText) {
        const savedStyle = plan.textStyle;
        updatedBoxes = [
          {
            ...DEFAULT_TEXT_BOX,
            id: `text-${slideNumber}-1`,
            text: plan.newOverlayText,
            x: savedStyle?.x ?? plan.textPosition?.x ?? 50,
            y: savedStyle?.y ?? plan.textPosition?.y ?? 50,
            color: savedStyle?.color || DEFAULT_TEXT_BOX.color,
            backgroundColor: savedStyle?.backgroundColor ?? DEFAULT_TEXT_BOX.backgroundColor,
            fontFamily: savedStyle?.fontFamily || DEFAULT_TEXT_BOX.fontFamily,
            textAlign: savedStyle?.textAlign || DEFAULT_TEXT_BOX.textAlign,
            ...fontSizeUpdate,
          },
        ];
      } else {
        return;
      }

      updates.push({ slideNumber, boxes: updatedBoxes });
    });

    // Update local state
    setTextBoxesMap((prev) => {
      const newMap = new Map(prev);
      updates.forEach(({ slideNumber, boxes }) => {
        newMap.set(slideNumber, boxes);
      });
      return newMap;
    });

    // Sync to session (outside of state setter)
    updates.forEach(({ slideNumber, boxes }) => {
      const firstBox = boxes[0];
      if (firstBox) {
        editRemixPlan(slideNumber, {
          textStyle: {
            x: firstBox.x,
            y: firstBox.y,
            fontSize: firstBox.fontSize,
            color: firstBox.color,
            backgroundColor: firstBox.backgroundColor,
            fontFamily: firstBox.fontFamily,
            textAlign: firstBox.textAlign,
          },
        });
      }
    });
  }, [selectedText, session, textBoxesMap, editRemixPlan]);

  // Pinterest search
  const handleSearch = async (slideNumber: number, query: string) => {
    setSearchingSlide(slideNumber);
    await searchPinterestForSlide(slideNumber, query);
    setSearchingSlide(null);
  };

  // Handle image upload
  const handleUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      Array.from(files).forEach((file) => {
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          if (dataUrl) {
            setUploadedImagesMap((prev) => {
              const newMap = new Map(prev);
              const existing = newMap.get(activeSlide) || [];
              newMap.set(activeSlide, [...existing, dataUrl]);
              return newMap;
            });
          }
        };
        reader.readAsDataURL(file);
      });

      // Reset input so same file can be uploaded again
      e.target.value = '';
    },
    [activeSlide]
  );

  // Select Pinterest image
  const handleSelectImage = (slideNumber: number, imageUrl: string) => {
    editRemixPlan(slideNumber, { selectedImageUrl: imageUrl });
  };

  // Handle image load error - hide failed images silently
  const handleImageError = useCallback(
    (imageUrl: string) => {
      setFailedImages((prev) => {
        const next = new Set(prev);
        next.add(imageUrl);
        return next;
      });

      // If this was the selected image, deselect it
      if (currentPlan?.selectedImageUrl === imageUrl) {
        editRemixPlan(activeSlide, { selectedImageUrl: undefined });
      }
    },
    [currentPlan?.selectedImageUrl, editRemixPlan, activeSlide]
  );

  // Download all slides as a zip file
  const handleDownloadAll = async () => {
    if (!session?.remixPlans) return;

    const zip = new JSZip();

    // Create an offscreen canvas for rendering each slide
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = EXPORT_WIDTH;
    offscreenCanvas.height = EXPORT_HEIGHT;

    for (const plan of session.remixPlans) {
      if (!plan.selectedImageUrl) continue;

      // Get text boxes from map, or fallback to plan's overlay text if not visited
      let slideTextBoxes = textBoxesMap.get(plan.slideNumber);
      if (!slideTextBoxes || slideTextBoxes.length === 0) {
        // Slide was never visited - create text box from plan data with saved style
        if (plan.newOverlayText) {
          const savedStyle = plan.textStyle;
          if (savedStyle) {
            slideTextBoxes = [
              {
                id: `text-${plan.slideNumber}-1`,
                text: plan.newOverlayText,
                x: savedStyle.x,
                y: savedStyle.y,
                fontSize: savedStyle.fontSize || DEFAULT_TEXT_BOX.fontSize,
                color: savedStyle.color || DEFAULT_TEXT_BOX.color,
                backgroundColor: savedStyle.backgroundColor ?? DEFAULT_TEXT_BOX.backgroundColor,
                fontFamily: savedStyle.fontFamily || DEFAULT_TEXT_BOX.fontFamily,
                textAlign: savedStyle.textAlign || DEFAULT_TEXT_BOX.textAlign,
              },
            ];
          } else {
            slideTextBoxes = [
              {
                ...DEFAULT_TEXT_BOX,
                id: `text-${plan.slideNumber}-1`,
                text: plan.newOverlayText,
                x: plan.textPosition?.x ?? 50,
                y: plan.textPosition?.y ?? 50,
              },
            ];
          }
        } else {
          slideTextBoxes = [];
        }
      }

      try {
        // Render this slide to the offscreen canvas
        await render(
          offscreenCanvas,
          plan.selectedImageUrl,
          slideTextBoxes,
          EXPORT_WIDTH,
          EXPORT_HEIGHT
        );

        // Convert to blob
        const blob = await new Promise<Blob | null>((resolve) => {
          offscreenCanvas.toBlob((b) => resolve(b), 'image/png', 0.95);
        });

        if (blob) {
          zip.file(`slide-${plan.slideNumber}.png`, blob);
        }
      } catch (error) {
        console.error(`Failed to export slide ${plan.slideNumber}:`, error);
      }
    }

    // Generate and download the zip file
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `slideshow-${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Also update slides state for the workflow
    const slides = session.remixPlans.map((plan) => {
      const boxes = textBoxesMap.get(plan.slideNumber) || [];
      const combinedText = boxes.map((b) => b.text).join('\n');
      const firstBox = boxes[0];

      return {
        id: `remix-${plan.slideNumber}-${Date.now()}`,
        slideNumber: plan.slideNumber,
        plan: {
          slideNumber: plan.slideNumber,
          imagePrompt: plan.pinterestQuery,
          suggestedOverlay: combinedText || plan.newOverlayText,
        },
        imageData: plan.selectedImageUrl,
        status: 'complete' as const,
        textOverlay:
          combinedText || plan.newOverlayText
            ? {
                text: combinedText || plan.newOverlayText,
                size: 'medium' as const,
                color: firstBox?.color || '#ffffff',
                position: firstBox ? { x: firstBox.x, y: firstBox.y } : { x: 50, y: 80 },
              }
            : undefined,
      };
    });

    setSlides(slides);
    // Stay on the same page so user can continue editing if needed
  };

  // Early return if no data
  if (!session?.remixPlans || session.remixPlans.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No remix plans available
      </div>
    );
  }

  const selectedCount = session.remixPlans.filter((p) => p.selectedImageUrl).length;
  const totalCount = session.remixPlans.length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Slide Strip */}
      <div className="border-b bg-muted/30 px-3 py-1 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {session.remixPlans.map((plan) => {
            const original = session.tiktokData?.slides.find(
              (s) => s.index === plan.slideNumber - 1
            );
            const isActive = plan.slideNumber === activeSlide;
            const hasSelection = !!plan.selectedImageUrl;
            const canDelete = (session.remixPlans?.length ?? 0) > 1;

            return (
              <div key={plan.slideNumber} className="relative group shrink-0">
                <button
                  onClick={() => changeSlide(plan.slideNumber)}
                  className={cn(
                    'relative w-9 h-12 rounded overflow-hidden border-2 transition-all',
                    isActive
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-transparent hover:border-muted-foreground/30',
                    !hasSelection && !isActive && 'opacity-50'
                  )}
                >
                  {original?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={original.imageUrl}
                      alt={`Slide ${plan.slideNumber}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <ImageIcon className="h-2 w-2 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute top-0 left-0 w-3.5 h-3.5 rounded-full bg-black/60 text-white text-[8px] flex items-center justify-center">
                    {plan.slideNumber}
                  </div>
                  {hasSelection && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="h-1.5 w-1.5 text-white" />
                    </div>
                  )}
                </button>
                {/* Delete button - shown on hover */}
                {canDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // If deleting active slide, move to previous or next
                      if (isActive) {
                        const newSlide = plan.slideNumber > 1 ? plan.slideNumber - 1 : 1;
                        setActiveSlide(newSlide);
                      } else if (activeSlide > plan.slideNumber) {
                        // Adjust active slide number if deleting a slide before it
                        setActiveSlide(activeSlide - 1);
                      }
                      deleteRemixPlan(plan.slideNumber);
                    }}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:scale-110"
                    title="Delete slide"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      {currentPlan && (
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left: Image Selection */}
          <div className="w-[280px] border-r flex flex-col min-h-0">
            {/* Search & Upload Bar */}
            <div className="p-2 border-b flex gap-1.5">
              <Input
                value={currentPlan.pinterestQuery}
                onChange={(e) => editRemixPlan(activeSlide, { pinterestQuery: e.target.value })}
                placeholder="Pinterest search..."
                className="flex-1 h-8 text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => handleSearch(activeSlide, currentPlan.pinterestQuery)}
                disabled={
                  searchingSlide === activeSlide || !currentPlan.pinterestQuery || isLoading
                }
              >
                {searchingSlide === activeSlide ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleUpload}
              />
            </div>

            {/* Images Grid */}
            <div className="flex-1 overflow-y-auto p-2">
              {(() => {
                const uploadedImages = uploadedImagesMap.get(activeSlide) || [];
                const pinterestImages = currentPlan.pinterestCandidates || [];

                // Filter out images that failed to load
                const allImages = [
                  ...uploadedImages.map((url, i) => ({
                    url,
                    type: 'upload' as const,
                    key: `upload-${i}`,
                  })),
                  ...pinterestImages
                    .filter((c) => !failedImages.has(c.imageUrl))
                    .map((c, i) => ({
                      url: c.imageUrl,
                      type: 'pinterest' as const,
                      key: `pinterest-${i}`,
                    })),
                ];

                // Check if we had Pinterest results but all failed
                const allPinterestFailed =
                  pinterestImages.length > 0 &&
                  pinterestImages.every((c) => failedImages.has(c.imageUrl));

                if (allImages.length > 0) {
                  return (
                    <div className="grid grid-cols-3 gap-1.5">
                      {allImages.map((img) => (
                        <button
                          key={img.key}
                          onClick={() => handleSelectImage(activeSlide, img.url)}
                          className={cn(
                            'relative aspect-9/16 rounded-lg overflow-hidden border-2 transition-all hover:scale-[1.02]',
                            currentPlan.selectedImageUrl === img.url
                              ? 'border-primary ring-2 ring-primary/20'
                              : 'border-transparent hover:border-muted-foreground/30'
                          )}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.url}
                            alt="Option"
                            className="w-full h-full object-cover"
                            onError={() => handleImageError(img.url)}
                          />
                          {currentPlan.selectedImageUrl === img.url && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                <Check className="h-4 w-4 text-white" />
                              </div>
                            </div>
                          )}
                          {img.type === 'upload' && (
                            <div className="absolute top-1 left-1 px-1 py-0.5 bg-blue-500 text-white text-[8px] rounded">
                              Uploaded
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  );
                }

                return (
                  <div className="flex items-center justify-center h-full bg-muted/30 rounded-xl">
                    <div className="text-center text-muted-foreground p-4">
                      {isLoading || searchingSlide === activeSlide ? (
                        <>
                          <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin" />
                          <p className="text-sm">Searching...</p>
                        </>
                      ) : allPinterestFailed ? (
                        <>
                          <Search className="h-6 w-6 mx-auto mb-2 opacity-50" />
                          <p className="text-sm font-medium">No compatible images found</p>
                          <p className="text-xs mt-1 opacity-70">Try a different search query</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload className="h-3 w-3 mr-1" />
                            Upload Instead
                          </Button>
                        </>
                      ) : (
                        <>
                          <Upload className="h-6 w-6 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Search Pinterest or upload images</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload className="h-3 w-3 mr-1" />
                            Upload
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Original Reference - Bottom */}
            {originalSlide?.imageUrl && (
              <div className="p-2 border-t shrink-0">
                <Label className="text-xs text-muted-foreground mb-1 block">Original</Label>
                <div className="aspect-9/16 w-full max-w-[120px] rounded-lg overflow-hidden mx-auto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={originalSlide.imageUrl}
                    alt="Original"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Center: Canvas Editor */}
          <div
            ref={canvasContainerRef}
            className="flex-1 flex items-center justify-center bg-zinc-900 p-3"
            onClick={(e) => {
              // Deselect when clicking on the background (not on canvas)
              if (e.target === e.currentTarget) {
                setSelectedTextId(null);
              }
            }}
          >
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              {/* Slide badge */}
              <div className="absolute -top-6 left-0 px-2 py-0.5 bg-black/60 text-white text-xs rounded">
                Slide {activeSlide}
              </div>

              <div className="rounded-xl overflow-hidden shadow-2xl">
                <CanvasEditor
                  ref={(ref) => setCanvasRef(activeSlide, ref)}
                  imageUrl={currentPlan.selectedImageUrl || null}
                  textBoxes={currentTextBoxes}
                  selectedTextId={selectedTextId}
                  onTextBoxesChange={handleTextBoxesChange}
                  onSelectionChange={setSelectedTextId}
                  width={canvasSize.width}
                  height={canvasSize.height}
                />
              </div>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="w-48 border-l bg-card p-3 flex flex-col gap-2">
            {/* Add Text Button */}
            <Button onClick={handleAddText} variant="outline" size="sm" className="w-full">
              <Plus className="h-3 w-3 mr-1" />
              Add Text
            </Button>

            {/* Selected Text Controls */}
            {selectedText && (
              <div className="space-y-2 pt-2 border-t">
                <div>
                  <Label className="text-xs text-muted-foreground">Font Size</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="range"
                      min="12"
                      max="48"
                      value={selectedText.fontSize}
                      onChange={(e) => updateSelectedTextBox({ fontSize: Number(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="text-xs w-6">{selectedText.fontSize}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={applyFontSizeToAll}
                    className="w-full mt-1.5 h-6 text-xs"
                  >
                    Apply to All Slides
                  </Button>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Color</Label>
                  <div className="mt-1.5 flex items-center justify-center gap-2">
                    {TEXT_COLORS.map((baseColor) => {
                      const variantIdx = getCurrentVariantIndex(
                        baseColor,
                        selectedText.color,
                        selectedText.backgroundColor
                      );
                      const isSelected = variantIdx >= 0;
                      const variants = getColorStyleVariants(baseColor);
                      const isWhite = baseColor === '#FFFFFF';

                      // Determine visual appearance based on current variant
                      const currentVariant = isSelected ? variants[variantIdx] : variants[0];
                      const showInnerCircle = isSelected && currentVariant.backgroundColor !== null;

                      return (
                        <button
                          key={baseColor}
                          onClick={() => {
                            // Cycle to next variant if already selected, otherwise select first
                            const nextIdx = isSelected ? (variantIdx + 1) % variants.length : 0;
                            const nextVariant = variants[nextIdx];
                            updateSelectedTextBox({
                              color: nextVariant.color,
                              backgroundColor: nextVariant.backgroundColor,
                            });
                          }}
                          className={cn(
                            'w-7 h-7 rounded-full transition-all flex items-center justify-center',
                            isSelected
                              ? 'ring-2 ring-offset-2 ring-blue-500 scale-110'
                              : 'hover:scale-105',
                            isWhite && !showInnerCircle && 'border border-zinc-300'
                          )}
                          style={{
                            backgroundColor: showInnerCircle
                              ? (currentVariant.backgroundColor ?? baseColor)
                              : baseColor,
                          }}
                          title={isWhite ? 'White (tap to cycle)' : `${baseColor} (tap to cycle)`}
                        >
                          {/* Inner circle shows the text color when there's a background */}
                          {showInnerCircle && (
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: currentVariant.color,
                                border:
                                  currentVariant.color === '#FFFFFF'
                                    ? '1px solid #d4d4d8'
                                    : undefined,
                              }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center mt-1">
                    Tap again to cycle styles
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={applyStyleToAll}
                    className="w-full mt-1.5 h-6 text-xs"
                  >
                    Apply to All Slides
                  </Button>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Alignment</Label>
                  <div className="flex gap-1 mt-1">
                    {[
                      { value: 'left' as const, icon: AlignLeft, x: 8 },
                      { value: 'center' as const, icon: AlignCenter, x: 50 },
                      { value: 'right' as const, icon: AlignRight, x: 92 },
                    ].map(({ value, icon: Icon, x }) => (
                      <button
                        key={value}
                        onClick={() => updateSelectedTextBox({ textAlign: value, x })}
                        className={cn(
                          'flex-1 px-1.5 py-1.5 rounded transition-colors flex items-center justify-center',
                          selectedText.textAlign === value
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={applyAlignmentToAll}
                    className="w-full mt-1.5 h-6 text-xs"
                  >
                    Apply to All Slides
                  </Button>
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={deleteSelectedTextBox}
                  className="w-full h-7 text-xs"
                >
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-3 py-2 border-t bg-card flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => changeSlide((prev) => prev - 1)}
            disabled={activeSlide === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            {activeSlide} / {totalCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => changeSlide((prev) => prev + 1)}
            disabled={activeSlide === totalCount}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm">
            <span className="font-medium">{selectedCount}</span>
            <span className="text-muted-foreground">/{totalCount}</span>
          </span>
          <Button onClick={handleDownloadAll} disabled={selectedCount !== totalCount}>
            <Download className="h-4 w-4 mr-2" />
            Download All
          </Button>
        </div>
      </div>
    </div>
  );
}
