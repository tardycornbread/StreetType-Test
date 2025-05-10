// scripts/letterSelector.js - FIXED VERSION
// Combined approach from old and new versions

import { generateFallbackLetterSVG } from './utils.js';

export default class LetterSelector {
  constructor(database) {
    this.database = database;
    this.fallbackCache = new Map(); // Cache for fallback SVGs
  }

  /**
   * Select a letter-image for each character in `text`.
   * Returns an array of letter-objects describing how to render each character.
   */
  async selectLettersForText(text, style, location) {
    const selected = [];
    // Available styles for random mix
    const availableStyles = ['sans', 'serif', 'mono', 'script', 'decorative'];

    for (const char of text) {
      // Handle spaces
      if (char === ' ') {
        selected.push({ type: 'space', value: char });
        continue;
      }

      // Handle non-alphanumeric characters (punctuation, etc.)
      if (!char.match(/[a-zA-Z0-9]/)) {
        selected.push({ type: 'special', value: char });
        continue;
      }
      
      // For random mix, choose a random style for each letter
      let currentStyle = style;
      if (style === 'random') {
        // Check if this is a number or symbol
        const isNumber = /^[0-9]$/.test(char);
        const isSymbol = /^[!@#$%^&*()_+\-=\[\]{}|;':",./<>?]$/.test(char);
        
        if (isNumber || isSymbol) {
          // Numbers and symbols don't need a style, they have their own folders
          currentStyle = 'default'; // Just use a generic style for fallbacks
        } else {
          // For letters, try each style until we find one with assets
          let foundStyle = false;
          
          // Shuffle the available styles randomly
          const shuffledStyles = [...availableStyles].sort(() => Math.random() - 0.5);
          
          for (const testStyle of shuffledStyles) {
            // Test if this style has valid variants for this letter
            try {
              const variants = await this.database.getLetterVariants(char, testStyle, location, true);
              if (variants && variants.length > 0 && !variants[0].startsWith('data:image/svg+xml')) {
                // Found a style with real image variants (not SVG fallbacks)
                currentStyle = testStyle;
                foundStyle = true;
                break;
              }
            } catch (err) {
              // Just continue to next style
              console.log(`Style ${testStyle} not available for ${char}`);
            }
          }
          
          // If no style found with real images, just pick a random one for the fallback
          if (!foundStyle) {
            const randomIndex = Math.floor(Math.random() * availableStyles.length);
            currentStyle = availableStyles[randomIndex];
            console.log(`Using fallback style ${currentStyle} for ${char}`);
          }
        }
      }

      // Fetch available variants (includes fallback if none numbered)
      let variants = [];
      try {
        variants = await this.database.getLetterVariants(char, currentStyle, location);
      } catch (err) {
        console.error(`Error fetching variants for "${char}":`, err);
      }

      // If no variants provided, use an SVG fallback
      if (!variants || variants.length === 0) {
        const fallbackData = this._getFallbackLetter(char, currentStyle);
        selected.push(fallbackData);
        continue;
      }

      // Check if the variant is an SVG data URL
      const path = variants[0]; // Use first variant
      const isSvgUrl = path.startsWith('data:image/svg+xml');
      
      if (isSvgUrl) {
        // For SVG data URLs, create special letter object
        selected.push({
          type: 'letter',
          value: char,
          path,
          url: path, // Add URL property for renderer compatibility
          style: currentStyle
        });
        continue;
      }

      // Randomly pick one variant path (if multiple exist)
      const index = Math.floor(Math.random() * variants.length);
      const selectedPath = variants[index];

      try {
        const img = await this.database.loadImage(selectedPath);
        selected.push({
          type: 'letter',
          value: char,
          path: selectedPath,
          url: selectedPath, // Add URL property for renderer compatibility
          image: img,
          style: currentStyle,
          isFallback: selectedPath.includes('/fallback/')
        });
      } catch (err) {
        console.error(`Error loading image for "${char}" at ${selectedPath}:`, err);
        // Use fallback for failed image loads
        const fallbackData = this._getFallbackLetter(char, style);
        selected.push(fallbackData);
      }
    }

    return selected;
  }
  
  /**
   * Get fallback letter (using cache to avoid regenerating SVGs)
   */
  _getFallbackLetter(char, style) {
    const cacheKey = `${char}_${style}`;
    
    if (this.fallbackCache.has(cacheKey)) {
      return this.fallbackCache.get(cacheKey);
    }
    
    // Generate SVG for this letter
    const svgUrl = generateFallbackLetterSVG(char, style);
    
    // Create fallback letter object that works with the renderer
    const fallbackLetter = {
      type: 'letter',
      value: char,
      url: svgUrl,
      path: svgUrl,
      isFallback: true,
      style: style
    };
    
    // Cache for future use
    this.fallbackCache.set(cacheKey, fallbackLetter);
    
    return fallbackLetter;
  }
}