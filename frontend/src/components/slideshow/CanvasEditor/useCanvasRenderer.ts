import { useCallback, useRef } from 'react';
import { TextBox, EXPORT_WIDTH, EXPORT_HEIGHT } from './types';

interface UseCanvasRendererOptions {
  width: number;
  height: number;
}

export function useCanvasRenderer({ width, height }: UseCanvasRendererOptions) {
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  /**
   * Load an image and cache it for reuse
   */
  const loadImage = useCallback((src: string): Promise<HTMLImageElement> => {
    const cached = imageCache.current.get(src);
    if (cached && cached.complete) {
      return Promise.resolve(cached);
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Required for canvas export
      img.onload = () => {
        imageCache.current.set(src, img);
        resolve(img);
      };
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }, []);

  /**
   * Wrap text to fit within a max width
   */
  const wrapText = useCallback((
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  }, []);

  /**
   * Draw text with shadow on canvas
   */
  const drawText = useCallback((
    ctx: CanvasRenderingContext2D,
    textBox: TextBox,
    canvasWidth: number,
    canvasHeight: number,
    scale: number = 1
  ) => {
    const { text, x, y, fontSize, color, backgroundColor, fontFamily, textAlign } = textBox;
    
    // Convert percentage position to pixels
    const pixelX = (x / 100) * canvasWidth;
    const pixelY = (y / 100) * canvasHeight;
    const scaledFontSize = fontSize * scale;

    // Set text properties
    ctx.font = `bold ${scaledFontSize}px ${fontFamily}`;  
    ctx.textAlign = textAlign;
    ctx.textBaseline = 'middle';

    // Max width for text wrapping (90% of canvas width for padding)
    const maxWidth = canvasWidth * 0.9;

    // Handle multiline text - split by explicit newlines first, then wrap each line
    const explicitLines = text.split('\n');
    const allLines: string[] = [];
    
    for (const line of explicitLines) {
      if (line.trim()) {
        const wrappedLines = wrapText(ctx, line, maxWidth);
        allLines.push(...wrappedLines);
      } else {
        allLines.push(''); // Preserve empty lines
      }
    }
    
    const lineHeight = scaledFontSize * 1.3; // Slightly more spacing for separate boxes
    const totalHeight = allLines.length * lineHeight;
    const startY = pixelY - totalHeight / 2 + lineHeight / 2;

    // Draw each line with its own background (Instagram/TikTok style)
    allLines.forEach((line, index) => {
      const lineY = startY + index * lineHeight;
      
      if (backgroundColor && line.trim()) {
        // Calculate this line's width
        const metrics = ctx.measureText(line);
        const lineWidth = metrics.width;
        
        const paddingX = scaledFontSize * 0.4;
        const paddingY = scaledFontSize * 0.15;
        const bgWidth = lineWidth + paddingX * 2;
        const bgHeight = scaledFontSize * 1.1;
        const bgX = textAlign === 'center' ? pixelX - bgWidth / 2 : 
                    textAlign === 'right' ? pixelX - bgWidth : pixelX;
        const bgY = lineY - bgHeight / 2;
        
        // Draw rounded rectangle background for this line
        const radius = scaledFontSize * 0.15;
        ctx.fillStyle = backgroundColor;
        ctx.beginPath();
        ctx.roundRect(bgX, bgY, bgWidth, bgHeight, radius);
        ctx.fill();
      }
    });

    // Add shadow only if no background
    if (!backgroundColor) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 8 * scale;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2 * scale;
    }

    // Draw all text
    ctx.fillStyle = color;
    allLines.forEach((line, index) => {
      const lineY = startY + index * lineHeight;
      ctx.fillText(line, pixelX, lineY);
    });

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }, [wrapText]);

  /**
   * Render the canvas with image and text overlays
   */
  const render = useCallback(async (
    canvas: HTMLCanvasElement,
    imageUrl: string | null,
    textBoxes: TextBox[],
    targetWidth: number = width,
    targetHeight: number = height
  ): Promise<void> => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Clear canvas
    ctx.clearRect(0, 0, targetWidth, targetHeight);

    // Draw background (gray if no image)
    if (!imageUrl) {
      ctx.fillStyle = '#374151';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      
      // Draw placeholder text
      ctx.font = '16px system-ui';
      ctx.fillStyle = '#9CA3AF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Select an image', targetWidth / 2, targetHeight / 2);
      return;
    }

    // Load and draw image
    try {
      const img = await loadImage(imageUrl);
      
      // Calculate cover fit (fill entire canvas, crop if needed)
      const imgAspect = img.width / img.height;
      const canvasAspect = targetWidth / targetHeight;
      
      let drawWidth, drawHeight, offsetX, offsetY;
      
      if (imgAspect > canvasAspect) {
        // Image is wider - fit height, crop width
        drawHeight = targetHeight;
        drawWidth = targetHeight * imgAspect;
        offsetX = (targetWidth - drawWidth) / 2;
        offsetY = 0;
      } else {
        // Image is taller - fit width, crop height
        drawWidth = targetWidth;
        drawHeight = targetWidth / imgAspect;
        offsetX = 0;
        offsetY = (targetHeight - drawHeight) / 2;
      }
      
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    } catch (error) {
      console.error('Failed to render image:', error);
      ctx.fillStyle = '#374151';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    }

    // Calculate scale factor for text (if rendering at export resolution)
    const scale = targetWidth / width;

    // Draw text boxes
    textBoxes.forEach(textBox => {
      if (textBox.text.trim()) {
        drawText(ctx, textBox, targetWidth, targetHeight, scale);
      }
    });
  }, [width, height, loadImage, drawText]);

  /**
   * Export canvas as Blob
   */
  const exportToBlob = useCallback(async (
    imageUrl: string | null,
    textBoxes: TextBox[],
    options: {
      width?: number;
      height?: number;
      format?: 'image/png' | 'image/jpeg' | 'image/webp';
      quality?: number;
    } = {}
  ): Promise<Blob | null> => {
    const {
      width: exportWidth = EXPORT_WIDTH,
      height: exportHeight = EXPORT_HEIGHT,
      format = 'image/png',
      quality = 0.95
    } = options;

    // Create offscreen canvas for export
    const offscreenCanvas = document.createElement('canvas');
    
    await render(offscreenCanvas, imageUrl, textBoxes, exportWidth, exportHeight);

    return new Promise((resolve) => {
      offscreenCanvas.toBlob(
        (blob) => resolve(blob),
        format,
        quality
      );
    });
  }, [render]);

  /**
   * Get hit detection for text box at coordinates
   * Uses the same bounding box calculation as the UI
   */
  const hitTest = useCallback((
    mouseX: number,
    mouseY: number,
    textBoxes: TextBox[],
    canvasWidth: number,
    canvasHeight: number
  ): string | null => {
    // Test in reverse order (topmost first)
    for (let i = textBoxes.length - 1; i >= 0; i--) {
      const box = textBoxes[i];
      const pixelX = (box.x / 100) * canvasWidth;
      const pixelY = (box.y / 100) * canvasHeight;
      
      // Calculate bounding box same as getTextBoundingBox in index.tsx
      const charWidth = box.fontSize * 0.55;
      const maxWidth = canvasWidth * 0.9;
      
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
      
      const padding = 12;
      const totalWidth = textWidth + padding * 2;
      const totalHeight = textHeight + padding * 2;
      
      const left = pixelX - totalWidth / 2;
      const right = pixelX + totalWidth / 2;
      const top = pixelY - totalHeight / 2;
      const bottom = pixelY + totalHeight / 2;
      
      if (mouseX >= left && mouseX <= right && mouseY >= top && mouseY <= bottom) {
        return box.id;
      }
    }
    return null;
  }, []);

  return {
    render,
    exportToBlob,
    hitTest,
    loadImage,
  };
}
