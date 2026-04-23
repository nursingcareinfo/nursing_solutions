import { useState, useCallback, useRef, useEffect } from 'react';

// Optimized state hook that prevents unnecessary re-renders
export function useOptimizedState<T>(initialValue: T) {
  const [state, setState] = useState(initialValue);
  const lastValueRef = useRef<T>(initialValue);
  const updateCountRef = useRef(0);

  const setOptimizedState = useCallback((newValue: T | ((prev: T) => T)) => {
    const currentValue = typeof newValue === 'function'
      ? (newValue as (prev: T) => T)(lastValueRef.current)
      : newValue;

    // Only update if value actually changed
    if (JSON.stringify(currentValue) !== JSON.stringify(lastValueRef.current)) {
      lastValueRef.current = currentValue;
      updateCountRef.current += 1;

      // Log excessive updates
      if (updateCountRef.current > 10) {
        console.warn('⚡ Excessive state updates detected - consider memoization');
      }

      setState(currentValue);
    }
  }, []);

  // Reset counter on component unmount
  useEffect(() => {
    return () => {
      updateCountRef.current = 0;
    };
  }, []);

  return [state, setOptimizedState, updateCountRef.current] as const;
}

// Hook for debouncing expensive operations
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Hook for lazy loading components with performance tracking
export function useLazyPerformance<T>(
  factory: () => Promise<T>,
  componentName: string
): [T | null, boolean, Error | null] {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    startTimeRef.current = performance.now();

    factory()
      .then((result) => {
        const loadTime = performance.now() - (startTimeRef.current || 0);
        if (loadTime > 500) {
          console.warn(`🐌 [${componentName}] Slow lazy load: ${loadTime.toFixed(2)}ms`);
        }
        setData(result);
      })
      .catch((err) => {
        console.error(`❌ [${componentName}] Lazy load failed:`, err);
        setError(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [factory, componentName]);

  return [data, loading, error];
}