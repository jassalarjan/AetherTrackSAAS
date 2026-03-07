/**
 * AetherTrack 2030 Drag and Drop Hook
 * Reference: System_UI_Shift.md Section 5.3 - Drag and drop (expanded scope)
 * 
 * Features:
 * - Ghost card drag with magnetic snap
 * - WIP limit indicators per column
 * - Inline quick-add
 * - Kanban, Gantt, Dashboard widget dragging
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Drag and Drop Types
 */
export const DRAG_TYPES = {
  TASK: 'task',
  WIDGET: 'widget',
  COLUMN: 'column',
  ITEM: 'item',
};

/**
 * Drag State
 */
const initialDragState = {
  isDragging: false,
  draggedItem: null,
  draggedType: null,
  sourceIndex: null,
  sourceContainer: null,
  ghostPosition: null,
  dropTarget: null,
  dropPosition: null,
};

/**
 * Use Drag and Drop Hook
 */
export const useDragAndDrop = ({
  items = [],
  onReorder = null,
  onMove = null,
  onDrop = null,
  dragType = DRAG_TYPES.ITEM,
  animationDuration = 200,
}) => {
  const [dragState, setDragState] = useState(initialDragState);
  const [localItems, setLocalItems] = useState(items);
  const dragRef = useRef(null);
  const ghostRef = useRef(null);

  // Sync local items with external items
  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  // Start dragging
  const startDrag = useCallback((item, sourceIndex, sourceContainer = null) => {
    setDragState({
      isDragging: true,
      draggedItem: item,
      draggedType: dragType,
      sourceIndex,
      sourceContainer,
      ghostPosition: null,
      dropTarget: null,
      dropPosition: null,
    });

    // Store drag data
    dragRef.current = {
      item,
      sourceIndex,
      sourceContainer,
      startX: 0,
      startY: 0,
    };
  }, [dragType]);

  // Update ghost position
  const updateGhostPosition = useCallback((x, y) => {
    setDragState(prev => ({
      ...prev,
      ghostPosition: { x, y },
    }));
  }, []);

  // Calculate drop position based on cursor
  const calculateDropPosition = useCallback((cursorY, containerRef, items) => {
    if (!containerRef || !items.length) return { index: 0, position: 'before' };

    const containerRect = containerRef.getBoundingClientRect();
    const itemHeight = containerRect.height / items.length;
    const relativeY = cursorY - containerRect.top;
    
    let index = Math.floor(relativeY / itemHeight);
    index = Math.max(0, Math.min(index, items.length));
    
    const itemMiddle = itemHeight * index + itemHeight / 2;
    const position = relativeY < itemMiddle ? 'before' : 'after';

    return { index, position };
  }, []);

  // Set drop target
  const setDropTarget = useCallback((containerId, position) => {
    setDragState(prev => ({
      ...prev,
      dropTarget: containerId,
      dropPosition: position,
    }));
  }, []);

  // End dragging
  const endDrag = useCallback(() => {
    const { draggedItem, sourceIndex, dropTarget, dropPosition, sourceContainer } = dragState;
    
    if (dropTarget !== null && dropPosition !== null) {
      let newItems = [...localItems];
      
      // Remove from source
      if (sourceContainer === dropTarget || sourceContainer === null) {
        newItems.splice(sourceIndex, 1);
        
        // Calculate new index
        let newIndex = dropPosition === 'after' ? dropPosition.index : dropPosition.index;
        newIndex = Math.min(newIndex, newItems.length);
        newItems.splice(newIndex, 0, draggedItem);
        
        setLocalItems(newItems);
        
        if (onReorder) {
          onReorder(newItems, { from: sourceIndex, to: newIndex });
        }
      } else {
        // Move between containers
        if (onMove) {
          onMove(draggedItem, { 
            from: sourceContainer, 
            to: dropTarget,
            fromIndex: sourceIndex,
            toIndex: dropPosition.index,
          });
        }
      }

      if (onDrop) {
        onDrop(draggedItem, { 
          target: dropTarget, 
          position: dropPosition,
        });
      }
    }

    setDragState(initialDragState);
    dragRef.current = null;
  }, [dragState, localItems, onReorder, onMove, onDrop]);

  // Cancel dragging
  const cancelDrag = useCallback(() => {
    setDragState(initialDragState);
    dragRef.current = null;
  }, []);

  // Reorder items locally
  const reorderItems = useCallback((fromIndex, toIndex) => {
    setLocalItems(prev => {
      const newItems = [...prev];
      const [removed] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, removed);
      return newItems;
    });
  }, []);

  // Add item
  const addItem = useCallback((item, index = null) => {
    setLocalItems(prev => {
      const newIndex = index !== null ? index : prev.length;
      const newItems = [...prev];
      newItems.splice(newIndex, 0, item);
      return newItems;
    });
  }, []);

  // Remove item
  const removeItem = useCallback((index) => {
    setLocalItems(prev => {
      const newItems = [...prev];
      newItems.splice(index, 1);
      return newItems;
    });
  }, []);

  return {
    // State
    items: localItems,
    setItems: setLocalItems,
    isDragging: dragState.isDragging,
    draggedItem: dragState.draggedItem,
    dropTarget: dragState.dropTarget,
    dropPosition: dragState.dropPosition,
    ghostPosition: dragState.ghostPosition,
    
    // Actions
    startDrag,
    updateGhostPosition,
    setDropTarget,
    endDrag,
    cancelDrag,
    reorderItems,
    addItem,
    removeItem,
  };
};

