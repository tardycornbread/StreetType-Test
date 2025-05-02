// scripts/renderer.js
// (Assumes you've loaded p5 globally via a <script> tag before this module)

export default class VisualRenderer {
  constructor(containerId) {
    this.containerId = containerId;
    this.letterSpacing = 5;
    this.lineHeight = 80;
    this.canvas = null;
    this.p5Instance = null;
    this.updateLetters = () => {};
    this.currentFormat = "16x24";
    this.fontSize = "small";
    
    // Add style color mappings with decorative style
    this.styleColors = {
      sans: [100, 100, 180],      // Blue-ish
      serif: [180, 100, 100],     // Red-ish
      mono: [100, 180, 100],      // Green-ish
      script: [180, 180, 100],    // Yellow-ish
      decorative: [180, 100, 180], // Purple-ish for decorative
      default: [150, 150, 150]    // Gray for unknown styles
    };
  
    // Create a single hidden download link for exports
    this.downloadLink = this._createDownloadLink();
  
    // Initialize the p5 instance
    this.initP5();
  
    // Handle window resize to keep canvas responsive
    window.addEventListener('resize', () => this._handleResize());
    
    // Make sure window.updateFontSize is properly assigned
    window.updateFontSize = (size) => {
      if (typeof size === 'string') {
        this.setFontSize(size.toLowerCase());
      } else {
        console.warn('Invalid font size value provided to updateFontSize');
      }
    };
  }

  _createDownloadLink() {
    const link = document.createElement('a');
    link.style.display = 'none';
    link.download = 'streettype.png';
    document.body.appendChild(link);
    return link;
  }

