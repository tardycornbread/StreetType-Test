// scripts/letterSelector.js

export default class LetterSelector {
  constructor(database) {
    this.database = database;
    // Add decorative to the available styles
    this.availableStyles = ['sans', 'serif', 'mono', 'script', 'decorative'];
  }

  /**
   * Get selected letters based on user options.
   * This wraps selectLettersForText and adds case handling.
   * @param {Object} options - Selection options
   * @param {string} options.text - The text to generate
   * @param {string} options.style - Font style (sans, serif, etc.) or "random"
   * @param {string} options.city - City code (e.g., NYC)
   * @param {string} options.caseOption - Case option (mixed, upper, lower)
   * @returns {Promise<Array>} Array of letter objects
   */
  async getSelectedLetters(options) {
    if (!options || typeof options !== 'object') {
      console.error('Invalid options provided to getSelectedLetters');
      return [];
    }
    
    const { text = '', style = 'sans', city = 'NYC', caseOption = 'mixed' } = options;
    
    // Handle case conversion based on user selection
    let processedText = text;
    if (caseOption === 'upper') {
      processedText = text.toUpperCase();
    } else if (caseOption === 'lower') {
      processedText = text.toLowerCase();
    }
    // 'mixed' keeps the text as-is
    
    if (style === 'random') {
      console.log('[SELECTOR] Using random style mode - each letter will get its own style');
      return this.selectLettersWithRandomStyles(processedText, city);
    } else {
      console.log(`[SELECTOR] Using fixed style mode: "${style}"`);
      return this.selectLettersForText(processedText, style, city);
    }
  }

  /**
   * Select letters using a random style for each character
   * @param {string} text - The text to process
   * @param {string} location - City code (e.g., NYC) 
   * @returns {Promise<Array>} Array of letter objects
   */
  async selectLettersWithRandomStyles(text, location) {
    console.log(`[SELECTOR] Selecting letters with random styles for "${text}"`);
    const selected = [];
    
    if (!text || typeof text !== 'string' || text.length === 0) {
      console.warn('[SELECTOR] Empty or invalid text provided');
      return [];
    }

    for (const char of text) {
      try {
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
        
        // Choose a random style for this letter
        const randomStyle = this.getRandomStyle();
        console.log(`[SELECTOR] Chose random style "${randomStyle}" for character "${char}"`);
      
        // Try to fetch variants, but don't let it throw
        let variants = [];
        try {
          variants = await this.database.getLetterVariants(char, randomStyle, location);
        } catch (err) {
          console.error(`[SELECTOR] Error fetching variants for "${char}":`, err);
        }
      
        // If no variants, immediately use a placeholder
        if (!variants || variants.length === 0) {
          console.warn(`[SELECTOR] No variants found for "${char}" with style "${randomStyle}", using placeholder`);
          const placeholderImg = await this.createPlaceholderImage(char, randomStyle);
          selected.push({ 
            type: 'letter', 
            value: char,
            image: placeholderImg,
            isFallback: true,
            style: randomStyle  // Store the style used
          });
          continue;
        }
      
        // Randomly pick one variant path
        const index = Math.floor(Math.random() * variants.length);
        const path = variants[index];
      
        // Try to load the image but be prepared for failure
        let img = null;
        try {
          img = await this.database.loadImage(path);
        } catch (err) {
          console.warn(`[SELECTOR] Failed to load image for "${char}" at ${path}:`, err);
        }
          
        // If image loading failed, create a placeholder
        if (!img || !img.width || !img.height) {
          console.warn(`[SELECTOR] Invalid image for "${char}", using placeholder`);
          const placeholderImg = await this.createPlaceholderImage(char, randomStyle);
          selected.push({
            type: 'letter',
            value: char,
            image: placeholderImg,
            isFallback: true,
            style: randomStyle  // Store the style used
          });
        } else {
          // Successfully loaded image
          selected.push({
            type: 'letter',
            value: char,
            path,
            image: img,
            isFallback: path.includes('/fallback/'),
            style: randomStyle  // Store the style used
          });
        }
      } catch (err) {
        // Catch any unexpected errors in processing letters
        console.error(`[SELECTOR] Critical error processing letter "${char}":`, err);
        
        // Create a truly minimal valid image object on error
        const fallbackImg = {
          width: 40,
          height: 60,
          naturalWidth: 40,
          naturalHeight: 60
        };
        
        selected.push({ 
          type: 'letter', 
          value: char, 
          image: fallbackImg,
          isFallback: true,
          style: 'sans'  // Default style on error
        });
      }
    }

    return selected;
  }

