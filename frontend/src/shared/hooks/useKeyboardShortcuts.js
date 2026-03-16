/**
 * AetherTrack 2030 Keyboard Shortcuts Registry
 * Reference: System_UI_Shift.md Section 5.4 - Keyboard Shortcuts
 * 
 * Shortcuts:
 * CMD+K  → Command palette     CMD+N → Create new (context-aware)
 * CMD+/  → Shortcut help       CMD+\ → Toggle sidebar
 * G→D    → Dashboard           G→T   → Tasks
 * G→P    → Projects            ?     → Page shortcuts
 * Escape → Close modals        Enter → Confirm
 * Tab    → Navigation
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Default Shortcuts
 */
export const DEFAULT_SHORTCUTS = [
  // Global Actions
  {
    key: 'cmd+k',
    aliases: ['ctrl+k'],
    description: 'Open command palette',
    category: 'global',
    global: true,
  },
  {
    key: 'cmd+n',
    aliases: ['ctrl+n'],
    description: 'Create new (context-aware)',
    category: 'actions',
    global: true,
  },
  {
    key: 'cmd+/',
    aliases: ['ctrl+/'],
    description: 'Show keyboard shortcuts',
    category: 'help',
    global: true,
  },
  {
    key: 'cmd+\\',
    aliases: ['ctrl+\\'],
    description: 'Toggle sidebar',
    category: 'navigation',
    global: true,
  },
  
  // Navigation
  {
    key: 'g d',
    description: 'Go to Dashboard',
    category: 'navigation',
    global: true,
  },
  {
    key: 'g t',
    description: 'Go to Tasks',
    category: 'navigation',
    global: true,
  },
  {
    key: 'g p',
    description: 'Go to Projects',
    category: 'navigation',
    global: true,
  },
  {
    key: 'g h',
    description: 'Go to HR',
    category: 'navigation',
    global: true,
  },
  {
    key: 'g c',
    description: 'Go to Calendar',
    category: 'navigation',
    global: true,
  },
  {
    key: 'g s',
    description: 'Go to Settings',
    category: 'navigation',
    global: true,
  },
  {
    key: '?',
    description: 'Show page shortcuts',
    category: 'help',
    global: true,
  },
  
  // Modal/Form Actions
  {
    key: 'escape',
    description: 'Cancel / Close modal',
    category: 'editor',
    global: true,
  },
  {
    key: 'enter',
    description: 'Confirm / Submit',
    category: 'editor',
    global: true,
  },
  {
    key: 'tab',
    description: 'Next field',
    category: 'navigation',
    global: true,
  },
  {
    key: 'shift+tab',
    description: 'Previous field',
    category: 'navigation',
    global: true,
  },
  
  // Task Shortcuts
  {
    key: 't n',
    description: 'New task',
    category: 'tasks',
  },
  {
    key: 't e',
    description: 'Edit selected task',
    category: 'tasks',
  },
  {
    key: 't d',
    description: 'Mark task as done',
    category: 'tasks',
  },
  
  // Editor Shortcuts
  {
    key: 'cmd+s',
    aliases: ['ctrl+s'],
    description: 'Save changes',
    category: 'editor',
  },
  {
    key: 'cmd+enter',
    aliases: ['ctrl+enter'],
    description: 'Submit / Confirm',
    category: 'editor',
  },
];

/**
 * Build key combination from event
 */
const buildKeyCombo = (e) => {
  let key = '';
  
  if (e.metaKey || e.ctrlKey) key += 'cmd+';
  if (e.altKey) key += 'alt+';
  if (e.shiftKey) key += 'shift+';
  
  // Normalize key names
  const rawKey = typeof e.key === 'string' ? e.key : '';
  if (!rawKey) return key;
  let keyName = rawKey.toLowerCase();
  if (keyName === ' ') keyName = 'space';
  if (keyName === 'backslash') keyName = '\\';
  
  return key + keyName;
};

/**
 * Keyboard Shortcuts Hook
 */
