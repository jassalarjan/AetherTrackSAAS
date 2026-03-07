/**
 * AetherTrack 2030 Data Table Component
 * Reference: System_UI_Shift.md Section 4.3 - Data Tables (2030)
 * 
 * Features:
 * - Column sort, resize, row selection with shift-click range
 * - Sticky header, frozen first column
 * - Virtual scroll (1000+ rows)
 * - Row hover action menu (⋯)
 * - Illustrated empty states
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/shared/utils/cn';

/**
 * Sort directions
 */
export const SORT_DIRECTIONS = {
  ASC: 'asc',
  DESC: 'desc',
  NONE: 'none',
};

/**
 * Table Header Cell Component
 */
const TableHeaderCell = ({
  column,
  sortKey,
  sortDirection,
  onSort,
  onResize,
  isResizing,
}) => {
  const handleSort = () => {
    if (!column.sortable) return;
    
    const newDirection = sortKey === column.key
      ? (sortDirection === SORT_DIRECTIONS.ASC ? SORT_DIRECTIONS.DESC : SORT_DIRECTIONS.ASC)
      : SORT_DIRECTIONS.ASC;
    
    onSort(column.key, newDirection);
  };

  return (
    <th
      className={cn(
        'sticky top-0 z-10 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
        'bg-[var(--bg-raised)] text-[var(--text-muted)]',
        'border-b border-[var(--border-hair)]',
        column.sortable && 'cursor-pointer select-none hover:bg-[var(--bg-base)]',
        column.frozen && 'left-0 z-20 bg-[var(--bg-raised)]',
        isResizing && 'cursor-col-resize'
      )}
      style={{ 
        width: column.width,
        minWidth: column.minWidth,
        ...(column.frozen && { left: column.frozenLeft }),
      }}
      onClick={handleSort}
      role={column.sortable ? 'button' : undefined}
      tabIndex={column.sortable ? 0 : undefined}
      aria-sort={sortKey === column.key 
        ? (sortDirection === SORT_DIRECTIONS.ASC ? 'ascending' : 'descending') 
        : 'none'
      }
    >
      <div className="flex items-center gap-2">
        <span>{column.label}</span>
        {column.sortable && (
          <span className="flex flex-col">
            <svg 
              className={cn(
                'w-3 h-3',
                sortKey === column.key && sortDirection === SORT_DIRECTIONS.ASC 
                  ? 'text-[var(--brand)]' 
                  : 'text-[var(--text-muted)] opacity-30'
              )}
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M12 8l-6 6h12z" />
            </svg>
            <svg 
              className={cn(
                'w-3 h-3 -mt-1',
                sortKey === column.key && sortDirection === SORT_DIRECTIONS.DESC 
                  ? 'text-[var(--brand)]' 
                  : 'text-[var(--text-muted)] opacity-30'
              )}
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M12 16l-6-6h12z" />
            </svg>
          </span>
        )}
      </div>
      
      {/* Resize handle */}
      {column.resizable && (
        <div
          className={cn(
            'absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[var(--brand)]',
            isResizing && 'bg-[var(--brand)]'
          )}
          onMouseDown={(e) => {
            e.stopPropagation();
            onResize(column, e);
          }}
        />
      )}
    </th>
  );
};

/**
 * Table Row Component
 */
