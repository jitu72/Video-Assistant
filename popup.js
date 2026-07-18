// Video Assistant Popup Script
// Handles video playback controls and UI interactions

class VideoPlayer {
  constructor() {
    this.video = document.getElementById('videoPlayer');
    this.urlInput = document.getElementById('urlInput');
    this.loadBtn = document.getElementById('loadBtn');
    this.speedSlider = document.getElementById('speedSlider');
    this.speedValue = document.getElementById('speedValue');
    this.volumeSlider = document.getElementById('volumeSlider');
    this.volumeValue = document.getElementById('volumeValue');
    this.pipBtn = document.getElementById('pipBtn');
    this.fullscreenBtn = document.getElementById('fullscreenBtn');
    this.speedQuickBtn = document.getElementById('speedQuickBtn');
    this.speedPopover = document.getElementById('speedPopover');
    this.speedPopoverSlider = document.getElementById('speedPopoverSlider');
    this.speedPopoverValue = document.getElementById('speedPopoverValue');
    this.loopBtn = document.getElementById('loopBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.closeBtn = document.getElementById('closeBtn');
    this.videoInfo = document.getElementById('videoInfo');
    this.infoBar = this.videoInfo.closest('.info');
    this.videoContainer = this.video.closest('.video-container');
    this.playerOverlay = document.getElementById('playerOverlay');
    this.settingsMenu = document.getElementById('settingsMenu');
    this.menuBtn = document.getElementById('menuBtn');
    this.menuCloseBtn = document.getElementById('menuCloseBtn');
    this.playPauseBtn = document.getElementById('playPauseBtn');
    this.rewindBtn = document.getElementById('rewindBtn');
    this.forwardBtn = document.getElementById('forwardBtn');
    this.progressSlider = document.getElementById('progressSlider');
    this.currentTimeLabel = document.getElementById('currentTimeLabel');
    this.durationLabel = document.getElementById('durationLabel');
    this.overlayTimer = null;
    
    this.isLooping = false;
    this.init();
  }

  init() {
    // Load video from storage or message
    this.loadInitialVideo();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Update video info
    this.updateVideoInfo();
  }

  async loadInitialVideo() {
    // Check if there's a video URL from the content script
    chrome.storage.local.get(['videoUrl', 'currentTime', 'playbackRate'], (result) => {
      if (result.videoUrl) {
        this.loadVideo(result.videoUrl, result.currentTime, result.playbackRate);
        // Clear the stored URL
        chrome.storage.local.remove(['videoUrl', 'currentTime', 'playbackRate']);
      }
    });
  }

  setupEventListeners() {
    // Load button
    this.loadBtn.addEventListener('click', () => {
      const url = this.urlInput.value.trim();
      if (url) {
        this.loadVideo(url);
      }
    });

    // Enter key on URL input
    this.urlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const url = this.urlInput.value.trim();
        if (url) {
          this.loadVideo(url);
        }
      }
    });

    // Playback speed
    this.speedSlider.addEventListener('input', () => {
      this.setPlaybackSpeed(parseFloat(this.speedSlider.value));
    });

    this.speedQuickBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      this.toggleSpeedPopover();
    });

    this.speedPopoverSlider.addEventListener('input', () => {
      this.setPlaybackSpeed(parseFloat(this.speedPopoverSlider.value));
    });

    this.speedPopover.querySelector('.speed-presets').addEventListener('click', (event) => {
      const button = event.target.closest('[data-speed]');
      if (button) this.setPlaybackSpeed(Number(button.dataset.speed));
    });

    document.addEventListener('pointerdown', (event) => {
      if (this.speedPopover.classList.contains('open') &&
          !this.speedPopover.contains(event.target) &&
          !this.speedQuickBtn.contains(event.target)) {
        this.toggleSpeedPopover(false);
      }
    });

    // Initialize speed display
    this.speedValue.textContent = '1.00x';

    // Volume
    this.volumeSlider.addEventListener('input', () => {
      this.video.volume = this.volumeSlider.value / 100;
      this.volumeValue.textContent = `${this.volumeSlider.value}%`;
    });

    // Picture-in-Picture
    this.pipBtn.addEventListener('click', () => {
      this.togglePictureInPicture();
    });

    // Fullscreen
    this.fullscreenBtn.addEventListener('click', () => {
      this.toggleFullscreen();
    });

    // Loop
    this.loopBtn.addEventListener('click', () => {
      this.toggleLoop();
    });

    // Download
    this.downloadBtn.addEventListener('click', () => {
      this.downloadVideo();
    });

    // Close button
    this.closeBtn.addEventListener('click', () => {
      window.close();
    });

    this.menuBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      this.toggleSettingsMenu();
    });

    this.menuCloseBtn.addEventListener('click', () => this.toggleSettingsMenu(false));

    document.addEventListener('pointerdown', (event) => {
      if (this.settingsMenu.classList.contains('open') &&
          !this.settingsMenu.contains(event.target) &&
          !this.menuBtn.contains(event.target)) {
        this.toggleSettingsMenu(false);
      }
    });

    this.playPauseBtn.addEventListener('click', () => this.togglePlayback());
    this.rewindBtn.addEventListener('click', () => this.seekBy(-10));
    this.forwardBtn.addEventListener('click', () => this.seekBy(10));
    this.progressSlider.addEventListener('input', () => {
      if (Number.isFinite(this.video.duration)) {
        this.video.currentTime = (Number(this.progressSlider.value) / 100) * this.video.duration;
      }
    });

    this.videoContainer.addEventListener('pointermove', () => this.showOverlay());
    this.videoContainer.addEventListener('pointerleave', () => this.scheduleOverlayHide());
    this.video.addEventListener('click', () => this.togglePlayback());
    this.playerOverlay.addEventListener('click', (event) => {
      if (event.target === this.playerOverlay) this.togglePlayback();
    });

    // Video events
    this.video.addEventListener('loadedmetadata', () => {
      this.videoContainer.classList.remove('loading');
      this.videoContainer.classList.add('has-video');
      this.updateVideoInfo();
      this.updateTimeline();
    });

    this.video.addEventListener('timeupdate', () => {
      this.updateVideoInfo();
      this.updateTimeline();
    });

    this.video.addEventListener('play', () => {
      this.videoContainer.classList.add('playing');
      this.playPauseBtn.setAttribute('aria-label', 'Pause');
      this.updateVideoInfo();
      this.scheduleOverlayHide();
    });

    this.video.addEventListener('pause', () => {
      this.videoContainer.classList.remove('playing');
      this.playPauseBtn.setAttribute('aria-label', 'Play');
      this.updateVideoInfo();
      this.showOverlay(false);
    });

    this.video.addEventListener('enterpictureinpicture', () => {
      this.pipBtn.classList.add('active');
    });

    this.video.addEventListener('leavepictureinpicture', () => {
      this.pipBtn.classList.remove('active');
    });

    document.addEventListener('fullscreenchange', () => {
      this.fullscreenBtn.classList.toggle('active', Boolean(document.fullscreenElement));
    });

    document.addEventListener('keydown', (event) => {
      const isInteractive = ['INPUT', 'BUTTON'].includes(event.target.tagName) || event.target.isContentEditable;
      if (event.code === 'Space' && !isInteractive) {
        event.preventDefault();
        this.togglePlayback();
      }
      if (event.key === 'ArrowLeft' && !isInteractive) {
        event.preventDefault();
        this.seekBy(-10);
      }
      if (event.key === 'ArrowRight' && !isInteractive) {
        event.preventDefault();
        this.seekBy(10);
      }
      if (event.key === 'Escape' && this.settingsMenu.classList.contains('open')) {
        this.toggleSettingsMenu(false);
      }
      if (event.key === 'Escape' && this.speedPopover.classList.contains('open')) {
        this.toggleSpeedPopover(false);
      }
    });
  }

  loadVideo(url, currentTime = 0, playbackRate = 1) {
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (error) {
      this.showError('Enter a valid video URL');
      return;
    }

    if (!['http:', 'https:', 'blob:', 'data:'].includes(parsedUrl.protocol)) {
      this.showError('This URL type is not supported');
      return;
    }
    
    this.video.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(currentTime) && currentTime > 0) {
        this.video.currentTime = Math.min(currentTime, this.video.duration || currentTime);
      }
      const safeRate = Math.max(0.25, Math.min(3, Number(playbackRate) || 1));
      this.setPlaybackSpeed(safeRate);
      this.video.play().catch(e => {
        console.log('Autoplay prevented:', e);
      });
    }, { once: true });

    this.video.addEventListener('error', () => {
      this.videoContainer.classList.remove('loading', 'has-video');
      this.showError('The video could not be loaded');
    }, { once: true });

    this.infoBar.classList.remove('error', 'visible');
    window.clearTimeout(this.statusTimer);
    this.videoContainer.classList.add('loading');
    this.toggleSettingsMenu(false);
    this.video.src = parsedUrl.href;
    this.urlInput.value = parsedUrl.href;
    this.video.load();
  }

  async togglePictureInPicture() {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled && !this.video.disablePictureInPicture) {
        await this.video.requestPictureInPicture();
      } else {
        this.showError('Picture-in-Picture is not supported in this browser');
      }
    } catch (error) {
      this.showError('Picture-in-Picture could not be started');
    }
  }

  async toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await this.videoContainer.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      this.showError('Fullscreen could not be started');
    }
  }

  showError(message) {
    window.clearTimeout(this.statusTimer);
    this.infoBar.classList.add('visible');
    this.infoBar.classList.add('error');
    this.videoInfo.textContent = message;
  }

  showStatus(message) {
    this.infoBar.classList.remove('error');
    this.infoBar.classList.add('visible');
    this.videoInfo.textContent = message;
    window.clearTimeout(this.statusTimer);
    this.statusTimer = window.setTimeout(() => this.infoBar.classList.remove('visible'), 2200);
  }

  toggleSettingsMenu(force) {
    const shouldOpen = typeof force === 'boolean' ? force : !this.settingsMenu.classList.contains('open');
    if (shouldOpen) this.toggleSpeedPopover(false);
    this.settingsMenu.classList.toggle('open', shouldOpen);
    this.settingsMenu.setAttribute('aria-hidden', String(!shouldOpen));
    this.menuBtn.setAttribute('aria-expanded', String(shouldOpen));
    this.showOverlay(false);
  }

  togglePlayback() {
    if (!this.video.currentSrc && !this.video.src) {
      this.toggleSettingsMenu(true);
      return;
    }
    if (this.video.paused) {
      this.video.play().catch(() => this.showError('Playback could not be started'));
    } else {
      this.video.pause();
    }
  }

  seekBy(seconds) {
    if (!Number.isFinite(this.video.duration)) return;
    this.video.currentTime = Math.max(0, Math.min(this.video.duration, this.video.currentTime + seconds));
    this.showOverlay();
  }

  showOverlay(autoHide = true) {
    window.clearTimeout(this.overlayTimer);
    this.playerOverlay.classList.remove('hidden');
    if (autoHide) this.scheduleOverlayHide();
  }

  scheduleOverlayHide() {
    window.clearTimeout(this.overlayTimer);
    if (!this.video.paused && !this.settingsMenu.classList.contains('open') && !this.speedPopover.classList.contains('open')) {
      this.overlayTimer = window.setTimeout(() => this.playerOverlay.classList.add('hidden'), 2600);
    }
  }

  updateTimeline() {
    const duration = Number.isFinite(this.video.duration) ? this.video.duration : 0;
    const currentTime = Number.isFinite(this.video.currentTime) ? this.video.currentTime : 0;
    this.currentTimeLabel.textContent = this.formatTime(currentTime);
    this.durationLabel.textContent = this.formatTime(duration);
    this.progressSlider.value = duration > 0 ? (currentTime / duration) * 100 : 0;
  }

  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return hours > 0
      ? `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      : `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  toggleSpeedPopover(force) {
    const shouldOpen = typeof force === 'boolean' ? force : !this.speedPopover.classList.contains('open');
    if (shouldOpen) this.toggleSettingsMenu(false);
    this.speedPopover.classList.toggle('open', shouldOpen);
    this.speedPopover.setAttribute('aria-hidden', String(!shouldOpen));
    this.speedQuickBtn.setAttribute('aria-expanded', String(shouldOpen));
    this.showOverlay(false);
  }

  setPlaybackSpeed(speed) {
    const safeSpeed = Math.max(0.25, Math.min(3, Number(speed) || 1));
    this.video.playbackRate = safeSpeed;
    this.speedSlider.value = safeSpeed;
    this.speedPopoverSlider.value = safeSpeed;
    this.speedValue.textContent = `${safeSpeed.toFixed(2)}x`;
    this.speedPopoverValue.textContent = `${safeSpeed.toFixed(2)}x`;
    this.speedPopover.querySelectorAll('[data-speed]').forEach(button => {
      button.classList.toggle('active', Math.abs(Number(button.dataset.speed) - safeSpeed) < 0.001);
    });
    this.updateQuickSpeed(safeSpeed);
  }

  updateQuickSpeed(speed) {
    const numericSpeed = Number(speed);
    const label = Number.isInteger(numericSpeed) ? numericSpeed.toFixed(1) : String(numericSpeed);
    this.speedQuickBtn.querySelector('span').textContent = `${label}×`;
    this.speedQuickBtn.setAttribute('aria-label', `Playback speed ${label}x`);
  }

  toggleLoop() {
    this.isLooping = !this.isLooping;
    this.video.loop = this.isLooping;
    this.loopBtn.classList.toggle('active', this.isLooping);
    this.loopBtn.setAttribute('aria-pressed', String(this.isLooping));
    this.loopBtn.querySelector('span').textContent = this.isLooping ? 'Loop on' : 'Loop off';
  }

  downloadVideo() {
    const url = this.video.currentSrc || this.video.src;
    if (!url) {
      this.showError('No video loaded');
      return;
    }

    chrome.permissions.request({ permissions: ['downloads'] }, (granted) => {
      if (chrome.runtime.lastError) {
        this.showError(chrome.runtime.lastError.message);
        return;
      }
      if (!granted) {
        this.showError('Download permission was not granted');
        return;
      }

      chrome.runtime.sendMessage({
        action: 'downloadVideo',
        videoUrl: url
      }, (response) => {
        const runtimeError = chrome.runtime.lastError;
        if (runtimeError || !response?.success) {
          this.showError(runtimeError?.message || response?.error || 'Download failed');
        } else {
          this.showStatus('Download started');
        }
      });
    });
  }

  updateVideoInfo() {
    if (this.infoBar.classList.contains('visible')) return;
    this.infoBar.classList.remove('error');
    if (this.video.src) {
      const duration = this.video.duration || 0;
      const currentTime = this.video.currentTime || 0;
      const isPlaying = !this.video.paused;
      
      this.videoInfo.textContent = `${this.formatTime(currentTime)} / ${this.formatTime(duration)} | ${isPlaying ? 'Playing' : 'Paused'} | ${this.video.playbackRate}x`;
    } else {
      this.videoInfo.textContent = 'No video loaded';
    }
  }
}

// Initialize the video player when the popup is loaded
document.addEventListener('DOMContentLoaded', () => {
  new VideoPlayer();
});