/**
 * Use Sortable Hook - for sortable lists
 */
export const useSortable = ({
  items,
  onReorder,
  disabled = false,
}) => {
  const [activeId, setActiveId] = useState(null);
  const [overId, setOverId] = useState(null);
  const [dropIndicator, setDropIndicator] = useState(null);

  const handleDragStart = useCallback((e, item) => {
    if (disabled) return;
    setActiveId(item.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
  }, [disabled]);

  const handleDragOver = useCallback((e, targetId) => {
    if (disabled || !activeId) return;
    e.preventDefault();
    setOverId(targetId);
    
    // Calculate drop position
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'before' : 'after';
    
    setDropIndicator({ targetId, position });
  }, [disabled, activeId]);

  const handleDragEnd = useCallback(() => {
    if (!activeId || !onReorder) return;
    
    const fromIndex = items.findIndex(item => item.id === activeId);
    const toIndex = dropIndicator 
      ? items.findIndex(item => item.id === dropIndicator.targetId)
      : fromIndex;
    
    if (fromIndex !== toIndex) {
      onReorder(fromIndex, dropIndicator?.position === 'after' ? toIndex + 1 : toIndex);
    }
    
    setActiveId(null);
    setOverId(null);
    setDropIndicator(null);
  }, [activeId, dropIndicator, items, onReorder]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverId(null);
    setDropIndicator(null);
  }, []);

  return {
    activeId,
    overId,
    dropIndicator,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    isDragging: activeId !== null,
  };
};

/**
 * Use Draggable Hook - for draggable items
 */
export const useDraggable = ({
  item,
  containerId,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = useCallback((e) => {
    if (disabled) return;
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({
      item,
      containerId,
    }));
  }, [disabled, item, containerId]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  return {
    isDragging,
    draggableProps: {
      draggable: !disabled,
      onDragStart: handleDragStart,
      onDragEnd: handleDragEnd,
    },
  };
};

/**
 * Use Drop Zone Hook
 */
export const useDropZone = ({
  accept = null,
  onDrop = null,
  disabled = false,
}) => {
  const [isOver, setIsOver] = useState(false);

  const handleDragEnter = useCallback((e) => {
    if (disabled) return;
    e.preventDefault();
    setIsOver(true);
  }, [disabled]);

  const handleDragOver = useCallback((e) => {
    if (disabled) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, [disabled]);

  const handleDragLeave = useCallback((e) => {
    if (disabled) return;
    e.preventDefault();
    setIsOver(false);
  }, [disabled]);

  const handleDrop = useCallback((e) => {
    if (disabled) return;
    e.preventDefault();
    setIsOver(false);

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      
      if (onDrop) {
        onDrop(data, e);
      }
    } catch (err) {
      console.error('Drop failed:', err);
    }
  }, [disabled, onDrop]);

  return {
    isOver,
    dropZoneProps: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
};

export default useDragAndDrop;
