import React, { useEffect, useRef } from 'react';
import ColumnPanel from './ColumnPanel';
import { useDragManager } from './DragManager';

export default function ColumnViewport({
  columns,
  activeColumnIndex,
  setActiveColumnIndex,
  loading,
  isOffline,
  onCardTap,
  onSwipeMoveRight,
  onCardEdit,
  onCardDelete,
  onCardAssign,
  onAddInline,
}) {
  const localRef = useRef(null);
  const scrollEndTimerRef = useRef(null);
  const dragManager = useDragManager();

  useEffect(() => {
    if (!localRef.current) return;
    dragManager.viewportRef.current = localRef.current;
  }, [dragManager.viewportRef]);

  useEffect(() => {
    if (!localRef.current) return;
    const left = activeColumnIndex * window.innerWidth;
    localRef.current.scrollTo({ left, behavior: 'smooth' });
  }, [activeColumnIndex]);

  const handleScroll = () => {
    if (!localRef.current || columns.length <= 1) return;

    if (scrollEndTimerRef.current) {
      window.clearTimeout(scrollEndTimerRef.current);
    }

    scrollEndTimerRef.current = window.setTimeout(() => {
      const idx = Math.round(localRef.current.scrollLeft / window.innerWidth);
      const safeIdx = Math.max(0, Math.min(columns.length - 1, idx));
      if (safeIdx !== activeColumnIndex) {
        setActiveColumnIndex(safeIdx);
      }
    }, 80);
  };

  const getNextColumnId = (columnId) => {
    const index = columns.findIndex((c) => c.id === columnId);
    if (index < 0 || index >= columns.length - 1) return null;
    return columns[index + 1].id;
  };

  return (
    <div
      ref={localRef}
      onScroll={handleScroll}
      className="mobile-kanban-no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {columns.map((column, index) => (
        <ColumnPanel
          key={column.id}
          column={column}
          isActive={index === activeColumnIndex}
          loading={loading}
          isOffline={isOffline}
          onCardTap={onCardTap}
          onSwipeMoveRight={onSwipeMoveRight}
          onCardEdit={onCardEdit}
          onCardDelete={onCardDelete}
          onCardAssign={onCardAssign}
          onAddInline={onAddInline}
          getNextColumnId={getNextColumnId}
        />
      ))}
    </div>
  );
}
