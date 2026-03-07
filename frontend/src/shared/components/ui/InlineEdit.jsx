/**
 * AetherTrack 2030 Inline Edit Component
 * Reference: System_UI_Shift.md Section 5.2 - Inline Editing
 * 
 * Features:
 * - Click to edit text in-place
 * - Tab/Enter to save, Esc to cancel
 * - Supports text, number, and select input types
 * - Visual feedback: hover highlight, border change on edit
 * - Accessible: keyboard navigation, focus management, aria-live
 */

import { useCallback, useState, useRef, useEffect } from 'react';

/**
 * Inline Edit Input Types
 */
export const INPUT_TYPES = {
  TEXT: 'text',
  NUMBER: 'number',
  SELECT: 'select',
  TEXTAREA: 'textarea',
};

/**
 * Default Configuration
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
  placeholder: 'Click to edit...',
};

/**
 * InlineEdit Component
 * 
 * @param {string} value - Current value
 * @param {Function} onSave - Callback when value is saved
 * @param {string} inputType - Type of input: 'text', 'number', 'select', 'textarea'
 * @param {Array} options - Options for select input [{value, label}]
 * @param {Object} config - Configuration options
 * @param {string} className - Additional CSS classes
 * @param {string} displayClassName - Classes for display mode
 * @param {string} inputClassName - Classes for input mode
 * @param {Function} renderDisplay - Custom display renderer
 * @param {Function} renderInput - Custom input renderer
 * @param {boolean} disabled - Whether editing is disabled
 * @param {string} ariaLabel - Accessibility label
 */
