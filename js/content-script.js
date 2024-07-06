chrome.runtime.onMessage.addListener(function(request, sender, sendResponse)
{
    sendResponse('y')
	if(request.action  == 'reload'){
        location.reload()
    }
});

function reload(){
    location.reload()
}

function send(){
    chrome.runtime.sendMessage({from:'content_script',reload: 'done'});
}

window.onload = send()