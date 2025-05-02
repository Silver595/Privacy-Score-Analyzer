let siteData = {};

const trackerWeights = {
  "Google Analytics": 2,
  "Facebook": 3,
  "Google Ads": 3,
  "Google DoubleClick": 4,
  "Potential Fingerprinting": 5,
  "Tracking Cookie": 1
};

chrome.storage.local.get(['siteData', 'lastCleared'], result => {
  if (result.siteData) {
    siteData = result.siteData;
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
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

  if (!result.lastCleared || (Date.now() - result.lastCleared > 30 * 24 * 60 * 60 * 1000)) {
    chrome.storage.local.set({ lastCleared: Date.now() });
  }
});

function saveData() {
  chrome.storage.local.set({ siteData });
}

function calculateScore(trackers) {
  if (!trackers || trackers.length === 0) return { grade: "A", score: 100 };
  let weightedCount = 0;
  let fingerprintingDetected = false;
  let adTrackersCount = 0;

  trackers.forEach(tracker => {
    const weight = trackerWeights[tracker.name] || 1;
    weightedCount += weight;

    if (tracker.name === "Potential Fingerprinting") {
      fingerprintingDetected = true;
    }

    if (tracker.name.includes("Ads") || 
        tracker.name.includes("DoubleClick") || 
        tracker.name.includes("AdSense") ||
        tracker.name.includes("Facebook Pixel")) {
      adTrackersCount++;
    }
  });

  if (fingerprintingDetected) {
    weightedCount += 5;
  }

  if (adTrackersCount > 1) {
    weightedCount += Math.min(adTrackersCount, 5);
  }

  const numericScore = Math.max(0, Math.min(100, 100 - (weightedCount * 3)));

  let grade;
  if (numericScore >= 90) grade = "A";
  else if (numericScore >= 80) grade = "B";
  else if (numericScore >= 70) grade = "C";
  else if (numericScore >= 60) grade = "D";
  else if (numericScore >= 50) grade = "E";
  else grade = "F";

  if (fingerprintingDetected && grade !== "F") {
    const grades = ["A", "B", "C", "D", "E", "F"];
    const currentIndex = grades.indexOf(grade);
    grade = grades[currentIndex + 1];
  }

  return { grade, score: Math.round(numericScore) };
}

function getDomainFromUrl(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    console.error("Error parsing URL:", e);
    return url;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "trackers") {
    const url = message.url || (sender.tab ? sender.tab.url : null);
    if (!url) {
      sendResponse({ error: "No URL provided" });
      return true;
    }

    const domain = getDomainFromUrl(url);
    const trackers = message.data;
    const scoreResult = calculateScore(trackers);

    siteData[domain] = {
      trackers: trackers,
      grade: scoreResult.grade,
      score: scoreResult.score,
      lastVisited: Date.now(),
      lastUpdated: Date.now(),
      url: url,
      visitCount: (siteData[domain]?.visitCount || 0) + 1
    };

    if (!siteData[domain].history) {
      siteData[domain].history = [];
    }

    siteData[domain].history.unshift({
      date: Date.now(),
      trackerCount: trackers.length,
      grade: scoreResult.grade,
      score: scoreResult.score
    });

    if (siteData[domain].history.length > 10) {
      siteData[domain].history = siteData[domain].history.slice(0, 10);
    }

    saveData();

    if (sender.tab && sender.tab.id) {
      updateBadge(sender.tab.id, scoreResult.grade);
    }

    sendResponse({ success: true, grade: scoreResult.grade, score: scoreResult.score });
    return true;
  } else if (message.type === "content_initialized") {
    sendResponse({ acknowledged: true });
    return true;
  } else if (message.type === "ping") {
    sendResponse({ alive: true });
    return true;
  }
});

function updateBadge(tabId, grade) {
  chrome.action.setBadgeText({
    text: grade,
    tabId: tabId
  }).catch(error => {
    console.error("Error setting badge text:", error);
  });

  let color;
  switch (grade) {
    case "A": color = "#4CAF50"; break;
    case "B": color = "#8BC34A"; break;
    case "C": color = "#FFEB3B"; break;
    case "D": color = "#FF9800"; break;
    case "E": color = "#FF5722"; break;
    case "F": color = "#F44336"; break;
    default: color = "#9E9E9E";
  }

  chrome.action.setBadgeBackgroundColor({
    color: color,
    tabId: tabId
  }).catch(error => {
    console.error("Error setting badge color:", error);
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "getScore") {
    const domain = getDomainFromUrl(msg.url);

    if (siteData[domain]) {
      sendResponse(siteData[domain]);
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs.length > 0 && tabs[0].id) {
          try {
            chrome.tabs.sendMessage(tabs[0].id, { type: "ping" }, (pingResponse) => {
              if (chrome.runtime.lastError) {
                setTimeout(() => {
                  chrome.tabs.sendMessage(tabs[0].id, { type: "rescan" }, (response) => {
                    if (chrome.runtime.lastError) {
                      console.error("Error sending rescan message:", chrome.runtime.lastError);
                    }
                  });
                }, 1000);
              } else {
                chrome.tabs.sendMessage(tabs[0].id, { type: "rescan" }, (response) => {
                  if (chrome.runtime.lastError) {
                    console.error("Error sending rescan message:", chrome.runtime.lastError);
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
    return true;
  } else if (msg.type === "getAllSites") {
    sendResponse({ sites: siteData });
    return true;
  } else if (msg.type === "clearData") {
    siteData = {};
    saveData();
    sendResponse({ success: true });
    return true;
  }
});

function tabExists(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.get(tabId, (tab) => {
      resolve(!chrome.runtime.lastError && tab);
    });
  });
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const domain = getDomainFromUrl(tab.url);

    if (siteData[domain]) {
      updateBadge(tabId, siteData[domain].grade);
    } else {
      try {
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
