'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  WorkflowStage,
  SlidePlan,
  GeneratedSlide,
  ImageConfig,
  SlideshowSession,
  TextOverlay,
  TikTokScrapeResult,
  SlideAnalysis,
  RemixPlan,
  PinterestCandidate,
} from '@/types';

interface SlideshowState {
  session: SlideshowSession | null;
}

type SlideshowAction =
  | { type: 'INIT_SESSION'; payload: { prompt: string; config: ImageConfig } }
  | { type: 'RESTORE_SESSION'; payload: SlideshowSession }
  | { type: 'SET_STAGE'; payload: WorkflowStage }
  | { type: 'SET_PLANS'; payload: SlidePlan[] }
  | { type: 'UPDATE_PLAN'; payload: { slideNumber: number; updates: Partial<SlidePlan> } }
  | { type: 'INIT_SLIDES'; payload: SlidePlan[] }
  | { type: 'SET_SLIDES'; payload: GeneratedSlide[] }
  | { type: 'UPDATE_SLIDE'; payload: { id: string; updates: Partial<GeneratedSlide> } }
  | { type: 'UPDATE_TEXT_OVERLAY'; payload: { id: string; overlay: TextOverlay } }
  | { type: 'RESET' }
  // TikTok import actions
  | {
      type: 'INIT_IMPORT_SESSION';
      payload: { tiktokData: TikTokScrapeResult; config: ImageConfig };
    }
  | { type: 'SET_SLIDE_ANALYSES'; payload: SlideAnalysis[] }
  | { type: 'SET_REMIX_PLANS'; payload: RemixPlan[] }
  | { type: 'UPDATE_REMIX_PLAN'; payload: { slideNumber: number; updates: Partial<RemixPlan> } }
  | {
      type: 'SET_PINTEREST_CANDIDATES';
      payload: { slideNumber: number; candidates: PinterestCandidate[] };
    }
  | { type: 'SET_PRODUCT_CONTEXT'; payload: string }
  | { type: 'DELETE_REMIX_PLAN'; payload: number };

const initialState: SlideshowState = {
  session: null,
};

function slideshowReducer(state: SlideshowState, action: SlideshowAction): SlideshowState {
  switch (action.type) {
    case 'INIT_SESSION':
      return {
        session: {
          id: uuidv4(),
          prompt: action.payload.prompt,
          stage: 'planning',
          plans: [],
          slides: [],
          config: action.payload.config,
        },
      };

    case 'RESTORE_SESSION':
      return {
        session: action.payload,
      };

    case 'INIT_IMPORT_SESSION':
      return {
        session: {
          id: uuidv4(),
          prompt: '',
          stage: 'analyzing',
          plans: [],
          slides: [],
          config: action.payload.config,
          tiktokData: action.payload.tiktokData,
          slideAnalyses: [],
          remixPlans: [],
        },
      };

    case 'SET_STAGE':
      if (!state.session) return state;
      return {
        session: { ...state.session, stage: action.payload },
      };

    case 'SET_PLANS':
      if (!state.session) return state;
      return {
        session: { ...state.session, plans: action.payload, stage: 'review' },
      };

    case 'SET_SLIDE_ANALYSES':
      if (!state.session) return state;
      return {
        session: { ...state.session, slideAnalyses: action.payload },
      };

    case 'SET_REMIX_PLANS':
      if (!state.session) return state;
      return {
        session: { ...state.session, remixPlans: action.payload, stage: 'remix-review' },
      };

    case 'UPDATE_REMIX_PLAN':
      if (!state.session || !state.session.remixPlans) return state;
      return {
        session: {
          ...state.session,
          remixPlans: state.session.remixPlans.map((plan) =>
            plan.slideNumber === action.payload.slideNumber
              ? { ...plan, ...action.payload.updates }
              : plan
          ),
        },
      };

    case 'SET_PINTEREST_CANDIDATES':
      if (!state.session || !state.session.remixPlans) return state;
      return {
        session: {
          ...state.session,
          remixPlans: state.session.remixPlans.map((plan) =>
            plan.slideNumber === action.payload.slideNumber
              ? { ...plan, pinterestCandidates: action.payload.candidates }
              : plan
          ),
        },
      };

    case 'UPDATE_PLAN':
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          plans: state.session.plans.map((plan) =>
            plan.slideNumber === action.payload.slideNumber
              ? { ...plan, ...action.payload.updates }
              : plan
          ),
        },
      };

    case 'INIT_SLIDES':
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          stage: 'generating',
          slides: action.payload.map((plan) => ({
            id: uuidv4(),
            slideNumber: plan.slideNumber,
            plan,
            status: 'pending',
          })),
        },
      };

    case 'SET_SLIDES':
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          slides: action.payload,
        },
      };

    case 'UPDATE_SLIDE':
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          slides: state.session.slides.map((slide) =>
            slide.id === action.payload.id ? { ...slide, ...action.payload.updates } : slide
          ),
        },
      };

    case 'UPDATE_TEXT_OVERLAY':
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          slides: state.session.slides.map((slide) =>
            slide.id === action.payload.id
              ? { ...slide, textOverlay: action.payload.overlay }
              : slide
          ),
        },
      };

    case 'RESET':
      return initialState;

    case 'SET_PRODUCT_CONTEXT':
      if (!state.session) return state;
      return {
        session: { ...state.session, productContext: action.payload },
      };

    case 'DELETE_REMIX_PLAN':
      if (!state.session || !state.session.remixPlans) return state;
      const filteredPlans = state.session.remixPlans
        .filter((plan) => plan.slideNumber !== action.payload)
        .map((plan, index) => ({ ...plan, slideNumber: index + 1 }));
      return {
        session: {
          ...state.session,
          remixPlans: filteredPlans,
        },
      };

    default:
      return state;
  }
}

