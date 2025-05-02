// scripts/utils.js

/**
 * Check whether the browser supports required APIs.
 * @returns {boolean} True if all features are supported.
 */
export function checkBrowserSupport() {
    const features = {
      canvas: !!window.CanvasRenderingContext2D,
      p5: typeof window.p5 !== 'undefined',
      fetch: typeof window.fetch !== 'undefined',
      fileAPI: typeof window.FileReader !== 'undefined',
    };
    const missing = Object.entries(features)
      .filter(([, ok]) => !ok)
      .map(([feat]) => feat);
  
    if (missing.length > 0) {
      console.warn('Missing browser features:', missing.join(', '));
    }
    return missing.length === 0;
  }
  
  /**
   * Debounce function calls: delays invoking fn until after wait ms have elapsed
   * since the last time it was invoked. Optionally invoke immediately on the first call.
   * @param {Function} fn - Function to debounce.
   * @param {number} wait - Milliseconds to wait.
   * @param {boolean} [immediate=false] - Trigger on leading edge instead of trailing.
   * @returns {Function} Debounced function.
   */
  export function debounce(fn, wait, immediate = false) {
    let timeout = null;
    return function(...args) {
      const callNow = immediate && timeout === null;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        timeout = null;
        if (!immediate) fn.apply(this, args);
      }, wait);
      if (callNow) fn.apply(this, args);
    };
  }
  
  /**
   * Return system-font fallback string based on style.
   * @param {string} style - One of 'sans', 'serif', 'mono', 'script'.
   * @returns {string} CSS font-family fallback.
   */
  export function getSystemFontFallbacks(style) {
    switch (style) {
      case 'sans':
        return 'Arial, Helvetica, sans-serif';
      case 'serif':
        return 'Georgia, "Times New Roman", serif';
      case 'mono':
        return '"Courier New", Courier, monospace';
      case 'script':
        return '"Comic Sans MS", cursive, sans-serif';
      default:
        return 'sans-serif';
    }
  }
  
  /**
   * Generate a simple SVG-based fallback for missing letters as a data URL.
   * @param {string} char - The character to render.
   * @param {string} style - Font style key (for fallback selection).
   * @returns {string} A data URI containing the SVG of the letter.
   */
  export function generateFallbackLetterSVG(char, style) {
    const font = getSystemFontFallbacks(style);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="60" viewBox="0 0 40 60">
        <rect width="40" height="60" fill="#f0f0f0" stroke="#ccc" stroke-width="1"/>
        <text x="20" y="40" font-family="${font}" font-size="30" fill="#333" text-anchor="middle" dominant-baseline="middle">${char}</text>
      </svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

window.generateFallbackLetterSVG = generateFallbackLetterSVG;
window.getSystemFontFallbacks = getSystemFontFallbacks;
  
  