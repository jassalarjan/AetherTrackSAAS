/**
 * AetherTrack 2030 Inline Editing Hook
 * Reference: System_UI_Shift.md Section 5.2 - Inline Editing
 * 
 * Pattern:
 * Click any field → input in-place → Tab to next → Esc to cancel → Enter/blur to save
 * 
 * Applies to: task fields, project name, sprint dates, profile fields
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Inline Editing Configuration
 */
const DEFAULT_CONFIG = {
  startOnClick: true,
  startOnDoubleClick: false,
  saveOnBlur: true,
  saveOnEnter: true,
  cancelOnEscape: true,
  selectOnOpen: true,
  validate: null,
  transform: null,
};

/**
 * Inline Editing Hook
 * @param {Object} options - Configuration options
 * @returns {Object} Inline editing state and handlers
 */
export const useInlineEdit = ({
  value,
  onSave,
  config = DEFAULT_CONFIG,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  
  const inputRef = useRef(null);
  const startEditRef = useRef(null);

  // Sync edit value with external value
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  // Start editing
  const startEdit = useCallback((e) => {
    if (config.startOnDoubleClick && e?.type !== 'dblclick') return;
    
    setIsEditing(true);
    setError(null);
    startEditRef.current = Date.now();

    // Focus input after render
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        if (config.selectOnOpen) {
          inputRef.current.select();
        }
      }
    }, 0);
  }, [config]);

  // Cancel editing
  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditValue(value);
    setError(null);
  }, [value]);

  // Save changes
  const saveEdit = useCallback(async () => {
    // Prevent double-save
    if (Date.now() - (startEditRef.current || 0) < 100) return;
    
    setIsSaving(true);
    setError(null);

    try {
      // Transform value if needed
      let finalValue = editValue;
      if (config.transform) {
        finalValue = config.transform(editValue);
      }

      // Validate if needed
      if (config.validate) {
        const validationError = config.validate(finalValue);
        if (validationError) {
          setError(validationError);
          setIsSaving(false);
          return;
        }
      }

      // Save via callback
      if (onSave) {
        await onSave(finalValue);
      }

      setIsEditing(false);
    } catch (err) {
      setError(err?.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [editValue, config, onSave]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && config.saveOnEnter) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape' && config.cancelOnEscape) {
      e.preventDefault();
      cancelEdit();
    } else if (e.key === 'Tab' && config.saveOnBlur) {
      // Tab to next field - save current
      saveEdit();
    }
  }, [config, saveEdit, cancelEdit]);

  // Handle blur
  const handleBlur = useCallback(() => {
    if (config.saveOnBlur && isEditing) {
      saveEdit();
    }
  }, [config.saveOnBlur, isEditing, saveEdit]);

  return {
    // State
    isEditing,
    editValue,
    setEditValue,
    isSaving,
    error,
    
    // Refs
    inputRef,
    
    // Actions
    startEdit,
    cancelEdit,
    saveEdit,
    
    // Event handlers
    handleKeyDown,
    handleBlur,
    
    // Helpers
    hasChanges: editValue !== value,
  };
};

/**
 * Inline Text Component
 */
export const InlineText = ({
  value,
  onSave,
  renderDisplay,
  renderEdit,
  config = DEFAULT_CONFIG,
  className = '',
}) => {
  const {
    isEditing,
    editValue,
    setEditValue,
    isSaving,
    error,
    inputRef,
    startEdit,
    cancelEdit,
    handleKeyDown,
    handleBlur,
    hasChanges,
  } = useInlineEdit({ value, onSave, config });

  if (isEditing) {
    return (
      <div className={`inline-edit-container ${className}`}>
        {renderEdit({
          value: editValue,
          onChange: setEditValue,
          inputRef,
          onKeyDown: handleKeyDown,
          onBlur: handleBlur,
          isSaving,
          error,
        })}
      </div>
    );
  }

  return (
    <div 
      className={`inline-display cursor-pointer hover:opacity-80 transition-opacity ${className}`}
      onClick={config.startOnClick ? startEdit : undefined}
      onDoubleClick={config.startOnDoubleClick ? startEdit : undefined}
    >
      {renderDisplay({ value, hasChanges })}
    </div>
  );
};

/**
 * Inline Text Input Component
 */
export const InlineTextInput = ({
  value,
  onSave,
  config = DEFAULT_CONFIG,
  inputClassName = '',
  displayClassName = '',
  ...props
}) => {
  return (
    <InlineText
      value={value}
      onSave={onSave}
      config={config}
      renderDisplay={({ value }) => (
        <span className={displayClassName}>{value}</span>
      )}
      renderEdit={({ value, onChange, inputRef, onKeyDown, onBlur, isSaving }) => (
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          disabled={isSaving}
          className={`inline-input ${inputClassName}`}
          {...props}
        />
      )}
    />
  );
};

/**
 * Inline Textarea Component
 */
export const InlineTextarea = ({
  value,
  onSave,
  config = DEFAULT_CONFIG,
  rows = 3,
  inputClassName = '',
  displayClassName = '',
  ...props
}) => {
  return (
    <InlineText
      value={value}
      onSave={onSave}
      config={config}
      renderDisplay={({ value }) => (
        <span className={displayClassName}>{value}</span>
      )}
      renderEdit={({ value, onChange, inputRef, onKeyDown, onBlur, isSaving }) => (
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          disabled={isSaving}
          rows={rows}
          className={`inline-textarea ${inputClassName}`}
          {...props}
        />
      )}
    />
  );
};

/**
 * Inline Select Component
 */
export const InlineSelect = ({
  value,
  onSave,
  options = [],
  config = DEFAULT_CONFIG,
  inputClassName = '',
  displayClassName = '',
  ...props
}) => {
  const {
    isEditing,
    editValue,
    setEditValue,
    isSaving,
    error,
    inputRef,
    startEdit,
    cancelEdit,
    handleKeyDown,
    handleBlur,
  } = useInlineEdit({ value, onSave, config });

  if (isEditing) {
    return (
      <select
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        disabled={isSaving}
        className={`inline-select ${inputClassName}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  const selectedOption = options.find(o => o.value === value);
  
  return (
    <span 
      className={`inline-display cursor-pointer hover:opacity-80 transition-opacity ${displayClassName}`}
      onClick={config.startOnClick ? startEdit : undefined}
    >
      {selectedOption?.label || value}
    </span>
  );
};

export default useInlineEdit;
