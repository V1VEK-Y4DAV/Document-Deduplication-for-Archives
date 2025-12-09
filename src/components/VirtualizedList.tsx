import { useState, useEffect, useRef, useCallback } from 'react';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  windowHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  windowHeight,
  renderItem,
  className = ''
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const totalHeight = items.length * itemHeight;
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(windowHeight / itemHeight) + 1,
    items.length
  );
  
  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;
  
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);
  
  return (
    <div 
      ref={containerRef}
      className={`overflow-y-auto ${className}`}
      style={{ height: windowHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ 
          transform: `translateY(${offsetY}px)`,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0
        }}>
          {visibleItems.map((item, index) => (
            <div 
              key={startIndex + index} 
              style={{ height: itemHeight }}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}