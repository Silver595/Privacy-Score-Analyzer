// Comprehensive list of trackers
const knownTrackers = {
  // Analytics trackers
  "google-analytics.com": "Google Analytics",
  "googletagmanager.com": "Google Tag Manager",
  "analytics.google.com": "Google Analytics",
  "hotjar.com": "Hotjar",
  "mouseflow.com": "Mouseflow",
  "clarity.ms": "Microsoft Clarity",
  "matomo": "Matomo Analytics",
  "plausible.io": "Plausible Analytics",
  "amplitude.com": "Amplitude",
  "mixpanel.com": "Mixpanel",
  "segment.com": "Segment",
  "segment.io": "Segment",
  "heap.io": "Heap Analytics",
  "fullstory.com": "FullStory",
  
  // Advertising trackers
  "doubleclick.net": "Google DoubleClick",
  "adservice.google.com": "Google Ads",
  "googlesyndication.com": "Google AdSense",
  "google-adservices.com": "Google Adservices",
  "facebook.net": "Facebook",
  "facebook.com/tr": "Facebook Pixel",
  "ads-twitter.com": "Twitter Ads",
  "platform.twitter.com": "Twitter Platform",
  "ads.linkedin.com": "LinkedIn Ads",
  "bing.com": "Bing Ads",
  "taboola.com": "Taboola",
  "outbrain.com": "Outbrain",
  "criteo.com": "Criteo",
  "adroll.com": "AdRoll",
  "casalemedia.com": "Casale Media",
  "rubiconproject.com": "Rubicon Project",
  "pubmatic.com": "PubMatic",
  "adnxs.com": "AppNexus",
  "openx.net": "OpenX",
  "smartadserver.com": "Smart AdServer",
  "amazon-adsystem.com": "Amazon Ads",
  
  // Social media trackers
  "connect.facebook.net": "Facebook Connect",
  "platform.instagram.com": "Instagram",
  "platform.linkedin.com": "LinkedIn",
  "static.xx.fbcdn.net": "Facebook Content",
  "widgets.pinterest.com": "Pinterest Widget",
  "sc-static.net": "Snapchat",
  
  // CDNs (some may be used for tracking)
  "cloudfront.net": "Amazon CloudFront",
  "cloudflare.com": "Cloudflare",
  
  // Other tracking technologies
  "optimizely.com": "Optimizely",
  "crazyegg.com": "Crazy Egg",
  "hubspot.com": "HubSpot",
  "marketo.net": "Marketo",
  "pardot.com": "Pardot",
  "salesforce.com": "Salesforce",
  "zendesk.com": "Zendesk",
  "intercom.io": "Intercom",
  "zopim.com": "Zopim",
  "drift.com": "Drift",
  "sharethis.com": "ShareThis",
  "addtoany.com": "AddToAny",
  "disqus.com": "Disqus",
  "adobe.com/experience": "Adobe Experience",
  "heatmap.it": "Heatmap",
  "kissmetrics.com": "KISSmetrics",
  "freshmarketer.com": "Freshmarketer",
  "clicktale.net": "Clicktale",
  "newrelic.com": "New Relic",
  "sentry.io": "Sentry",
  "bugsnag.com": "Bugsnag",
  "quantserve.com": "Quantcast",
  "quantcount.com": "Quantcast",
  "scorecardresearch.com": "ScoreCard Research"
};

