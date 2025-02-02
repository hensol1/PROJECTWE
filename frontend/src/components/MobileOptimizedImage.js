// 1. Create a mobile-optimized image component
import React, { useEffect, useState } from 'react';

const MobileOptimizedImage = ({ src, alt, className }) => {
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  
  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate optimal image size based on viewport
  const getOptimalImageSize = () => {
    if (viewportWidth <= 640) return 'sm';
    if (viewportWidth <= 768) return 'md';
    return 'lg';
  };

  const getImageUrl = () => {
    const size = getOptimalImageSize();
    // Modify the URL to use size-specific images
    return src.replace(/\.(jpg|png|webp)/, `-${size}.$1`);
  };

  return (
    <img
      src={getImageUrl()}
      alt={alt}
      className={`${className} w-full`}
      loading="lazy"
      decoding="async"
      width={viewportWidth <= 640 ? 320 : 640}
      height={viewportWidth <= 640 ? 240 : 480}
    />
  );
};

// 2. Create a List Virtualization component for mobile
import { useVirtual } from 'react-virtual';

const VirtualizedList = ({ items, renderItem }) => {
  const parentRef = React.useRef();
  
  const rowVirtualizer = useVirtual({
    size: items.length,
    parentRef,
    estimateSize: React.useCallback(() => 100, []),
    overscan: 5
  });

  return (
    <div ref={parentRef} className="h-screen overflow-auto">
      <div
        style={{
          height: `${rowVirtualizer.totalSize}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.virtualItems.map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {renderItem(items[virtualRow.index])}
          </div>
        ))}
      </div>
    </div>
  );
};

// 3. Optimize Mobile Navigation
const MobileNav = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <nav className="fixed bottom-0 w-full bg-white shadow-lg">
      <div className="max-w-md mx-auto px-4 py-2">
        <div className="flex justify-around items-center">
          {/* Use SVG icons instead of font icons for better performance */}
          <button
            aria-label="Home"
            className="p-2 rounded-full hover:bg-gray-100"
            onClick={() => navigate('/')}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
          </button>
          {/* Add other navigation items */}
        </div>
      </div>
    </nav>
  );
};

// 4. Add Skeleton Loading for Mobile
const SkeletonLoader = () => (
  <div className="animate-pulse space-y-4 p-4">
    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 rounded"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
    </div>
  </div>
);

export { MobileOptimizedImage, VirtualizedList, MobileNav, SkeletonLoader };