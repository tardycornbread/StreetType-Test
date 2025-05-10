// scripts/renderer.js - FIXED VERSION
// Handles both regular images and SVG data URLs

export default class VisualRenderer {
  /**
   * @param {string} containerId — ID of the DOM element to mount the canvas into
   */
  constructor(containerId) {
    this.containerId   = containerId;
    this.letterSpacing = 5;
    this.lineHeight    = 80;
    this.letterWidth   = 40;
    this.letterHeight  = 60;
    this.canvas        = null;
    this.p5Instance    = null;
    
    // Font settings for different styles
    this.styleColors = {
      sans: { fill: '#3a7ca5', bg: '#f0f8ff' },
      serif: { fill: '#d63030', bg: '#fff0f0' },
      mono: { fill: '#2d882d', bg: '#f0fff0' },
      script: { fill: '#aa7c39', bg: '#fff8e6' },
      decorative: { fill: '#9933cc', bg: '#f8f0ff' },
      default: { fill: '#666666', bg: '#f5f5f5' }
    };

    // Will be wired up in initP5()
    this._updateLetters = () => {};

    // Hidden link for export
    this.downloadLink = this._createDownloadLink();

    // Keep responsive
    window.addEventListener('resize', () => this._handleResize());

    // Kick off p5
    this.initP5();
  }

  _createDownloadLink() {
    const a = document.createElement('a');
    a.style.display = 'none';
    a.download = 'streettype.png';
    document.body.appendChild(a);
    return a;
  }

