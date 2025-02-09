// frontend/src/lib/imageLoader.js
import { useState, useEffect } from 'react';

class ImageLoader {
  constructor() {
    this.loadingPromises = new Map();
    this.memoryCache = new Map(); // In-memory cache for instant retrieval
  }

  loadImage(url, fallbackUrl = '/fallback-team-logo.png') {
    if (!url) return Promise.resolve(fallbackUrl);

    // Check memory cache first for instant retrieval
    if (this.memoryCache.has(url)) {
      return Promise.resolve(url);
    }

    // If we already have a loading promise for this URL, return it
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url);
    }

    const promise = new Promise((resolve) => {
      const img = new Image();
      
      img.onload = () => {
        this.loadingPromises.delete(url);
        this.memoryCache.set(url, true); // Cache successful loads
        resolve(url);
      };

      img.onerror = () => {
        this.loadingPromises.delete(url);
        resolve(fallbackUrl);
      };

      img.src = url;
    });

    this.loadingPromises.set(url, promise);
    return promise;
  }

  // Method to preload multiple images at once
  preloadImages(urls) {
    return Promise.all(
      urls.map(url => this.loadImage(url))
    );
  }

  clearCache() {
    this.memoryCache.clear();
    this.loadingPromises.clear();
  }
}

// Create a singleton instance
const imageLoader = new ImageLoader();
export default imageLoader;

// React hook for using the image loader
export const useOptimizedImage = (url, fallbackUrl = '/fallback-team-logo.png') => {
  const [imageUrl, setImageUrl] = useState(
    // Use cached URL immediately if available
    imageLoader.memoryCache.has(url) ? url : fallbackUrl
  );
  const [loading, setLoading] = useState(!imageLoader.memoryCache.has(url));

  useEffect(() => {
    let mounted = true;

    const loadImage = async () => {
      // If already in memory cache, skip loading
      if (imageLoader.memoryCache.has(url)) {
        if (mounted) {
          setImageUrl(url);
          setLoading(false);
        }
        return;
      }

      try {
        const result = await imageLoader.loadImage(url, fallbackUrl);
        if (mounted) {
          setImageUrl(result);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      mounted = false;
    };
  }, [url, fallbackUrl]);

  return { imageUrl, loading };
};