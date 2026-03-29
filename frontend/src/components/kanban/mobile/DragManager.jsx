import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const DragManagerContext = createContext(null);

export function DragManagerProvider({ children, columns, activeColumnIndex, setActiveColumnIndex, onDropMove }) {
  const viewportRef = useRef(null);
  const [draggingCard, setDraggingCard] = useState(null);
  const [dragFromColumn, setDragFromColumn] = useState(null);
  const [dropTargetColumn, setDropTargetColumn] = useState(null);
  const [dropInsertIndex, setDropInsertIndex] = useState(0);

  const startDrag = useCallback((card, fromColumnId) => {
    setDraggingCard(card);
    setDragFromColumn(fromColumnId);
    setDropTargetColumn(fromColumnId);
    setDropInsertIndex(0);
  }, []);

  const updateDropTarget = useCallback((columnId, insertIndex) => {
    setDropTargetColumn(columnId);
    setDropInsertIndex(insertIndex);
  }, []);

  const updatePointer = useCallback((clientX) => {
    if (!viewportRef.current || !columns.length) return;

    const EDGE_THRESHOLD = 60;
    if (clientX <= EDGE_THRESHOLD && activeColumnIndex > 0) {
      const next = activeColumnIndex - 1;
      setActiveColumnIndex(next);
    }
    if (clientX >= window.innerWidth - EDGE_THRESHOLD && activeColumnIndex < columns.length - 1) {
      const next = activeColumnIndex + 1;
      setActiveColumnIndex(next);
    }
  }, [activeColumnIndex, columns.length, setActiveColumnIndex]);

  const drop = useCallback(async () => {
    if (!draggingCard || !dropTargetColumn) {
      setDraggingCard(null);
      setDragFromColumn(null);
      return;
    }

    await onDropMove(draggingCard.id, dragFromColumn, dropTargetColumn, dropInsertIndex);

    if (navigator.vibrate) {
      navigator.vibrate(10);
    }

    setDraggingCard(null);
    setDragFromColumn(null);
    setDropTargetColumn(null);
    setDropInsertIndex(0);
  }, [dragFromColumn, draggingCard, dropInsertIndex, dropTargetColumn, onDropMove]);

  const cancelDrag = useCallback(() => {
    setDraggingCard(null);
    setDragFromColumn(null);
    setDropTargetColumn(null);
    setDropInsertIndex(0);
  }, []);

  const value = useMemo(() => ({
    viewportRef,
    draggingCard,
    dragFromColumn,
    dropTargetColumn,
    dropInsertIndex,
    startDrag,
    updateDropTarget,
    updatePointer,
    drop,
    cancelDrag,
  }), [
    draggingCard,
    dragFromColumn,
    dropTargetColumn,
    dropInsertIndex,
    startDrag,
    updateDropTarget,
    updatePointer,
    drop,
    cancelDrag,
  ]);

  return <DragManagerContext.Provider value={value}>{children}</DragManagerContext.Provider>;
}

export function useDragManager() {
  const context = useContext(DragManagerContext);
  if (!context) {
    throw new Error('useDragManager must be used within DragManagerProvider');
  }
  return context;
}
