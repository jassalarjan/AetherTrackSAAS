import React from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import KanbanCard from './KanbanCard';
import SkeletonCard from './SkeletonCard';
import { useDragManager } from './DragManager';

export default function ColumnPanel({
  column,
  isActive,
  isOffline,
  loading,
  onCardTap,
  onSwipeMoveRight,
  onCardEdit,
  onCardDelete,
  onCardAssign,
  onAddInline,
  getNextColumnId,
}) {
  const dragManager = useDragManager();

  return (
    <section className={cn('h-full w-screen shrink-0 snap-center px-3 pb-6', isActive && 'transition-colors duration-300')}>
      <div
        className={cn(
          'flex h-full flex-col overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--bg-raised)]',
          dragManager.dropTargetColumn === column.id && 'bg-primary/5'
        )}
      >
        {isOffline && (
          <div className="border-b border-yellow-500/30 bg-yellow-500/15 px-3 py-2 text-xs font-semibold text-yellow-600">
            Offline mode: changes are queued and will sync when back online.
          </div>
        )}

        <header className="flex items-center justify-between border-b border-[var(--border-soft)] px-3 py-2">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{column.title}</h3>
          <span className="rounded-full bg-[var(--bg-base)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">
            {column.cards.length}
          </span>
        </header>

        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="space-y-2">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : column.cards.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <div className="text-2xl">🗂️</div>
              <p className="text-sm font-medium text-[var(--text-muted)]">No cards yet</p>
              <button
                type="button"
                onClick={() => onAddInline(column.id)}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-base)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)]"
              >
                <Plus size={14} />
                Add
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {column.cards.map((card, index) => (
                <React.Fragment key={card.id}>
                  {dragManager.draggingCard && dragManager.dropTargetColumn === column.id && dragManager.dropInsertIndex === index && (
                    <div className="h-0.5 rounded bg-primary" />
                  )}

                  <KanbanCard
                    card={card}
                    columnId={column.id}
                    index={index}
                    nextColumnId={getNextColumnId(column.id)}
                    onTap={onCardTap}
                    onSwipeMoveRight={onSwipeMoveRight}
                    onEdit={onCardEdit}
                    onDelete={onCardDelete}
                    onAssign={onCardAssign}
                  />
                </React.Fragment>
              ))}

              {dragManager.draggingCard && dragManager.dropTargetColumn === column.id && dragManager.dropInsertIndex >= column.cards.length && (
                <div className="h-0.5 rounded bg-primary" />
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
