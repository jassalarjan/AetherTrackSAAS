/**
 * AetherTrack 2030 Hooks Index
 * All hooks exported for easy importing
 */

// Contexts
export { useAuth, AuthProvider } from '../context/AuthContext';
export { useTheme, ThemeProvider } from '../context/ThemeContext';
export { useSidebar, SidebarProvider, SHELL_MODES } from '../context/SidebarContext';

// Phase 4 - Interaction Layer
export { 
  useOptimisticUpdate, 
  useOptimisticMutation, 
  useBatchOptimisticUpdate 
} from './useOptimisticUpdate';

export { 
  useInlineEdit, 
  InlineText, 
  InlineTextInput, 
  InlineTextarea, 
  InlineSelect 
} from './useInlineEdit';

export { 
  useKeyboardShortcuts, 
  useCommandPalette,
  useModalKeyboard,
  useSimpleKeyboardShortcuts,
  KeyboardShortcutProvider,
  DEFAULT_SHORTCUTS 
} from './useKeyboardShortcuts';

export { 
  useDragAndDrop, 
  useSortable, 
  useDraggable, 
  useDropZone,
  DRAG_TYPES 
} from './useDragAndDrop';

export { 
  useRealtimePresence, 
  useLiveFieldSync, 
  useActivityFeed 
} from './useRealtimePresence';

// Components - Phase 2
export { AISuggestion, AIAlertCallout, useAISuggestions, AI_TYPES } from '../components/AISuggestion';

// Utility hooks
export { useDebounce, useDebouncedCallback } from '../utils/useDebounce';
export { useClickOutside } from '../utils/useClickOutside';

// Re-export from existing hooks
export { useActivityTracker } from './useActivityTracker';
export { useConfirmModal } from './useConfirmModal';
export { useMeetings } from './useMeetings';
export { useNotifications } from './useNotifications';
export { useShifts } from './useShifts';
export { useVerification } from './useVerification';
export { useRealtimeSync } from './useRealtimeSync';