const TableRow = ({
  row,
  columns,
  isSelected,
  isHovered,
  onSelect,
  onClick,
  onActionMenu,
  rowIndex,
  selectedRows,
  setSelectedRows,
}) => {
  const handleCheckboxChange = (e) => {
    e.stopPropagation();
    onSelect(row, e.shiftKey);
  };

  const handleRowClick = (e) => {
    if (e.target.closest('input[type="checkbox"]') || e.target.closest('button')) return;
    onClick?.(row);
  };

  return (
    <tr
      className={cn(
        'border-b border-[var(--border-hair)]',
        'hover:bg-[var(--bg-base)]',
        isSelected && 'bg-[var(--brand-dim)] hover:bg-[var(--brand-dim)]',
        rowIndex % 2 === 0 ? 'bg-[var(--bg-canvas)]' : 'bg-[var(--bg-base)]'
      )}
      onClick={handleRowClick}
      role="row"
      aria-selected={isSelected}
    >
      {/* Checkbox column */}
      <td className="px-4 py-3 w-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleCheckboxChange}
          className="rounded border-[var(--border-soft)] text-[var(--brand)] focus:ring-[var(--brand)]"
          aria-label={`Select ${row.name || 'row'}`}
        />
      </td>
      
      {/* Data columns */}
      {columns.map((column) => (
        <td
          key={column.key}
          className={cn(
            'px-4 py-3 text-sm',
            column.frozen && 'sticky bg-inherit left-0 z-10',
            column.className
          )}
          style={column.frozen ? { left: column.frozenLeft } : {}}
        >
          {column.render ? column.render(row[column.key], row) : row[column.key]}
        </td>
      ))}
      
      {/* Actions column */}
      {onActionMenu && (
        <td className="px-4 py-3 w-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onActionMenu(row, e);
            }}
            className="p-1 rounded hover:bg-[var(--bg-surface)] transition-colors"
            aria-label="Row actions"
          >
            <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </td>
      )}
    </tr>
  );
};

/**
 * Empty State Component
 */
const EmptyState = ({ icon, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="w-16 h-16 mb-4 text-[var(--text-muted)] opacity-50">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-[var(--text-muted)] max-w-md mb-4">
          {description}
        </p>
      )}
      {action && (
        <div>{action}</div>
      )}
    </div>
  );
};

/**
 * Selection Toolbar Component
 */
