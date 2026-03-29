import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function UndoToast({ item, onUndo, onDismiss }) {
  useEffect(() => {
    if (!item) return;
    const timer = window.setTimeout(() => {
      onDismiss();
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [item, onDismiss]);

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
          className="fixed bottom-40 left-1/2 z-50 w-[min(92vw,360px)] -translate-x-1/2 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-raised)] px-3 py-2 shadow-lg"
        >
          <div className="flex items-center justify-between gap-2 text-sm">
            <p className="truncate text-[var(--text-primary)]">Moved to {item.toColumnTitle}</p>
            <button type="button" onClick={() => onUndo(item)} className="rounded px-2 py-1 text-xs font-semibold text-[#C4713A]">
              Undo
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
