// DOM elements
const tabButtons = document.querySelectorAll('.tab-button');
const panels = document.querySelectorAll('.panel');
const siteDomain = document.getElementById('site-domain');
const gradeElement = document.getElementById('grade');
const numericScoreElement = document.getElementById('numeric-score');
const trackerCountElement = document.getElementById('tracker-count');
const detailsTrackerCountElement = document.getElementById('details-tracker-count');
const lastScanElement = document.getElementById('last-scan');
const trackersList = document.getElementById('trackers-list');
const noTrackersMessage = document.getElementById('no-trackers-message');
const rescanButton = document.getElementById('rescan-button');
const historyList = document.getElementById('history-list');
const historyEmpty = document.getElementById('history-empty');
const historyFilter = document.getElementById('history-filter');
const enableBadgeCheckbox = document.getElementById('enable-badge');
const enableNotificationsCheckbox = document.getElementById('enable-notifications');
const autoScanCheckbox = document.getElementById('auto-scan');
const clearDataButton = document.getElementById('clear-data');
const clearConfirmation = document.getElementById('clear-confirmation');
const clearConfirmYesButton = document.getElementById('clear-confirm-yes');
const clearConfirmNoButton = document.getElementById('clear-confirm-no');

// Current tab URL
let currentUrl = '';
let currentDomain = '';
let currentData = null;

// Initialize
document.addEventListener('DOMContentLoaded', init);

// Setup tab navigation
tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const targetPanel = button.getAttribute('id').replace('tab-', '');
    switchTab(targetPanel);
    
    // Load appropriate data for the tab
    if (targetPanel === 'history') {
      loadHistoryData();
    }
  });
});

// Initialize popup
function init() {
  loadCurrentTabData();
  loadSettings();
  setupEventListeners();
}

// Switch between tabs
function switchTab(panelId) {
  tabButtons.forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('id') === `tab-${panelId}`) {
      btn.classList.add('active');
    }
  });
  
  panels.forEach(panel => {
    panel.classList.remove('active');
    if (panel.getAttribute('id') === `${panelId}-panel`) {
      panel.classList.add('active');
    }
  });
}

// Setup event listeners
function setupEventListeners() {
  // Rescan button
  rescanButton.addEventListener('click', () => {
    rescanButton.textContent = 'Scanning...';
    rescanButton.disabled = true;
    
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.tabs.sendMessage(tab.id, { type: "rescan" }, () => {
        setTimeout(() => {
          loadCurrentTabData();
          rescanButton.textContent = 'Scan Again';
          rescanButton.disabled = false;
        }, 1500); // Give time for the scan to complete
      });
    });
  });
  
  // History filter
  historyFilter.addEventListener('change', () => {
    loadHistoryData();
  });
  
  // Settings toggles
  enableBadgeCheckbox.addEventListener('change', saveSettings);
  enableNotificationsCheckbox.addEventListener('change', saveSettings);
  autoScanCheckbox.addEventListener('change', saveSettings);
  
  // Clear data buttons
  clearDataButton.addEventListener('click', () => {
    clearConfirmation.classList.remove('hidden');
  });
  
  clearConfirmYesButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: "clearData" }, () => {
      clearConfirmation.classList.add('hidden');
      showToast('All data cleared successfully');
      // Reload current tab data
      loadCurrentTabData();
      // Clear history
      historyList.innerHTML = '';
      historyEmpty.classList.remove('hidden');
    });
  });
  
  clearConfirmNoButton.addEventListener('click', () => {
    clearConfirmation.classList.add('hidden');
  });
}

// Load current tab data
function loadCurrentTabData() {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab && tab.url) {
      currentUrl = tab.url;
      currentDomain = extractDomain(tab.url);
      siteDomain.textContent = currentDomain;
      
      chrome.runtime.sendMessage(
        { type: "getScore", url: tab.url },
        (response) => {
          if (response && response.grade) {
            updateUI(response);
            currentData = response;
          } else {
            updateUIForNoData();
          }
        }
      );
    }
  });
}

// Update UI with site data
function updateUI(data) {
  // Update overview panel
  gradeElement.textContent = data.grade;
  gradeElement.setAttribute('data-grade', data.grade);
  numericScoreElement.textContent = `${data.score}/100`;
  trackerCountElement.textContent = Array.isArray(data.trackers) ? data.trackers.length : 0;
  
  if (data.lastUpdated) {
    lastScanElement.textContent = formatDate(data.lastUpdated);
  } else {
    lastScanElement.textContent = 'Just now';
  }
  
  // Update details panel
  detailsTrackerCountElement.textContent = Array.isArray(data.trackers) ? data.trackers.length : 0;
  trackersList.innerHTML = '';
  
  if (Array.isArray(data.trackers) && data.trackers.length > 0) {
    data.trackers.forEach(tracker => {
      const trackerItem = document.createElement('li');
      trackerItem.className = 'tracker-item';
      
      const trackerName = document.createElement('div');
      trackerName.className = 'tracker-name';
      trackerName.textContent = tracker.name;
      
      const trackerDetails = document.createElement('div');
      trackerDetails.className = 'tracker-details';
      trackerDetails.textContent = `Detection method: ${tracker.method}`;
      
      if (tracker.details) {
        trackerDetails.textContent += ` (${tracker.details})`;
      }
      
      trackerItem.appendChild(trackerName);
      trackerItem.appendChild(trackerDetails);
      trackersList.appendChild(trackerItem);
    });
    
    noTrackersMessage.classList.add('hidden');
    trackersList.classList.remove('hidden');
  } else {
    noTrackersMessage.classList.remove('hidden');
    trackersList.classList.add('hidden');
  }
}