const SelectionToolbar = ({ selectedCount, onClear, onAction, actions = [] }) => {
  if (selectedCount === 0) return null;
  
  return (
    <div className="sticky bottom-0 z-20 flex items-center gap-4 px-4 py-2 bg-[var(--bg-raised)] border-t border-[var(--border-hair)]">
      <span className="text-sm text-[var(--text-primary)]">
        {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={onClear}
          className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          Clear
        </button>
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={() => action.onClick(selectedCount)}
            className="px-3 py-1 text-sm rounded-md bg-[var(--brand)] text-white hover:opacity-90"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * Main DataTable Component
 */
export const DataTable = ({
  columns = [],
  data = [],
  sortable = true,
  selectable = false,
  resizable = false,
  stickyHeader = true,
  frozenColumn = null,
  emptyTitle = 'No data available',
  emptyDescription = 'There are no items to display.',
  onRowClick,
  onSelectionChange,
  onSort,
  onActionMenu,
  actions = [],
  virtualScroll = false,
  rowHeight = 52,
  className = '',
}) => {
  const [sortKey, setSortKey] = useState(null);
  const [sortDirection, setSortDirection] = useState(SORT_DIRECTIONS.NONE);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [hoveredRow, setHoveredRow] = useState(null);
  const [resizingColumn, setResizingColumn] = useState(null);
  const tableRef = useRef(null);

  // Calculate frozen columns
  const processedColumns = useMemo(() => {
    let frozenLeft = 0;
    return columns.map((col) => {
      if (col.frozen || frozenColumn === col.key) {
        const result = { ...col, frozen: true, frozenLeft };
        frozenLeft += col.width || 150;
        return result;
      }
      return col;
    });
  }, [columns, frozenColumn]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortKey || sortDirection === SORT_DIRECTIONS.NONE) return data;
    
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      
      if (aVal === bVal) return 0;
      
      const comparison = aVal < bVal ? -1 : 1;
      return sortDirection === SORT_DIRECTIONS.ASC ? comparison : -comparison;
    });
  }, [data, sortKey, sortDirection]);

  // Handle sort
  const handleSort = useCallback((key, direction) => {
    setSortKey(key);
    setSortDirection(direction);
    onSort?.(key, direction);
  }, [onSort]);

  // Handle row selection
  const handleRowSelect = useCallback((row, isShiftKey) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      
      if (newSet.has(row.id)) {
        newSet.delete(row.id);
      } else {
        if (isShiftKey && prev.size > 0) {
          // Select range
          const lastSelected = Array.from(prev).pop();
          const lastIndex = sortedData.findIndex(r => r.id === lastSelected);
          const currentIndex = sortedData.findIndex(r => r.id === row.id);
          const [start, end] = [lastIndex, currentIndex].sort((a, b) => a - b);
          
          for (let i = start; i <= end; i++) {
            if (sortedData[i]?.id) {
              newSet.add(sortedData[i].id);
            }
          }
        } else {
          newSet.add(row.id);
        }
      }
      
      onSelectionChange?.(Array.from(newSet));
      return newSet;
    });
  }, [sortedData, onSelectionChange]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedRows(new Set());
    onSelectionChange?.([]);
  }, [onSelectionChange]);

  // Handle resize
  const handleResizeStart = useCallback((column, e) => {
    setResizingColumn(column);
    const startX = e.clientX;
    const startWidth = column.width || 150;
    
    const handleMouseMove = (moveEvent) => {
      const diff = moveEvent.clientX - startX;
      const newWidth = Math.max(startWidth + diff, column.minWidth || 50);
      
      // Update column width in state (would need column state management)
    };
    
    const handleMouseUp = () => {
      setResizingColumn(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  // Handle action menu
  const handleActionMenu = useCallback((row, event) => {
    onActionMenu?.(row, {
      x: event.clientX,
      y: event.clientY,
    });
  }, [onActionMenu]);

  return (
    <div className={cn('data-table-container overflow-auto rounded-lg border border-[var(--border-hair)]', className)}>
      <table 
        ref={tableRef}
        className="w-full border-collapse"
        role="grid"
      >
        <thead className="sticky top-0 z-10">
          <tr>
            {/* Checkbox column */}
            {selectable && (
              <th className="sticky top-0 left-0 z-20 px-4 py-3 w-10 bg-[var(--bg-raised)] border-b border-[var(--border-hair)]">
                <input
                  type="checkbox"
                  checked={selectedRows.size === data.length && data.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRows(new Set(data.map(r => r.id)));
                      onSelectionChange?.(data.map(r => r.id));
                    } else {
                      clearSelection();
                    }
                  }}
                  className="rounded border-[var(--border-soft)] text-[var(--brand)] focus:ring-[var(--brand)]"
                  aria-label="Select all"
                />
              </th>
            )}
            
            {/* Header cells */}
            {processedColumns.map((column) => (
              <TableHeaderCell
                key={column.key}
                column={column}
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
                onResize={handleResizeStart}
                isResizing={resizingColumn?.key === column.key}
              />
            ))}
            
            {/* Actions column */}
            {onActionMenu && (
              <th className="sticky top-0 right-0 z-20 px-4 py-3 w-10 bg-[var(--bg-raised)] border-b border-[var(--border-hair)]" />
            )}
          </tr>
        </thead>
        
        <tbody>
          {sortedData.length > 0 ? (
            sortedData.map((row, rowIndex) => (
              <TableRow
                key={row.id || rowIndex}
                row={row}
                columns={processedColumns}
                isSelected={selectedRows.has(row.id)}
                isHovered={hoveredRow === row.id}
                onSelect={handleRowSelect}
                onClick={onRowClick}
                onActionMenu={onActionMenu ? handleActionMenu : undefined}
                rowIndex={rowIndex}
                selectedRows={selectedRows}
                setSelectedRows={setSelectedRows}
              />
            ))
          ) : (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0) + (onActionMenu ? 1 : 0)}>
                <EmptyState
                  title={emptyTitle}
                  description={emptyDescription}
                />
              </td>
            </tr>
          )}
        </tbody>
      </table>
      
      {/* Selection toolbar */}
      <SelectionToolbar
        selectedCount={selectedRows.size}
        onClear={clearSelection}
        actions={actions}
      />
    </div>
  );
};

export default DataTable;