  /**
   * Get a random style from the available styles
   * @returns {string} A random style name
   */
  getRandomStyle() {
    const randomIndex = Math.floor(Math.random() * this.availableStyles.length);
    return this.availableStyles[randomIndex];
  }

  /**
   * Create a simple placeholder image for a character
   * @param {string} char - The character to create a placeholder for
   * @param {string} style - Font style for the fallback
   * @returns {Promise<HTMLImageElement>} - A loaded image element
   */
  async createPlaceholderImage(char, style) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 40;
      canvas.height = 60;
      const ctx = canvas.getContext('2d');
      
      // Draw background
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, 40, 60);
      
      // Draw border
      ctx.strokeStyle = '#ccc';
      ctx.strokeRect(0, 0, 40, 60);
      
      // Draw text
      ctx.fillStyle = '#333';
      ctx.font = '30px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(char, 20, 30);
      
      // Create image from canvas
      const img = new Image();
      img.onload = () => {
        // Ensure the image has width and height properties
        if (!img.width) img.width = 40;
        if (!img.height) img.height = 60;
        resolve(img);
      };
      img.onerror = () => {
        // Create a truly minimal valid image object on error
        const fallbackImg = {
          width: 40,
          height: 60,
          naturalWidth: 40,
          naturalHeight: 60
        };
        resolve(fallbackImg);
      };
      img.src = canvas.toDataURL('image/png');
    });
  }

  /**
   * Select a letter-image for each character in `text`.
   * Returns an array of letter-objects describing how to render each character.
   * Improved with better error handling and fallbacks.
   */
  async selectLettersForText(text, style, location) {
    const selected = [];
    
    if (!text || typeof text !== 'string' || text.length === 0) {
      console.warn('[SELECTOR] Empty or invalid text provided to selectLettersForText');
      return [];
    }

    for (const char of text) {
      try {
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
      
        // Try to fetch variants, but don't let it throw
        let variants = [];
        try {
          variants = await this.database.getLetterVariants(char, style, location);
        } catch (err) {
          console.error(`[SELECTOR] Error fetching variants for "${char}":`, err);
        }
      
        // If no variants, immediately use a placeholder
        if (!variants || variants.length === 0) {
          console.warn(`[SELECTOR] No variants found for "${char}", using placeholder`);
          const placeholderImg = await this.createPlaceholderImage(char, style);
          selected.push({ 
            type: 'letter', 
            value: char,
            image: placeholderImg,
            isFallback: true,
            style: style  // Store the style used
          });
          continue;
        }
      
        // Randomly pick one variant path
        const index = Math.floor(Math.random() * variants.length);
        const path = variants[index];
      
        // Try to load the image but be prepared for failure
        let img = null;
        try {
          img = await this.database.loadImage(path);
        } catch (err) {
          console.warn(`[SELECTOR] Failed to load image for "${char}" at ${path}:`, err);
        }
          
        // If image loading failed, create a placeholder
        if (!img || !img.width || !img.height) {
          console.warn(`[SELECTOR] Invalid image for "${char}", using placeholder`);
          const placeholderImg = await this.createPlaceholderImage(char, style);
          selected.push({
            type: 'letter',
            value: char,
            image: placeholderImg,
            isFallback: true,
            style: style  // Store the style used
          });
        } else {
          // Successfully loaded image
          selected.push({
            type: 'letter',
            value: char,
            path,
            image: img,
            isFallback: path.includes('/fallback/'),
            style: style  // Store the style used
          });
        }
      } catch (err) {
        // Catch any unexpected errors in processing letters
        console.error(`[SELECTOR] Critical error processing letter "${char}":`, err);
        
        // Create a truly minimal valid image object on error
        const fallbackImg = {
          width: 40,
          height: 60,
          naturalWidth: 40,
          naturalHeight: 60
        };
        
        selected.push({ 
          type: 'letter', 
          value: char, 
          image: fallbackImg,
          isFallback: true,
          style: style  // Store the style used
        });
      }
    }

    return selected;
  }
}
  