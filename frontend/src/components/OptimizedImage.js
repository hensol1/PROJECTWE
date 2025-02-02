import React, { useEffect, useRef, useState } from 'react';

const OptimizedImage = ({
  src,
  alt,
  className,
  width,
  height,
  loading = 'lazy',
  placeholder = 'blur'
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef(null);
  
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      setIsLoaded(true);
    }
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = src;
            observer.unobserve(img);
          }
        });
      },
      {
        rootMargin: '50px',
      }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [src]);

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      <img
        ref={imgRef}
        alt={alt}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        width={width}
        height={height}
        loading={loading}
        onLoad={() => setIsLoaded(true)}
        decoding="async"
      />
      {placeholder === 'blur' && !isLoaded && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse"
          style={{ width, height }}
        />
      )}
    </div>
  );
};

export default OptimizedImage;