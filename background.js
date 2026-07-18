// Video Assistant Background Script
// Handles messaging between content script and popup

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openVideoPlayer') {
    // Store the video information in local storage
    chrome.storage.local.set({
      videoUrl: request.videoUrl,
      currentTime: request.currentTime || 0,
      playbackRate: request.playbackRate || 1
    }, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }

      // Open a durable player window. Use the callback form for compatibility
      // with Chrome and browsers whose chrome.* shim does not return a Promise.
      try {
        chrome.windows.create({
          url: chrome.runtime.getURL('popup.html'),
          type: 'popup',
          width: 800,
          height: 720
        }, (window) => {
          if (chrome.runtime.lastError) {
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
            sendResponse({ success: true, windowId: window?.id });
          }
        });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    });
    return true;
  }

  if (request.action === 'downloadVideo') {
    if (!chrome.downloads) {
      sendResponse({ success: false, error: 'Download permission is required' });
      return false;
    }

    const downloadOptions = {
      url: request.videoUrl,
      saveAs: true
    };
    try {
      const pathname = new URL(request.videoUrl).pathname;
      const candidate = decodeURIComponent(pathname.split('/').pop() || '');
      if (/^[^/\\]+\.(mp4|webm|ogg|ogv|mov|m4v)$/i.test(candidate)) {
        downloadOptions.filename = candidate;
      }
    } catch (error) {
      // Let the downloads API report malformed URLs to the caller.
    }

    chrome.downloads.download(downloadOptions, (downloadId) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, downloadId });
      }
    });
    return true;
  }

  return false;
});

// Handle installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Video Assistant extension installed');
  } else if (details.reason === 'update') {
    console.log('Video Assistant extension updated');
  }
});
