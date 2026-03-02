// Per-tab URL store: { [tabId]: { m3u8list: { [url]: tabObject } } }
var tabData = {};
var pattern = /\.m3u8$|\.mp4$/;

// Exclude patterns loaded from excludes.txt
var excludePatterns = [];

fetch(chrome.runtime.getURL('excludes.txt'))
    .then(r => r.text())
    .then(text => {
        excludePatterns = text
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.startsWith('#'))
            .map(line => new RegExp(line));
    });

function isExcluded(url) {
    return excludePatterns.some(re => re.test(url));
}

chrome.webRequest.onBeforeRequest.addListener(details => {
    const tabId = details.tabId;
    if (tabId < 0) return; // ignore requests not associated with a tab

    var tmp = new URL(details.url).pathname;
    if (pattern.test(tmp)) {
        chrome.tabs.get(tabId, function(tab) {
            if (chrome.runtime.lastError) return;
            if (isExcluded(tab.url)) return; // skip excluded sites
            if (!tabData[tabId]) {
                tabData[tabId] = { m3u8list: {} };
            }
            tabData[tabId].m3u8list[details.url] = tab;
        });
    }
}, { urls: ["<all_urls>"] }, ["extraHeaders"]);

// Clear a tab's captured URLs when it navigates to a new page
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo) {
    if (changeInfo.status === 'loading' && changeInfo.url) {
        if (isExcluded(changeInfo.url)) {
            delete tabData[tabId]; // drop any previously captured data for this tab
        } else {
            tabData[tabId] = { m3u8list: {} };
        }
    }
});

// Remove stored data when a tab is closed
chrome.tabs.onRemoved.addListener(function(tabId) {
    delete tabData[tabId];
});

chrome.runtime.onConnect.addListener(function(port) {
    port.onMessage.addListener(function(receivedMsg) {
        if (receivedMsg.action == 'getList') {
            const tabId = receivedMsg.tabId;
            const data = (tabData[tabId] && tabData[tabId].m3u8list) || {};
            port.postMessage({ action: 'm3u8List', data: data });
        }
    });
});