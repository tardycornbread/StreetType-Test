// scripts/database.js

export default class LetterDatabase {
  constructor() {
    this.letterCache = {};       // Cache loaded Image objects
    this.loadingPromises = {};   // Ongoing load promises
  }

  /**
   * Test whether an image URL actually exists by letting the browser try to load it.
   * Includes timeout to prevent hanging requests
   * @param {string} path
   * @returns {Promise<boolean>}
   */
  async pathExists(path) {
    if (!path || typeof path !== 'string') {
      console.warn('[PATH CHECK] Invalid path provided:', path);
      return false;
    }

    console.log(`[PATH CHECK] Checking if path exists: ${path}`);
    
    return new Promise(resolve => {
      const img = new Image();
      const timeout = setTimeout(() => {
        img.src = ''; // Cancel request
        console.warn(`[PATH CHECK] Timeout loading: ${path}`);
        resolve(false);
      }, 3000); // 3 second timeout
      
      img.onload = () => {
        clearTimeout(timeout);
        console.log(`[PATH CHECK] Successfully loaded: ${path}`);
        resolve(true);
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        console.warn(`[PATH CHECK] Failed to load: ${path}`);
        resolve(false);
      };
      
      img.src = path;
    });
  }

  /**
   * Generate a fallback path for a character
   * @param {string} character A single alphanumeric character
   * @param {string} styleKey One of: "sans", "serif", "mono", "script", etc.
   * @returns {string} URL to a fallback image or SVG data URL
   */
  getFallbackPath(character, styleKey) {
    // Check if the character is valid alphanumeric
    if (!/^[a-zA-Z0-9]$/.test(character)) {
      console.warn(`[FALLBACK] Invalid character for fallback: ${character}`);
      character = '?'; // Use question mark as ultimate fallback
    }
    
    // Create SVG data URL directly instead of trying to load files
    // Get appropriate style based on styleKey
    const styleDir = LetterDatabase.styleFolderMap[styleKey] || 'sans';
    const font = this._getFontFamilyForStyle(styleDir);
    
    // Generate SVG inline
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="60" viewBox="0 0 40 60">
        <rect width="40" height="60" fill="#f0f0f0" stroke="#ccc" stroke-width="1"/>
        <text x="20" y="35" font-family="${font}" font-size="30" fill="#333" text-anchor="middle" dominant-baseline="middle">${character}</text>
      </svg>`;
    
    console.log(`[FALLBACK] Generated SVG fallback for "${character}" with style "${styleKey}"`);
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /**
   * Get appropriate font family for a style
   * @param {string} style Style name
   * @returns {string} Font family CSS string
   */
  _getFontFamilyForStyle(style) {
    switch (style) {
      case 'sans':
        return 'Arial, Helvetica, sans-serif';
      case 'serif':
        return 'Georgia, "Times New Roman", serif';
      case 'monospace':
        return '"Courier New", Courier, monospace';
      case 'script':
        return '"Comic Sans MS", cursive, sans-serif';
      case 'decorative':
        return 'Impact, fantasy';
      default:
        return 'sans-serif';
    }
  }

  /**
   * Map your UI style values → actual folder names on disk.
   */
  static styleFolderMap = {
    sans:       'sans',       // maps UI "sans" → folder "sans"
    serif:      'serif',      // "serif" → "serif"
    mono:       'monospace',  // "mono" → "monospace"
    script:     'script',     // "script" → "script"
    decorative: 'decorative'  // "decorative" → "decorative"
  };

  /**
   * Build the path for a character's numbered JPG variant.
   * Returns null for unsupported characters.
   *
   * @param {string} character    A single alphanumeric character
   * @param {string} styleKey     One of: "sans", "serif", "mono", "script", etc.
   * @param {string} location     City code (e.g. "NYC")
   * @param {number} variantIndex 1-based index to pick 01.jpg → 05.jpg
   * @returns {string|null} URL relative to web root
   */
  getLetterPath(character, styleKey, location, variantIndex = 1) {
    // Validate input parameters
    if (!character || typeof character !== 'string') {
      console.warn('[PATH BUILD] Invalid character provided:', character);
      return null;
    }
    
    if (!styleKey || typeof styleKey !== 'string') {
      console.warn('[PATH BUILD] Invalid style key provided:', styleKey);
      return null;
    }
    
    if (!location || typeof location !== 'string') {
      console.warn('[PATH BUILD] Invalid location provided:', location);
      return null;
    }

    if (!/^[a-zA-Z0-9]$/.test(character)) {
      console.warn(`[PATH BUILD] Unsupported character: "${character}"`);
      return null;
    }

    const letter = character.toUpperCase();                    // "A"
    const caseType = character === letter ? 'upper' : 'lower';   // "upper" or "lower"
    const idx = String(variantIndex).padStart(2, '0');      // "01", "02", …
    const styleDir = LetterDatabase.styleFolderMap[styleKey];

    if (!styleDir) {
      console.error(`[PATH BUILD] Unknown style key: "${styleKey}"`);
      return null;
    }

    // FIXED: Construct path based on actual folder structure
    // Remove the letter folder from the path
    const path = `assets/Alphabet/cities/${location}/alphabet/${letter}/${styleDir}-${caseType}/${idx}.jpg`;
    
    console.log(`[PATH BUILD] Generated path: ${path}`);
    return path;
  }

  /**
   * Gather up to 5 numbered variants (01–05). Only returns those that actually exist.
   * Improved with better error handling and fallbacks.
   *
   * @param {string} character
   * @param {string} styleKey
   * @param {string} location
   * @returns {Promise<string[]>} Array of existing URLs
   */
  async getLetterVariants(character, styleKey, location) {
    console.log(`[VARIANTS] Looking for variants of "${character}" in style "${styleKey}" for location "${location}"`);
    const found = [];

    try {
      for (let i = 1; i <= 5; i++) {
        const path = this.getLetterPath(character, styleKey, location, i);
        if (!path) {
          console.warn(`[VARIANTS] Could not generate path for variant ${i}`);
          continue;
        }
        
        console.log(`[VARIANTS] Checking variant ${i}: ${path}`);
        const exists = await this.pathExists(path);
        if (exists) {
          console.log(`[VARIANTS] Found valid variant ${i}: ${path}`);
          found.push(path);
        } else {
          console.warn(`[VARIANTS] Variant ${i} doesn't exist: ${path}`);
        }
      }
    } catch (err) {
      console.error(`[VARIANTS] Error checking variants for "${character}":`, err);
    }

    if (found.length === 0) {
      const fallbackPath = this.getFallbackPath(character, styleKey);
      console.warn(`[VARIANTS] No variants found, using fallback: ${fallbackPath.substring(0, 50)}...`);
      found.push(fallbackPath);
    } else {
      console.log(`[VARIANTS] Found ${found.length} variants for "${character}"`);
    }

    return found;
  }

  /**
   * Helper method to create a minimal valid image object
   * Used when image loading fails
   * @returns {Object} A minimal object with width/height properties
   */
  _createMinimalImageObject() {
    return {
      width: 40,
      height: 60,
      naturalWidth: 40,
      naturalHeight: 60
    };
  }

  /**
   * Load an image (or previously found variant) and cache it.
   * Improved with better error handling.
   * @param {string} path
   * @returns {Promise<HTMLImageElement|Object>}
   */
  async loadImage(path) {
    if (!path) {
      console.error(`[IMAGE LOAD] Invalid path: ${path}`);
      return this._createMinimalImageObject();
    }
    
    if (this.letterCache[path]) {
      console.log(`[IMAGE LOAD] Using cached image: ${path}`);
      return this.letterCache[path];
    }
    
    if (this.loadingPromises[path]) {
      console.log(`[IMAGE LOAD] Already loading: ${path}`);
      return this.loadingPromises[path];
    }

    console.log(`[IMAGE LOAD] Loading image: ${path.substring(0, 100)}`);
    
    this.loadingPromises[path] = new Promise((resolve) => {
      // Check if this is a data URL
      if (path.startsWith('data:')) {
        console.log(`[IMAGE LOAD] Loading from data URL`);
        const img = new Image();
        
        const timeout = setTimeout(() => {
          console.warn(`[IMAGE LOAD] Data URL image load timeout`);
          delete this.loadingPromises[path];
          resolve(this._createMinimalImageObject());
        }, 5000);
        
        img.onload = () => {
          clearTimeout(timeout);
          console.log(`[IMAGE LOAD] Data URL loaded successfully, dimensions: ${img.width}x${img.height}`);
          this.letterCache[path] = img;
          delete this.loadingPromises[path];
          resolve(img);
        };
        
        img.onerror = () => {
          clearTimeout(timeout);
          console.error(`[IMAGE LOAD] Failed to load data URL image`);
          delete this.loadingPromises[path];
          resolve(this._createMinimalImageObject());
        };
        
        img.src = path;
        return;
      }
      
      // Normal file path loading
      const img = new Image();
      
      const timeout = setTimeout(() => {
        console.warn(`[IMAGE LOAD] Timeout loading: ${path}`);
        delete this.loadingPromises[path];
        resolve(this._createMinimalImageObject());
      }, 5000);
      
      img.onload = () => {
        clearTimeout(timeout);
        console.log(`[IMAGE LOAD] Successfully loaded: ${path}, dimensions: ${img.width}x${img.height}`);
        this.letterCache[path] = img;
        delete this.loadingPromises[path];
        resolve(img);
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        console.error(`[IMAGE LOAD] Failed to load: ${path}`);
        delete this.loadingPromises[path];
        resolve(this._createMinimalImageObject());
      };
      
      img.src = path;
    });

    return this.loadingPromises[path];
  }
}



