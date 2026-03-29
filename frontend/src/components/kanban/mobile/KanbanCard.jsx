import React, { useMemo, useRef, useState } from 'react';
import { useGesture } from '@use-gesture/react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { cn } from '@/shared/utils/cn';
import { useDragManager } from './DragManager';

const PRIORITY_DOT = {
  urgent: 'bg-red-500',
  high: 'bg-red-500',
  medium: 'bg-amber-400',
  low: 'bg-emerald-400',
  none: 'bg-gray-300',
};

export default function KanbanCard({
  card,
  columnId,
  index,
  nextColumnId,
  onTap,
  onSwipeMoveRight,
  onEdit,
  onDelete,
  onAssign,
}) {
  const dragManager = useDragManager();
  const [isDragging, setIsDragging] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const longPressRef = useRef(null);
  const pressPointRef = useRef({ x: 0, y: 0 });

  const x = useMotionValue(0);
  const xSpring = useSpring(x, { stiffness: 300, damping: 30 });

  const leftBorderStyle = useMemo(
    () => ({ borderLeftColor: card.columnColor || 'var(--border-mid)' }),
    [card.columnColor]
  );

  const clearLongPress = () => {
    if (longPressRef.current) {
      window.clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  const beginLongPress = (event) => {
    pressPointRef.current = { x: event.clientX, y: event.clientY };
    clearLongPress();
    longPressRef.current = window.setTimeout(() => {
      setIsDragging(true);
      dragManager.startDrag(card, columnId);
    }, 300);
  };

  const bind = useGesture(
    {
      onDrag: ({ down, movement: [mx, my], velocity: [vx], event, last, tap }) => {
        if (tap) return;

        if (isDragging) {
          if (event?.clientX != null) {
            dragManager.updatePointer(event.clientX);
          }
          dragManager.updateDropTarget(columnId, index);

          if (last) {
            setIsDragging(false);
            dragManager.drop();
          }
          return;
        }

        const horizontalIntent = Math.abs(mx) > Math.abs(my) * 1.5;
        if (!horizontalIntent) {
          if (last) {
            x.set(0);
          }
          return;
        }

        if (down) {
          const constrained = Math.max(-120, Math.min(80, mx));
          x.set(constrained);
          return;
        }

        if (mx > 60 && vx > 0.3 && nextColumnId) {
          x.set(0);
          onSwipeMoveRight(card, nextColumnId);
          setRevealed(false);
          return;
        }

        if (mx < -60) {
          x.set(-96);
          setRevealed(true);
        } else {
          x.set(0);
          setRevealed(false);
        }
      },
    },
    {
      drag: {
        axis: 'x',
        filterTaps: true,
        pointer: { touch: true },
      },
    }
  );

  return (
    <div
      className={cn('relative overflow-hidden rounded-md', dragManager.dropTargetColumn === columnId && 'ring-1 ring-primary/30')}
      onPointerDown={(e) => beginLongPress(e)}
      onPointerMove={(e) => {
        if (!longPressRef.current) return;
        const dx = e.clientX - pressPointRef.current.x;
        const dy = e.clientY - pressPointRef.current.y;
        if (Math.hypot(dx, dy) > 10) {
          clearLongPress();
        }
      }}
      onPointerUp={clearLongPress}
      onPointerCancel={clearLongPress}
      onPointerLeave={clearLongPress}
    >
      <div className="absolute inset-y-0 right-0 z-0 flex w-24 items-center justify-end gap-1 bg-[var(--bg-surface)] pr-2">
        <button type="button" onClick={() => onEdit(card)} className="rounded bg-[var(--bg-base)] px-2 py-1 text-[10px] font-semibold text-[var(--text-primary)]">
          Edit
        </button>
        <button type="button" onClick={() => onDelete(card)} className="rounded bg-red-500/15 px-2 py-1 text-[10px] font-semibold text-red-500">
          Del
        </button>
        <button type="button" onClick={() => onAssign(card)} className="rounded bg-[var(--bg-base)] px-2 py-1 text-[10px] font-semibold text-[var(--text-primary)]">
          Asn
        </button>
      </div>

      <motion.button
        type="button"
        {...bind()}
        onClick={() => onTap(card)}
        className={cn(
          'relative z-10 w-full border border-[var(--border-soft)] bg-[var(--bg-canvas)] p-3 text-left',
          'min-h-16 border-l-[3px] transition-shadow',
          isDragging && 'scale-105 opacity-85 shadow-xl ring-2 ring-primary/40 z-50'
        )}
        style={{ x: xSpring, ...leftBorderStyle }}
      >
        <div className="mb-2 flex items-start gap-2">
          <span
            className={cn('mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full', PRIORITY_DOT[card.priority || 'none'] || PRIORITY_DOT.none)}
          />
          <p className="line-clamp-2 text-sm font-semibold text-[var(--text-primary)]">{card.title}</p>
        </div>

        <div className="mb-2 flex flex-wrap gap-1">
          {(card.tags || []).slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-[var(--bg-base)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <span className="truncate pr-2">{card.assignee?.name || card.assignee?.full_name || 'Unassigned'}</span>
          <span>{card.dueDate ? new Date(card.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date'}</span>
        </div>
      </motion.button>

      {revealed && <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-transparent" />}
    </div>
  );
}