export const useKeyboardShortcuts = ({
  shortcuts = DEFAULT_SHORTCUTS,
  handlers = {},
  enabled = true,
  onCommandPalette,
  onEscape,
  onEnter,
  onTab,
} = {}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const shortcutMapRef = useRef(new Map());
  const gPressedRef = useRef(false);
  const contextRef = useRef(null);
  const [lastShortcut, setLastShortcut] = useState(null);

  // Build shortcut map with handlers
  useEffect(() => {
    const map = new Map();
    
    shortcuts.forEach((shortcut) => {
      const keys = [shortcut.key, ...(shortcut.aliases || [])];
      keys.forEach((key) => {
        map.set(key.toLowerCase(), {
          ...shortcut,
          handler: shortcut.handler || handlers[key] || handlers[shortcut.key],
        });
      });
    });

    shortcutMapRef.current = map;
  }, [shortcuts, handlers]);

  // Get current context based on route
  const getContext = useCallback(() => {
    const path = location.pathname;
    
    if (path.includes('/tasks')) return 'tasks';
    if (path.includes('/projects')) return 'projects';
    if (path.includes('/hr')) return 'hr';
    if (path.includes('/calendar')) return 'calendar';
    if (path.includes('/dashboard')) return 'dashboard';
    if (path.includes('/settings')) return 'settings';
    
    return 'default';
  }, [location.pathname]);

  // Get handler for navigation shortcuts
  const getNavHandler = useCallback((navKey) => {
    switch (navKey) {
      case 'g d':
      case 'dashboard':
        return () => navigate('/dashboard');
      case 'g t':
      case 'tasks':
        return () => navigate('/tasks');
      case 'g p':
      case 'projects':
        return () => navigate('/projects');
      case 'g h':
      case 'hr':
        return () => navigate('/hr/dashboard');
      case 'g c':
      case 'calendar':
        return () => navigate('/calendar');
      case 'g s':
      case 'settings':
        return () => navigate('/settings');
      default:
        return null;
    }
  }, [navigate]);

  // Handle key press
  const handleKeyDown = useCallback((e) => {
    if (!enabled) return;
    
    const target = e.target;
    const isInput = target.tagName === 'INPUT' || 
                   target.tagName === 'TEXTAREA' || 
                   target.isContentEditable;
    
    const keyCombo = buildKeyCombo(e);
    
    // Handle CMD+K - Command Palette
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      if (onCommandPalette) {
        e.preventDefault();
        onCommandPalette();
        setLastShortcut({ key: 'cmd+k', timestamp: Date.now() });
      }
      // Always skip further processing in this hook so other listeners (AppHeader) can fire
      return;
    }

    // Handle CMD+/ - Show keyboard shortcuts overlay
    if ((e.metaKey || e.ctrlKey) && e.key === '/') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('show-shortcuts-help'));
      setLastShortcut({ key: 'cmd+/', timestamp: Date.now() });
      return;
    }

    // Handle CMD+\ - Toggle sidebar
    if ((e.metaKey || e.ctrlKey) && (e.key === '\\' || e.key === '|')) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('toggle-sidebar'));
      setLastShortcut({ key: 'cmd+\\', timestamp: Date.now() });
      return;
    }
    
    // Handle Escape - Close modals
    if (e.key === 'Escape') {
      if (onEscape) {
        e.preventDefault();
        onEscape();
        setLastShortcut({ key: 'escape', timestamp: Date.now() });
      }
      return;
    }
    
    // Handle Enter - Confirm
    if (e.key === 'Enter' && !e.shiftKey) {
      if (onEnter && (target.tagName !== 'TEXTAREA' || e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onEnter();
        setLastShortcut({ key: 'enter', timestamp: Date.now() });
        return;
      }
    }
    
    // Handle Tab - Navigation
    if (e.key === 'Tab') {
      if (onTab) {
        e.preventDefault();
        onTab(e.shiftKey);
        setLastShortcut({ key: e.shiftKey ? 'shift+tab' : 'tab', timestamp: Date.now() });
        return;
      }
    }
    
    // Handle G→X navigation pattern (e.g. g then d = go to dashboard)
    // keyCombo for the second key is just 'd', NOT 'g+d', so we check gPressedRef only
    if (gPressedRef.current && !isInput) {
      gPressedRef.current = false; // reset regardless of match

      const navKey = `g ${e.key.toLowerCase()}`;
      const shortcut = shortcutMapRef.current.get(navKey);
      const navHandler = getNavHandler(navKey);

      if (shortcut?.handler || navHandler) {
        e.preventDefault();
        const handler = shortcut?.handler || navHandler;
        handler();
        setLastShortcut({ key: navKey, timestamp: Date.now() });
        return;
      }
    }
    
    // Check for 'g' key to start navigation
    if (keyCombo === 'g' && !isInput) {
      gPressedRef.current = true;
      contextRef.current = getContext();
      
      setTimeout(() => {
        if (gPressedRef.current) {
          gPressedRef.current = false;
        }
      }, 1000);
      
      return;
    }

    // Skip if typing in input (except for global shortcuts)
    if (isInput) {
      const shortcut = shortcutMapRef.current.get(keyCombo);
      if (shortcut?.global && shortcut?.handler) {
        e.preventDefault();
        shortcut.handler();
        setLastShortcut({ key: keyCombo, timestamp: Date.now() });
      }
      return;
    }

    // Find matching shortcut
    const shortcut = shortcutMapRef.current.get(keyCombo);
    
    if (shortcut?.handler) {
      e.preventDefault();
      shortcut.handler();
      setLastShortcut({ key: keyCombo, timestamp: Date.now() });
    }
  }, [enabled, onCommandPalette, onEscape, onEnter, onTab, getContext, getNavHandler]);

  // Register global listeners
  useEffect(() => {
    if (!enabled) return;
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);

  // Get shortcuts for current context
  const getContextShortcuts = useCallback(() => {
    const context = getContext();
    
    return shortcuts.filter((s) => {
      if (s.global) return true;
      if (!s.contexts) return true;
      return s.contexts.includes(context);
    });
  }, [shortcuts, getContext]);

  // Register a component-specific shortcut
  const registerShortcut = useCallback((key, handler, options = {}) => {
    const shortcut = {
      key,
      handler,
      ...options,
    };
    
    const keyLower = key.toLowerCase();
    shortcutMapRef.current.set(keyLower, shortcut);
    
    // Return unregister function
    return () => {
      shortcutMapRef.current.delete(keyLower);
    };
  }, []);

  return {
    shortcuts: getContextShortcuts(),
    allShortcuts: shortcuts,
    getContext,
    registerShortcut,
    lastShortcut,
  };
};

