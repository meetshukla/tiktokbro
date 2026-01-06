'use client';

import React, { createContext, useContext, useReducer, ReactNode, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ReactionListItem, Reaction, UGCReactionSession } from '@/types';
import * as api from '@/lib/api-client';

interface ReactionState {
  session: UGCReactionSession | null;
  reactions: ReactionListItem[];
  categories: string[];
  selectedCategory: string | null;
  selectedReaction: Reaction | null;
  avatarFile: File | null;
  avatarPreviewUrl: string | null;
  isLoading: boolean;
  loadingMessage: string | null;
  error: string | null;
}

type ReactionAction =
  | { type: 'SET_REACTIONS'; payload: ReactionListItem[] }
  | { type: 'SET_CATEGORIES'; payload: string[] }
  | { type: 'SET_SELECTED_CATEGORY'; payload: string | null }
  | { type: 'SET_SELECTED_REACTION'; payload: Reaction | null }
  | { type: 'SET_AVATAR_FILE'; payload: { file: File; previewUrl: string } }
  | { type: 'CLEAR_AVATAR' }
  | { type: 'SET_SESSION'; payload: UGCReactionSession }
  | { type: 'UPDATE_SESSION'; payload: Partial<UGCReactionSession> }
  | { type: 'SET_LOADING'; payload: { loading: boolean; message?: string | null } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET' };

const initialState: ReactionState = {
  session: null,
  reactions: [],
  categories: [],
  selectedCategory: null,
  selectedReaction: null,
  avatarFile: null,
  avatarPreviewUrl: null,
  isLoading: false,
  loadingMessage: null,
  error: null,
};

function reactionReducer(state: ReactionState, action: ReactionAction): ReactionState {
  switch (action.type) {
    case 'SET_REACTIONS':
      return { ...state, reactions: action.payload };

    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload };

    case 'SET_SELECTED_CATEGORY':
      return { ...state, selectedCategory: action.payload };

    case 'SET_SELECTED_REACTION':
      return { ...state, selectedReaction: action.payload };

    case 'SET_AVATAR_FILE':
      return {
        ...state,
        avatarFile: action.payload.file,
        avatarPreviewUrl: action.payload.previewUrl,
      };

    case 'CLEAR_AVATAR':
      return {
        ...state,
        avatarFile: null,
        avatarPreviewUrl: null,
      };

    case 'SET_SESSION':
      return { ...state, session: action.payload };

    case 'UPDATE_SESSION':
      if (!state.session) return state;
      return {
        ...state,
        session: { ...state.session, ...action.payload },
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload.loading,
        loadingMessage: action.payload.message ?? null,
      };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

interface ReactionContextValue {
  state: ReactionState;
  // Data fetching
  loadReactions: () => Promise<void>;
  loadCategories: () => Promise<void>;
  loadReaction: (reactionId: string) => Promise<void>;
  // Session management
  initSession: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  // Workflow actions
  setAvatarFile: (file: File) => void;
  clearAvatar: () => void;
  selectCategory: (category: string | null) => void;
  selectReaction: (reactionId: string) => Promise<void>;
  uploadAvatar: () => Promise<void>;
  generateImages: () => Promise<void>;
  selectImage: (imageId: string) => Promise<void>;
  generateVideo: () => Promise<void>;
  // Utilities
  reset: () => void;
  clearError: () => void;
}

const ReactionContext = createContext<ReactionContextValue | null>(null);

export function ReactionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reactionReducer, initialState);

  // Load all reactions
  const loadReactions = useCallback(async () => {
    try {
      dispatch({
        type: 'SET_LOADING',
        payload: { loading: true, message: 'Loading reactions...' },
      });
      const response = await api.fetchReactions();
      if (response.success && response.data) {
        dispatch({ type: 'SET_REACTIONS', payload: response.data });
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Failed to load reactions' });
      }
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to load reactions',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { loading: false } });
    }
  }, []);

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      const response = await api.getReactionCategories();
      if (response.success && response.data) {
        dispatch({ type: 'SET_CATEGORIES', payload: response.data });
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, []);

  // Load a single reaction
  const loadReaction = useCallback(async (reactionId: string) => {
    try {
      const response = await api.getReaction(reactionId);
      if (response.success && response.data) {
        dispatch({ type: 'SET_SELECTED_REACTION', payload: response.data });
      }
    } catch (error) {
      console.error('Failed to load reaction:', error);
    }
  }, []);

  // Initialize a new session
  const initSession = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: { loading: true, message: 'Creating session...' } });
      const sessionId = uuidv4();
      const response = await api.createUGCReactionSession(sessionId);
      if (response.success && response.data) {
        dispatch({ type: 'SET_SESSION', payload: response.data });
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Failed to create session' });
      }
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to create session',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { loading: false } });
    }
  }, []);

  // Load an existing session
  const loadSession = useCallback(async (sessionId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: { loading: true, message: 'Loading session...' } });
      const response = await api.getUGCReactionSession(sessionId);
      if (response.success && response.data) {
        dispatch({ type: 'SET_SESSION', payload: response.data });
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Failed to load session' });
      }
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to load session',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { loading: false } });
    }
  }, []);

  // Set avatar file
  const setAvatarFile = useCallback((file: File) => {
    const previewUrl = URL.createObjectURL(file);
    dispatch({ type: 'SET_AVATAR_FILE', payload: { file, previewUrl } });
  }, []);

  // Clear avatar
  const clearAvatar = useCallback(() => {
    if (state.avatarPreviewUrl) {
      URL.revokeObjectURL(state.avatarPreviewUrl);
    }
    dispatch({ type: 'CLEAR_AVATAR' });
  }, [state.avatarPreviewUrl]);

  // Select category
  const selectCategory = useCallback((category: string | null) => {
    dispatch({ type: 'SET_SELECTED_CATEGORY', payload: category });
  }, []);

  // Select reaction
  const selectReactionAction = useCallback(
    async (reactionId: string) => {
      if (!state.session) return;
      try {
        dispatch({
          type: 'SET_LOADING',
          payload: { loading: true, message: 'Selecting reaction...' },
        });
        const response = await api.selectReaction(state.session.sessionId, reactionId);
        if (response.success && response.data) {
          dispatch({ type: 'SET_SESSION', payload: response.data });
          await loadReaction(reactionId);
        } else {
          dispatch({ type: 'SET_ERROR', payload: response.error || 'Failed to select reaction' });
        }
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload: error instanceof Error ? error.message : 'Failed to select reaction',
        });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: { loading: false } });
      }
    },
    [state.session, loadReaction]
  );

  // Upload avatar
  const uploadAvatar = useCallback(async () => {
    if (!state.session || !state.avatarFile) return;
    try {
      dispatch({ type: 'SET_LOADING', payload: { loading: true, message: 'Uploading avatar...' } });

      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(state.avatarFile);
      const base64Data = await base64Promise;

      const response = await api.uploadAvatarImage(
        state.session.sessionId,
        base64Data,
        state.avatarFile.type
      );
      if (response.success && response.data) {
        dispatch({ type: 'SET_SESSION', payload: response.data });
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Failed to upload avatar' });
      }
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to upload avatar',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { loading: false } });
    }
  }, [state.session, state.avatarFile]);

  // Generate avatar images
  const generateImages = useCallback(async () => {
    if (!state.session) return;
    try {
      dispatch({
        type: 'SET_LOADING',
        payload: {
          loading: true,
          message: 'Generating avatar images... This may take 30-60 seconds.',
        },
      });
      dispatch({ type: 'UPDATE_SESSION', payload: { stage: 'generating-images' } });

      const response = await api.generateAvatarImages(state.session.sessionId);
      if (response.success && response.data) {
        dispatch({ type: 'SET_SESSION', payload: response.data });
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Failed to generate images' });
      }
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to generate images',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { loading: false } });
    }
  }, [state.session]);

  // Select generated image
  const selectImage = useCallback(
    async (imageId: string) => {
      if (!state.session) return;
      try {
        dispatch({
          type: 'SET_LOADING',
          payload: { loading: true, message: 'Selecting image...' },
        });
        const response = await api.selectGeneratedImage(state.session.sessionId, imageId);
        if (response.success && response.data) {
          dispatch({ type: 'SET_SESSION', payload: response.data });
        } else {
          dispatch({ type: 'SET_ERROR', payload: response.error || 'Failed to select image' });
        }
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload: error instanceof Error ? error.message : 'Failed to select image',
        });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: { loading: false } });
      }
    },
    [state.session]
  );

  // Generate video
  const generateVideo = useCallback(async () => {
    if (!state.session) return;
    try {
      dispatch({
        type: 'SET_LOADING',
        payload: { loading: true, message: 'Generating video... This may take 2-5 minutes.' },
      });
      dispatch({ type: 'UPDATE_SESSION', payload: { stage: 'generating-video' } });

      const response = await api.generateReactionVideo(state.session.sessionId);
      if (response.success && response.data) {
        dispatch({ type: 'SET_SESSION', payload: response.data });
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Failed to generate video' });
      }
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to generate video',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { loading: false } });
    }
  }, [state.session]);

  // Reset and start fresh
  const reset = useCallback(async () => {
    if (state.avatarPreviewUrl) {
      URL.revokeObjectURL(state.avatarPreviewUrl);
    }
    dispatch({ type: 'RESET' });
    // Create a new session after resetting
    await initSession();
  }, [state.avatarPreviewUrl, initSession]);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const value: ReactionContextValue = {
    state,
    loadReactions,
    loadCategories,
    loadReaction,
    initSession,
    loadSession,
    setAvatarFile,
    clearAvatar,
    selectCategory,
    selectReaction: selectReactionAction,
    uploadAvatar,
    generateImages,
    selectImage,
    generateVideo,
    reset,
    clearError,
  };

  return <ReactionContext.Provider value={value}>{children}</ReactionContext.Provider>;
}

export function useReactionContext() {
  const context = useContext(ReactionContext);
  if (!context) {
    throw new Error('useReactionContext must be used within a ReactionProvider');
  }
  return context;
}
