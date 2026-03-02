// Per-tab URL store: { [tabId]: { m3u8list: { [url]: tabObject } } }
// Kept in chrome.storage.session so it survives MV3 service worker restarts.
var tabData = {};
var pattern = /\.m3u8$|\.mp4$/;

// Exclude patterns loaded from excludes.txt
var excludePatterns = [];

// Restore persisted data and load excludes in parallel at startup
Promise.all([
    chrome.storage.session.get('tabData').then(result => {
        if (result.tabData) tabData = result.tabData;
    }),
    fetch(chrome.runtime.getURL('excludes.txt'))
        .then(r => r.text())
        .then(text => {
            excludePatterns = text
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0 && !line.startsWith('#'))
                .map(line => new RegExp(line));
        })
        .catch(() => {}) // ignore fetch errors
]);

function saveTabData() {
    chrome.storage.session.set({ tabData });
}

function isExcluded(url) {
    return excludePatterns.some(re => re.test(url));
}

chrome.webRequest.onBeforeRequest.addListener(details => {
    const tabId = String(details.tabId); // normalize to string — storage serializes keys as strings
    if (details.tabId < 0) return; // ignore requests not associated with a tab

    var tmp = new URL(details.url).pathname;
    if (pattern.test(tmp)) {
        chrome.tabs.get(details.tabId, function(tab) {
            if (chrome.runtime.lastError) return;
            if (isExcluded(tab.url)) return; // skip excluded sites
            if (!tabData[tabId]) {
                tabData[tabId] = { m3u8list: {} };
            }
            tabData[tabId].m3u8list[details.url] = tab;
            saveTabData();
        });
    }
}, { urls: ["<all_urls>"] }, ["extraHeaders"]);

// Clear a tab's captured URLs when it navigates to a new page
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo) {
    const key = String(tabId);
    if (changeInfo.status === 'loading' && changeInfo.url) {
        if (isExcluded(changeInfo.url)) {
            delete tabData[key];
        } else {
            tabData[key] = { m3u8list: {} };
        }
        saveTabData();
    }
});

// Remove stored data when a tab is closed
chrome.tabs.onRemoved.addListener(function(tabId) {
    delete tabData[String(tabId)];
    saveTabData();
});

chrome.runtime.onConnect.addListener(function(port) {
    port.onMessage.addListener(async function(receivedMsg) {
        if (receivedMsg.action == 'getList') {
            const tabId = String(receivedMsg.tabId);
            // Always read directly from storage to avoid race condition where
            // the service worker was just restarted and the in-memory tabData
            // restore (async) hasn't completed yet when the popup connects.
            const result = await chrome.storage.session.get('tabData');
            const stored = result.tabData || {};
            const data = (stored[tabId] && stored[tabId].m3u8list) || {};
            port.postMessage({ action: 'm3u8List', data: data });
        }
    });
});