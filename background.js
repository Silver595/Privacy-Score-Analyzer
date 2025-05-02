
let siteData = {};

// Weight factors for different types of trackers (for advanced scoring)
const trackerWeights = {
  "Google Analytics": 2,
  "Facebook": 3,
  "Google Ads": 3,
  "Google DoubleClick": 4,
  "Potential Fingerprinting": 5,
  "Tracking Cookie": 1
};

// Load stored data on startup
chrome.storage.local.get(['siteData', 'lastCleared'], result => {
  if (result.siteData) {
    siteData = result.siteData;
    
    // Auto-cleanup data older than 30 days
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    
    // Check if we need to clean up old data
    let needsCleanup = false;
    Object.keys(siteData).forEach(domain => {
      if (siteData[domain].lastUpdated < thirtyDaysAgo) {
        delete siteData[domain];
        needsCleanup = true;
      }
    });
    
    if (needsCleanup) {
      saveData();
    }
  }
  
  // If it's been more than a month since last cleanup, wipe old data
  if (!result.lastCleared || (Date.now() - result.lastCleared > 30 * 24 * 60 * 60 * 1000)) {
    chrome.storage.local.set({ lastCleared: Date.now() });
  }
});

// Save data to persistent storage
function saveData() {
  chrome.storage.local.set({ siteData });
}

// Calculate a privacy score based on trackers found
function calculateScore(trackers) {
  // If no trackers, it's an A
  if (!trackers || trackers.length === 0) return { grade: "A", score: 100 };
  
  // Calculate weighted score
  let weightedCount = 0;
  let fingerprintingDetected = false;
  let adTrackersCount = 0;
  
  trackers.forEach(tracker => {
    // Get base weight (default to 1 if not specified)
    const weight = trackerWeights[tracker.name] || 1;
    weightedCount += weight;
    
    // Check for fingerprinting (extra penalty)
    if (tracker.name === "Potential Fingerprinting") {
      fingerprintingDetected = true;
    }
    
    // Count ad trackers
    if (tracker.name.includes("Ads") || 
        tracker.name.includes("DoubleClick") || 
        tracker.name.includes("AdSense") ||
        tracker.name.includes("Facebook Pixel")) {
      adTrackersCount++;
    }
  });
  
  // Apply extra penalty for fingerprinting
  if (fingerprintingDetected) {
    weightedCount += 5;
  }
  
  // Apply extra penalty for multiple ad networks
  if (adTrackersCount > 1) {
    weightedCount += Math.min(adTrackersCount, 5);
  }
  
  // Calculate numeric score (100 = best, 0 = worst)
  const numericScore = Math.max(0, Math.min(100, 100 - (weightedCount * 3)));
  
  // Convert to letter grade
  let grade;
  if (numericScore >= 90) grade = "A";
  else if (numericScore >= 80) grade = "B";
  else if (numericScore >= 70) grade = "C";
  else if (numericScore >= 60) grade = "D";
  else if (numericScore >= 50) grade = "E";
  else grade = "F";
  
  // Adjust grade based on fingerprinting
  if (fingerprintingDetected && grade !== "F") {
    // Downgrade by one level if fingerprinting is detected
    const grades = ["A", "B", "C", "D", "E", "F"];
    const currentIndex = grades.indexOf(grade);
    grade = grades[currentIndex + 1];
  }
  
  return { grade, score: Math.round(numericScore) };
}

// Get the domain from URL
function getDomainFromUrl(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    console.error("Error parsing URL:", e);
    return url; // Fall back to the raw url if parsing fails
  }
}

// Listen for tracker data from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background script received message:", message.type);
  
  if (message.type === "trackers") {
    const url = message.url || (sender.tab ? sender.tab.url : null);
    if (!url) {
      console.error("No URL provided for tracker data");
      sendResponse({ error: "No URL provided" });
      return true;
    }
    
    const domain = getDomainFromUrl(url);
    const trackers = message.data;
    const scoreResult = calculateScore(trackers);
    
    // Store data with timestamp
    siteData[domain] = {
      trackers: trackers,
      grade: scoreResult.grade,
      score: scoreResult.score,
      lastVisited: Date.now(),
      lastUpdated: Date.now(),
      url: url,
      visitCount: (siteData[domain]?.visitCount || 0) + 1
    };
    
    // If this is a repeat visit, update stats but keep history
    if (!siteData[domain].history) {
      siteData[domain].history = [];
    }
    
    // Add to history (keeping last 10 entries)
    siteData[domain].history.unshift({
      date: Date.now(),
      trackerCount: trackers.length,
      grade: scoreResult.grade,
      score: scoreResult.score
    });
    
    // Keep history to maximum 10 entries
    if (siteData[domain].history.length > 10) {
      siteData[domain].history = siteData[domain].history.slice(0, 10);
    }
    
    // Save updated data
    saveData();
    
    // Update badge with grade
    if (sender.tab && sender.tab.id) {
      updateBadge(sender.tab.id, scoreResult.grade);
    }
    
    sendResponse({ success: true, grade: scoreResult.grade, score: scoreResult.score });
    return true; // Important: keep message channel open for async response
  } else if (message.type === "content_initialized") {
    console.log("Background script: Content script initialized in tab", 
                sender.tab ? sender.tab.id : "unknown");
    sendResponse({ acknowledged: true });
    return true;
  } else if (message.type === "ping") {
    // Heartbeat message to check connection health
    sendResponse({ alive: true });
    return true;
  }
});

