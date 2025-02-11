// hooks/useImagePreloader.js
import { useEffect } from 'react';

export const useImagePreloader = (matches) => {
  useEffect(() => {
    if (!matches) return;

    const loadImage = (url) => {
      return new Promise((resolve, reject) => {
        if (!url) {
          reject('No URL provided');
          return;
        }

        const img = new Image();
        
        img.onload = () => {
          resolve(url);
        };

        img.onerror = () => {
          // Instead of rejecting, we'll just resolve to handle the error gracefully
          resolve(null);
        };

        // Add a cache-buster and request timestamp
        const cacheBuster = `?t=${Date.now()}`;
        img.src = url + cacheBuster;
      });
    };

    const preloadImages = async () => {
      const uniqueUrls = new Set();

      // Collect all unique URLs
      Object.values(matches).forEach(dateMatches => {
        Object.values(dateMatches).forEach(leagueMatches => {
          leagueMatches.forEach(match => {
            if (match.homeTeam?.crest) uniqueUrls.add(match.homeTeam.crest);
            if (match.awayTeam?.crest) uniqueUrls.add(match.awayTeam.crest);
            if (match.competition?.emblem) uniqueUrls.add(match.competition.emblem);
          });
        });
      });

      // Load images in smaller batches to avoid overwhelming mobile
      const batchSize = 5;
      const urls = Array.from(uniqueUrls);
      
      for (let i = 0; i < urls.length; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);
        try {
          await Promise.all(batch.map(url => loadImage(url)));
          // Small delay between batches
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.warn('Error loading image batch:', error);
        }
      }
    };

    preloadImages();
  }, [matches]);
};