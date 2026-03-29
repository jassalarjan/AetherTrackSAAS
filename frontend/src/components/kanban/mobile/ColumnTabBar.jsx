import React, { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/shared/utils/cn';

export default function ColumnTabBar({ columns, activeColumnIndex, onChange }) {
  const tabRefs = useRef([]);
  const scrollerRef = useRef(null);
  const [showRightFade, setShowRightFade] = useState(false);

  const hasManyColumns = columns.length > 1;

  const activeColumn = useMemo(() => columns[activeColumnIndex], [columns, activeColumnIndex]);

  useEffect(() => {
    if (!hasManyColumns) return;
    const node = tabRefs.current[activeColumnIndex];
    if (node?.scrollIntoView) {
      node.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeColumnIndex, hasManyColumns]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const updateFade = () => {
      setShowRightFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 6);
    };

    updateFade();
    el.addEventListener('scroll', updateFade, { passive: true });
    window.addEventListener('resize', updateFade);

    return () => {
      el.removeEventListener('scroll', updateFade);
      window.removeEventListener('resize', updateFade);
    };
  }, [columns.length]);

  if (!hasManyColumns) return null;

  return (
    <div className="sticky top-0 z-20 border-b border-[var(--border-soft)] bg-[var(--bg-base)]/95 backdrop-blur-sm">
      <div className="relative">
        <div
          ref={scrollerRef}
          className="mobile-kanban-no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto px-3 py-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {columns.map((column, index) => {
            const isActive = index === activeColumnIndex;
            const activeStyle = {
              backgroundColor: `${column.color}26`,
              color: column.color,
              borderColor: `${column.color}66`,
            };

            return (
              <button
                key={column.id}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                type="button"
                onClick={() => onChange(index)}
                className={cn(
                  'snap-center shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                  'first:ml-3 last:mr-3',
                  isActive
                    ? 'shadow-sm'
                    : 'border-[var(--border-soft)] bg-[var(--bg-surface)] text-[var(--text-muted)]'
                )}
                style={isActive ? activeStyle : undefined}
                aria-pressed={isActive}
                aria-label={`Switch to ${column.title}`}
              >
                <span>{column.title}</span>
                <span className="ml-2 rounded-full bg-black/10 px-1.5 py-0.5 text-[10px]">
                  {column.cards.length}
                </span>
              </button>
            );
          })}
        </div>

        {showRightFade && activeColumn && (
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-10"
            style={{
              background: `linear-gradient(to right, transparent, var(--bg-base) 70%)`,
            }}
          />
        )}
      </div>
    </div>
  );
}
