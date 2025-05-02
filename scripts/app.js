// app.js
import LetterDatabase from './database.js';
import LetterSelector from './letterSelector.js';
import VisualRenderer from './renderer.js';

// Add logging function for better debugging
function logToConsole(message, data = null) {
  const timestamp = new Date().toISOString().substring(11, 23);
  const prefix = `[${timestamp}][STREETTYPE]`;
  
  if (data) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

// Test file path existence function
function testFilePath(path) {
  logToConsole(`Testing path: ${path}`);
  
  return new Promise(resolve => {
    const img = new Image();
    
    img.onload = () => {
      logToConsole(`SUCCESS: Path exists: ${path}, dimensions: ${img.width}x${img.height}`);
      resolve(true);
    };
    
    img.onerror = () => {
      logToConsole(`ERROR: Path does not exist: ${path}`);
      resolve(false);
    };
    
    img.src = path;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  logToConsole("Application starting...");
  
  // Grab controls
  const userTextInput     = document.getElementById('user-text');
  const fontStyleSelect   = document.getElementById('font-style');
  const locationSelect    = document.getElementById('location');
  const caseOptionSelect  = document.getElementById('case-option');
  const generateBtn       = document.getElementById('generate-btn');
  const exportBtn         = document.getElementById('export-btn');
  const shareBtn          = document.getElementById('share-btn');
  const outputContainer   = document.getElementById('output-container');

  logToConsole("UI controls initialized");

  // Initialize database, selector, and renderer
  const database = new LetterDatabase();
  const selector = new LetterSelector(database);
  const renderer = new VisualRenderer('p5-canvas-container');

  logToConsole("Core components initialized");
  
  // Test folder structure function
  window.testFolderStructure = async function() {
    logToConsole("=== TESTING FOLDER STRUCTURE ===");
    
    // Test base assets folder
    await testFilePath('assets');
    
    // Test Alphabet folder
    await testFilePath('assets/Alphabet');
    
    // Test cities folder
    await testFilePath('assets/Alphabet/cities');
    
    // Test NYC folder
    await testFilePath('assets/Alphabet/cities/NYC');
    
    // Test alphabet folder
    await testFilePath('assets/Alphabet/cities/NYC/alphabet');
    
    // Test A folder
    await testFilePath('assets/Alphabet/cities/NYC/alphabet/A');
    
    // Test style folder
    await testFilePath('assets/Alphabet/cities/NYC/alphabet/A/sans-upper');
    
    // Test actual image file
    await testFilePath('assets/Alphabet/cities/NYC/alphabet/A/sans-upper/01.jpg');
    
    logToConsole("=== FOLDER STRUCTURE TEST COMPLETE ===");
  };

  // Show loading indicator
  function showLoading() {
    logToConsole("Showing loading indicator");
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
    logToConsole("Hiding loading indicator");
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

  async function updateCanvas() {
    // Show loading state
    showLoading();
    logToConsole("Starting typography generation");
    
    try {
      // Log the input values
      logToConsole("Input values:", {
        text: userTextInput.value || 'Type something...',
        style: fontStyleSelect.value,
        city: locationSelect.value,
        caseOption: caseOptionSelect.value
      });
      
      // Check if the selector and database are initialized
      if (!selector) {
        logToConsole("ERROR: Letter selector not initialized", selector);
        throw new Error("Letter selector not initialized");
      }
      
      if (!database) {
        logToConsole("ERROR: Database not initialized", database);
        throw new Error("Database not initialized");
      }
      
      logToConsole("Getting selected letters...");
      const letters = await selector.getSelectedLetters({
        text: userTextInput.value || 'Type something...',
        style: fontStyleSelect.value,
        city: locationSelect.value,
        caseOption: caseOptionSelect.value
      });
      
      logToConsole(`Retrieved ${letters.length} letter objects`);
      
      // Log details about each letter
      letters.forEach((lt, index) => {
        if (lt.type === 'letter') {
          const hasImage = lt.image !== undefined && lt.image !== null;
          const imgInfo = hasImage ? {
            hasWidth: 'width' in lt.image,
            hasHeight: 'height' in lt.image,
            width: lt.image.width,
            height: lt.image.height,
            hasSrc: 'src' in lt.image,
            complete: lt.image.complete || false
          } : 'No image';
          
          logToConsole(`Letter [${index}]: "${lt.value}", isFallback: ${lt.isFallback}`, imgInfo);
        } else {
          logToConsole(`Letter [${index}]: type=${lt.type}, value="${lt.value}"`);
        }
      });
      
      // Pass along the loaded image element, not just its URL
      const rendererData = letters.map(lt => ({
        type: lt.type,
        value: lt.value,
        image: lt.image,
        isFallback: lt.isFallback
      }));

      logToConsole("Rendering letters...");
      renderer.renderLetters(rendererData);
      logToConsole("Render complete");
    } catch (error) {
      logToConsole("ERROR: Failed to generate typography", error);
      console.error('Error generating typography:', error);
      
      // Show error message
      if (outputContainer) {
        outputContainer.innerHTML = `
          <div class="error-message">
            <h3>Error</h3>
            <p>Failed to generate typography: ${error.message}</p>
          </div>
        `;
      }
    } finally {
      // Hide loading state
      hideLoading();
      logToConsole("Generation process finished");
    }
  }

  // Generate button
  generateBtn.addEventListener('click', () => {
    logToConsole("Generate button clicked");
    updateCanvas();
  });

  // Export
  exportBtn.addEventListener('click', () => {
    logToConsole("Export button clicked");
    renderer.exportAsImage();
  });

  // Share
  shareBtn.addEventListener('click', () => {
    logToConsole("Share button clicked");
    if (!renderer.canvas) {
      logToConsole("ERROR: Canvas not available for sharing");
      return;
    }
    
    try {
      const dataURL = renderer.canvas.elt.toDataURL('image/png');
      const win = window.open();
      win.document.body.innerHTML = `<img src="${dataURL}" alt="Shared Typography" />`;
      logToConsole("Typography shared in new window");
    } catch (error) {
      logToConsole("ERROR: Failed to share typography", error);
      alert("Could not share the typography. Please try again.");
    }
  });

  // Initial render with a small delay to ensure everything is loaded
  logToConsole("Scheduling initial render");
  setTimeout(() => {
    logToConsole("Running initial render");
    updateCanvas();
  }, 500);
  
  // Log when everything is loaded
  logToConsole("Application initialization complete");
});