  initP5() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`Container "${this.containerId}" not found`);
      return;
    }

    this.p5Instance = new p5(p => {
      // Our working array of letter-objects { type, value, url?, img? }
      let letters = [];

      // 1) Standard canvas setup
      p.setup = () => {
        this.canvas = p
          .createCanvas(container.offsetWidth, 400)
          .parent(this.containerId);
        p.textAlign(p.LEFT, p.TOP);
        p.textSize(16);
        p.noLoop(); // only redraw on demand
      };

      // 2) Main draw loop
      p.draw = () => {
        p.clear();
        p.background(255);

        if (letters.length === 0) {
          // placeholder
          p.fill(150);
          p.text('Generated text will appear here…', 20, p.height / 2);
          return;
        }

        let x = 10, y = 20;
        const maxW = p.width - 20;

        for (const lt of letters) {
          try {
            if (lt.type === 'space') {
              x += this.letterWidth + this.letterSpacing;
            } else if (lt.type === 'letter' && lt.img) {
              // Regular image - scale to consistent size
              const imgWidth = lt.img.width;
              const imgHeight = lt.img.height;
              
              // Handle aspect ratio to maintain the image proportions
              let drawWidth = this.letterWidth;
              let drawHeight = this.letterHeight;
              
              if (imgWidth / imgHeight > drawWidth / drawHeight) {
                // Image is wider than our target ratio
                drawHeight = drawWidth * (imgHeight / imgWidth);
              } else {
                // Image is taller than our target ratio
                drawWidth = drawHeight * (imgWidth / imgHeight);
              }
              
              // Center the image in the letter space
              const offsetX = (this.letterWidth - drawWidth) / 2;
              p.image(lt.img, x + offsetX, y, drawWidth, drawHeight);
              x += this.letterWidth + this.letterSpacing;
            } else if (lt.type === 'special' || lt.type === 'placeholder') {
              // Handle special characters with style
              this._drawSpecialChar(p, lt.value, x, y);
              x += this.letterWidth + this.letterSpacing;
            } else {
              // Fallback to stylized text if no image
              this._drawFallbackLetter(p, lt.value, x, y, lt.style || 'default');
              x += this.letterWidth + this.letterSpacing;
            }
            
            if (x > maxW) {
              x = 10;
              y += this.lineHeight;
            }
          } catch (error) {
            console.error('Error rendering letter:', error);
            // Continue with next letter
            x += 20 + this.letterSpacing;
          }
        }

        // expand height if needed
        const neededH = y + this.lineHeight;
        if (neededH > p.height) {
          p.resizeCanvas(p.width, neededH);
        }
      };

      // Helper method to draw fallback letter
      this._drawFallbackLetter = (p, char, x, y, style = 'default') => {
        // Get style colors or use defaults
        const styleKey = style.split('-')[0]; // Extract base style without case suffix
        const styleData = this.styleColors[styleKey] || this.styleColors.default;
        
        // Draw background rectangle
        p.fill(styleData.bg);
        p.rect(x, y, this.letterWidth, this.letterHeight);
        
        // Draw letter
        p.fill(styleData.fill);
        p.textSize(36);
        p.textAlign(p.CENTER, p.CENTER);
        p.text(char, x + this.letterWidth/2, y + this.letterHeight/2);
        
        // Reset text settings
        p.textAlign(p.LEFT, p.TOP);
        p.textSize(16);
      };
      
      // Helper method for special characters
      this._drawSpecialChar = (p, char, x, y) => {
        // Gray background for special characters
        p.fill(220);
        p.rect(x, y, this.letterWidth, this.letterHeight);
        
        // Draw character
        p.fill(80);
        p.textSize(36);
        p.textAlign(p.CENTER, p.CENTER);
        p.text(char, x + this.letterWidth/2, y + this.letterHeight/2);
        
        // Reset text settings
        p.textAlign(p.LEFT, p.TOP);
        p.textSize(16);
      };

      // 3) The function we'll call from outside
      //    It takes an array of {type, value, url?}, loads each url into a p5.Image, then redraws.
      this._updateLetters = async raw => {
        const loaded = [];
        for (const lt of raw) {
          if (lt.type === 'letter' && lt.url) {
            try {
              // IMPROVEMENT: Check if URL is actually an SVG data URL
              if (lt.url.startsWith('data:image/svg+xml')) {
                // For SVG data URLs, don't try to load as image - use fallback rendering
                loaded.push({ 
                  type: 'letter', 
                  value: lt.value,
                  style: this._getStyleFromPath(lt.url)
                });
                continue;
              }
              
              // For regular URLs, load as image
              const img = await new Promise(res => 
                p.loadImage(
                  lt.url,
                  img => res(img),
                  _  => res(null)
                )
              );
              
              if (img) {
                loaded.push({ type: 'letter', value: lt.value, img });
              } else {
                // Image loading failed
                loaded.push({ 
                  type: 'letter', 
                  value: lt.value,
                  style: this._getStyleFromPath(lt.url)
                });
              }
            } catch (error) {
              console.error('Error loading image:', error);
              loaded.push({ 
                type: 'letter', 
                value: lt.value,
                style: this._getStyleFromPath(lt.url)
              });
            }
          } else {
            loaded.push({ type: lt.type, value: lt.value });
          }
        }
        letters = loaded;
        p.redraw();
      };
    });
  }
  
  /**
   * Extract style information from path string
   */
  _getStyleFromPath(path) {
    // Try to identify style from path
    if (path.includes('sans')) return 'sans';
    if (path.includes('serif')) return 'serif';
    if (path.includes('mono') || path.includes('monospace')) return 'mono';
    if (path.includes('script')) return 'script';
    if (path.includes('decorative')) return 'decorative';
    return 'default';
  }

  /**
   * Call this with an array of plain letter-objects:
   *   [{ type:'letter'|'space', value: string, url?: string }, …]
   */
  renderLetters(letterData) {
    if (!this.p5Instance) {
      console.error('P5 not initialized');
      return;
    }
    this._updateLetters(letterData);
  }

  /**
   * Export canvas as PNG.
   */
  exportAsImage() {
    if (!this.canvas) {
      console.error('Canvas not ready');
      return;
    }
    const dataURL = this.canvas.elt.toDataURL('image/png');
    this.downloadLink.href = dataURL;
    this.downloadLink.click();
  }

  _handleResize() {
    if (!this.p5Instance || !this.canvas) return;
    const container = document.getElementById(this.containerId);
    const newW = container.offsetWidth;
    const newH = this.canvas.height;
    this.p5Instance.resizeCanvas(newW, newH);
    this.p5Instance.redraw();
  }

  setLetterSpacing(n) { this.letterSpacing = n; }
  setLineHeight(n)    { this.lineHeight    = n; }
  
  /**
   * Set the font size (affects letter dimensions)
   * @param {string} size - 'small', 'medium', or 'large'
   */
  setFontSize(size) {
    switch(size) {
      case 'small':
        this.letterWidth = 40;
        this.letterHeight = 60;
        this.letterSpacing = 5;
        this.lineHeight = 70;
        break;
      case 'medium':
        this.letterWidth = 60;
        this.letterHeight = 90;
        this.letterSpacing = 8;
        this.lineHeight = 110;
        break;
      case 'large':
        this.letterWidth = 80;
        this.letterHeight = 120;
        this.letterSpacing = 12;
        this.lineHeight = 140;
        break;
      default:
        // Default to small
        this.letterWidth = 40;
        this.letterHeight = 60;
        this.letterSpacing = 5;
        this.lineHeight = 70;
    }
  }
}