// services/imagePreloader.js
export class ImagePreloader {
    static imageCache = new Map();
    static loadingPromises = new Map();
    
    static async preloadImages(matches) {
      const urls = new Set();
  
      // Collect all URLs first
      Object.values(matches).forEach(dateMatches => {
        Object.values(dateMatches).forEach(leagueMatches => {
          leagueMatches.forEach(match => {
            if (match.homeTeam?.crest) urls.add(match.homeTeam.crest);
            if (match.awayTeam?.crest) urls.add(match.awayTeam.crest);
            if (match.competition?.emblem) urls.add(match.competition.emblem);
          });
        });
      });
  
      const loadImage = async (url) => {
        // If already cached, return immediately
        if (this.imageCache.has(url)) {
          return true;
        }
  
        // If already loading, return existing promise
        if (this.loadingPromises.has(url)) {
          return this.loadingPromises.get(url);
        }
  
        // Create new loading promise
        const promise = new Promise((resolve) => {
          const img = new Image();
          
          img.onload = () => {
            this.imageCache.set(url, true);
            this.loadingPromises.delete(url);
            resolve(true);
          };
  
          img.onerror = () => {
            // On error, cache the fallback to prevent repeated attempts
            this.imageCache.set(url, false);
            this.loadingPromises.delete(url);
            resolve(false);
          };
  
          // Add timestamp to prevent caching
          img.src = `${url}?t=${Date.now()}`;
        });
  
        this.loadingPromises.set(url, promise);
        return promise;
      };
  
      // Load all images concurrently
      const promises = Array.from(urls).map(url => loadImage(url));
      await Promise.all(promises);
  
      return true;
    }
  
    static isImageLoaded(url) {
      return this.imageCache.get(url) === true;
    }
  
    static clearCache() {
      this.imageCache.clear();
      this.loadingPromises.clear();
    }
  }