import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  componentName: string;
  mountTime: number;
  renderTime: number;
  interactionTime?: number;
  memoryUsage?: number;
}

export const usePerformanceMonitor = (componentName: string) => {
  const mountTimeRef = useRef<number>(0);
  const renderStartRef = useRef<number>(0);
  const metricsRef = useRef<PerformanceMetrics[]>([]);

  // Monitor component mount time
  useEffect(() => {
    mountTimeRef.current = performance.now();

    // Monitor memory usage if available
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      console.log(`[${componentName}] Memory: ${Math.round(memInfo.usedJSHeapSize / 1048576)}MB used`);
    }

    return () => {
      const unmountTime = performance.now();
      const totalMountTime = unmountTime - (mountTimeRef.current || 0);

      const metric: PerformanceMetrics = {
        componentName,
        mountTime: totalMountTime,
        renderTime: 0,
        memoryUsage: 'memory' in performance ? (performance as any).memory.usedJSHeapSize : undefined
      };

      metricsRef.current.push(metric);

      // Log slow components (>100ms mount time)
      if (totalMountTime > 100) {
        console.warn(`🐌 [${componentName}] Slow mount: ${totalMountTime.toFixed(2)}ms`);
      }
    };
  }, [componentName]);

  // Monitor render performance
  const startRender = useCallback(() => {
    renderStartRef.current = performance.now();
  }, []);

  const endRender = useCallback(() => {
    if (renderStartRef.current) {
      const renderTime = performance.now() - renderStartRef.current;
      if (renderTime > 16.67) { // More than one frame (60fps)
        console.warn(`🎨 [${componentName}] Slow render: ${renderTime.toFixed(2)}ms`);
      }
    }
  }, [componentName]);

  // Monitor user interactions
  const measureInteraction = useCallback((interactionName: string) => {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      if (duration > 100) {
        console.warn(`👆 [${componentName}] Slow interaction "${interactionName}": ${duration.toFixed(2)}ms`);
      }
    };
  }, [componentName]);

  return {
    startRender,
    endRender,
    measureInteraction,
    getMetrics: () => metricsRef.current
  };
};