  initP5() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`Container "${this.containerId}" not found`);
      return;
    }

    // Ensure container has a default class
    if (!container.className) {
      container.className = 'canvas-16x24';
    }

    // Use the global p5 constructor
    this.p5Instance = new p5(p => {
      let letters = [];

      p.setup = () => {
        // Get container dimensions
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;
        
        this.canvas = p.createCanvas(containerWidth, containerHeight);
        this.canvas.parent(this.containerId);
        p.textAlign(p.LEFT, p.TOP);
        p.textSize(16);
        p.noLoop();
      };

      p.draw = () => {
        p.clear();
        p.background(255);

        if (!letters || letters.length === 0) {
          p.fill(150);
          p.text('Generated text will appear here…', 20, p.height / 2);
          return;
        }

        // Adjust layout based on fixed settings
        const { maxWidth, maxLetterWidth, spacing } = this._getFormatSettings();
        
        let x = spacing;
        let y = spacing;
        const availableWidth = maxWidth;

        for (const lt of letters) {
          // Skip any invalid letter objects
          if (!lt) continue;
          
          try {
            if (lt.type === 'space') {
              x += spacing + 10;
            } else if (lt.type === 'letter') {
              // Get letter dimensions based on font size
              const charHeight = this._getLetterHeight();
              const charWidth = charHeight * 0.8;
              
              // Check if we actually have a valid image to draw
              const validImage = lt.image && 
                                typeof lt.image === 'object' && 
                                lt.image !== null &&
                                'src' in lt.image && // Make sure it's an HTML Image element
                                lt.image.complete; // Make sure it's fully loaded
              
              if (validImage && !lt.isFallback) {
                try {
                  // Calculate display dimensions, maintaining aspect ratio
                  const sourceWidth = lt.image.width;
                  const sourceHeight = lt.image.height;
                  
                  // Additional validation
                  if (sourceWidth > 0 && sourceHeight > 0) {
                    // Scale the image based on font size while maintaining aspect ratio
                    const displayHeight = charHeight;
                    const displayWidth = (sourceWidth / sourceHeight) * displayHeight;
                    
                    // Apply max width constraint
                    let finalWidth = displayWidth;
                    let finalHeight = displayHeight;
                    if (displayWidth > maxLetterWidth) {
                      const ratio = maxLetterWidth / displayWidth;
                      finalWidth = maxLetterWidth;
                      finalHeight = displayHeight * ratio;
                    }
                    
                    // Draw the image using a safer approach
                    // Create a canvas element
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = finalWidth;
                    tempCanvas.height = finalHeight;
                    const ctx = tempCanvas.getContext('2d');
                    
                    // Draw the image on the canvas
                    ctx.drawImage(lt.image, 0, 0, finalWidth, finalHeight);
                    
                    // Get the image data from the canvas
                    const tempImg = new Image();
                    tempImg.src = tempCanvas.toDataURL('image/png');
                    
                    // Use p5's rect and fill functions instead of image
                    p.fill(255); // White background for image area
                    p.rect(x, y, finalWidth, finalHeight);
                    
                    // Draw image using native drawImage
                    p.drawingContext.drawImage(tempImg, x, y, finalWidth, finalHeight);
                    
                    // Move to next position
                    x += finalWidth + spacing;
                    continue; // Skip the fallback rendering
                  }
                } catch (err) {
                  console.warn('Error drawing image:', err);
                  // Fall through to the fallback rendering below
                }
              }
              
              // Fallback rendering (colored rectangles)
              if (lt.isFallback) {
                // Blue-ish for fallbacks
                p.fill(100, 100, 180);
              } else {
                // Red-ish for "real" images that couldn't be drawn
                p.fill(220, 120, 120);
              }
              
              // Draw rectangle background
              p.rect(x, y, charWidth, charHeight);
              
              // Draw the character on top
              p.fill(255);
              p.textSize(charHeight * 0.6);
              p.text(lt.value, x + charWidth * 0.2, y + charHeight * 0.2);
              p.textSize(16); // Reset text size
              
              // Move to next position
              x += charWidth + spacing;
            } else {
              // Special/placeholder rendering for non-letter characters
              const char = lt.value || '?';
              p.fill(200, 200, 200);
              const charWidth = this._getLetterHeight() * 0.8;
              p.rect(x, y, charWidth, this._getLetterHeight());
              p.fill(100);
              p.textSize(this._getLetterHeight() * 0.6);
              p.text(char, x + charWidth * 0.2, y + this._getLetterHeight() * 0.2);
              p.textSize(16); // Reset text size
              x += charWidth + spacing;
            }
          } catch (err) {
            console.warn('Error rendering letter:', err);
            // Still draw something in case of error - don't just skip
            const char = lt.value || '?';
            p.fill(255, 100, 100);  // Red-ish for errors
            const charWidth = this._getLetterHeight() * 0.8;
            p.rect(x, y, charWidth, this._getLetterHeight());
            p.fill(255);
            p.textSize(this._getLetterHeight() * 0.5);
            p.text(char, x + charWidth * 0.2, y + this._getLetterHeight() * 0.2);
            p.textSize(16); // Reset text size
            x += charWidth + spacing;
          }

          // Handle line wrapping
          if (x > availableWidth - maxLetterWidth) {
            x = spacing;
            y += this._getLetterHeight() + spacing;
          }
        }
      };

      // Expose updateLetters to outer scope
      this.updateLetters = newLetters => {
        // Make sure newLetters is an array
        letters = Array.isArray(newLetters) ? newLetters : [];
        p.redraw();
      };
    });
  }

  _handleResize() {
    if (!this.p5Instance || !this.canvas) return;
    const container = document.getElementById(this.containerId);
    if (!container) return;
    
    const newW = container.offsetWidth;
    const newH = container.offsetHeight;
    this.p5Instance.resizeCanvas(newW, newH);
    this.p5Instance.redraw();
  }

  _getFormatSettings() {
    // Simplified method with fixed settings instead of format-dependent ones
    const container = document.getElementById(this.containerId);
    if (!container) return { maxWidth: 500, maxLetterWidth: 60, spacing: 5 };
    
    const containerWidth = container.offsetWidth;
    
    // Use 16x24 poster format settings as the default
    const maxWidth = containerWidth * 0.9;
    const maxLetterWidth = containerWidth * 0.15;
    const spacing = 8;
    
    return { maxWidth, maxLetterWidth, spacing };
  }
  
  _getLetterHeight() {
    // Return letter height based on font size setting
    switch (this.fontSize) {
      case 'small':
        return 50;
      case 'medium':
        return 80;
      case 'large':
        return 120;
      default:
        return 50;
    }
  }
  
  /**
   * Set the font size and trigger redraw
   * @param {string} size - One of: 'small', 'medium', 'large'
   */
  setFontSize(size) {
    // Validate input
    const validSizes = ['small', 'medium', 'large'];
    if (!validSizes.includes(size)) {
      console.warn(`Invalid font size: ${size}. Using default 'small'.`);
      size = 'small';
    }
    
    this.fontSize = size;
    
    // Redraw if p5 instance is available
    if (this.p5Instance) {
      this.p5Instance.redraw();
    }
    
    console.log(`Font size updated to: ${size}`);
  }

  /**
   * Render an array of letter-objects onto the canvas.
   */
  renderLetters(letterArray) {
    if (!this.p5Instance) {
      console.error('P5 not initialized');
      return;
    }
    // Validate letterArray before processing
    if (!Array.isArray(letterArray)) {
      console.warn('Expected an array of letters, got:', letterArray);
      letterArray = [];
    }

    // Enable export and share buttons after rendering
    const exportBtn = document.getElementById('export-btn');
    const shareBtn = document.getElementById('share-btn');
    if (exportBtn) exportBtn.disabled = false;
    if (shareBtn) shareBtn.disabled = false;

    this.updateLetters(letterArray);
  }

  /**
   * Export the current canvas as a PNG image.
   */
  exportAsImage() {
    if (!this.canvas || !this.canvas.elt) {
      console.error('Canvas not ready for export');
      return;
    }
    try {
      const dataURL = this.canvas.elt.toDataURL('image/png');
      this.downloadLink.href = dataURL;
      this.downloadLink.click();
    } catch (err) {
      console.error('Error exporting image:', err);
      alert('Could not export image. Please try again.');
    }
  }

  setLetterSpacing(spacing) {
    this.letterSpacing = spacing;
    if (this.p5Instance) {
      this.p5Instance.redraw();
    }
  }

  setLineHeight(height) {
    this.lineHeight = height;
    if (this.p5Instance) {
      this.p5Instance.redraw();
    }
  }
  
}

