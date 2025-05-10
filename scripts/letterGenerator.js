// letterGenerator.js
import { generateFallbackLetterSVG } from './utils.js';

/**
 * Generates letter fallbacks when actual letter assets cannot be found
 */
class LetterGenerator {
  constructor() {
    this.cache = new Map();
    this.stats = {
      generated: 0,
      cached: 0
    };
  }

  /**
   * Generate a letter with the specified style
   * @param {string} char - The character to generate
   * @param {string} style - The style to use
   * @param {Object} options - Additional options
   * @returns {Object} The generated letter object
   */
  generateLetter(char, style, options = {}) {
    const cacheKey = `${char}_${style}_${options.variant || '01'}_${options.city || 'NYC'}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      this.stats.cached++;
      return this.cache.get(cacheKey);
    }
    
    // Generate SVG data URL
    const svgUrl = generateFallbackLetterSVG(char, style);
    
    // Create letter object
    const letter = {
      src: svgUrl,
      isGenerated: true,
      isFallback: true
    };
    
    // Cache for future use
    this.cache.set(cacheKey, letter);
    this.stats.generated++;
    
    return letter;
  }
  
  /**
   * Get statistics about letter generation
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.cache.size
    };
  }
}

// Export a singleton instance
const letterGenerator = new LetterGenerator();
export default letterGenerator;