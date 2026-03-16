/**
 * AetherTrack 2030 Command Palette
 * Reference: System_UI_Shift.md Section 2.3 & Section 4.5
 * 
 * Features:
 * - Trigger: CMD+K / Ctrl+K
 * - Default: Recent items list
 * - Search: Fuzzy match across pages, tasks, projects, users, settings
 * - Nav: ↑↓ to move, Enter to select, Esc to close
 * - Actions: "Create task", "Go to HR", "Switch theme"
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';

/**
 * Command Palette Item Types
 */
const ITEM_TYPES = {
  RECENT: 'recent',
  NAVIGATION: 'navigation',
  ACTION: 'action',
  TASK: 'task',
  PROJECT: 'project',
  USER: 'user',
  SETTINGS: 'settings',
};

/**
 * Default navigation items
 */
const NAVIGATION_ITEMS = [
  { id: 'dashboard', label: 'Go to Dashboard', path: '/dashboard', icon: '📊', type: ITEM_TYPES.NAVIGATION },
  { id: 'tasks', label: 'Go to Tasks', path: '/tasks', icon: '✅', type: ITEM_TYPES.NAVIGATION },
  { id: 'kanban', label: 'Go to Kanban Board', path: '/kanban', icon: '📋', type: ITEM_TYPES.NAVIGATION },
  { id: 'calendar', label: 'Go to Calendar', path: '/calendar', icon: '📅', type: ITEM_TYPES.NAVIGATION },
  { id: 'projects', label: 'Go to Projects', path: '/projects', icon: '📁', type: ITEM_TYPES.NAVIGATION },
  { id: 'hr-dashboard', label: 'Go to HR Dashboard', path: '/hr/dashboard', icon: '👥', type: ITEM_TYPES.NAVIGATION },
  { id: 'hr-attendance', label: 'Go to Attendance', path: '/hr/attendance', icon: '⏰', type: ITEM_TYPES.NAVIGATION },
  { id: 'hr-leaves', label: 'Go to Leave Management', path: '/hr/leaves', icon: '🏖️', type: ITEM_TYPES.NAVIGATION },
  { id: 'settings', label: 'Go to Settings', path: '/settings', icon: '⚙️', type: ITEM_TYPES.NAVIGATION },
  { id: 'analytics', label: 'Go to Analytics', path: '/analytics', icon: '📈', type: ITEM_TYPES.NAVIGATION },
];

/**
 * Default actions
 */
const ACTION_ITEMS = [
  { id: 'create-task', label: 'Create New Task', action: 'create-task', icon: '➕', type: ITEM_TYPES.ACTION },
  { id: 'create-project', label: 'Create New Project', action: 'create-project', icon: '📂', type: ITEM_TYPES.ACTION },
  { id: 'toggle-theme', label: 'Toggle Theme', action: 'toggle-theme', icon: '🌓', type: ITEM_TYPES.ACTION },
  { id: 'search', label: 'Search Everything', action: 'search', icon: '🔍', type: ITEM_TYPES.ACTION },
];

/**
 * Fuzzy search implementation
 */
const fuzzyMatch = (text, query) => {
  if (!query) return true;
  
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  let queryIndex = 0;
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
    }
  }
  
  return queryIndex === queryLower.length;
};

/**
 * Command Palette Component
 */
