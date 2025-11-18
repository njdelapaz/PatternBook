import { useEffect, useRef } from 'react';

/**
 * Custom hook for debounced save functionality
 * @param {Function} saveFn - Function to call when saving
 * @param {Array} dependencies - Dependencies to watch for changes
 * @param {number} delay - Debounce delay in milliseconds (default: 500)
 */
export function useDebouncedSave(saveFn, dependencies, delay = 500) {
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      saveFn();
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, dependencies);
}


