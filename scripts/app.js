// app.js - Fixed version (using older architecture)
import LetterDatabase from './database.js';
import LetterSelector from './letterSelector.js';
import VisualRenderer from './renderer.js';
import { createLogger, debounce } from './utils.js';
import config from './config.js';

// Create logger
const logger = createLogger('StreetType', config.debug.enabled);

document.addEventListener('DOMContentLoaded', async () => {
  logger.log("Application starting...");
  
  // Grab controls and containers
  const userTextInput     = document.getElementById('user-text');
  const fontStyleSelect   = document.getElementById('font-style');
  const locationSelect    = document.getElementById('location');
  const caseOptionSelect  = document.getElementById('case-option');
  const generateBtn       = document.getElementById('generate-btn');
  const exportBtn         = document.getElementById('export-btn');
  const shareBtn          = document.getElementById('share-btn');
  const outputContainer   = document.getElementById('output-container');
  const canvasContainer   = document.getElementById('p5-canvas-container');
  const testPathsBtn      = document.getElementById('test-paths-btn');
  const fontSizeToggle    = document.getElementById('size-toggle');

  // Disable buttons initially
  if (exportBtn) exportBtn.disabled = true;
  if (shareBtn) shareBtn.disabled = true;

  // Instantiate your classes - DIRECT INITIALIZATION like the old version
  const database = new LetterDatabase();
  const selector = new LetterSelector(database);
  const renderer = new VisualRenderer('p5-canvas-container');

  // Initialize font size from config
  let currentFontSize = config.defaults.fontSize || 'small';
  
  // Show loading indicator
  function showLoading() {
    logger.log("Showing loading indicator");
    // Create a loading indicator
    const loadingEl = document.createElement('div');
    loadingEl.className = 'loading-indicator';
    loadingEl.innerHTML = `
      <div class="spinner"></div>
      <div>Generating typography...</div>
    `;
    
    // Clear previous content and add the loading indicator
    if (outputContainer) {
      outputContainer.innerHTML = '';
      outputContainer.appendChild(loadingEl);
    }
    
    // Disable generate button while loading
    if (generateBtn) {
      generateBtn.disabled = true;
      generateBtn.textContent = 'Generating...';
    }
  }

  // Hide loading indicator
  function hideLoading() {
    logger.log("Hiding loading indicator");
    // Clear the loading indicator
    if (outputContainer) {
      outputContainer.innerHTML = '';
    }
    
    // Re-enable generate button
    if (generateBtn) {
      generateBtn.disabled = false;
      generateBtn.textContent = 'Generate Typography';
    }
  }

  // Show error message in the UI
  function showErrorMessage(container, message, isWarning = false) {
    if (!container) return;
    
    const className = isWarning ? "warning-message" : "error-message";
    
    container.innerHTML = `
      <div class="${className}">
        <h3>${isWarning ? 'Warning' : 'Error'}</h3>
        <p>${message}</p>
        ${!isWarning ? '<p>Please check browser console for technical details.</p>' : ''}
      </div>
    `;
  }

  // Update the canvas with new text and settings
  async function updateCanvas() {
    try {
      // Show loading state
      showLoading();
      logger.log("Starting typography generation");
      
      // Check for empty text and set default if needed
      const inputText = userTextInput.value.trim() || config.defaults.text;
      userTextInput.value = inputText; // Update the input field
      
      // Get font style and location
      const style = fontStyleSelect.value;
      const location = locationSelect.value;
      const caseOption = caseOptionSelect.value;
      
      // Log the input values
      logger.log("Input values:", {
        text: inputText,
        style: style,
        city: location,
        caseOption: caseOption
      });
      
      // Process text based on case option (like in old version)
      let processedText = inputText;
      if (caseOption === 'upper') {
        processedText = inputText.toUpperCase();
      } else if (caseOption === 'lower') {
        processedText = inputText.toLowerCase();
      }
      
      try {
        // Use the selector to handle all letter selection logic (direct from old version)
        const letterArray = await selector.selectLettersForText(processedText, style, location);
        
        // Render the letters
        renderer.renderLetters(letterArray);
        
        // Enable export and share buttons
        if (exportBtn) exportBtn.disabled = false;
        if (shareBtn) exportBtn.disabled = false;
        
        logger.log("Render complete");
      } catch (error) {
        logger.error("ERROR: Failed to generate typography", error);
        console.error('Error generating typography:', error);
        
        // Show error message
        showErrorMessage(outputContainer, `Failed to generate typography: ${error.message}`);
      }
    } catch (error) {
      logger.error('Fatal error in updateCanvas:', error);
      showErrorMessage(outputContainer, 'A fatal error occurred while updating the canvas.');
    } finally {
      hideLoading();
    }
  }

  // Test directory structure
  function testDirectoryStructure() {
    logger.log("Running directory structure test...");
    
    // Create test message container
    const testResults = document.createElement('div');
    testResults.className = 'test-results';
    testResults.innerHTML = `
      <h3>Testing Directory Structure</h3>
      <p>This will test different asset paths to find working letter images...</p>
      <pre id="test-log" style="max-height: 300px; overflow: auto; background: #eee; padding: 10px;"></pre>
    `;
    
    // Add to output container
    outputContainer.innerHTML = '';
    outputContainer.appendChild(testResults);
    
    const testLog = document.getElementById('test-log');
    
    // Create a test logger
    function logTest(message) {
      const timestamp = new Date().toISOString().substring(11, 23);
      testLog.innerHTML += `[${timestamp}] ${message}\n`;
      testLog.scrollTop = testLog.scrollHeight; // Auto-scroll to bottom
    }
    
    // Start testing
    logTest('Starting asset path tests...');
    
    // Test a sample letter
    const testLetter = 'A';
    const testStyle = 'sans';
    
    // Test path existence
    database.pathExists('assets/Alphabet/cities/NYC/alphabet/A/sans-upper/01.jpg')
      .then(exists => {
        logTest(`Test path exists: ${exists}`);
        
        if (exists) {
          logTest('SUCCESS: Found asset path');
          
          // Add success message at the top
          testResults.insertAdjacentHTML('afterbegin', `
            <div style="background: #e6ffe6; border: 1px solid #99cc99; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
              <strong>Success!</strong> Found working asset path.
            </div>
          `);
        } else {
          logTest('WARNING: No working asset paths found. Using fallback letter generator.');
          
          // Add warning message at the top
          testResults.insertAdjacentHTML('afterbegin', `
            <div style="background: #fff8e6; border: 1px solid #ffcc80; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
              <strong>No asset paths found.</strong> The application will use generated SVG letters instead.
            </div>
          `);
        }
        
        // Add a button to generate a test sample
        testResults.insertAdjacentHTML('beforeend', `
          <div style="margin-top: 10px;">
            <button id="test-sample-btn" style="padding: 8px 16px;">Generate Test Sample</button>
          </div>
        `);
        
        // Add event listener for the test sample button
        document.getElementById('test-sample-btn').addEventListener('click', () => {
          updateCanvas();
        });
      });
  }

  // Update font size
  function updateFontSize() {
    const sizes = ['SMALL', 'MEDIUM', 'LARGE'];
    const currentSize = fontSizeToggle.textContent;
    const currentIndex = sizes.indexOf(currentSize);
    const nextIndex = (currentIndex + 1) % sizes.length;
    const nextSize = sizes[nextIndex];
    
    fontSizeToggle.textContent = nextSize;
    currentFontSize = nextSize.toLowerCase();
    
    // Set appropriate sizes on renderer
    if (nextSize === 'SMALL') {
      renderer.setLetterSpacing(5);
      renderer.setLineHeight(60);
    } else if (nextSize === 'MEDIUM') {
      renderer.setLetterSpacing(10);
      renderer.setLineHeight(100);
    } else if (nextSize === 'LARGE') {
      renderer.setLetterSpacing(15);
      renderer.setLineHeight(140);
    }
    
    logger.log(`Font size changed to: ${nextSize}`);
    
    // Re-render with new size
    updateCanvas();
  }

  // Event listeners
  if (generateBtn) {
    generateBtn.addEventListener('click', updateCanvas);
  }
  
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      if (renderer) {
        renderer.exportAsImage();
      }
    });
  }
  
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      if (renderer && renderer.canvas) {
        try {
          const dataURL = renderer.canvas.elt.toDataURL('image/png');
          const win = window.open();
          win.document.body.innerHTML = `<img src="${dataURL}" alt="Shared Typography" />`;
        } catch (error) {
          logger.error("ERROR: Failed to share typography", error);
          alert("Could not share the typography. Please try again.");
        }
      }
    });
  }
  
  if (testPathsBtn) {
    testPathsBtn.addEventListener('click', testDirectoryStructure);
  }
  
  if (fontSizeToggle) {
    fontSizeToggle.addEventListener('click', updateFontSize);
  }

  // Initial render with a small delay to let everything initialize
  setTimeout(() => {
    updateCanvas();
  }, 500);
  
  logger.log("Application initialization complete");
});