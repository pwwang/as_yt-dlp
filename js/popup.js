var m3u8list = {};
const bgPort = chrome.runtime.connect();
var currentTabId = null;

$(function(){
    // Do NOT render immediately — wait for the background response so
    // the error alert doesn't flash before data has had a chance to load.

    // Resolve the active tab first, then request its URL list
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs.length > 0) {
            currentTabId = tabs[0].id;
            bgPort.postMessage({action: 'getList', tabId: currentTabId});
        }
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if(request.from == 'content_script' && request.reload == 'done'){
            if (currentTabId !== null) {
                bgPort.postMessage({action: 'getList', tabId: currentTabId});
            }
        }
        return true;
    });

    bgPort.onMessage.addListener(function(receivedPortMsg) {
        if(receivedPortMsg.action == 'm3u8List'){
            m3u8list = receivedPortMsg.data || {};
            render(m3u8list, receivedPortMsg.failed);
        }
    });
})

$(document).ready(function() {
    document.getElementById("reload").addEventListener("click",reload);
  });

function reload(){
    //console.log('function : reload');
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "reload"});
      });
}

// Show the "nothing detected" warning (yellow), hide the error alert
function showEmpty() {
    $("#alert-empty").addClass("show").removeAttr("hidden");
    $("#alert-error").removeClass("show").attr("hidden", "hidden");
}

// Show the "try reloading" error (red), hide the empty alert
function showError() {
    $("#alert-error").addClass("show").removeAttr("hidden");
    $("#alert-empty").removeClass("show").attr("hidden", "hidden");
}

function hideAlerts() {
    $("#alert-empty, #alert-error").removeClass("show").attr("hidden", "hidden");
}

function render(list, failed) {
    if (failed) {
        showError();
        return;
    }
    if (list !== undefined) {
        if (Object.keys(list).length == 0) {
            showEmpty();
        } else {
            hideAlerts();
            $("#box").empty();
            for (url in list) {
                let cmd = `yt-dlp '${url}' -o '${list[url].title}.mp4' --refer '${list[url].url}'`
                $('<div style="display:flex;justify-content:space-between;font-family:ui-monospace,Consolas,monospace;cursor:pointer;background-color:#aea;align-items:flex-start;font-size:11px;width:480px;margin-bottom:2px;">'
                  + '<span style="width:95%;white-space:wrap;">'
                  + `${cmd}`
                  + '</span><a href="#">Copy</a></div>')
                    .appendTo("#box")
                    .click({ "cmd": cmd }, copyCmd);
            }
        }
    }
}

function copyCmd(obj) {
    navigator.clipboard.writeText(obj.data.cmd);
    $(".alert-success").addClass("show")
    $(".alert-success").removeAttr("hidden")
    window.setTimeout(function(){
        $(".alert-success").removeClass("show")
        $(".alert-success").attr("hidden","hidden")
    },2000);
}
