export interface TextBox {
  id: string;
  text: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  fontSize: number; // pixels at preview scale
  color: string;
  backgroundColor: string | null; // null = no background, string = background color
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right';
}

export interface CanvasEditorProps {
  imageUrl: string | null;
  textBoxes: TextBox[];
  selectedTextId: string | null;
  onTextBoxesChange: (textBoxes: TextBox[]) => void;
  onSelectionChange: (id: string | null) => void;
  width?: number;
  height?: number;
  className?: string;
}

export interface CanvasExportOptions {
  width: number;
  height: number;
  quality?: number;
  format?: 'image/png' | 'image/jpeg' | 'image/webp';
}

// Preview dimensions (9:16 aspect ratio) - larger for better editing
export const PREVIEW_WIDTH = 405;
export const PREVIEW_HEIGHT = 720;

// Export dimensions (TikTok standard)
export const EXPORT_WIDTH = 1080;
export const EXPORT_HEIGHT = 1920;

// Scale factor from preview to export
export const SCALE_FACTOR = EXPORT_WIDTH / PREVIEW_WIDTH;

export const DEFAULT_TEXT_BOX: Omit<TextBox, 'id'> = {
  text: 'Double-click to edit',
  x: 50,
  y: 50,
  fontSize: 24,
  color: '#ffffff',
  backgroundColor: null,
  fontFamily: 'Inter, system-ui, sans-serif',
  textAlign: 'center',
};

// Text style presets
export type TextStylePreset = 'white' | 'black' | 'white-on-black' | 'black-on-white';

export const TEXT_STYLE_PRESETS: Record<TextStylePreset, { color: string; backgroundColor: string | null }> = {
  'white': { color: '#ffffff', backgroundColor: null },
  'black': { color: '#000000', backgroundColor: null },
  'white-on-black': { color: '#ffffff', backgroundColor: '#000000' },
  'black-on-white': { color: '#000000', backgroundColor: '#ffffff' },
};
