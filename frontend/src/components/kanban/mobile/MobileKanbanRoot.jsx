import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ColumnTabBar from './ColumnTabBar';
import ColumnViewport from './ColumnViewport';
import QuickAddFAB from './QuickAddFAB';
import CardDetailSheet from './CardDetailSheet';
import UndoToast from './UndoToast';
import { DragManagerProvider } from './DragManager';
import './mobileKanban.css';

function useMobileView() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return isMobile;
}

function applyMove(columns, cardId, toColumnId, insertIndex) {
  let moving = null;
  const withoutCard = columns.map((col) => ({
    ...col,
    cards: col.cards.filter((card) => {
      if (card.id === cardId) {
        moving = card;
        return false;
      }
      return true;
    }),
  }));

  if (!moving) return columns;

  return withoutCard.map((col) => {
    if (col.id !== toColumnId) return col;
    const nextCards = [...col.cards];
    const safeIndex = Math.max(0, Math.min(insertIndex, nextCards.length));
    nextCards.splice(safeIndex, 0, { ...moving, columnId: toColumnId, columnColor: col.color });
    return { ...col, cards: nextCards };
  });
}

export default function MobileKanbanRoot({
  columns,
  loading = false,
  onCardMove,
  onCardAdd,
  onCardEdit,
  onCardDelete,
  onCardAssign,
}) {
  const isMobile = useMobileView();
  const [activeColumnIndex, setActiveColumnIndex] = useState(0);
  const [localColumns, setLocalColumns] = useState(columns);
  const [selectedCard, setSelectedCard] = useState(null);
  const [undoItem, setUndoItem] = useState(null);
  const [queuedMutations, setQueuedMutations] = useState([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    setLocalColumns(columns);
  }, [columns]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOffline || queuedMutations.length === 0) return;

    let cancelled = false;
    const flush = async () => {
      for (const mutation of queuedMutations) {
        if (cancelled) break;
        await mutation();
      }
      if (!cancelled) {
        setQueuedMutations([]);
      }
    };

    flush();
    return () => {
      cancelled = true;
    };
  }, [isOffline, queuedMutations]);

  const activeColumnId = useMemo(() => localColumns[activeColumnIndex]?.id, [activeColumnIndex, localColumns]);

  const runMutation = useCallback(
    async (mutation, optimisticUpdater) => {
      if (optimisticUpdater) {
        optimisticUpdater();
      }

      if (isOffline) {
        setQueuedMutations((prev) => [...prev, mutation]);
        return;
      }

      await mutation();
    },
    [isOffline]
  );

  const handleCardMove = useCallback(
    async (cardId, fromColumnId, toColumnId, insertIndex) => {
      const fromColumn = localColumns.find((c) => c.id === fromColumnId);
      const toColumn = localColumns.find((c) => c.id === toColumnId);

      await runMutation(
        () => onCardMove(cardId, toColumnId, insertIndex),
        () => {
          setLocalColumns((prev) => applyMove(prev, cardId, toColumnId, insertIndex));
          if (fromColumn && toColumn && fromColumn.id !== toColumn.id) {
            setUndoItem({ cardId, fromColumnId: fromColumn.id, toColumnId: toColumn.id, toColumnTitle: toColumn.title });
          }
        }
      );
    },
    [localColumns, onCardMove, runMutation]
  );

  const handleSwipeMoveRight = useCallback(
    async (card, nextColumnId) => {
      const from = card.columnId;
      await handleCardMove(card.id, from, nextColumnId, 0);
    },
    [handleCardMove]
  );

  const handleAdd = useCallback(
    async (columnId, title) => {
      await runMutation(() => onCardAdd(columnId, title));
    },
    [onCardAdd, runMutation]
  );

  const handleEdit = useCallback(
    async (cardId, updates) => {
      await runMutation(
        () => onCardEdit(cardId, updates),
        () => {
          setLocalColumns((prev) =>
            prev.map((column) => ({
              ...column,
              cards: column.cards.map((card) => (card.id === cardId ? { ...card, ...updates } : card)),
            }))
          );
        }
      );
    },
    [onCardEdit, runMutation]
  );

  const handleDelete = useCallback(
    async (cardId) => {
      await runMutation(
        () => onCardDelete(cardId),
        () => {
          setLocalColumns((prev) => prev.map((column) => ({ ...column, cards: column.cards.filter((card) => card.id !== cardId) })));
        }
      );
      setSelectedCard(null);
    },
    [onCardDelete, runMutation]
  );

  const handleAssign = useCallback(
    async (card) => {
      await runMutation(() => onCardAssign?.(card));
    },
    [onCardAssign, runMutation]
  );

  const handleUndo = useCallback(
    async (item) => {
      await onCardMove(item.cardId, item.fromColumnId, 0);
      setLocalColumns((prev) => applyMove(prev, item.cardId, item.fromColumnId, 0));
      setUndoItem(null);
    },
    [onCardMove]
  );

  if (!isMobile) return null;

  return (
    <DragManagerProvider
      columns={localColumns}
      activeColumnIndex={activeColumnIndex}
      setActiveColumnIndex={setActiveColumnIndex}
      onDropMove={handleCardMove}
    >
      <div className="relative h-full min-h-[calc(100dvh-180px)] overflow-hidden">
        <ColumnTabBar columns={localColumns} activeColumnIndex={activeColumnIndex} onChange={setActiveColumnIndex} />

        <ColumnViewport
          columns={localColumns}
          activeColumnIndex={activeColumnIndex}
          setActiveColumnIndex={setActiveColumnIndex}
          loading={loading}
          isOffline={isOffline}
          onCardTap={setSelectedCard}
          onSwipeMoveRight={handleSwipeMoveRight}
          onCardEdit={(card) => setSelectedCard(card)}
          onCardDelete={(card) => handleDelete(card.id)}
          onCardAssign={handleAssign}
          onAddInline={(columnId) => handleAdd(columnId, 'New Task')}
        />

        <QuickAddFAB columns={localColumns} activeColumnId={activeColumnId} onAdd={handleAdd} />

        {selectedCard && (
          <CardDetailSheet
            card={selectedCard}
            columns={localColumns}
            onClose={() => setSelectedCard(null)}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onMove={(cardId, toColumnId, insertIndex) => handleCardMove(cardId, selectedCard.columnId, toColumnId, insertIndex)}
          />
        )}

        <UndoToast item={undoItem} onUndo={handleUndo} onDismiss={() => setUndoItem(null)} />
      </div>
    </DragManagerProvider>
  );
}
