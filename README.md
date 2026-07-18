# Video Assistant Browser Extension

A browser extension that adds a floating icon when videos play on web pages, similar to Samsung Browser's video assistant feature. Click the icon to open the video in a custom player with advanced controls.

## Features

- **Automatic Video Detection**: Detects HTML5 videos on any webpage
- **Floating Icon**: Shows a floating icon near playing videos
- **Custom Video Player**: Opens videos in a dedicated player with controls
- **Playback Speed Control**: Adjust playback speed from 0.25x to 3x with a linear slider
- **Volume Control**: Fine-tune volume with a slider
- **Picture-in-Picture**: Watch videos in a floating window
- **Fullscreen Mode**: Enjoy videos in fullscreen
- **Loop Toggle**: Loop videos with a single click
- **Download Support**: Download videos directly from the player
- **Beautiful UI**: Modern, gradient-based design with smooth animations

## Installation

### Chrome/Edge/Brave (Chromium-based browsers)

1. Download or clone this repository
2. Open your browser and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked"
5. Select the `video-player-extension` folder
6. The extension is now installed!

### Firefox

1. Download or clone this repository
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file in the extension folder
5. The extension is now loaded!

## Usage

1. Navigate to any webpage with HTML5 videos
2. Play a video on the page
3. A floating icon will appear near the video
4. Click the icon to open the original live video in fullscreen assistant mode
5. Use the toolbar popup for the custom URL player, speed, volume, Picture-in-Picture, looping, and downloads

### Manual Video Loading

You can also manually load videos by:
1. Clicking the extension icon in your browser toolbar
2. Pasting a video URL in the input field
3. Clicking "Load" to play the video

## Controls

- **URL Input**: Paste any video URL to load it
- **Playback Speed**: Choose from 0.25x to 2x speed
- **Volume Slider**: Adjust volume from 0-100%
- **Picture-in-Picture**: Watch in a floating window
- **Fullscreen**: Enter fullscreen mode
- **Loop**: Toggle video looping
- **Download**: Download the current video

## File Structure

```
video-player-extension/
├── manifest.json       # Extension configuration
├── content.js          # Video detection and floating icon
├── content.css         # Floating icon styling
├── popup.html          # Video player interface
├── popup.css           # Player styling
├── popup.js            # Player controls
├── background.js       # Background service worker
├── icons/              # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   └── icon.svg
└── README.md           # This file
```

## Technical Details

- **Manifest Version**: 3
- **Permissions**: activeTab, storage, <all_urls>
- **Content Scripts**: Runs on all web pages to detect videos
- **Service Worker**: Handles messaging between content script and popup

## Browser Compatibility

- Chrome/Chromium: ✅ Full support
- Edge: ✅ Full support
- Brave: ✅ Full support
- Firefox: ⚠️ Limited support (some features may not work)
- Safari: ❌ Not supported (uses different extension system)

## Development

To modify the extension:

1. Make changes to the source files
2. In Chrome, go to `chrome://extensions/`
3. Click the reload button on the Video Assistant extension card
4. Test your changes on a webpage with videos

## Known Limitations

- Some websites may block video detection due to CORS policies
- Media Source (`blob:`) streams stay in their original page and open directly in fullscreen because browsers cannot transfer page-owned blob URLs into an extension window
- Videos with DRM protection cannot be played in the custom player
- The extension requires the video URL to be accessible

## Future Enhancements

- Support for more video platforms
- Playlist support
- Keyboard shortcuts
- Custom themes
- Video history
- Bookmarking videos

## License

MIT License - Feel free to use, modify, and distribute

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.
