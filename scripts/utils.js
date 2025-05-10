// scripts/utils.js - FIXED VERSION
// Contains enhanced SVG fallback generator for letters

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
 * Create a logger with optional debug mode
 * @param {string} prefix - Logger prefix
 * @param {boolean} debugEnabled - Whether debug mode is enabled
 * @returns {Object} Logger object with log, warn, and error methods
 */
export function createLogger(prefix, debugEnabled = false) {
  const logger = {
    log: function(...args) {
      if (debugEnabled) {
        console.log(`[${prefix}]`, ...args);
      }
    },
    warn: function(...args) {
      if (debugEnabled) {
        console.warn(`[${prefix}]`, ...args);
      }
    },
    error: function(...args) {
      console.error(`[${prefix}]`, ...args);
    }
  };
  
  return logger;
}

/**
 * Return system-font fallback string based on style.
 * @param {string} style - One of 'sans', 'serif', 'mono', 'script'.
 * @returns {string} CSS font-family fallback.
 */
export function getSystemFontFallbacks(style) {
  // Extract base style without case suffix
  let baseStyle = style;
  if (style && (style.includes('-upper') || style.includes('-lower'))) {
    baseStyle = style.split('-')[0];
  }
  
  switch (baseStyle) {
    case 'sans':
      return 'Arial, Helvetica, sans-serif';
    case 'serif':
      return 'Georgia, "Times New Roman", serif';
    case 'mono':
      return '"Courier New", Courier, monospace';
    case 'script':
      return '"Comic Sans MS", cursive, sans-serif';
    case 'decorative':
      return '"Impact", fantasy';
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
  
  // Extract base style without case suffix
  let baseStyle = style;
  if (style && (style.includes('-upper') || style.includes('-lower'))) {
    baseStyle = style.split('-')[0];
  }
  
  // Select colors based on style
  let fill = '#333';
  let background = '#f0f0f0';
  let stroke = '#ccc';
  
  if (baseStyle === 'sans') {
    fill = '#3a7ca5';
    background = '#f0f8ff';
    stroke = '#2a5a7a';
  } else if (baseStyle === 'serif') {
    fill = '#d63030';
    background = '#fff0f0';
    stroke = '#a02020';
  } else if (baseStyle === 'mono') {
    fill = '#2d882d';
    background = '#f0fff0';
    stroke = '#1d681d';
  } else if (baseStyle === 'script') {
    fill = '#aa7c39';
    background = '#fff8e6';
    stroke = '#8a5c19';
  } else if (baseStyle === 'decorative') {
    fill = '#9933cc';
    background = '#f8f0ff';
    stroke = '#7922aa';
  }
  
  // Special colors for numbers and symbols
  if (/^[0-9]$/.test(char)) {
    // Numbers get a bluish-purple color scheme
    fill = '#6a5acd';
    background = '#f5f0ff';
    stroke = '#483d8b';
  } else if (/^[!@#$%^&*()_+\-=\[\]{}|;':",./<>?]$/.test(char)) {
    // Symbols get an orangish color scheme
    fill = '#ff8c00';
    background = '#fff8f0';
    stroke = '#cc7000';
  }
  
  // Create an improved SVG with subtle style effects
  // Make unique filter ID to avoid conflicts when multiple SVGs are rendered
  const filterId = `shadow_${char}_${Math.floor(Math.random() * 10000)}`;
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="60" viewBox="0 0 40 60" preserveAspectRatio="xMidYMid meet">
      <defs>
        <filter id="${filterId}">
          <feDropShadow dx="1" dy="1" stdDeviation="1" flood-opacity="0.3"/>
        </filter>
      </defs>
      
      <!-- Background -->
      <rect width="40" height="60" fill="${background}" stroke="${stroke}" stroke-width="1"/>
      
      <!-- Letter with shadow -->
      <text 
        x="20" 
        y="35" 
        font-family="${font}" 
        font-size="30" 
        fill="${fill}" 
        text-anchor="middle" 
        dominant-baseline="middle"
        filter="url(#${filterId})"
      >${char}</text>
    </svg>`;
    
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/**
 * Download an image from a data URL
 * @param {string} dataUrl - The data URL of the image
 * @param {string} filename - The filename to save as
 */
export function downloadImage(dataUrl, filename) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Show a message in a container
 * @param {HTMLElement} container - The container to show the message in
 * @param {string} message - The message to show
 * @param {string} type - The type of message ('error', 'warning', 'success')
 */
export function showMessage(container, message, type = 'info') {
  if (!container) return;
  
  const messageEl = document.createElement('div');
  messageEl.className = `message ${type}-message`;
  messageEl.innerHTML = `<p>${message}</p>`;
  
  container.innerHTML = '';
  container.appendChild(messageEl);
}