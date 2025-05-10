// typographyManager.js
import assetManager from './assetManager.js';
import letterGenerator from './letterGenerator.js';
import { createLogger, generateFallbackLetterSVG } from './utils.js';
import config from './config.js';

// Create logger
const logger = createLogger('Typography', config.debug.enabled);

/**
 * Manages typography assets and letter generation
 */
class TypographyManager {
  constructor() {
    this.initialized = false;
    this.assetManager = assetManager;
    this.letterGenerator = letterGenerator;
  }
  
  /**
   * Initialize the typography manager
   */
  async initialize() {
    if (this.initialized) return true;
    
    try {
      // Initialize asset manager
      const assetsReady = await this.assetManager.initialize();
      if (!assetsReady) {
        logger.warn('Asset manager initialized but could not find asset paths - using fallback mode');
      }
      
      // Pre-warm the cache with a few common letters
      this._prewarmCache();
      
      this.initialized = true;
      logger.log('Typography manager initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize typography manager', error);
      return false;
    }
  }
  
  /**
   * Pre-warm the cache with common letters
   */
  async _prewarmCache() {
    // Queue up some common letters to load in background
    const prewarmLetters = ['A', 'B', 'E', 'T'];
    const styles = ['sans-upper', 'sans-lower'];
    
    for (const letter of prewarmLetters) {
      for (const style of styles) {
        this.loadLetter('NYC', style, letter).catch(() => {
          // Silently catch errors during prewarming
        });
      }
    }
  }
  
  /**
   * Load a letter with fallbacks
   */
  async loadLetter(city, style, letter, variant = '01') {
    try {
      // Try to load from asset manager first
      const letterAsset = await this.assetManager.loadLetter(city, style, letter, variant);
      return letterAsset;
    } catch (error) {
      logger.warn(`Could not load letter "${letter}" from assets, using generator instead`);
      
      // Use the letter generator as fallback
      return this.letterGenerator.generateLetter(letter, style, {
        variant,
        city
      });
    }
  }
  
  /**
   * Convert text to an array of letter objects
   */
  async getLettersFromText(text, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Default options
    const opts = {
      style: config.defaults.fontStyle,
      city: config.defaults.city,
      caseOption: config.defaults.caseOption,
      ...options
    };
    
    // Handle empty input
    if (!text || typeof text !== 'string') {
      logger.warn('Invalid text input:', text);
      text = config.defaults.text;
    }
    
    // Handle case conversion based on user selection
    let processedText = text;
    if (opts.caseOption === 'upper') {
      processedText = text.toUpperCase();
    } else if (opts.caseOption === 'lower') {
      processedText = text.toLowerCase();
    } // Keep as "mixed" otherwise
    
    logger.log(`Processing text "${text}" with options:`, opts);
    
    // Create letter array with loading promises
    const letterPromises = [];
    const letterInfo = [];
    
    // Process each character
    for (const char of processedText) {
      // Handle spaces
      if (char === ' ') {
        letterInfo.push({ 
          type: 'space', 
          value: char,
          index: letterInfo.length
        });
        letterPromises.push(Promise.resolve(null));
        continue;
      }
      
      // Handle non-alphanumeric characters
      if (!char.match(/[a-zA-Z0-9]/)) {
        letterInfo.push({ 
          type: 'special', 
          value: char,
          index: letterInfo.length 
        });
        letterPromises.push(Promise.resolve(null));
        continue;
      }
      
      // Determine if this should be uppercase or lowercase style
      const charCase = char === char.toUpperCase() ? 'upper' : 'lower';
      const fullStyle = `${opts.style}-${charCase}`;
      
      // Add info about this letter
      letterInfo.push({
        type: 'letter',
        value: char,
        style: opts.style,
        case: charCase,
        fullStyle,
        index: letterInfo.length
      });
      
      // Start loading this letter
      letterPromises.push(
        this.loadLetter(opts.city, fullStyle, char)
          .catch(error => {
            logger.warn(`Error loading letter "${char}":`, error);
            // Return SVG fallback on error
            return { 
              src: generateFallbackLetterSVG(char, opts.style),
              isFallback: true
            };
          })
      );
    }
    
    // Wait for all letters to load (or fail)
    const loadedImages = await Promise.all(letterPromises);
    
    // Create the final letter objects with loaded images
    const letters = letterInfo.map((info, i) => {
      if (info.type === 'space' || info.type === 'special') {
        return info;
      }
      
      return {
        ...info,
        image: loadedImages[i],
        isFallback: loadedImages[i]?.isFallback || false,
        isGenerated: loadedImages[i]?.isGenerated || false
      };
    });
    
    logger.log(`Generated ${letters.length} letter objects from text "${text}"`);
    return letters;
  }
  
  /**
   * Get stats about the typography system
   */
  getStats() {
    return {
      assetManager: this.assetManager.getStats(),
      letterGenerator: this.letterGenerator.getStats(),
      initialized: this.initialized
    };
  }
}

// Export a singleton instance
const typographyManager = new TypographyManager();
export default typographyManager;