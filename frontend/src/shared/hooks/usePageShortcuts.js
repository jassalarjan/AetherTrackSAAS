/**
 * usePageShortcuts
 * Registers page-specific keyboard shortcuts that only fire when
 * the user is NOT typing in an input / textarea / select / contenteditable.
 *
 * Also listens for the global 'show-shortcuts-help' CustomEvent so that the
 * AppHeader '?' button can open the overlay on any page.
 *
 * Usage:
 *   const { showHelp, setShowHelp } = usePageShortcuts(shortcuts);
 *
 * Shortcut shape:
 *   { key: string, ctrl?: bool, meta?: bool, alt?: bool, shift?: bool,
 *     label: string, description?: string, action: () => void }
 */

import { useEffect, useRef, useState } from 'react';

export function usePageShortcuts(shortcuts = [], enabled = true) {
  const [showHelp, setShowHelp] = useState(false);
  // Keep a stable ref so the event listener is never stale
  const ref = useRef(shortcuts);
  ref.current = shortcuts;

  useEffect(() => {
    if (!enabled) return;

    const isEditing = () => {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName;
      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        el.isContentEditable
      );
    };

    const onKey = (e) => {
      if (isEditing()) return;

      // '?' toggles the help overlay (no modifier needed)
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShowHelp((v) => !v);
        return;
      }

      // Escape closes the help overlay
      if (e.key === 'Escape' && !e.ctrlKey && !e.metaKey) {
        setShowHelp(false);
        // don't return; let pages handle Esc themselves too
      }

      for (const sc of ref.current) {
        if (
          e.key.toLowerCase() === sc.key.toLowerCase() &&
          !!sc.ctrl  === e.ctrlKey  &&
          !!sc.meta  === e.metaKey  &&
          !!sc.alt   === e.altKey   &&
          !!sc.shift === e.shiftKey
        ) {
          e.preventDefault();
          sc.action();
          return;
        }
      }
    };

    // AppHeader broadcasts this when the user clicks the '?' button
    const onShowHelp = () => setShowHelp(true);

    window.addEventListener('keydown', onKey);
    window.addEventListener('show-shortcuts-help', onShowHelp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('show-shortcuts-help', onShowHelp);
    };
  }, [enabled]);

  return { showHelp, setShowHelp };
}

export default usePageShortcuts;
