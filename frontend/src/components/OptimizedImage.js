// frontend/src/components/OptimizedImage.js
import React from 'react';
import { useOptimizedImage } from '../lib/imageLoader';
import { cn } from '../lib/utils';

const OptimizedImage = ({
  src,
  alt,
  className = '',
  fallbackSrc = '/fallback-team-logo.png',
  width = 'w-8',
  height = 'h-8'
}) => {
  const { imageUrl, loading } = useOptimizedImage(src, fallbackSrc);

  return (
    <div className={cn(
      'relative overflow-hidden',
      width,
      height,
      className
    )}>
      <img
        src={imageUrl}
        alt={alt}
        className="w-full h-full object-contain"
        onError={(e) => {
          e.target.src = fallbackSrc;
        }}
      />
      {loading && (
        <div className="absolute inset-0 animate-pulse bg-gray-200 rounded-full" />
      )}
    </div>
  );
};

export default OptimizedImage;