// Update UI when no data is available
function updateUIForNoData() {
  gradeElement.textContent = '?';
  gradeElement.removeAttribute('data-grade');
  numericScoreElement.textContent = '--/100';
  trackerCountElement.textContent = '--';
  lastScanElement.textContent = 'Never';
  
  detailsTrackerCountElement.textContent = '0';
  trackersList.innerHTML = '';
  noTrackersMessage.classList.remove('hidden');
  trackersList.classList.add('hidden');
}

// Load history data
function loadHistoryData() {
  chrome.runtime.sendMessage({ type: "getAllSites" }, (response) => {
    historyList.innerHTML = '';
    
    if (response && response.sites && Object.keys(response.sites).length > 0) {
      const sites = Object.values(response.sites);
      const filter = historyFilter.value;
      
      // Apply filter
      let filteredSites = sites;
      if (filter === 'bad') {
        filteredSites = sites.filter(site => ['D', 'E', 'F'].includes(site.grade));
      } else if (filter === 'good') {
        filteredSites = sites.filter(site => ['A', 'B', 'C'].includes(site.grade));
      }
      
      // Sort by last visited
      filteredSites.sort((a, b) => b.lastVisited - a.lastVisited);
      
      if (filteredSites.length > 0) {
        filteredSites.forEach(site => {
          const historyItem = document.createElement('div');
          historyItem.className = 'history-item';
          
          const siteInfo = document.createElement('div');
          siteInfo.className = 'history-site-info';
          
          const domain = document.createElement('div');
          domain.className = 'history-domain';
          domain.textContent = extractDomain(site.url);
          
          const details = document.createElement('div');
          details.className = 'history-details';
          details.textContent = `${site.trackers.length} trackers • Last visit: ${formatDate(site.lastVisited)}`;
          
          const grade = document.createElement('div');
          grade.className = 'history-grade';
          grade.textContent = site.grade;
          grade.style.backgroundColor = getGradeColor(site.grade);
          
          siteInfo.appendChild(domain);
          siteInfo.appendChild(details);
          historyItem.appendChild(siteInfo);
          historyItem.appendChild(grade);
          
          // Add click handler to view details of this site
          historyItem.addEventListener('click', () => {
            // Open site in new tab when clicked
            chrome.tabs.create({ url: site.url });
          });
          
          historyList.appendChild(historyItem);
        });
        
        historyEmpty.classList.add('hidden');
      } else {
        historyEmpty.classList.remove('hidden');
      }
    } else {
      historyEmpty.classList.remove('hidden');
    }
  });
}

// Load settings
function loadSettings() {
  chrome.storage.local.get(['settings'], result => {
    const settings = result.settings || {
      enableBadge: true,
      enableNotifications: false,
      autoScan: true
    };
    
    enableBadgeCheckbox.checked = settings.enableBadge !== false;
    enableNotificationsCheckbox.checked = settings.enableNotifications === true;
    autoScanCheckbox.checked = settings.autoScan !== false;
  });
}

// Save settings
function saveSettings() {
  const settings = {
    enableBadge: enableBadgeCheckbox.checked,
    enableNotifications: enableNotificationsCheckbox.checked,
    autoScan: autoScanCheckbox.checked
  };
  
  chrome.storage.local.set({ settings });
}

// Helper: Format date
function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffDays < 30) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// Helper: Extract domain from URL
function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return url;
  }
}

// Helper: Get color for grade
function getGradeColor(grade) {
  const colors = {
    'A': '#4CAF50',
    'B': '#8BC34A',
    'C': '#FFEB3B',
    'D': '#FF9800',
    'E': '#FF5722',
    'F': '#F44336'
  };
  
  return colors[grade] || '#9E9E9E';
}

// Helper: Show toast notification
function showToast(message, duration = 3000) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  
  // Style the toast
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '4px',
    zIndex: '9999',
    opacity: '0',
    transition: 'opacity 0.3s ease'
  });
  
  document.body.appendChild(toast);
  
  // Fade in
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 10);
  
  // Fade out and remove
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, duration);
}