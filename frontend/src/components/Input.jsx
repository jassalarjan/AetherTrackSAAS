/**
 * AetherTrack 2030 Input Component
 * Reference: System_UI_Shift.md Section 4.4 - Forms & Inputs
 * 
 * Features:
 * - Floating labels
 * - 300ms debounced real-time validation
 * - Prefix/suffix icon slots
 * - Support for all input types
 */

import { forwardRef, useState, useId, useCallback, useEffect } from 'react';

/**
 * Input Component with floating label
 */
const Input = forwardRef(({
  label,
  error,
  helperText,
  type = 'text',
  disabled = false,
  required = false,
  className = '',
  inputClassName = '',
  containerClassName = '',
  prefix,
  suffix,
  onChange,
  onBlur,
  onFocus,
  id: providedId,
  validationDelay = 300,
  showValidation = 'blur', // 'blur', 'change', 'both'
  ...props
}, ref) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;
  
  const [isFocused, setIsFocused] = useState(false);
  const [showError, setShowError] = useState(false);
  const [value, setValue] = useState(props.value || props.defaultValue || '');
  
  // Determine if label should float
  const isLabelFloating = isFocused || (value && value.length > 0);
  
  // Handle input change with debounce for validation
  const [validationTimeout, setValidationTimeout] = useState(null);
  
  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    setValue(newValue);
    
    if (onChange) {
      onChange(e);
    }
    
    // Debounced validation
    if (showValidation === 'change' || showValidation === 'both') {
      if (validationTimeout) {
        clearTimeout(validationTimeout);
      }
      const timeout = setTimeout(() => {
        setShowError(true);
      }, validationDelay);
      setValidationTimeout(timeout);
    }
  }, [onChange, showValidation, validationDelay, validationTimeout]);
  
  const handleBlur = useCallback((e) => {
    setIsFocused(false);
    
    if (showValidation === 'blur' || showValidation === 'both') {
      setShowError(true);
    }
    
    if (onBlur) {
      onBlur(e);
    }
  }, [onBlur, showValidation]);
  
  const handleFocus = useCallback((e) => {
    setIsFocused(true);
    
    if (onFocus) {
      onFocus(e);
    }
  }, [onFocus]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (validationTimeout) {
        clearTimeout(validationTimeout);
      }
    };
  }, [validationTimeout]);
  
  // Sync with external value changes
  useEffect(() => {
    if (props.value !== undefined) {
      setValue(props.value);
    }
  }, [props.value]);
  
  const hasError = error && showError;
  
  // Base input classes
  const inputClasses = [
    'w-full px-4 pt-5 pb-2 bg-transparent border rounded-[var(--radius-input)]',
    'text-[var(--text-primary)] placeholder-transparent',
    'transition-all duration-[var(--fast)]',
    'focus:outline-none',
    hasError 
      ? 'border-[var(--danger)] focus:border-[var(--danger)]' 
      : 'border-[var(--border-soft)] focus:border-[var(--brand)]',
    disabled && 'opacity-50 cursor-not-allowed bg-[var(--bg-base)]',
    prefix && 'pl-10',
    suffix && 'pr-10',
    inputClassName,
  ].filter(Boolean).join(' ');
  
  // Label classes (floating)
  const labelClasses = [
    'absolute left-4 transition-all duration-[var(--fast)] pointer-events-none',
    'origin-left',
    isLabelFloating 
      ? 'top-2 text-xs' 
      : 'top-1/2 -translate-y-1/2 text-sm',
    hasError 
      ? 'text-[var(--danger)]' 
      : isFocused 
        ? 'text-[var(--brand)]' 
        : 'text-[var(--text-muted)]',
  ].filter(Boolean).join(' ');
  
  // Container classes
  const containerClasses = [
    'relative',
    containerClassName,
  ].filter(Boolean).join(' ');
  
  return (
    <div className={containerClasses}>
      {/* Prefix icon */}
      {prefix && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] z-10">
          {prefix}
        </div>
      )}
      
      {/* Input */}
      <input
        ref={ref}
        id={id}
        type={type}
        value={value}
        disabled={disabled}
        required={required}
        className={inputClasses}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        aria-invalid={hasError ? 'true' : 'false'}
        aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
        aria-disabled={disabled}
        {...props}
      />
      
      {/* Floating Label */}
      {label && (
        <label
          htmlFor={id}
          className={labelClasses}
        >
          {label}
          {required && <span className="text-[var(--danger)] ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      
      {/* Suffix icon */}
      {suffix && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] z-10">
          {suffix}
        </div>
      )}
      
      {/* Error message */}
      {hasError && (
        <p 
          id={errorId}
          className="mt-1 text-sm text-[var(--danger)]"
          role="alert"
        >
          {error}
        </p>
      )}
      
      {/* Helper text (when no error) */}
      {!hasError && helperText && (
        <p 
          id={helperId}
          className="mt-1 text-sm text-[var(--text-muted)]"
        >
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

/**
 * Textarea Component
 */
const Textarea = forwardRef(({
  label,
  error,
  helperText,
  disabled = false,
  required = false,
  className = '',
  inputClassName = '',
  containerClassName = '',
  rows = 4,
  id: providedId,
  showValidation = 'blur',
  ...props
}, ref) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;
  
  const [isFocused, setIsFocused] = useState(false);
  const [showError, setShowError] = useState(false);
  const [value, setValue] = useState(props.value || props.defaultValue || '');
  
  const isLabelFloating = isFocused || (value && value.length > 0);
  
  const handleChange = useCallback((e) => {
    setValue(e.target.value);
    if (showValidation === 'change' || showValidation === 'both') {
      setShowError(true);
    }
  }, [showValidation]);
  
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (showValidation === 'blur' || showValidation === 'both') {
      setShowError(true);
    }
  }, [showValidation]);
  
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);
  
  const hasError = error && showError;
  
  const inputClasses = [
    'w-full px-4 pt-5 pb-2 bg-transparent border rounded-[var(--radius-input)]',
    'text-[var(--text-primary)] placeholder-transparent',
    'transition-all duration-[var(--fast)]',
    'focus:outline-none resize-none',
    hasError 
      ? 'border-[var(--danger)] focus:border-[var(--danger)]' 
      : 'border-[var(--border-soft)] focus:border-[var(--brand)]',
    disabled && 'opacity-50 cursor-not-allowed bg-[var(--bg-base)]',
    inputClassName,
  ].filter(Boolean).join(' ');
  
  const labelClasses = [
    'absolute left-4 transition-all duration-[var(--fast)] pointer-events-none',
    'origin-left',
    isLabelFloating 
      ? 'top-2 text-xs' 
      : 'top-5 text-sm',
    hasError 
      ? 'text-[var(--danger)]' 
      : isFocused 
        ? 'text-[var(--brand)]' 
        : 'text-[var(--text-muted)]',
  ].filter(Boolean).join(' ');
  
  return (
    <div className={`relative ${containerClassName}`}>
      <textarea
        ref={ref}
        id={id}
        value={value}
        disabled={disabled}
        required={required}
        rows={rows}
        className={inputClasses}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        aria-invalid={hasError ? 'true' : 'false'}
        aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
        {...props}
      />
      
      {label && (
        <label
          htmlFor={id}
          className={labelClasses}
        >
          {label}
          {required && <span className="text-[var(--danger)] ml-1">*</span>}
        </label>
      )}
      
      {hasError && (
        <p id={errorId} className="mt-1 text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}
      
      {!hasError && helperText && (
        <p id={helperId} className="mt-1 text-sm text-[var(--text-muted)]">
          {helperText}
        </p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

/**
 * Select Component (Combobox replacement)
 */
const Select = forwardRef(({
  label,
  error,
  helperText,
  disabled = false,
  required = false,
  className = '',
  containerClassName = '',
  options = [],
  placeholder = 'Select an option',
  id: providedId,
  ...props
}, ref) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;
  
  const [isFocused, setIsFocused] = useState(false);
  const [showError, setShowError] = useState(false);
  
  const hasError = error && showError;
  
  const selectClasses = [
    'w-full px-4 py-3 bg-transparent border rounded-[var(--radius-input)]',
    'text-[var(--text-primary)]',
    'transition-all duration-[var(--fast)]',
    'focus:outline-none appearance-none cursor-pointer',
    hasError 
      ? 'border-[var(--danger)] focus:border-[var(--danger)]' 
      : 'border-[var(--border-soft)] focus:border-[var(--brand)]',
    disabled && 'opacity-50 cursor-not-allowed bg-[var(--bg-base)]',
    className,
  ].filter(Boolean).join(' ');
  
  const labelClasses = [
    'block mb-2 text-sm font-medium',
    hasError 
      ? 'text-[var(--danger)]' 
      : 'text-[var(--text-primary)]',
  ].filter(Boolean).join(' ');
  
  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={id} className={labelClasses}>
          {label}
          {required && <span className="text-[var(--danger)] ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <select
          ref={ref}
          id={id}
          disabled={disabled}
          required={required}
          className={selectClasses}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            setShowError(true);
          }}
          aria-invalid={hasError ? 'true' : 'false'}
          aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
          {...props}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        
        {/* Custom dropdown arrow */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      
      {hasError && (
        <p id={errorId} className="mt-1 text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}
      
      {!hasError && helperText && (
        <p id={helperId} className="mt-1 text-sm text-[var(--text-muted)]">
          {helperText}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Input;
export { Input, Textarea, Select };
