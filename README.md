# Privacy Score Analyzer - Chrome Extension

## Overview
Privacy Score Analyzer is a powerful Chrome extension that analyzes websites for tracking technologies and provides a privacy score from A to F. It helps users understand which websites respect their privacy and which ones may be tracking their online behavior excessively.

## Features

### 🔍 Comprehensive Tracker Detection
- Scans for 50+ common trackers and tracking technologies
- Detects trackers in HTML, script tags, link tags, iframes, and image tags
- Identifies tracking cookies and localStorage items
- Detects potential browser fingerprinting techniques

### 📊 Privacy Scoring System
- Grades websites from A (excellent) to F (poor) based on tracking practices
- Weighted scoring system that considers the invasiveness of different trackers
- Extra penalties for fingerprinting and multiple advertising networks
- Visual color-coded grades that make privacy assessment intuitive

### 📱 User-Friendly Interface
- Clean, modern design with tabs for different features
- Quick overview of the current site's privacy score
- Detailed breakdown of all trackers detected
- Browsing history with privacy scores for all visited sites
- Customizable settings to tailor the extension to your needs

### 🔔 Additional Features
- Badge display shows privacy grade directly on extension icon
- Historical tracking to see if sites improve or worsen over time
- Filter history by good (A-C) or poor (D-F) privacy practices
- Ability to rescan sites on demand
- Data persistence with automatic cleanup of old entries

## Installation

### From Chrome Web Store (Recommended)
1. Visit the Chrome Web Store (link to be added)
2. Click "Add to Chrome"
3. Confirm the installation

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extension directory
5. Generate icons by running `node generate_icons.js` in the icons directory (or create your own icons)

## Usage

1. Browse the web as you normally would
2. Click on the Privacy Score Analyzer icon to see the privacy score of the current website
3. Navigate between tabs to see detailed information, history, and settings
4. Use the "Scan Again" button to refresh the analysis on the current page

## Technical Details

### File Structure
- `manifest.json`: Extension manifest file (V3)
- `popup.html`: The extension's popup interface
- `popup.css`: Styles for the popup
- `popup.js`: Script that handles popup functionality
- `background.js`: Background service worker for persistent functionality
- `content.js`: Content script that scans web pages for trackers
- `icons/`: Directory containing extension icons

### Permissions Used
- `activeTab`: To analyze the current tab
- `storage`: To store privacy scores and settings
- `scripting`: To inject content scripts
- `webNavigation`: To detect page navigation
- `webRequest`: To monitor web requests
- `host_permissions`: To scan all websites

## Privacy Statement
This extension runs entirely on your device and does not send any data to external servers. All analysis happens locally, and all data is stored only in your browser's local storage. The extension does not track you - it helps you understand who is tracking you!

## Contributing
Contributions are welcome! Feel free to submit pull requests or open issues to suggest improvements or report bugs.

## License
[MIT License](LICENSE)
