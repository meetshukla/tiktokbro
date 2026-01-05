'use client';

import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { cn } from '@/lib/utils';
import {
  TextBox,
  CanvasEditorProps,
  PREVIEW_WIDTH,
  PREVIEW_HEIGHT,
  DEFAULT_TEXT_BOX,
} from './types';
import { useCanvasRenderer } from './useCanvasRenderer';

export interface CanvasEditorRef {
  exportToBlob: () => Promise<Blob | null>;
  addTextBox: () => void;
}

/**
 * Calculate the bounding box for a text box based on its content
 * Accounts for word wrapping and text alignment
 */
function getTextBoundingBox(
  box: TextBox,
  canvasWidth: number,
  canvasHeight: number
): { left: number; top: number; width: number; height: number } {
  const pixelX = (box.x / 100) * canvasWidth;
  const pixelY = (box.y / 100) * canvasHeight;

  // Approximate character width (varies by font, this is a reasonable estimate)
  const charWidth = box.fontSize * 0.55;
  const maxWidth = canvasWidth * 0.9; // 90% of canvas for wrapping

  // Split by explicit newlines, then estimate wrapping for each line
  const explicitLines = box.text.split('\n');
  let totalLines = 0;
  let longestLineWidth = 0;

  for (const line of explicitLines) {
    if (!line.trim()) {
      totalLines += 1;
      continue;
    }
    const lineWidth = line.length * charWidth;
    if (lineWidth > maxWidth) {
      // Estimate how many wrapped lines
      const wrappedLineCount = Math.ceil(lineWidth / maxWidth);
      totalLines += wrappedLineCount;
      longestLineWidth = Math.max(longestLineWidth, maxWidth);
    } else {
      totalLines += 1;
      longestLineWidth = Math.max(longestLineWidth, lineWidth);
    }
  }

  const textWidth = Math.max(100, longestLineWidth);
  const lineHeight = box.fontSize * 1.2;
  const textHeight = Math.max(1, totalLines) * lineHeight;

  // Add padding around text
  const padding = 12;
  const totalWidth = textWidth + padding * 2;
  const totalHeight = textHeight + padding * 2;

  // Calculate left position based on alignment
  let left: number;
  if (box.textAlign === 'left') {
    left = pixelX - padding; // pixelX is left edge of text
  } else if (box.textAlign === 'right') {
    left = pixelX - totalWidth + padding; // pixelX is right edge of text
  } else {
    // center
    left = pixelX - totalWidth / 2;
  }

  return {
    left,
    top: pixelY - totalHeight / 2,
    width: totalWidth,
    height: totalHeight,
  };
}

