import React, { useState, useEffect } from 'react';
import { Zap, AlertTriangle, TrendingUp, Monitor } from 'lucide-react';

export default function PerformanceDevTools() {
  const [metrics, setMetrics] = useState({
    lcp: 0,
    fid: 0,
    cls: 0,
    memoryUsage: 0,
    renderCount: 0
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') return;

    // LCP observer
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      setMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }));
    });

    // FID observer
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;
      setMetrics(prev => ({ ...prev, fid: lastEntry.processingStart - lastEntry.startTime }));
    });

    // CLS observer
    const clsObserver = new PerformanceObserver((list) => {
      let clsValue = 0;
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      setMetrics(prev => ({ ...prev, cls: clsValue }));
    });

    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      fidObserver.observe({ entryTypes: ['first-input'] });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.warn('Performance API not fully supported');
    }

    // Memory monitoring
    const memoryInterval = setInterval(() => {
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        setMetrics(prev => ({
          ...prev,
          memoryUsage: Math.round(memInfo.usedJSHeapSize / 1024 / 1024)
        }));
      }
    }, 2000);

    return () => {
      lcpObserver.disconnect();
      fidObserver.disconnect();
      clsObserver.disconnect();
      clearInterval(memoryInterval);
    };
  }, []);

  // Toggle visibility with keyboard shortcut
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setIsVisible(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!isVisible || process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed bottom-4 right-4 bg-cat-mantle border border-cat-surface0 rounded-lg p-4 shadow-xl z-50 max-w-sm">
      <div className="flex items-center gap-2 mb-3">
        <Monitor className="w-4 h-4 text-cat-blue" />
        <h3 className="font-bold text-cat-text text-sm">Performance Monitor</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="ml-auto text-cat-overlay0 hover:text-cat-text"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-cat-overlay2">LCP:</span>
          <span className={`font-mono ${metrics.lcp > 2500 ? 'text-cat-red' : 'text-cat-green'}`}>
            {metrics.lcp.toFixed(0)}ms
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-cat-overlay2">FID:</span>
          <span className={`font-mono ${metrics.fid > 100 ? 'text-cat-red' : 'text-cat-green'}`}>
            {metrics.fid.toFixed(0)}ms
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-cat-overlay2">CLS:</span>
          <span className={`font-mono ${metrics.cls > 0.1 ? 'text-cat-red' : 'text-cat-green'}`}>
            {metrics.cls.toFixed(3)}
          </span>
        </div>

        {metrics.memoryUsage > 0 && (
          <div className="flex justify-between">
            <span className="text-cat-overlay2">Memory:</span>
            <span className={`font-mono ${metrics.memoryUsage > 100 ? 'text-cat-red' : 'text-cat-green'}`}>
              {metrics.memoryUsage}MB
            </span>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-cat-surface0">
        <p className="text-[10px] text-cat-overlay2">
          Press Ctrl+Shift+P to toggle
        </p>
      </div>
    </div>
  );
}