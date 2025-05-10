// assetManager.js - OPTIMIZED
// Central manager for asset loading with robust path resolution and fallbacks
import { createLogger, generateFallbackLetterSVG } from './utils.js';
import config from './config.js';

// Create logger
const logger = createLogger('AssetManager', config.debug.enabled);

class AssetManager {
  constructor() {
    this.cache = new Map();
    this.fallbackImages = new Map();
    this.loadingPromises = new Map();
    this.stats = {
      requested: 0,
      loaded: 0,
      failed: 0,
      cached: 0
    };
    this.basePath = '';
    this.initialized = false;
    this.workingPathPattern = null;
    this.assetsDetected = false;
    this.assetDetectionCompleted = false;
  }

  /**
   * Initialize the asset manager and detect the correct base path
   */
  async initialize() {
    if (this.initialized) {
      logger.log('Asset manager already initialized');
      return this.assetsDetected;
    }
    
    // Create a test image - this will be our fallback
    const fallbackA = generateFallbackLetterSVG('A', 'sans');
    this.fallbackImages.set('A', { src: fallbackA, isFallback: true });

    // Skip asset path detection if we're in a development environment
    // That doesn't have the assets available - this prevents excessive 404s
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      logger.log('Development environment detected. Quick-checking assets...');
      
      // Try just a couple of common paths instead of all possible variations
      const quickPaths = [
        'assets/alphabet/NYC/A/sans-upper/01.jpg',
        'assets/letters/A/sans-upper/01.jpg'
      ];
      
      let assetsFound = false;
      for (const path of quickPaths) {
        const exists = await this._checkFileExists(path);
        if (exists) {
          this.basePath = path.split('/')[0] + '/';
          this.workingPathPattern = '${base}' + path.substring(this.basePath.length).replace('A', '${letter}').replace('sans-upper', '${style}').replace('01.jpg', '${variant}.jpg');
          assetsFound = true;
          break;
        }
      }
      
      // If assets still not found, just initialize in fallback mode
      if (!assetsFound) {
        logger.warn('No assets found in development environment. Using fallback mode.');
        this.basePath = 'assets/';
        this.initialized = true;
        this.assetDetectionCompleted = true;
        return false;
      }
    } else {
      // In production, try all paths
      const possibleBasePaths = [
        '', // Root relative
        'assets/', // assets/ folder
        '/assets/', // absolute path to assets/
        './assets/', // Explicit relative path
        '../assets/', // Up one directory
        'images/', // images folder
        '/images/',
        './images/',
        'fonts/', // fonts folder
        '/fonts/',
        './fonts/',
        'letters/', // letters folder
        '/letters/',
        './letters/'
      ];
      
      logger.log('Trying to detect asset base path...');
      
      // Test each base path by trying various folder structures
      const pathTemplates = [
        '${base}${city}/alphabet/${letter}/${style}/${variant}.jpg',
        '${base}cities/${city}/alphabet/${letter}/${style}/${variant}.jpg',
        '${base}alphabet/${city}/${letter}/${style}/${variant}.jpg',
        '${base}${letter}/${style}/${variant}.jpg',
        '${base}${style}/${letter}/${variant}.jpg',
        '${base}${letter}_${style}_${variant}.jpg'
      ];
      
      // Test each combination of base path and template
      for (const basePath of possibleBasePaths) {
        for (const template of pathTemplates) {
          // Create a test path with a timestamp to avoid caching
          const testPath = this._replacePlaceholders(template, {
            base: basePath,
            city: 'NYC',
            letter: 'A',
            style: 'sans-upper',
            variant: '01'
          });
          
          logger.log(`Testing path: ${testPath}`);
          const exists = await this._checkFileExists(testPath);
          
          if (exists) {
            logger.log(`Found working path pattern: ${template} with base: ${basePath}`);
            this.basePath = basePath;
            this.workingPathPattern = template;
            this.assetsDetected = true;
            break;
          }
        }
        
        if (this.assetsDetected) break;
      }
    }
    
    // If no working path found, use fallback mode
    if (!this.assetsDetected) {
      logger.warn('Could not find working asset path. Using fallback rendering mode.');
      this.basePath = 'assets/';
    }
    
