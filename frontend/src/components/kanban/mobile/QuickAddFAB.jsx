import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, X } from 'lucide-react';

export default function QuickAddFAB({ columns, activeColumnId, onAdd }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedColumnId, setSelectedColumnId] = useState(activeColumnId || columns[0]?.id);

  useEffect(() => {
    setSelectedColumnId(activeColumnId || columns[0]?.id);
  }, [activeColumnId, columns]);

  const canSave = useMemo(() => title.trim().length > 0 && !!selectedColumnId, [title, selectedColumnId]);

  const handleSave = async () => {
    if (!canSave) return;
    await onAdd(selectedColumnId, title.trim());
    setTitle('');
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#C4713A] text-white shadow-lg"
        aria-label="Quick add card"
      >
        <Plus size={24} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <button type="button" className="absolute inset-0 bg-black/35" onClick={() => setOpen(false)} aria-label="Close quick add" />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 300 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120) setOpen(false);
            }}
            className="absolute bottom-0 left-0 right-0 rounded-t-2xl border-t border-[var(--border-soft)] bg-[var(--bg-base)]/95 p-4 backdrop-blur-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Quick Add</h3>
              <button type="button" onClick={() => setOpen(false)} className="rounded p-1 text-[var(--text-muted)]">
                <X size={18} />
              </button>
            </div>

            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Card title"
              className="mb-3 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
            />

            <div className="mobile-kanban-no-scrollbar mb-4 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {columns.map((column) => {
                const active = selectedColumnId === column.id;
                return (
                  <button
                    key={column.id}
                    type="button"
                    onClick={() => setSelectedColumnId(column.id)}
                    className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold"
                    style={
                      active
                        ? { backgroundColor: `${column.color}26`, color: column.color, borderColor: `${column.color}66` }
                        : undefined
                    }
                  >
                    {column.title}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={!canSave}
              onClick={handleSave}
              className="w-full rounded-lg bg-[#C4713A] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Save
            </button>
          </motion.div>
        </div>
      )}
    </>
  );
}
