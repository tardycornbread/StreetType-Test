// scripts/database.js - FIXED VERSION
// With support for Numbers and Symbols folders

import { generateFallbackLetterSVG } from './utils.js';

export default class LetterDatabase {
  constructor() {
    this.letterCache = {};       // Cache loaded Image objects
    this.loadingPromises = {};   // Ongoing load promises
    this.pathExistsCache = {};   // Cache results of pathExists checks
    this.assetsDetected = false; // Flag to track if we've detected any assets
    
    // Check for assets once to avoid excessive 404s
    this._checkForAssets();
  }
  
  /**
   * Quick check to see if any assets exist to reduce 404 errors
   */
  async _checkForAssets() {
    // Test a few common paths and variants
    const testCases = [
      // Test sans-serif uppercase
      'assets/Alphabet/cities/NYC/alphabet/A/sans-upper/01.jpg',
      'assets/alphabet/NYC/A/sans-upper/01.jpg',
      'assets/alphabet/cities/NYC/alphabet/A/sans-upper/01.jpg',
      
      // Test sans-serif lowercase
      'assets/Alphabet/cities/NYC/alphabet/a/sans-lower/01.jpg',
      'assets/alphabet/NYC/a/sans-lower/01.jpg',
      
      // Test serif
      'assets/Alphabet/cities/NYC/alphabet/A/serif-upper/01.jpg',
      'assets/alphabet/NYC/A/serif-upper/01.jpg',
      
      // Basic tests without cities subfolder
      'assets/A/sans-upper/01.jpg',
      'assets/alphabet/A/sans-upper/01.jpg',
      
      // Test numbers folder (both standalone and nested structures)
      'assets/Numbers/1/01.jpg',
      'assets/numbers/1/01.jpg',
      
      // Test symbols folder at root level
      'assets/Symbols/period/01.jpg',
      'assets/symbols/period/01.jpg',
      'assets/Symbols/exclamation/01.jpg',
    ];
    
    console.log('Checking for asset availability...');
    
    // Check each category separately
    let alphabetAssetsFound = false;
    let numberAssetsFound = false;
    let symbolAssetsFound = false;
    
    // Try each test path
    for (const testPath of testCases) {
      const exists = await this.pathExists(testPath);
      
      if (exists) {
        this.assetsDetected = true;
        console.log(`Assets detected at path: ${testPath}`);
        
        // Determine which category this belongs to
        if (testPath.includes('Numbers') || testPath.includes('numbers')) {
          numberAssetsFound = true;
        } else if (testPath.includes('Symbols') || testPath.includes('symbols')) {
          symbolAssetsFound = true;
        } else {
          alphabetAssetsFound = true;
        }
      }
    }
    
    this.pathExistsCache.checked = true;
    
    // Log what we found
    console.log(`Asset detection complete: 
      - Alphabet assets: ${alphabetAssetsFound ? 'FOUND' : 'NOT FOUND'}
      - Number assets: ${numberAssetsFound ? 'FOUND' : 'NOT FOUND'}
      - Symbol assets: ${symbolAssetsFound ? 'FOUND' : 'NOT FOUND'}
    `);
    
    if (!this.assetsDetected) {
      console.warn('No assets detected. Will use SVG fallbacks.');
    } else {
      console.log('Assets detected and available.');
    }
  }

  /**
   * Test whether an image URL actually exists by letting the browser try to load it.
   * @param {string} path
   * @returns {Promise<boolean>}
   */
  async pathExists(path) {
    // Check cache first
    if (path in this.pathExistsCache) {
      const result = this.pathExistsCache[path];
      console.log(`Path cache hit: ${path}, exists: ${result}`);
      return result;
    }
    
    // Skip checking if we already know no assets exist
    if (this.pathExistsCache.checked && !this.assetsDetected) {
      console.log(`Skipping check for ${path} - no assets detected`);
      return false;
    }
    
    console.log(`Testing path: ${path}`);
    
    return new Promise(resolve => {
      const img = new Image();
      
      // Set a timeout to avoid waiting too long
      const timeoutId = setTimeout(() => {
        console.log(`Timeout checking path: ${path}`);
        this.pathExistsCache[path] = false;
        resolve(false);
      }, 1000);
      
      img.onload = () => {
        clearTimeout(timeoutId);
        console.log(`Path exists: ${path}`);
        this.pathExistsCache[path] = true;
        resolve(true);
      };
      
      img.onerror = () => {
        clearTimeout(timeoutId);
        console.log(`Path does not exist: ${path}`);
        this.pathExistsCache[path] = false;
        resolve(false);
      };
      
      // Add cache buster to avoid browser caching
      img.src = `${path}?t=${Date.now()}`;
    });
  }

