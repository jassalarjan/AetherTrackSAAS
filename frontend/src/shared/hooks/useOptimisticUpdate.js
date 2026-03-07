/**
 * AetherTrack 2030 Optimistic UI Hook
 * Reference: System_UI_Shift.md Section 5.1 - Optimistic UI (Apply system-wide)
 * 
 * Pattern:
 * 1. User action → UI updates instantly
 * 2. API fires in background
 * 3. Success: silent (no toast for expected outcomes)
 * 4. Error: revert UI + error toast with retry button
 */

import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/shared/components/ui/Toast';

/**
 * Optimistic Update Hook
 * @param {Object} options - Configuration options
 * @returns {Object} Optimistic state and handlers
 */
export const useOptimisticUpdate = ({
  initialData = null,
  onUpdate = null, // API call
  onSuccess = null, // Optional success handler
  onError = null, // Optional error handler
  rollbackOnError = true,
  showErrorToast = true,
}) => {
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const previousDataRef = useRef(initialData);
  const { error: showError } = useToast();

  // Execute optimistic update
  const execute = useCallback(async (updateFn, optimisticData) => {
    // Store previous data for rollback
    previousDataRef.current = data;
    
    // Optimistically update UI immediately
    setData(optimisticData);
    setError(null);
    setIsLoading(true);

    try {
      // If there's an API call, execute it
      if (onUpdate) {
        await onUpdate(optimisticData);
      }
      
      // Success - silent (no toast for expected outcomes per spec)
      setIsLoading(false);
      
      if (onSuccess) {
        onSuccess(optimisticData);
      }
      
      return { success: true, data: optimisticData };
    } catch (err) {
      // Error - revert UI
      setIsLoading(false);
      
      if (rollbackOnError) {
        setData(previousDataRef.current);
      }
      
      const errorMessage = err?.message || 'An error occurred';
      setError(errorMessage);
      
      // Show error toast with retry option
      if (showErrorToast) {
        showError('Operation Failed', errorMessage, {
          action: 'Retry',
          onAction: () => execute(updateFn, optimisticData),
        });
      }
      
      if (onError) {
        onError(err, previousDataRef.current);
      }
      
      return { success: false, error: err };
    }
  }, [data, onUpdate, onSuccess, onError, rollbackOnError, showErrorToast, showError]);

  // Rollback to previous state
  const rollback = useCallback(() => {
    setData(previousDataRef.current);
    setError(null);
  }, []);

  // Update data directly (for immediate UI updates)
  const updateData = useCallback((newData) => {
    previousDataRef.current = data;
    setData(newData);
  }, [data]);

  return {
    data,
    setData: updateData,
    isLoading,
    error,
    execute,
    rollback,
    hasChanges: data !== initialData,
  };
};

/**
 * Optimistic Mutation Hook - for create/update/delete operations
 */
export const useOptimisticMutation = ({
  mutationFn, // The API mutation function
  onSuccess,
  onError,
}) => {
  const [state, setState] = useState({
    data: null,
    isLoading: false,
    error: null,
  });

  const previousDataRef = useRef(null);
  const { error: showError } = useToast();

  const mutate = useCallback(async (variables, optimisticUpdate) => {
    // Store previous state
    previousDataRef.current = state.data;
    
    // Optimistically update
    setState(prev => ({
      ...prev,
      data: optimisticUpdate?.(prev.data, variables) || prev.data,
      isLoading: true,
      error: null,
    }));

    try {
      const result = await mutationFn(variables);
      
      setState(prev => ({
        ...prev,
        data: result,
        isLoading: false,
      }));

      if (onSuccess) {
        onSuccess(result, variables);
      }

      return result;
    } catch (err) {
      // Rollback on error
      setState(prev => ({
        ...prev,
        data: previousDataRef.current,
        isLoading: false,
        error: err,
      }));

      if (onError) {
        onError(err, variables);
      } else {
        showError('Operation Failed', err?.message || 'Something went wrong', {
          action: 'Retry',
          onAction: () => mutate(variables, optimisticUpdate),
        });
      }

      throw err;
    }
  }, [mutationFn, onSuccess, onError, state.data, showError]);

  return {
    ...state,
    mutate,
  };
};

/**
 * Batch Optimistic Updates
 * For operations that need to update multiple items at once
 */
export const useBatchOptimisticUpdate = ({ onUpdate }) => {
  const [pendingUpdates, setPendingUpdates] = useState(new Map());
  const [isProcessing, setIsProcessing] = useState(false);

  const addUpdate = useCallback((key, updateFn) => {
    setPendingUpdates(prev => {
      const newMap = new Map(prev);
      newMap.set(key, updateFn);
      return newMap;
    });
  }, []);

  const removeUpdate = useCallback((key) => {
    setPendingUpdates(prev => {
      const newMap = new Map(prev);
      newMap.delete(key);
      return newMap;
    });
  }, []);

  const processUpdates = useCallback(async (currentData) => {
    if (pendingUpdates.size === 0) return currentData;

    setIsProcessing(true);
    
    // Apply all optimistic updates
    let updatedData = currentData;
    for (const [_, updateFn] of pendingUpdates) {
      updatedData = updateFn(updatedData);
    }

    try {
      // Execute batch API call
      if (onUpdate) {
        await onUpdate(updatedData);
      }
      
      // Clear pending updates on success
      setPendingUpdates(new Map());
      setIsProcessing(false);
      
      return updatedData;
    } catch (err) {
      // Keep pending updates for retry
      setIsProcessing(false);
      throw err;
    }
  }, [pendingUpdates, onUpdate]);

  return {
    pendingUpdates,
    isProcessing,
    addUpdate,
    removeUpdate,
    processUpdates,
    hasPendingUpdates: pendingUpdates.size > 0,
  };
};

export default useOptimisticUpdate;