    this.initialized = true;
    this.assetDetectionCompleted = true;
    return this.assetsDetected;
  }

  /**
   * Replace placeholders in a template string
   */
  _replacePlaceholders(template, values) {
    let result = template;
    for (const [key, value] of Object.entries(values)) {
      result = result.replace(`\${${key}}`, value);
    }
    return result;
  }

  /**
   * Check if a file exists by attempting to load it
   */
  _checkFileExists(path) {
    return new Promise((resolve) => {
      const timestamp = new Date().getTime();
      const img = new Image();
      
      // Reduce timeout for faster development experience
      const timeoutId = setTimeout(() => {
        logger.warn(`Timeout checking path: ${path}`);
        resolve(false);
      }, 1000); // Reduced from 2000ms
      
      img.onload = () => {
        clearTimeout(timeoutId);
        logger.log(`File exists: ${path}`);
        resolve(true);
      };
      
      img.onerror = () => {
        clearTimeout(timeoutId);
        logger.log(`File does not exist: ${path}`);
        resolve(false);
      };
      
      img.src = `${path}?t=${timestamp}`;
    });
  }

  /**
   * Load a letter asset
   */
  async loadLetter(city, style, letter, variant = '01') {
    if (!this.initialized) {
      await this.initialize();
    }
    
    this.stats.requested++;
    
    // Create a cache key for this letter
    const cacheKey = `${city}_${style}_${letter}_${variant}`;
    
    // Check if this letter is already in the cache
    if (this.cache.has(cacheKey)) {
      this.stats.cached++;
      return this.cache.get(cacheKey);
    }
    
    // Check if we're already loading this letter
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }
    
    // If we know for sure assets aren't available, return fallback immediately
    // This optimization prevents unnecessary network requests
    if (this.assetDetectionCompleted && !this.assetsDetected) {
      return this._getFallbackLetter(letter, style);
    }
    
    // Start loading the letter
    const loadPromise = this._loadLetterImage(city, style, letter, variant);
    this.loadingPromises.set(cacheKey, loadPromise);
    
    try {
      const letter = await loadPromise;
      this.cache.set(cacheKey, letter);
      this.loadingPromises.delete(cacheKey);
      return letter;
    } catch (error) {
      this.loadingPromises.delete(cacheKey);
      logger.error(`Failed to load letter: ${cacheKey}`, error);
      
      // Return a fallback letter
      this.stats.failed++;
      return this._getFallbackLetter(letter, style);
    }
  }
  
  /**
   * Get a fallback letter image
   */
  _getFallbackLetter(char, style) {
    // Check if we already have a fallback for this letter
    if (this.fallbackImages.has(char)) {
      return this.fallbackImages.get(char);
    }
    
    // Create a fallback SVG
    const fallbackSrc = generateFallbackLetterSVG(char, style);
    const fallback = { src: fallbackSrc, isFallback: true };
    
    // Cache the fallback
    this.fallbackImages.set(char, fallback);
    
    return fallback;
  }

  /**
   * Internal method to load a letter image
   */
  async _loadLetterImage(city, style, letter, variant) {
    // If we don't have a working path pattern, use fallback
    if (!this.workingPathPattern) {
      return this._getFallbackLetter(letter, style);
    }
    
    // Try to load the letter using our working pattern
    const path = this._replacePlaceholders(this.workingPathPattern, {
      base: this.basePath,
      city: city,
      letter: letter,
      style: style,
      variant: variant
    });
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        this.stats.loaded++;
        resolve({ src: img.src, width: img.width, height: img.height, isFallback: false });
      };
      
      img.onerror = () => {
        reject(new Error(`Failed to load image: ${path}`));
      };
      
      img.src = path;
    });
  }

  /**
   * Get loading statistics
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      fallbacksCreated: this.fallbackImages.size,
      pendingLoads: this.loadingPromises.size,
      workingPathPattern: this.workingPathPattern,
      basePath: this.basePath,
      initialized: this.initialized,
      assetsDetected: this.assetsDetected
    };
  }
}

// Export a singleton instance
const assetManager = new AssetManager();
export default assetManager;