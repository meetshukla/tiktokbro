# TikTok Slideshow Generator

A web application for generating TikTok-style image slideshows using AI. Users write a prompt, AI generates a slide plan, then generates images for each slide using Google's Imagen API.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js + Express + TypeScript (separate server)
- **AI**: Google Gemini API (text generation) + Imagen 4 API (image generation)
- **Canvas**: Fabric.js for text overlay editing

## Project Structure

```
TiktokBro/
├── frontend/                     # Next.js 15 frontend (port 3000)
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx          # Main split-panel layout
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── ui/               # shadcn components
│   │   │   └── slideshow/
│   │   │       ├── PromptPanel.tsx      # Left panel - prompt input, config
│   │   │       ├── PreviewPanel.tsx     # Right panel - workflow stages
│   │   │       ├── SlidePlanReview.tsx  # Edit slide plans before generation
│   │   │       ├── SlideCard.tsx        # Individual slide thumbnail
│   │   │       ├── SlideEditor.tsx      # Fabric.js canvas for text overlays
│   │   │       └── DownloadPanel.tsx    # Download individual/all slides
│   │   ├── context/
│   │   │   └── SlideshowContext.tsx     # React Context + useReducer state
│   │   ├── hooks/
│   │   │   └── useSlideshowGenerator.ts # API calls, generation logic
│   │   ├── lib/
│   │   │   ├── api-client.ts            # Fetch wrapper for backend
│   │   │   └── utils.ts                 # cn() helper
│   │   └── types/
│   │       └── index.ts                 # Shared TypeScript types
│   └── .env.local                       # NEXT_PUBLIC_API_URL
│
└── backend/                      # Express backend (port 3001)
    ├── src/
    │   ├── index.ts              # Express app entry point
    │   ├── routes/
    │   │   ├── index.ts          # Route aggregator
    │   │   ├── plan.routes.ts    # POST /api/generate-plan
    │   │   └── image.routes.ts   # POST /api/generate-image
    │   ├── services/
    │   │   ├── gemini.service.ts # GoogleGenAI client initialization
    │   │   ├── plan.service.ts   # Gemini text model for slide planning
    │   │   └── image.service.ts  # Imagen 4 API for image generation
    │   └── types/
    │       └── index.ts          # Backend types
    └── .env                      # GEMINI_API_KEY, PORT
```

## User Flow

1. **Prompt Stage**: User enters a prompt describing their slideshow idea
   - Configure: slide count (3-6), aspect ratio (9:16, 1:1, 16:9), model selection

2. **Planning Stage**: Gemini generates slide plans with:
   - Content (main message)
   - Image prompt (for Imagen)
   - Suggested text overlay

3. **Review Stage**: User can edit slide plans before generation
   - Modify content, image prompts, overlay text

4. **Generating Stage**: Images generated sequentially via Imagen 4 API
   - Progress indicator shows completion status
   - Each slide shows loading/complete/error state

5. **Editing Stage**: User edits slides with Fabric.js canvas
   - Add/remove text overlays
   - Change font, size, color
   - Drag to position text
   - Save changes exports canvas with text baked in

6. **Download Stage**: Download individual slides or all as ZIP
   - Uses edited version with text overlays when available

## API Endpoints

### POST /api/generate-plan
- **Input**: `{ prompt: string, slideCount: number }`
- **Output**: `{ success: boolean, plans: SlidePlan[] }`
- Uses Gemini 2.0 Flash for text generation

### POST /api/generate-image
- **Input**: `{ imagePrompt: string, aspectRatio: string, model: string }`
- **Output**: `{ success: boolean, imageData: string }` (base64)
- Uses Imagen 4 models:
  - `imagen-4.0-generate-001` (quality)
  - `imagen-4.0-fast-generate-001` (faster)

## Core Types

```typescript
type WorkflowStage = 'prompt' | 'planning' | 'review' | 'generating' | 'editing' | 'complete';

interface SlidePlan {
  slideNumber: number;
  content: string;
  imagePrompt: string;
  suggestedOverlay?: string;
}

interface GeneratedSlide {
  id: string;
  slideNumber: number;
  plan: SlidePlan;
  imageData?: string;           // Base64 from Imagen
  editedImageData?: string;     // Canvas export with text overlay
  status: 'pending' | 'generating' | 'complete' | 'error';
  error?: string;
  textOverlay?: TextOverlay;
}

interface TextOverlay {
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  position: { x: number; y: number };
}

interface ImageConfig {
  aspectRatio: '9:16' | '1:1' | '16:9';
  model: 'imagen-4.0-generate-001' | 'imagen-4.0-fast-generate-001';
  slideCount: number;
}
```

## State Management

Uses React Context with useReducer in `SlideshowContext.tsx`:

- `INIT_SESSION` - Start new session with prompt and config
- `SET_STAGE` - Change workflow stage
- `SET_PLANS` - Store generated slide plans
- `UPDATE_PLAN` - Edit individual plan before generation
- `SET_SLIDES` - Update all slides (used during generation)
- `UPDATE_SLIDE` - Update single slide
- `UPDATE_TEXT_OVERLAY` - Save text overlay to slide
- `RESET` - Clear session, start over

## Key Implementation Details

### Image Generation (backend/src/services/image.service.ts)
- Uses `ai.models.generateImages()` API (not generateContent)
- Enhances prompts with TikTok-style keywords
- Returns base64 image bytes directly

### Slide Editor (SlideEditor.tsx)
- Fabric.js canvas for text manipulation
- Two-way sync: canvas selection updates controls, control changes update canvas
- Saves both TextOverlay config and editedImageData (canvas snapshot)
- Dirty state tracking for save button

### Download (DownloadPanel.tsx)
- Uses `editedImageData` when available (includes text overlays)
- Falls back to original `imageData` if no edits
- JSZip for downloading all slides as ZIP

## Environment Variables

### Backend (.env)
```
GEMINI_API_KEY=your_api_key
PORT=3001
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Running the App

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Requires Node.js 20+ (use `nvm use 22`)

## Dependencies

### Backend
- `@google/genai` - Google AI SDK
- `express`, `cors`, `dotenv`
- `typescript`, `tsx` (dev)

### Frontend
- `next`, `react`
- `fabric` - Canvas library
- `jszip` - ZIP file generation
- `uuid` - ID generation
- `sonner` - Toast notifications
- shadcn/ui components (button, card, input, select, etc.)