// Function to detect trackers in DOM and network requests
function detectTrackers() {
  console.log("Content script: Starting tracker detection");
  const trackersFound = {};
  const htmlContent = document.documentElement.innerHTML;
  
  try {
      // Check for trackers in HTML content
      for (const [domain, name] of Object.entries(knownTrackers)) {
          if (htmlContent.includes(domain)) {
              trackersFound[domain] = { name, method: "HTML content" };
          }
      }
      
      // Check for trackers in script tags
      const scripts = document.querySelectorAll('script[src]');
      scripts.forEach(script => {
          const src = script.getAttribute('src');
          for (const [domain, name] of Object.entries(knownTrackers)) {
              if (src && src.includes(domain)) {
                  trackersFound[domain] = { name, method: "Script tag", url: src };
              }
          }
      });
      
      // Check for trackers in link tags
      const links = document.querySelectorAll('link[href]');
      links.forEach(link => {
          const href = link.getAttribute('href');
          for (const [domain, name] of Object.entries(knownTrackers)) {
              if (href && href.includes(domain)) {
                  trackersFound[domain] = { name, method: "Link tag", url: href };
              }
          }
      });
      
      // Check for trackers in iframe tags
      const iframes = document.querySelectorAll('iframe[src]');
      iframes.forEach(iframe => {
          const src = iframe.getAttribute('src');
          for (const [domain, name] of Object.entries(knownTrackers)) {
              if (src && src.includes(domain)) {
                  trackersFound[domain] = { name, method: "Iframe", url: src };
              }
          }
      });
      
      // Check for trackers in img tags
      const images = document.querySelectorAll('img[src]');
      images.forEach(img => {
          const src = img.getAttribute('src');
          for (const [domain, name] of Object.entries(knownTrackers)) {
              if (src && src.includes(domain)) {
                  trackersFound[domain] = { name, method: "Image tag", url: src };
              }
          }
      });
      
      // Check for cookie-based trackers
      const cookies = document.cookie.split(';');
      cookies.forEach(cookie => {
          const cookieName = cookie.trim().split('=')[0].toLowerCase();
          
          // Look for common tracking cookie names
          if (cookieName.includes('_ga') || 
              cookieName.includes('_fbp') ||
              cookieName.includes('_gid') ||
              cookieName.includes('__qca') ||
              cookieName.includes('__hstc')) {
              trackersFound["cookie:" + cookieName] = { 
                  name: "Tracking Cookie", 
                  method: "Cookie",
                  details: cookieName
              };
          }
      });
      
      // Check for localStorage-based trackers
      try {
          for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.includes('_ga') || 
                  key.includes('_fbp') ||
                  key.includes('amplitude') ||
                  key.includes('mixpanel'))) {
                  trackersFound["localstorage:" + key] = { 
                      name: "LocalStorage Tracker", 
                      method: "LocalStorage",
                      details: key
                  };
              }
          }
      } catch (e) {
          console.log("Content script: localStorage access error:", e.message);
          // Some pages block localStorage access in iframes or have other restrictions
      }
  
      // Look for fingerprinting techniques
      const fingerprintingAPIs = [
          { name: "Canvas API", test: () => !!window.CanvasRenderingContext2D },
          { name: "WebGL API", test: () => !!window.WebGLRenderingContext },
          { name: "Audio API", test: () => !!window.AudioContext || !!window.webkitAudioContext },
          { name: "Battery API", test: () => !!navigator.getBattery },
          { name: "Device Enumeration", test: () => !!navigator.mediaDevices?.enumerateDevices }
      ];
      
      fingerprintingAPIs.forEach(api => {
          try {
              if (api.test()) {
                  // Only report if we see suspiciously accessed APIs when trackers are already present
                  if (Object.keys(trackersFound).length > 0) {
                      trackersFound["fingerprinting:" + api.name] = { 
                          name: "Potential Fingerprinting", 
                          method: "Browser API",
                          details: api.name
                      };
                  }
              }
          } catch (e) {
              // Ignore errors in fingerprinting detection
          }
      });
      
      console.log("Content script: Found trackers:", Object.keys(trackersFound).length);
      
      // Send tracker data to background script
      sendTrackerData(Object.values(trackersFound));
  } catch (error) {
      console.error("Content script: Error during tracker detection:", error);
      // Still attempt to send any trackers found before the error
      sendTrackerData(Object.values(trackersFound));
  }
}

// Function to send tracker data to background script with retry
function sendTrackerData(trackers, retries = 3) {
  console.log("Content script: Sending tracker data to background...");
  chrome.runtime.sendMessage({ 
      type: "trackers", 
      data: trackers,
      url: window.location.href
  }, response => {
      if (chrome.runtime.lastError) {
          console.error("Content script: Error sending tracker data:", chrome.runtime.lastError);
          if (retries > 0) {
              console.log(`Content script: Retrying... (${retries} attempts left)`);
              setTimeout(() => sendTrackerData(trackers, retries - 1), 1000);
          }
      } else {
          console.log("Content script: Successfully sent tracker data, response:", response);
      }
  });
}

// Initialize tracker detection
function initTrackerDetection() {
  console.log("Content script: Initializing tracker detection");
  
  // Check if we're in a viable context for scanning
  if (document.readyState === 'loading') {
      console.log("Content script: Document still loading, waiting for load event");
      window.addEventListener('load', () => {
          // Small delay to ensure dynamic content has loaded
          setTimeout(detectTrackers, 1500);
      });
  } else {
      console.log("Content script: Document already loaded, scheduling detection");
      // Small delay to ensure dynamic content has loaded
      setTimeout(detectTrackers, 1500);
  }
}

// Set up message listener immediately
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script: Received message:", message.type);
  
  if (message.type === "rescan") {
      console.log("Content script: Received rescan request");
      detectTrackers();
      sendResponse({success: true});
  }
  return true; // Keep message channel open for async response
});

// Self-healing mechanism
let connectionCheckerInterval;

function checkConnection() {
  chrome.runtime.sendMessage({ type: "ping" }, response => {
      if (chrome.runtime.lastError) {
          console.log("Content script: Connection error detected, reinitializing");
          clearInterval(connectionCheckerInterval);
          
          // Try to re-establish connection
          initTrackerDetection();
          
          // Restart connection checker
          connectionCheckerInterval = setInterval(checkConnection, 30000); // Every 30 seconds
      } else {
          console.log("Content script: Connection with background script is healthy");
      }
  });
}

// Start initialization
initTrackerDetection();

// Start connection checker after a short delay
setTimeout(() => {
  connectionCheckerInterval = setInterval(checkConnection, 30000); // Every 30 seconds
}, 5000);

// Alert the background script that we're initialized
chrome.runtime.sendMessage({ type: "content_initialized" }, response => {
  if (chrome.runtime.lastError) {
      console.error("Content script: Failed to notify background of initialization:", chrome.runtime.lastError);
  } else {
      console.log("Content script: Background notified of initialization");
  }
});