const InlineEdit = ({
  value,
  onSave,
  inputType = INPUT_TYPES.TEXT,
  options = [],
  config = DEFAULT_CONFIG,
  className = '',
  displayClassName = '',
  inputClassName = '',
  renderDisplay,
  renderInput,
  disabled = false,
  ariaLabel,
  id,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const startEditRef = useRef(null);

  // Merge config with defaults
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Sync edit value with external value
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          if (mergedConfig.selectOnOpen) {
            inputRef.current.select();
          }
        }
      }, 0);
    }
  }, [isEditing, mergedConfig.selectOnOpen]);

  // Handle click outside to cancel
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        // Don't auto-save on outside click - let blur handle it
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing]);

  // Start editing
  const startEdit = useCallback((e) => {
    if (disabled) return;
    if (mergedConfig.startOnDoubleClick && e?.type !== 'dblclick') return;
    
    setIsEditing(true);
    setError(null);
    startEditRef.current = Date.now();
  }, [disabled, mergedConfig]);

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
      if (mergedConfig.transform) {
        finalValue = mergedConfig.transform(editValue);
      }

      // Validate if needed
      if (mergedConfig.validate) {
        const validationError = mergedConfig.validate(finalValue);
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
  }, [editValue, mergedConfig, onSave]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey && mergedConfig.saveOnEnter) {
      // For textarea, allow Shift+Enter for new line
      if (inputType === INPUT_TYPES.TEXTAREA && e.shiftKey) return;
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape' && mergedConfig.cancelOnEscape) {
      e.preventDefault();
      cancelEdit();
    } else if (e.key === 'Tab' && mergedConfig.saveOnBlur) {
      // Tab to next field - save current
      // Don't prevent default - let tab work
      saveEdit();
    }
  }, [mergedConfig, saveEdit, cancelEdit, inputType]);

  // Handle blur
  const handleBlur = useCallback(() => {
    if (mergedConfig.saveOnBlur && isEditing && !isSaving) {
      saveEdit();
    }
  }, [mergedConfig.saveOnBlur, isEditing, isSaving, saveEdit]);

  // Handle input change
  const handleChange = useCallback((e) => {
    setEditValue(e.target.value);
  }, []);

  // Render default display
  const renderDefaultDisplay = () => {
    const displayValue = value ?? mergedConfig.placeholder;
    return (
      <span className={`inline-edit-value ${!value ? 'text-[var(--text-faint)] italic' : ''}`}>
        {displayValue}
      </span>
    );
  };

  // Render input based on type
  const renderDefaultInput = () => {
    const baseInputClass = `
      w-full px-2 py-1 text-sm
      bg-[var(--bg-raised)] 
      border-2 border-[var(--brand)] rounded-[var(--r-md)]
      text-[var(--text-primary)] 
      outline-none
      transition-all duration-[var(--fast)]
      focus:ring-2 focus:ring-[var(--focus-ring)]
      disabled:opacity-50 disabled:cursor-not-allowed
    `;

    const commonProps = {
      ref: inputRef,
      value: editValue,
      onChange: handleChange,
      onKeyDown: handleKeyDown,
      onBlur: handleBlur,
      disabled: isSaving || disabled,
      className: `${baseInputClass} ${inputClassName}`.trim(),
      'aria-label': ariaLabel,
      id,
    };

    switch (inputType) {
      case INPUT_TYPES.NUMBER:
        return (
          <input
            {...commonProps}
            type="number"
            onWheel={(e) => e.target.blur()} // Prevent scroll change
          />
        );
      
      case INPUT_TYPES.SELECT:
        return (
          <select {...commonProps}>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      case INPUT_TYPES.TEXTAREA:
        return (
          <textarea
            {...commonProps}
            rows={3}
            className={`${commonProps.className} resize-none`}
          />
        );
      
      case INPUT_TYPES.TEXT:
      default:
        return <input {...commonProps} type="text" />;
    }
  };

  // Container styles
  const containerBaseClass = `
    inline-edit-container
    relative
    rounded-[var(--r-md)]
    transition-all duration-[var(--fast)]
    ${className}
  `;

  // Display mode styles
  const displayModeClass = `
    cursor-pointer
    px-2 py-1 -mx-2 -my-1
    rounded-[var(--r-md)]
    border border-transparent
    hover:bg-[var(--brand-dim)]
    hover:border-[var(--border-hair)]
    focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]
    ${disabled ? 'cursor-not-allowed opacity-60' : ''}
    ${displayClassName}
  `;

  // Edit mode styles
  const editModeClass = `
    ${inputClassName}
  `;

  // Error styles
  const errorClass = `
    text-xs text-[var(--danger)] mt-1
    animate-fade-in
  `;

  return (
    <div 
      ref={containerRef}
      className={`${containerBaseClass} ${isEditing ? editModeClass : displayModeClass}`}
      role="group"
      aria-label={ariaLabel}
    >
      {/* Live region for screen readers */}
      <div 
        className="sr-only" 
        role="status" 
        aria-live="polite"
        aria-atomic="true"
      >
        {isSaving ? 'Saving...' : error || ''}
      </div>

      {isEditing ? (
        <div className="inline-edit-input-wrapper">
          {renderInput ? (
            renderInput({
              value: editValue,
              onChange: setEditValue,
              inputRef,
              onKeyDown: handleKeyDown,
              onBlur: handleBlur,
              isSaving,
              error,
            })
          ) : (
            renderDefaultInput()
          )}
          
          {error && (
            <div className={errorClass} role="alert">
              {error}
            </div>
          )}
        </div>
      ) : (
        <div 
          className="inline-edit-display"
          onClick={mergedConfig.startOnClick ? startEdit : undefined}
          onDoubleClick={mergedConfig.startOnDoubleClick ? startEdit : undefined}
          tabIndex={disabled ? -1 : 0}
          role="button"
          aria-label={ariaLabel || `Click to edit: ${value}`}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
              e.preventDefault();
              startEdit(e);
            }
          }}
        >
          {renderDisplay ? (
            renderDisplay({ value, hasChanges: editValue !== value })
          ) : (
            renderDefaultDisplay()
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Inline Number Component - Convenience wrapper for numbers
 */
export const InlineNumber = ({
  value,
  onSave,
  config,
  className,
  displayClassName,
  inputClassName,
  disabled,
  ariaLabel,
  min,
  max,
  step = 1,
}) => {
  return (
    <InlineEdit
      value={value}
      onSave={onSave}
      inputType={INPUT_TYPES.NUMBER}
      config={{
        ...config,
        transform: (val) => {
          const num = parseFloat(val);
          return isNaN(num) ? val : num;
        },
        validate: (val) => {
          const num = parseFloat(val);
          if (isNaN(num)) return 'Please enter a valid number';
          if (min !== undefined && num < min) return `Minimum value is ${min}`;
          if (max !== undefined && num > max) return `Maximum value is ${max}`;
          return null;
        },
      }}
      className={className}
      displayClassName={displayClassName}
      inputClassName={inputClassName}
      disabled={disabled}
      ariaLabel={ariaLabel}
    />
  );
};

/**
 * Inline Select Component - Convenience wrapper for selects
 */
export const InlineSelectEdit = ({
  value,
  onSave,
  options = [],
  config,
  className,
  displayClassName,
  inputClassName,
  disabled,
  ariaLabel,
}) => {
  return (
    <InlineEdit
      value={value}
      onSave={onSave}
      inputType={INPUT_TYPES.SELECT}
      options={options}
      config={config}
      className={className}
      displayClassName={displayClassName}
      inputClassName={inputClassName}
      disabled={disabled}
      ariaLabel={ariaLabel}
    />
  );
};

/**
 * Inline Textarea Component - For longer text
 */
export const InlineTextareaEdit = ({
  value,
  onSave,
  config,
  className,
  displayClassName,
  inputClassName,
  disabled,
  ariaLabel,
  rows = 3,
}) => {
  return (
    <InlineEdit
      value={value}
      onSave={onSave}
      inputType={INPUT_TYPES.TEXTAREA}
      config={{
        ...config,
        saveOnEnter: false, // Don't save on Enter in textarea
      }}
      className={className}
      displayClassName={displayClassName}
      inputClassName={inputClassName}
      disabled={disabled}
      ariaLabel={ariaLabel}
    />
  );
};

export default InlineEdit;
