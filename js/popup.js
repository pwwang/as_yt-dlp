var m3u8list = {};
const bgPort = chrome.runtime.connect();

$(function(){
    render(m3u8list)
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if(request.from == 'content_script' && request.reload == 'done'){
            bgPort.postMessage({action:'getList'});
        }
        return true;
    });
    bgPort.onMessage.addListener(function(receivedPortMsg) {
        if(receivedPortMsg.action = 'm3u8List'){
            if(receivedPortMsg.data){
                m3u8list = receivedPortMsg.data
                render(m3u8list)
            }
        }
	});
    bgPort.postMessage({action:'getList'});
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

function render(list){
    if(list !== undefined){
        if(list.length==0){
            $(".alert-danger").addClass("show")
            $(".alert-danger").removeAttr("hidden")
        }else{
            $("#box").html()
            for (url in list) {
                let cmd = `yt-dlp '${url}' -o '${list[url].title}.mp4' --refer '${list[url].url}'`
                $('<div style="display:flex;justify-content:space-between;font-family:ui-monospace,Consolas,monospace;cursor:pointer;background-color:#aea;align-items:flex-start;font-size:11px;width:480px;margin-bottom:2px;">'
                  + '<span style="width:95%;white-space:wrap;">'
                  + `${cmd}`
                  + '</span><a href="#">Copy</a></div>')
                    .appendTo("#box")
                    .click({ "cmd": cmd }, copyCmd);
            }
            $(".alert-danger").removeClass("show")
            $(".alert-danger").attr("hidden","hidden")
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