const CommandPalette = ({ 
  isOpen, 
  onClose, 
  onThemeToggle,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentItems, setRecentItems] = useState([]);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Load recent items from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('commandPaletteRecent');
    if (saved) {
      try {
        setRecentItems(JSON.parse(saved));
      } catch (e) {
        setRecentItems([]);
      }
    }
  }, []);

  // Save recent items to localStorage
  const saveRecentItem = useCallback((item) => {
    setRecentItems(prev => {
      const filtered = prev.filter(i => i.id !== item.id);
      const newItems = [item, ...filtered].slice(0, 5);
      localStorage.setItem('commandPaletteRecent', JSON.stringify(newItems));
      return newItems;
    });
  }, []);

  // Filter items based on query
  const filteredItems = useMemo(() => {
    if (!query) {
      // Show recent items first, then navigation, then actions
      return [
        ...recentItems,
        ...NAVIGATION_ITEMS,
        ...ACTION_ITEMS,
      ].slice(0, 10);
    }

    const allItems = [
      ...NAVIGATION_ITEMS,
      ...ACTION_ITEMS,
    ];

    return allItems.filter(item => 
      fuzzyMatch(item.label, query)
    ).slice(0, 10);
  }, [query, recentItems]);

  // Reset selection when filtered items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);

  // Reset query & selection each time the palette opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      // Defer focus so the DOM is ready after the conditional render
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && isOpen) {
      const selectedItem = listRef.current.children[selectedIndex];
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, isOpen]);

  // Handle item selection
  const handleSelect = useCallback((item) => {
    if (item.type === ITEM_TYPES.NAVIGATION) {
      saveRecentItem(item);
      navigate(item.path);
      onClose();
    } else if (item.type === ITEM_TYPES.ACTION) {
      switch (item.action) {
        case 'toggle-theme':
          onThemeToggle?.();
          break;
        case 'create-task':
          navigate('/tasks?create=true');
          break;
        case 'create-project':
          navigate('/projects?create=true');
          break;
        case 'search':
          // Focus search input
          break;
        default:
          break;
      }
      onClose();
    }
  }, [navigate, onClose, saveRecentItem, onThemeToggle]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredItems.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredItems.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          handleSelect(filteredItems[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      default:
        break;
    }
  }, [isOpen, filteredItems, selectedIndex, onClose, handleSelect]);

  // Global keyboard shortcut (CMD+K / Ctrl+K)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9100] flex items-start justify-center pt-[10vh] sm:pt-[15vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Palette */}
      <div 
        className="relative w-full max-w-xl bg-[var(--bg-raised)] rounded-[var(--r-xl)] shadow-[var(--shadow-xl)] border border-[var(--border-soft)] overflow-hidden animate-scale-in"
        style={{ maxHeight: 'calc(100vh - 12vh - 2rem)' }}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 border-b border-[var(--border-hair)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }} aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search commands, pages, tasks..."
            className="flex-1 py-4 bg-transparent border-none outline-none text-[var(--text-primary)] placeholder:text-[var(--text-faint)] text-[15px]"
            aria-label="Search"
            aria-autocomplete="list"
            aria-controls="command-list"
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-xs text-[var(--text-muted)] bg-[var(--bg-surface)] border border-[var(--border-mid)] rounded-[var(--r-sm)] flex-none">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <ul 
          ref={listRef}
          id="command-list"
          className="overflow-y-auto py-2"
          style={{ maxHeight: 'min(320px, 45vh)' }}
          role="listbox"
          aria-label="Command results"
        >
          {filteredItems.length === 0 ? (
            <li className="px-4 py-8 text-center text-[var(--text-muted)]">
              No results found
            </li>
          ) : (
            filteredItems.map((item, index) => (
              <li
                key={item.id}
                role="option"
                aria-selected={index === selectedIndex}
                className={`
                  flex items-center px-4 py-3 cursor-pointer mx-2 rounded-[var(--r-md)]
                  transition-colors duration-[var(--fast)]
                  ${index === selectedIndex 
                    ? 'bg-[var(--brand)] text-[var(--bg-canvas)]' 
                    : 'hover:bg-[var(--bg-base)]'
                  }
                `}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="mr-3 text-lg" aria-hidden="true">
                  {item.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {item.label}
                  </div>
                  {item.path && (
                    <div className={`text-sm truncate ${
                      index === selectedIndex 
                        ? 'text-[var(--bg-canvas)]/70' 
                        : 'text-[var(--text-muted)]'
                    }`}>
                      {item.path}
                    </div>
                  )}
                </div>
                {index === selectedIndex && (
                  <span className="text-sm opacity-70 ml-2">
                    ↵
                  </span>
                )}
              </li>
            ))
          )}
        </ul>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-hair)] text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[var(--bg-surface)] rounded">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[var(--bg-surface)] rounded">↵</kbd>
              Select
            </span>
          </div>
          <span>Press ⌘K to open</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Command Palette Trigger Button
 */
const CommandPaletteTrigger = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] bg-[var(--bg-base)] hover:bg-[var(--bg-surface)] rounded-[var(--r-md)] transition-colors duration-[var(--fast)] border border-[var(--border-hair)] min-h-[var(--size-touch-target)]"
      aria-label="Open command palette"
    >
      <span aria-hidden="true">🔍</span>
      <span className="hidden sm:inline">Search...</span>
      <kbd className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-[var(--bg-raised)] rounded-[var(--r-sm)]">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
};

export default CommandPalette;
export { CommandPalette, CommandPaletteTrigger, ITEM_TYPES };
