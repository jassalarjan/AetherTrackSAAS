import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';

export default function CardDetailSheet({ card, columns, onClose, onEdit, onDelete, onMove }) {
  const [draft, setDraft] = useState(() => ({
    title: card?.title || '',
    description: card?.description || '',
    priority: card?.priority || 'medium',
    tags: (card?.tags || []).join(', '),
    assignee: card?.assignee?.name || card?.assignee?.full_name || '',
  }));

  const canSave = useMemo(() => draft.title.trim().length > 0, [draft.title]);

  if (!card) return null;

  const save = () => {
    if (!canSave) return;
    onEdit(card.id, {
      title: draft.title.trim(),
      description: draft.description,
      priority: draft.priority,
      tags: draft.tags.split(',').map((t) => t.trim()).filter(Boolean),
    });
  };

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" className="absolute inset-0 bg-black/35" onClick={onClose} aria-label="Close details" />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 400 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 120) onClose();
        }}
        className="absolute bottom-0 left-0 right-0 h-[95dvh] rounded-t-2xl border-t border-[var(--border-soft)] bg-[var(--bg-base)]/95 backdrop-blur-sm"
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-[var(--border-mid)]" />

        <div className="h-[calc(95dvh-24px)] overflow-y-auto p-4">
          <input
            value={draft.title}
            onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
            className="mb-3 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--bg-canvas)] px-3 py-2 text-base font-semibold text-[var(--text-primary)] outline-none"
          />

          <div className="space-y-3">
            <textarea
              value={draft.description}
              onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Description"
              rows={4}
              className="w-full rounded-lg border border-[var(--border-soft)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
            />

            <input
              value={draft.assignee}
              onChange={(e) => setDraft((prev) => ({ ...prev, assignee: e.target.value }))}
              placeholder="Assignee"
              className="w-full rounded-lg border border-[var(--border-soft)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
            />

            <select
              value={draft.priority}
              onChange={(e) => setDraft((prev) => ({ ...prev, priority: e.target.value }))}
              className="w-full rounded-lg border border-[var(--border-soft)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            <input
              value={draft.tags}
              onChange={(e) => setDraft((prev) => ({ ...prev, tags: e.target.value }))}
              placeholder="Tags (comma separated)"
              className="w-full rounded-lg border border-[var(--border-soft)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
            />

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Move to column</p>
              <div className="mobile-kanban-no-scrollbar flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {columns.map((column) => (
                  <button
                    key={column.id}
                    type="button"
                    onClick={() => onMove(card.id, column.id, 0)}
                    className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold"
                    style={card.columnId === column.id ? { backgroundColor: `${column.color}26`, color: column.color } : undefined}
                  >
                    {column.title}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={save}
              disabled={!canSave}
              className="w-full rounded-lg bg-[#C4713A] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Save Changes
            </button>

            <button
              type="button"
              onClick={() => {
                if (window.confirm('Delete this card?')) {
                  onDelete(card.id);
                  onClose();
                }
              }}
              className="w-full rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