interface SlideshowContextValue {
  session: SlideshowSession | null;
  initSession: (prompt: string, config: ImageConfig) => void;
  restoreSession: (session: SlideshowSession) => void;
  initImportSession: (tiktokData: TikTokScrapeResult, config: ImageConfig) => void;
  setStage: (stage: WorkflowStage) => void;
  setPlans: (plans: SlidePlan[]) => void;
  updatePlan: (slideNumber: number, updates: Partial<SlidePlan>) => void;
  setSlideAnalyses: (analyses: SlideAnalysis[]) => void;
  setRemixPlans: (plans: RemixPlan[]) => void;
  updateRemixPlan: (slideNumber: number, updates: Partial<RemixPlan>) => void;
  deleteRemixPlan: (slideNumber: number) => void;
  setPinterestCandidates: (slideNumber: number, candidates: PinterestCandidate[]) => void;
  initSlides: (plans: SlidePlan[]) => void;
  setSlides: (slides: GeneratedSlide[]) => void;
  updateSlide: (id: string, updates: Partial<GeneratedSlide>) => void;
  updateTextOverlay: (id: string, overlay: TextOverlay) => void;
  setProductContext: (context: string) => void;
  reset: () => void;
}

const SlideshowContext = createContext<SlideshowContextValue | null>(null);

export function SlideshowProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(slideshowReducer, initialState);

  const value: SlideshowContextValue = {
    session: state.session,
    initSession: (prompt, config) =>
      dispatch({ type: 'INIT_SESSION', payload: { prompt, config } }),
    restoreSession: (session) => dispatch({ type: 'RESTORE_SESSION', payload: session }),
    initImportSession: (tiktokData, config) =>
      dispatch({ type: 'INIT_IMPORT_SESSION', payload: { tiktokData, config } }),
    setStage: (stage) => dispatch({ type: 'SET_STAGE', payload: stage }),
    setPlans: (plans) => dispatch({ type: 'SET_PLANS', payload: plans }),
    updatePlan: (slideNumber, updates) =>
      dispatch({ type: 'UPDATE_PLAN', payload: { slideNumber, updates } }),
    setSlideAnalyses: (analyses) => dispatch({ type: 'SET_SLIDE_ANALYSES', payload: analyses }),
    setRemixPlans: (plans) => dispatch({ type: 'SET_REMIX_PLANS', payload: plans }),
    updateRemixPlan: (slideNumber, updates) =>
      dispatch({ type: 'UPDATE_REMIX_PLAN', payload: { slideNumber, updates } }),
    deleteRemixPlan: (slideNumber) => dispatch({ type: 'DELETE_REMIX_PLAN', payload: slideNumber }),
    setPinterestCandidates: (slideNumber, candidates) =>
      dispatch({ type: 'SET_PINTEREST_CANDIDATES', payload: { slideNumber, candidates } }),
    initSlides: (plans) => dispatch({ type: 'INIT_SLIDES', payload: plans }),
    setSlides: (slides) => dispatch({ type: 'SET_SLIDES', payload: slides }),
    updateSlide: (id, updates) => dispatch({ type: 'UPDATE_SLIDE', payload: { id, updates } }),
    updateTextOverlay: (id, overlay) =>
      dispatch({ type: 'UPDATE_TEXT_OVERLAY', payload: { id, overlay } }),
    setProductContext: (context) => dispatch({ type: 'SET_PRODUCT_CONTEXT', payload: context }),
    reset: () => dispatch({ type: 'RESET' }),
  };

  return <SlideshowContext.Provider value={value}>{children}</SlideshowContext.Provider>;
}

export function useSlideshowContext() {
  const context = useContext(SlideshowContext);
  if (!context) {
    throw new Error('useSlideshowContext must be used within a SlideshowProvider');
  }
  return context;
}
