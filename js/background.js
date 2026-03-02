// Per-tab URL store: { [tabId]: { m3u8list: { [url]: tabObject } } }
var tabData = {};
var pattern = /\.m3u8$|\.mp4$/;

chrome.webRequest.onBeforeRequest.addListener(details => {
    const tabId = details.tabId;
    if (tabId < 0) return; // ignore requests not associated with a tab

    var tmp = new URL(details.url).pathname;
    if (pattern.test(tmp)) {
        chrome.tabs.get(tabId, function(tab) {
            if (chrome.runtime.lastError) return;
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
        tabData[tabId] = { m3u8list: {} };
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