// Update the extension's badge with the privacy grade
function updateBadge(tabId, grade) {
  // Set badge text
  chrome.action.setBadgeText({
    text: grade,
    tabId: tabId
  }).catch(error => {
    console.error("Error setting badge text:", error);
  });
  
  // Set badge color based on grade
  let color;
  switch (grade) {
    case "A": color = "#4CAF50"; break; // Green
    case "B": color = "#8BC34A"; break; // Light Green
    case "C": color = "#FFEB3B"; break; // Yellow
    case "D": color = "#FF9800"; break; // Orange
    case "E": color = "#FF5722"; break; // Deep Orange
    case "F": color = "#F44336"; break; // Red
    default: color = "#9E9E9E";  // Grey for unknown
  }
  
  chrome.action.setBadgeBackgroundColor({
    color: color,
    tabId: tabId
  }).catch(error => {
    console.error("Error setting badge color:", error);
  });
}

// Separate message handler for getScore, getAllSites, and clearData
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("Background script received message:", msg.type);
  
  if (msg.type === "getScore") {
    const domain = getDomainFromUrl(msg.url);
    
    if (siteData[domain]) {
      console.log("Sending score data for:", domain);
      sendResponse(siteData[domain]);
    } else {
      console.log("No data for domain:", domain, "- triggering scan");
      // No data yet, trigger a scan
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs.length > 0 && tabs[0].id) {
          try {
            // First check if content script is ready by sending a ping
            chrome.tabs.sendMessage(tabs[0].id, { type: "ping" }, (pingResponse) => {
              if (chrome.runtime.lastError) {
                console.log("Content script not ready yet, waiting before scan");
                setTimeout(() => {
                  chrome.tabs.sendMessage(tabs[0].id, { type: "rescan" }, (response) => {
                    if (chrome.runtime.lastError) {
                      console.error("Error sending rescan message:", chrome.runtime.lastError);
                    } else {
                      console.log("Rescan request sent, response:", response);
                    }
                  });
                }, 1000); // Wait a second before trying again
              } else {
                // Content script is ready, send the rescan request immediately
                chrome.tabs.sendMessage(tabs[0].id, { type: "rescan" }, (response) => {
                  if (chrome.runtime.lastError) {
                    console.error("Error sending rescan message:", chrome.runtime.lastError);
                  } else {
                    console.log("Rescan request sent, response:", response);
                  }
                });
              }
            });
          } catch (error) {
            console.error("Error sending rescan message:", error);
          } finally {
            sendResponse({ grade: "Scanning...", score: "-", trackers: [] });
          }
        } else {
          sendResponse({ grade: "N/A", score: "-", trackers: [] });
        }
      });
    }
    return true; // Indicate async response
  } else if (msg.type === "getAllSites") {
    // Return all tracked sites for the history view
    console.log("Sending all sites data");
    sendResponse({ sites: siteData });
    return true;
  } else if (msg.type === "clearData") {
    // Clear stored data if requested
    console.log("Clearing all site data");
    siteData = {};
    saveData();
    sendResponse({ success: true });
    return true;
  }
});

// Check if a tab exists
function tabExists(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.get(tabId, (tab) => {
      resolve(!chrome.runtime.lastError && tab);
    });
  });
}

// When a tab is updated, check and update the badge
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const domain = getDomainFromUrl(tab.url);
    
    if (siteData[domain]) {
      updateBadge(tabId, siteData[domain].grade);
    } else {
      // Clear badge when no data is available
      try {
        // First check if tab still exists
        const exists = await tabExists(tabId);
        if (exists) {
          chrome.action.setBadgeText({
            text: "",
            tabId: tabId
          });
        }
      } catch (error) {
        console.error("Error clearing badge:", error);
      }
    }
  }
});

// When a tab is activated, update the badge based on stored data
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await new Promise((resolve, reject) => {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(tab);
        }
      });
    });
    
    if (tab && tab.url) {
      const domain = getDomainFromUrl(tab.url);
      
      if (siteData[domain]) {
        updateBadge(tabId, siteData[domain].grade);
      } else {
        // Clear badge when no data is available
        const exists = await tabExists(tabId);
        if (exists) {
          chrome.action.setBadgeText({
            text: "",
            tabId: tabId
          });
        }
      }
    }
  } catch (error) {
    console.error("Error in tab activated handler:", error);
  }
});