/**
 * Simple keyboard shortcuts without complex options
 */
export const useSimpleKeyboardShortcuts = (shortcuts = []) => {
  return useKeyboardShortcuts({ shortcuts });
};

/**
 * Keyboard Shortcut Listener Component
 * Use for page-specific shortcuts
 */
export const KeyboardShortcutProvider = ({ children, shortcuts = [], handlers = {}, enabled = true }) => {
  useKeyboardShortcuts({ shortcuts, handlers, enabled });
  return children;
};

/**
 * Command Palette Keyboard Handler Hook
 * Specialized hook for CMD+K command palette integration
 */
export const useCommandPalette = (isOpen, setIsOpen) => {
  return useKeyboardShortcuts({
    onCommandPalette: () => {
      setIsOpen(prev => !prev);
    },
    onEscape: () => {
      if (isOpen) {
        setIsOpen(false);
      }
    },
  });
};

/**
 * Modal Keyboard Handler Hook
 * Specialized hook for modal escape/enter handling
 */
export const useModalKeyboard = (isOpen, onClose, onConfirm) => {
  return useKeyboardShortcuts({
    onEscape: () => {
      if (isOpen && onClose) {
        onClose();
      }
    },
    onEnter: () => {
      if (isOpen && onConfirm) {
        onConfirm();
      }
    },
  });
};

export default useKeyboardShortcuts;