  /**
   * Map your UI style values → actual folder names on disk.
   */
  static styleFolderMap = {
    sans:       'sans',       // maps UI "sans" → folder "sans"
    serif:      'serif',      // "serif" → "serif"
    mono:       'monospace',  // "mono" → "monospace"
    script:     'script',     // "script" → "script"
    decorative: 'decorative', // if you add "decorative"
    random:     'sans'        // random will pick a random style per letter
  };

  /**
   * Build the path for a character's numbered JPG variant.
   * Returns null for unsupported characters.
   *
   * @param {string} character    A single alphanumeric character or symbol
   * @param {string} styleKey     One of: "sans", "serif", "mono", "script", etc.
   * @param {string} location     City code (e.g. "NYC")
   * @param {number} variantIndex 1-based index to pick 01.jpg → 05.jpg
   * @returns {string|null} URL relative to web root
   */
  getLetterPath(character, styleKey, location, variantIndex = 1) {
    // Format the variant index as a two-digit string
    const idx = String(variantIndex).padStart(2, '0');
    
    // Handle numbers (0-9)
    if (/^[0-9]$/.test(character)) {
      // For numbers, use the root Numbers folder - style independent
      return [
        'assets',
        'Numbers',
        character,
        `${idx}.jpg`
      ].join('/');
    }
    
    // Handle common symbols with special naming
    const symbolRegex = /^[!@#$%^&*()_+\-=[\]{}|;':",./<>?]$/;
    if (symbolRegex.test(character)) {
      let symbolName = 'symbol'; // Default name
      
      // Map symbols to folder names
      const symbolMap = {
        '!': 'exclamation',
        '?': 'question',
        '.': 'period',
        ',': 'comma',
        ':': 'colon',
        ';': 'semicolon',
        '"': 'quote',
        "'": 'apostrophe',
        '(': 'parenthesis-open',
        ')': 'parenthesis-close',
        '[': 'bracket-open',
        ']': 'bracket-close',
        '{': 'brace-open',
        '}': 'brace-close',
        '<': 'angle-open',
        '>': 'angle-close',
        '+': 'plus',
        '-': 'minus',
        '*': 'asterisk',
        '/': 'slash',
        '\\': 'backslash',
        '|': 'vertical-bar',
        '=': 'equals',
        '@': 'at',
        '#': 'hash',
        '$': 'dollar',
        '%': 'percent',
        '^': 'caret',
        '&': 'ampersand',
        '_': 'underscore'
      };
      
      if (character in symbolMap) {
        symbolName = symbolMap[character];
      }
      
      // For symbols, use the root Symbols folder - style independent
      return [
        'assets',
        'Symbols',
        symbolName,
        `${idx}.jpg`
      ].join('/');
    }
    
    // Handle alpha characters (a-z, A-Z)
    if (/^[a-zA-Z]$/.test(character)) {
      const letter = character.toUpperCase();                  // "A"
      const caseType = character === letter ? 'upper' : 'lower'; // "upper" or "lower"
      const styleDir = LetterDatabase.styleFolderMap[styleKey];
      
      if (!styleDir) {
        console.error(`Unknown style key: ${styleKey}`);
        return null;
      }
      
      // e.g. assets/Alphabet/cities/NYC/alphabet/A/sans-upper/01.jpg
      return [
        'assets',
        'Alphabet',
        'cities',
        location,
        'alphabet',
        letter,
        `${styleDir}-${caseType}`,
        `${idx}.jpg`
      ].join('/');
    }
    
    // Unsupported character
    return null;
  }

  /**
   * Gather up to 3 numbered variants (01–03). Only returns those that actually exist.
   * If none exist, returns an SVG fallback URL.
   *
   * @param {string} character
   * @param {string} styleKey
   * @param {string} location
   * @param {boolean} skipFallback - If true, don't generate SVG fallback when no variants found
   * @returns {Promise<string[]>} Array of existing URLs
   */
  async getLetterVariants(character, styleKey, location, skipFallback = false) {
    // If we know no assets exist, return SVG fallback immediately
    if (this.pathExistsCache.checked && !this.assetsDetected && !skipFallback) {
      const fullStyle = `${styleKey}-${character === character.toUpperCase() ? 'upper' : 'lower'}`;
      const svgUrl = generateFallbackLetterSVG(character, fullStyle);
      return [svgUrl];
    }
    
    const found = [];

    // Check if character is a number or symbol
    const isNumber = /^[0-9]$/.test(character);
    const isSymbol = /^[!@#$%^&*()_+\-=[\]{}|;':",./<>?]$/.test(character);
    
    // Try alternative paths for numbers and symbols (different cases, folder structures)
    if (isNumber || isSymbol) {
      // Get the primary path from getLetterPath method
      const primaryPath = this.getLetterPath(character, styleKey, location, 1);
      
      if (primaryPath) {
        // Check if this path exists
        const exists = await this.pathExists(primaryPath);
        if (exists) {
          found.push(primaryPath);
        }
        
        // Try additional variants
        for (let i = 2; i <= 3; i++) {
          const variantPath = this.getLetterPath(character, styleKey, location, i);
          if (variantPath) {
            const exists = await this.pathExists(variantPath);
            if (exists) {
              found.push(variantPath);
            }
          }
        }
      }
    } else {
      // Regular letter handling
      // Only check first 3 variants to reduce 404s
      for (let i = 1; i <= 3; i++) {
        const path = this.getLetterPath(character, styleKey, location, i);
        if (path) {
          const exists = await this.pathExists(path);
          if (exists) {
            found.push(path);
          }
        }
      }
    }
    
    // If no variants found and not skipping fallbacks, add SVG fallback URL
    if (found.length === 0 && !skipFallback) {
      // The combined style with case information
      let fullStyle;
      
      // For letters, use case-specific style
      if (/^[a-zA-Z]$/.test(character)) {
        fullStyle = `${styleKey}-${character === character.toUpperCase() ? 'upper' : 'lower'}`;
      } else {
        // For numbers and symbols, just use the base style
        fullStyle = styleKey;
      }
      
      // Generate SVG data URL
      const svgUrl = generateFallbackLetterSVG(character, fullStyle);
      found.push(svgUrl);
    }

    return found;
  }

  /**
   * Load an image (or previously found variant) and cache it.
   * @param {string} path
   * @returns {Promise<HTMLImageElement|null>}
   */
  async loadImage(path) {
    if (!path) return null;
    
    // If this is an SVG data URL, create a simple image object
    if (path.startsWith('data:image/svg+xml')) {
      const img = new Image();
      img.src = path;
      console.log(`Created SVG fallback image for: ${path.substring(0, 30)}...`);
      return img; // Return immediately without waiting for load
    }
    
    if (this.letterCache[path]) {
      console.log(`Cache hit for image: ${path}`);
      return this.letterCache[path];
    }
    
    if (this.loadingPromises[path]) {
      console.log(`Already loading image: ${path}`);
      return this.loadingPromises[path];
    }

    console.log(`Loading image: ${path}`);
    this.loadingPromises[path] = new Promise((resolve, reject) => {
      const img = new Image();
      
      // Set timeout to avoid hanging
      const timeoutId = setTimeout(() => {
        delete this.loadingPromises[path];
        console.error(`Timeout loading image: ${path}`);
        reject(new Error(`Timeout loading image: ${path}`));
      }, 5000);
      
      img.onload = () => {
        clearTimeout(timeoutId);
        this.letterCache[path] = img;
        delete this.loadingPromises[path];
        console.log(`Successfully loaded image: ${path}`);
        resolve(img);
      };
      
      img.onerror = () => {
        clearTimeout(timeoutId);
        delete this.loadingPromises[path];
        console.error(`Failed to load image: ${path}`);
        reject(new Error(`Failed to load image: ${path}`));
      };
      
      // Add cache buster to avoid browser caching
      img.src = `${path}?t=${Date.now()}`;
    });

    return this.loadingPromises[path];
  }
}