export const CanvasEditor = forwardRef<CanvasEditorRef, CanvasEditorProps>(
  (
    {
      imageUrl,
      textBoxes,
      selectedTextId,
      onTextBoxesChange,
      onSelectionChange,
      width = PREVIEW_WIDTH,
      height = PREVIEW_HEIGHT,
      className,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const [isEditing, setIsEditing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Get device pixel ratio once on mount for retina display support
    const dpr = useRef(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);

    const { render, exportToBlob, hitTest } = useCanvasRenderer({ width, height });

    // Re-render canvas when dependencies change
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // When editing, hide the text being edited from the canvas (textarea shows it instead)
      const textBoxesToRender =
        isEditing && selectedTextId
          ? textBoxes.filter((box) => box.id !== selectedTextId)
          : textBoxes;

      // Use device pixel ratio for sharper rendering on retina displays
      const ratio = dpr.current;
      render(canvas, imageUrl, textBoxesToRender, width * ratio, height * ratio).catch(
        console.error
      );
    }, [imageUrl, textBoxes, render, isEditing, selectedTextId, width, height]);

    // Focus textarea when editing
    useEffect(() => {
      if (isEditing && textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.select();
      }
    }, [isEditing, selectedTextId]);

    // Update a text box
    const updateTextBox = useCallback(
      (id: string, updates: Partial<TextBox>) => {
        onTextBoxesChange(textBoxes.map((box) => (box.id === id ? { ...box, ...updates } : box)));
      },
      [textBoxes, onTextBoxesChange]
    );

    // Add new text box
    const addTextBox = useCallback(() => {
      const newBox: TextBox = {
        ...DEFAULT_TEXT_BOX,
        id: `text-${Date.now()}`,
      };
      onTextBoxesChange([...textBoxes, newBox]);
      onSelectionChange(newBox.id);
      setIsEditing(true);
    }, [textBoxes, onTextBoxesChange, onSelectionChange]);

    // Delete selected text box
    const deleteSelectedTextBox = useCallback(() => {
      if (!selectedTextId) return;
      onTextBoxesChange(textBoxes.filter((box) => box.id !== selectedTextId));
      onSelectionChange(null);
      setIsEditing(false);
    }, [selectedTextId, textBoxes, onTextBoxesChange, onSelectionChange]);

    // Handle mouse down on canvas
    const handleMouseDown = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = overlayRef.current?.getBoundingClientRect();
        if (!rect) return;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Check if clicked on a text box
        const hitId = hitTest(mouseX, mouseY, textBoxes, width, height);

        if (hitId) {
          e.preventDefault();
          e.stopPropagation();

          const box = textBoxes.find((b) => b.id === hitId);
          if (!box) return;

          // If already selected and editing, don't start drag
          if (hitId === selectedTextId && isEditing) return;

          // Select and start drag
          onSelectionChange(hitId);
          setIsEditing(false);
          setIsDragging(true);

          // Calculate offset from text center
          const boxX = (box.x / 100) * width;
          const boxY = (box.y / 100) * height;
          setDragOffset({
            x: mouseX - boxX,
            y: mouseY - boxY,
          });
        } else {
          // Clicked on empty area - deselect
          if (!isEditing) {
            onSelectionChange(null);
          }
          setIsEditing(false);
        }
      },
      [hitTest, textBoxes, width, height, selectedTextId, isEditing, onSelectionChange]
    );

    // Handle mouse move (dragging)
    const handleMouseMove = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging || !selectedTextId) return;

        const rect = overlayRef.current?.getBoundingClientRect();
        if (!rect) return;

        const mouseX = e.clientX - rect.left - dragOffset.x;
        const mouseY = e.clientY - rect.top - dragOffset.y;

        // Convert to percentage - allow full range
        const newX = (mouseX / width) * 100;
        const newY = (mouseY / height) * 100;

        updateTextBox(selectedTextId, { x: newX, y: newY });
      },
      [isDragging, selectedTextId, dragOffset, width, height, updateTextBox]
    );

    // Handle mouse up
    const handleMouseUp = useCallback(() => {
      setIsDragging(false);
    }, []);

    // Handle double click to edit
    const handleDoubleClick = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = overlayRef.current?.getBoundingClientRect();
        if (!rect) return;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const hitId = hitTest(mouseX, mouseY, textBoxes, width, height);

        if (hitId) {
          e.preventDefault();
          onSelectionChange(hitId);
          setIsEditing(true);
        }
      },
      [hitTest, textBoxes, width, height, onSelectionChange]
    );

    // Handle keyboard events
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (isEditing) {
          if (e.key === 'Escape') {
            setIsEditing(false);
          } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            setIsEditing(false);
          }
          // Let other keys pass through to textarea
          return;
        }

        // Not editing - handle selection shortcuts
        if (selectedTextId) {
          if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            deleteSelectedTextBox();
          } else if (e.key === 'Escape') {
            onSelectionChange(null);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            setIsEditing(true);
          }
        }
      },
      [isEditing, selectedTextId, deleteSelectedTextBox, onSelectionChange]
    );

    // Handle text change
    const handleTextChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (selectedTextId) {
          updateTextBox(selectedTextId, { text: e.target.value });
        }
      },
      [selectedTextId, updateTextBox]
    );

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        exportToBlob: () => exportToBlob(imageUrl, textBoxes),
        addTextBox,
      }),
      [exportToBlob, imageUrl, textBoxes, addTextBox]
    );

    return (
      <div
        className={cn('relative', className)}
        style={{ width, height }}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {/* Canvas for rendering - internal resolution scaled by DPR, CSS size stays at display size */}
        <canvas ref={canvasRef} className="absolute inset-0 rounded-lg" style={{ width, height }} />

        {/* Interaction overlay */}
        <div
          ref={overlayRef}
          className="absolute inset-0 cursor-default"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDoubleClick}
        >
          {/* Selection and editing overlays */}
          {textBoxes.map((box) => {
            const isSelected = box.id === selectedTextId;
            const isEditingThis = isSelected && isEditing;

            if (!isSelected) return null;

            // Calculate the bounding box for the text
            const bounds = getTextBoundingBox(box, width, height);

            return (
              <div key={box.id}>
                {/* Selection border positioned around actual text bounds */}
                <div
                  className={cn(
                    'absolute border-2 rounded pointer-events-none',
                    isEditingThis ? 'border-blue-400' : 'border-blue-500'
                  )}
                  style={{
                    left: bounds.left,
                    top: bounds.top,
                    width: bounds.width,
                    height: bounds.height,
                  }}
                />

                {/* Editing mode - clean simple textarea, fancy styling shows when done */}
                {isEditingThis && (
                  <div
                    className="absolute pointer-events-none rounded-lg overflow-hidden"
                    style={{
                      left: Math.max(0, bounds.left),
                      top: Math.max(0, bounds.top),
                      width: Math.min(bounds.width, width - Math.max(0, bounds.left)),
                      maxHeight: height - Math.max(0, bounds.top) - 10,
                      // Simple semi-transparent background for readability during edit
                      backgroundColor: 'rgba(0, 0, 0, 0.85)',
                      border: '2px solid rgba(59, 130, 246, 0.8)',
                    }}
                  >
                    <textarea
                      ref={textareaRef}
                      value={box.text}
                      onChange={handleTextChange}
                      className="w-full border-none outline-none resize-none pointer-events-auto"
                      style={{
                        font: `bold ${box.fontSize}px ${box.fontFamily}`,
                        color: '#ffffff',
                        backgroundColor: 'transparent',
                        lineHeight: 1.3,
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word',
                        whiteSpace: 'pre-wrap',
                        padding: '12px',
                        height: Math.min(bounds.height, height - Math.max(0, bounds.top) - 20),
                        maxHeight: height - Math.max(0, bounds.top) - 20,
                        overflow: 'auto',
                        textAlign: box.textAlign,
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        // Stop propagation so parent doesn't handle keys
                        e.stopPropagation();
                        // Only Escape exits editing mode - Enter creates new lines normally
                        if (e.key === 'Escape') {
                          setIsEditing(false);
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Drag indicator */}
        {isDragging && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/70 text-white text-xs rounded">
            Dragging...
          </div>
        )}
      </div>
    );
  }
);

CanvasEditor.displayName = 'CanvasEditor';

export { type TextBox } from './types';
export {
  PREVIEW_WIDTH,
  PREVIEW_HEIGHT,
  EXPORT_WIDTH,
  EXPORT_HEIGHT,
  DEFAULT_TEXT_BOX,
} from './types';
