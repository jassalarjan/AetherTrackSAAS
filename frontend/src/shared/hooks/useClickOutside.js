/**
 * Click Outside hook - detects clicks outside of a referenced element
 */
import { useEffect, useRef, useCallback } from 'react';

export const useClickOutside = (callback) => {
  const ref = useRef(null);
  const callbackRef = useRef(callback);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const handleClick = useCallback((event) => {
    if (ref.current && !ref.current.contains(event.target)) {
      callbackRef.current(event);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [handleClick]);

  return ref;
};

export default useClickOutside;
