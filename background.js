/**
 * LinkedIn Zip Puzzle Auto-Solver - Background Service Worker
 * Manages SPA navigation, extension icon state, and cross-context messaging.
 */

const ZIP_URL_PATTERNS = [
  'linkedin.com/games/zip',
  'zipgameunlimited.com',
  'zipgameonline.com',
  'awa.games/zip'
];

function isZipUrl(url) {
  if (!url) return false;
  return ZIP_URL_PATTERNS.some(pattern => url.includes(pattern));
}

// Update icon badge when tab changes
async function updateTabBadge(tabId, url) {
  try {
    if (isZipUrl(url)) {
      await chrome.action.setBadgeText({ tabId, text: 'ZIP' });
      await chrome.action.setBadgeBackgroundColor({ tabId, color: '#0284c7' });
      await chrome.action.setTitle({ tabId, title: 'LinkedIn Zip Solver - Ready' });
    } else {
      await chrome.action.setBadgeText({ tabId, text: '' });
      await chrome.action.setTitle({ tabId, title: 'LinkedIn Zip Solver (Inactive on this page)' });
    }
  } catch (err) {
    // Tab might be closing
  }
}

// Tab navigation listener
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    updateTabBadge(tabId, tab.url);
  }
});

// Single Page Application (SPA) navigation listener for LinkedIn
chrome.webNavigation.onHistoryStateUpdated.addListener(({ tabId, url }) => {
  if (isZipUrl(url)) {
    updateTabBadge(tabId, url);
    // Ping content script or ensure injection
    chrome.tabs.sendMessage(tabId, { action: 'CHECK_GAME_STATE' }).catch(() => {
      // Content script may need reinjection on dynamic route switch
      chrome.scripting.executeScript({
        target: { tabId },
        files: ['solver.js', 'dom-bridge.js', 'content.js']
      }).catch(err => console.debug('Script execution caught:', err));
    });
  }
});

// Message listener from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'PING_BACKGROUND') {
    sendResponse({ status: 'ok', version: '1.0.0' });
    return true;
  }

  if (message.action === 'OPEN_ZIP_GAME') {
    chrome.tabs.create({ url: 'https://www.linkedin.com/games/zip/' });
    sendResponse({ status: 'opened' });
    return true;
  }

  if (message.action === 'OPEN_PLAYGROUND') {
    chrome.tabs.create({ url: chrome.runtime.getURL('playground.html') });
    sendResponse({ status: 'opened' });
    return true;
  }
});
