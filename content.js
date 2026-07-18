// Video Assistant Content Script
// Detects videos on the page and shows a floating icon when they play

class VideoAssistant {
  constructor() {
    this.floatingIcon = null;
    this.currentVideo = null;
    this.videos = new Set();
    this.videoFrames = new WeakSet();
    this.observers = new Set();
    this.observedRoots = new WeakSet();
    this.positionFrame = null;
    this.resizeObserver = null;
    this.currentFrameArea = 0;
    this.rescanTimer = null;
    this.boundScheduleIconPosition = () => this.scheduleIconPosition();
    this.boundMediaPlay = (event) => {
      if (event.target instanceof HTMLVideoElement) {
        this.registerVideo(event.target);
        this.onVideoPlay(event.target);
      }
    };
    this.init();
  }

  init() {
    this.scanRoot(document);
    // Some component libraries attach open shadow roots after their host is
    // connected, which produces no observable light-DOM mutation.
    this.rescanTimer = window.setInterval(() => this.rescanPage(), 4000);
    window.addEventListener('pageshow', () => this.rescanPage());
  }

  scanRoot(root) {
    root.querySelectorAll('video').forEach(video => {
      this.registerVideo(video);
    });

    root.querySelectorAll('*').forEach(element => {
      if (element.shadowRoot) {
        this.scanRoot(element.shadowRoot);
      }
    });

    root.querySelectorAll('iframe').forEach(iframe => this.registerVideoFrame(iframe));

    this.observeRoot(root);
  }

  registerVideo(video) {
    if (this.videos.has(video)) {
      return;
    }

    this.videos.add(video);
    this.attachVideoListeners(video);
  }

  registerVideoFrame(iframe) {
    if (this.videoFrames.has(iframe) || !this.isVideoFrame(iframe)) {
      return;
    }

    this.videoFrames.add(iframe);
    const showWhenReady = () => {
      if (iframe.isConnected && iframe.src && !iframe.src.startsWith('about:blank')) {
        requestAnimationFrame(() => this.showFloatingIconForFrame(iframe));
      }
    };
    iframe.addEventListener('load', showWhenReady);
    showWhenReady();
    window.setTimeout(showWhenReady, 500);
  }

  isVideoFrame(iframe) {
    const src = iframe.src || iframe.getAttribute('data-src') || '';
    const identity = [iframe.id, iframe.className, iframe.title, iframe.name].join(' ');
    const allowsVideo = iframe.hasAttribute('allowfullscreen') ||
      /(?:fullscreen|autoplay|picture-in-picture)/i.test(iframe.getAttribute('allow') || '');
    const looksLikePlayer = /(?:video|player|embed)/i.test(identity) ||
      /(?:flixcloud\.cc|vidtube\.site|megacloud|vidplay|filemoon|streamtape|youtube\.com\/embed|vimeo\.com\/video|\/embed\/|\/player\/|\/e\/)/i.test(src);
    return looksLikePlayer && allowsVideo;
  }

  rescanPage() {
    this.videos.forEach(video => {
      if (!video.isConnected) this.videos.delete(video);
    });
    this.scanRoot(document);
  }

