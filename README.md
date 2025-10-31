# Video Player React.js

A modern, lightweight React application for playing YouTube videos with interactive controls and event handling. This project provides a single-video player with click, visibility, and postMessage event support.

## 🎯 Features

- **YouTube Video Integration**: Seamless integration with YouTube IFrame API
- **Interactive Controls**: Click to play/pause functionality
- **Smart Event Handling**: 
  - Click events for play/pause toggle
  - Visibility change events (auto-pause when tab is hidden)
  - PostMessage API support for external control
- **Audio Enabled**: Plays videos with sound enabled
- **Autoplay Support**: Automatically starts playing when video loads
- **Loop Playback**: Videos automatically loop when finished
- **Mobile Optimized**: Full-screen, touch-friendly interface

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn package manager
- A modern web browser

## 🚀 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd video-player-react-js
```

2. Install dependencies:
```bash
npm install
```

## 💻 Usage

### Starting the Development Server

```bash
npm start
```

The application will open at [http://localhost:3000](http://localhost:3000)

### Playing a Video

To play a YouTube video, add the video ID as a URL parameter:

```
http://localhost:3000/?id=YOUR_VIDEO_ID
```

**Example:**
```
http://localhost:3000/?id=kxOuG8jMIgI
```

If no video ID is provided, you'll see a message prompting you to add one.

## 📁 Project Structure

```
video-player-react-js/
├── public/                 # Static files
├── src/
│   ├── components/         # React components
│   │   ├── YouTubePlayer.jsx   # Main YouTube player component
│   │   ├── ReelItem.jsx        # Video item wrapper
│   │   └── ReelsFeed.jsx       # Main feed component (handles URL params)
│   ├── hooks/              # Custom React hooks
│   │   └── useActiveIndex.js   # (Currently unused after simplification)
│   ├── data/               # Data files
│   │   └── reels.json          # Sample video data (not currently used)
│   ├── styles/             # CSS styles
│   │   └── reels.css           # Main styling
│   ├── App.js              # Root component
│   └── index.js            # Entry point
├── package.json            # Dependencies and scripts
└── README.md              # This file
```

## 🧩 Components

### YouTubePlayer (`src/components/YouTubePlayer.jsx`)

The core video player component that wraps the YouTube IFrame API.

**Features:**
- Loads YouTube IFrame API dynamically
- Creates and manages YouTube player instance
- Handles multiple event types
- Provides imperative handle methods for external control

**Props:**
- `videoId` (string, required): YouTube video ID to play
- `className` (string, optional): CSS class name for styling
- `onReady` (function, optional): Callback when player is ready

**Ref Methods:**
- `play()`: Start playing the video
- `pause()`: Pause the video
- `unmute()`: Unmute the video

**Player Configuration:**
```javascript
{
  autoplay: 1,        // Auto-play when loaded
  mute: 0,            // Audio enabled
  controls: 0,        // Hide YouTube controls
  loop: 1,            // Loop video
  disablekb: 1,       // Disable keyboard controls
  fs: 0,              // Disable fullscreen button
  rel: 0,             // Don't show related videos
  iv_load_policy: 3,  // Hide annotations
}
```

### ReelsFeed (`src/components/ReelsFeed.jsx`)

Main container component that handles URL parameters and renders the video player.

**Functionality:**
- Reads video ID from URL parameter (`?id=VIDEO_ID`)
- Renders a single video player
- Displays error message if no video ID is provided

### ReelItem (`src/components/ReelItem.jsx`)

Wrapper component that connects the YouTube player with ref forwarding.

**Props:**
- `videoId` (string, required): YouTube video ID

## 🎮 Event System

The player supports three types of events:

### 1. Click Events

Click anywhere on the video player to toggle play/pause.

**Behavior:**
- If playing → pauses
- If paused/unstarted/ended → plays

**Implementation:** Event listener attached to the player container

### 2. Visibility Change Events

Automatically pauses the video when the browser tab becomes hidden and resumes when visible (if it was paused).

**Use Cases:**
- Better battery management
- Prevents background playback
- Better user experience

**Implementation:** Listens to `document.visibilitychange` event

### 3. PostMessage Events

Control the player from external scripts or iframes via postMessage API.

**Usage in Browser Console:**
```javascript
// Play video
window.postMessage(JSON.stringify({action: 'play'}), '*');

// Pause video
window.postMessage(JSON.stringify({action: 'pause'}), '*');
```

**Message Format:**
```json
{
  "action": "play" | "pause"
}
```

## 🎨 Styling

The application uses a minimal, full-screen design optimized for video playback:

- **Full-screen layout**: Videos fill the entire viewport
- **Black background**: Cinema-style viewing experience
- **Mobile support**: Includes safe area insets for iOS devices
- **Scroll snap**: Smooth scrolling (if multiple videos in future)

Main styles are defined in `src/styles/reels.css`.

## 🛠️ Development

### Available Scripts

#### `npm start`
Runs the app in development mode with hot reloading.

#### `npm test`
Launches the test runner in interactive watch mode.

#### `npm run build`
Creates an optimized production build in the `build` folder.

#### `npm run eject`
⚠️ **One-way operation**: Ejects from Create React App. Gives full control over configuration.

### Testing Events in Browser

1. **Open Developer Tools**: Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
2. **Go to Console tab**
3. **Test PostMessage events:**
   ```javascript
   // Play
   window.postMessage(JSON.stringify({action: 'play'}), '*');
   
   // Pause
   window.postMessage(JSON.stringify({action: 'pause'}), '*');
   ```
4. **Test Click events**: Click directly on the video player
5. **Test Visibility events**: Switch browser tabs

## 🔧 Configuration

### Changing Player Settings

Edit `src/components/YouTubePlayer.jsx` to modify player behavior:

```javascript
playerVars: {
  autoplay: 1,        // Change to 0 to disable autoplay
  mute: 0,            // Change to 1 to mute by default
  controls: 0,        // Change to 1 to show YouTube controls
  loop: 1,            // Change to 0 to disable looping
  // ... other settings
}
```

### Modifying Styling

Edit `src/styles/reels.css` to customize the appearance.

## 📦 Dependencies

- **React** (^19.2.0): UI library
- **React DOM** (^19.2.0): React DOM renderer
- **React Scripts** (5.0.1): Build tools and configuration

## 🌐 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 📝 Notes

- **Autoplay Policy**: Some browsers may block autoplay with sound. User interaction may be required for autoplay to work.
- **YouTube API**: The YouTube IFrame API is loaded dynamically when the component mounts.
- **Single Video Mode**: Currently configured to play only one video at a time based on URL parameter.

## 🐛 Troubleshooting

### Video doesn't autoplay
- Some browsers require user interaction before allowing autoplay with sound
- Check browser autoplay settings
- Try clicking on the page first

### PostMessage not working
- Ensure message format is correct: `JSON.stringify({action: 'play'})`
- Check browser console for errors
- Verify message origin matches (using '*' allows all origins)

### Player not loading
- Check if YouTube IFrame API is accessible
- Verify video ID is correct and video is accessible
- Check browser console for errors

## 📄 License

See [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For questions or support, please open an issue in the repository.

---

Built with ❤️ using React and YouTube IFrame API
