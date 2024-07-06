var msg = {}
msg.m3u8list = {}
var pattern = /\.m3u8$|\.mp4$/
var url = ""
var the_details

chrome.webRequest.onBeforeRequest.addListener(details => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const tab = tabs[tabs.length - 1]
        if (url != tab.url) {
            msg.m3u8list = {}
        }
        url = tab.url

        var tmp = new URL(details.url).pathname
        if (pattern.test(tmp)) {
            msg.m3u8list[details.url] = tab
        }
    });
}, { urls: ["<all_urls>"] }, ["extraHeaders"]);

chrome.runtime.onConnect.addListener(function (port) {
    port.onMessage.addListener(function (receivedMsg) {
        if (receivedMsg.action == 'getList') {
            //console.log("bg send:" + msg.toString())
            port.postMessage({ action: 'm3u8List', 'data': msg.m3u8list })
        }
    })
});