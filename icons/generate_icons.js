// This script generates SVG icons for the extension
// Create a directory named 'icons' and save this file there
// Run with Node.js: node generate_icons.js

const fs = require('fs');
const path = require('path');

// Create SVG icon with privacy shield design
function generateIcon(size) {
  // Choose colors
  const primaryColor = '#4a6fa5';
  const secondaryColor = '#47b8e0';
  
  // Calculate dimensions based on size
  const padding = size * 0.15;
  const innerSize = size - (padding * 2);
  
  // Create SVG content
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradientFill" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primaryColor}" />
      <stop offset="100%" stop-color="${secondaryColor}" />
    </linearGradient>
  </defs>
  <!-- Shield background -->
  <path d="M${padding} ${padding + innerSize * 0.2}
           L${size/2} ${size - padding}
           L${size - padding} ${padding + innerSize * 0.2}
           L${size - padding} ${padding}
           L${padding} ${padding}
           Z" 
        fill="url(#gradientFill)" />
  
  <!-- Privacy eye symbol -->
  <circle cx="${size/2}" cy="${size/2 - size*0.05}" r="${innerSize * 0.22}" 
          fill="white" stroke="white" stroke-width="${size * 0.03}" />
  <circle cx="${size/2}" cy="${size/2 - size*0.05}" r="${innerSize * 0.11}" 
          fill="${primaryColor}" />
          
  <!-- Slash through eye (privacy) -->
  <line x1="${padding + innerSize * 0.2}" y1="${size/2 + innerSize * 0.2}" 
        x2="${size - padding - innerSize * 0.2}" y2="${size/2 - innerSize * 0.3}"
        stroke="white" stroke-width="${size * 0.05}" stroke-linecap="round" />
</svg>`;

  return svg;
}

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname);
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

// Generate icons in different sizes
const sizes = {
  'icon16.svg': 16,
  'icon48.svg': 48,
  'icon128.svg': 128
};

// Write files
Object.entries(sizes).forEach(([filename, size]) => {
  fs.writeFileSync(path.join(iconsDir, filename), generateIcon(size));
  console.log(`Generated ${filename}`);
});

// Create PNG conversion instructions
console.log('\nTo convert SVG to PNG:');
console.log('1. Install Inkscape or another SVG to PNG converter');
console.log('2. For each SVG file, convert to PNG with the same dimensions');
console.log('3. Name the files icon16.png, icon48.png, and icon128.png');
console.log('\nOr, use online SVG to PNG converters and manually save the files.');