  observeRoot(root) {
    if (this.observedRoots.has(root)) {
      return;
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.target.nodeName === 'IFRAME') {
          this.registerVideoFrame(mutation.target);
        }
        mutation.addedNodes.forEach((node) => {
          this.scanAddedNode(node);
        });

        mutation.removedNodes.forEach((node) => {
          if (node === this.currentVideo || (node.contains && node.contains(this.currentVideo))) {
            this.currentVideo = null;
            this.hideFloatingIcon();
          }
        });
      });
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'data-src', 'id', 'class', 'title', 'allow', 'allowfullscreen']
    });
    root.addEventListener('play', this.boundMediaPlay, true);
    root.addEventListener('playing', this.boundMediaPlay, true);
    this.observedRoots.add(root);
    this.observers.add(observer);
  }

  scanAddedNode(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    if (node.nodeName === 'VIDEO' && !this.videos.has(node)) {
      this.registerVideo(node);
    }

    if (node.nodeName === 'IFRAME') {
      this.registerVideoFrame(node);
    }

    if (node.querySelectorAll) {
      node.querySelectorAll('video').forEach(video => {
        this.registerVideo(video);
      });
      node.querySelectorAll('iframe').forEach(iframe => this.registerVideoFrame(iframe));

      if (node.shadowRoot) {
        this.scanRoot(node.shadowRoot);
      }
      node.querySelectorAll('*').forEach(element => {
        if (element.shadowRoot) {
          this.scanRoot(element.shadowRoot);
        }
      });
    }
  }

  attachVideoListeners(video) {
    video.addEventListener('pause', () => this.onVideoPause(video));
    video.addEventListener('ended', () => this.onVideoPause(video));

    if (!video.paused && !video.ended) {
      this.onVideoPlay(video);
    }
  }

  onVideoPlay(video) {
    if (this.currentVideo === video && this.floatingIcon) {
      this.scheduleIconPosition();
      return;
    }
    this.currentVideo = video;
    this.showFloatingIcon(video);
  }

  onVideoPause(video) {
    if (this.currentVideo === video) {
      this.hideFloatingIcon();
    }
  }

  showFloatingIcon(video) {
    if (this.floatingIcon) {
      this.hideFloatingIcon();
    }

    const dock = document.createElement('div');
    dock.className = 'video-assistant-dock';

    const icon = document.createElement('button');
    icon.type = 'button';
    icon.className = 'video-assistant-icon';
    icon.setAttribute('aria-label', 'Open Video Assistant player');
    icon.title = 'Open Video Assistant player';
    icon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
      </svg>
    `;

    icon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.openVideoPlayer(video);
    });

    dock.append(icon);
    (document.body || document.documentElement).appendChild(dock);
    this.floatingIcon = dock;
    this.trackIconTarget(video);
  }

  showFloatingIconForFrame(iframe) {
    if (this.currentVideo instanceof HTMLVideoElement && !this.currentVideo.paused) {
      return;
    }
    const rect = iframe.getBoundingClientRect();
    const frameArea = Math.max(0, rect.width) * Math.max(0, rect.height);
    if (frameArea < 30000) {
      return;
    }
    if (this.currentVideo instanceof HTMLIFrameElement && this.currentFrameArea >= frameArea && this.floatingIcon) {
      return;
    }
    if (this.floatingIcon) {
      this.hideFloatingIcon();
    }

    const dock = document.createElement('div');
    dock.className = 'video-assistant-dock';
    const icon = document.createElement('button');
    icon.type = 'button';
    icon.className = 'video-assistant-icon';
    icon.setAttribute('aria-label', 'Open embedded video player');
    icon.title = 'Open embedded video player';
    icon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
      </svg>
    `;
    icon.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.openEmbeddedFrame(iframe);
    });

    dock.append(icon);
    (document.body || document.documentElement).appendChild(dock);
    this.currentVideo = iframe;
    this.currentFrameArea = frameArea;
    this.floatingIcon = dock;
    this.trackIconTarget(iframe);
  }

  async openEmbeddedFrame(iframe) {
    try {
      if (iframe.requestFullscreen) {
        await iframe.requestFullscreen();
      } else if (iframe.webkitRequestFullscreen) {
        iframe.webkitRequestFullscreen();
      } else {
        throw new Error('Fullscreen is not available for this embedded player');
      }
    } catch (error) {
      console.warn('Video Assistant:', error.message);
    }
  }

  trackIconTarget(target) {
    this.iconTarget = target;
    window.addEventListener('scroll', this.boundScheduleIconPosition, true);
    window.addEventListener('resize', this.boundScheduleIconPosition);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.boundScheduleIconPosition);
      this.resizeObserver.observe(target);
    }

    this.scheduleIconPosition();
  }

  scheduleIconPosition() {
    if (this.positionFrame !== null) {
      return;
    }

    this.positionFrame = requestAnimationFrame(() => {
      this.positionFrame = null;
      this.updateIconPosition();
    });
  }

  updateIconPosition() {
    if (!this.floatingIcon || !this.iconTarget || !this.iconTarget.isConnected) {
      this.hideFloatingIcon();
      return;
    }

    const rect = this.iconTarget.getBoundingClientRect();
    const iconSize = this.floatingIcon.offsetWidth || 48;
    const margin = 10;
    const hasVisibleBox = rect.width > 1 && rect.height > 1;
    const isVisible = !hasVisibleBox || (
      rect.bottom > 0 && rect.right > 0 &&
      rect.top < window.innerHeight && rect.left < window.innerWidth
    );

    this.floatingIcon.style.visibility = isVisible ? 'visible' : 'hidden';
    if (!isVisible) {
      return;
    }

    const top = hasVisibleBox
      ? Math.max(margin, Math.min(rect.bottom - iconSize - margin, window.innerHeight - iconSize - margin))
      : window.innerHeight - iconSize - margin;
    const left = hasVisibleBox
      ? Math.max(margin, Math.min(rect.right - iconSize - margin, window.innerWidth - iconSize - margin))
      : window.innerWidth - iconSize - margin;

    this.floatingIcon.style.top = `${top}px`;
    this.floatingIcon.style.left = `${left}px`;
  }

  hideFloatingIcon() {
    window.removeEventListener('scroll', this.boundScheduleIconPosition, true);
    window.removeEventListener('resize', this.boundScheduleIconPosition);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.positionFrame !== null) {
      cancelAnimationFrame(this.positionFrame);
      this.positionFrame = null;
    }
    if (this.floatingIcon) {
      this.floatingIcon.remove();
      this.floatingIcon = null;
    }
    this.iconTarget = null;
    this.currentFrameArea = 0;
  }

  openVideoPlayer(video, videoUrl = null) {
    let url = videoUrl;
    
    if (video) {
      // Get video source
      if (video.currentSrc) {
        url = video.currentSrc;
      } else if (video.src) {
        url = video.src;
      } else if (video.querySelector('source')) {
        const source = video.querySelector('source');
        url = source.src;
      }
    }

    if (url) {
      // Media Source blob URLs are scoped to the page that created them and
      // cannot be loaded by an extension-origin player window. Keep the live
      // element in its document and open it directly instead.
      if (video && url.startsWith('blob:')) {
        this.openPageOwnedVideo(video);
        return;
      }

      if (typeof chrome === 'undefined' || !chrome.runtime?.id) {
        return;
      }

      // Reloading an extension invalidates content scripts already attached to open tabs.
      // Guard both callback errors and the synchronous exception from that stale context.
      try {
        chrome.runtime.sendMessage({
          action: 'openVideoPlayer',
          videoUrl: url,
          currentTime: video ? video.currentTime : 0,
          playbackRate: video ? video.playbackRate : 1
        }, (response) => {
          const runtimeError = chrome.runtime.lastError;
          if (runtimeError) {
            if (!/context invalidated|receiving end does not exist/i.test(runtimeError.message)) {
              console.warn('Video Assistant:', runtimeError.message);
            }
            return;
          }

          if (!response?.success) {
            console.warn('Video Assistant:', response?.error || 'Player could not be opened');
          }
        });
      } catch (error) {
        if (!/context invalidated/i.test(error.message)) {
          console.warn('Video Assistant:', error.message);
        }
      }
    }
  }

  async openPageOwnedVideo(video) {
    const originallyHadControls = video.controls;
    video.controls = true;

    const restoreControls = () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        video.controls = originallyHadControls;
        document.removeEventListener('fullscreenchange', restoreControls);
        document.removeEventListener('webkitfullscreenchange', restoreControls);
      }
    };

    document.addEventListener('fullscreenchange', restoreControls);
    document.addEventListener('webkitfullscreenchange', restoreControls);
    video.addEventListener('webkitendfullscreen', restoreControls, { once: true });

    try {
      if (video.requestFullscreen) {
        await video.requestFullscreen();
      } else if (video.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
      } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
      } else if (document.pictureInPictureEnabled && video.requestPictureInPicture) {
        await video.requestPictureInPicture();
        restoreControls();
      } else {
        throw new Error('No supported page-owned video mode is available');
      }
    } catch (error) {
      document.removeEventListener('fullscreenchange', restoreControls);
      document.removeEventListener('webkitfullscreenchange', restoreControls);
      video.removeEventListener('webkitendfullscreen', restoreControls);

      try {
        if (document.pictureInPictureEnabled && video.requestPictureInPicture) {
          await video.requestPictureInPicture();
          video.controls = originallyHadControls;
          return;
        }
      } catch (pipError) {
        console.warn('Video Assistant:', pipError.message);
      }

      video.controls = originallyHadControls;
      console.warn('Video Assistant:', error.message);
    }
  }
}

// Initialize the video assistant
const videoAssistant = new VideoAssistant();
