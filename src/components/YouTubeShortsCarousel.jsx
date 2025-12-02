import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { motion, useMotionValue, animate } from 'motion/react';
import './css/youtubeShortsCarousel.css';

const DRAG_BUFFER = 80;
const VELOCITY_THRESHOLD = 200;
const SPRING_OPTIONS = { type: 'tween', duration: 0.3, ease: 'easeOut' };
const RENDER_WINDOW = 1; // Only render current ± 1 for performance
const PRELOAD_AHEAD = 2; // Preload 2 videos ahead

// Extract YouTube video ID from various URL formats
function extractYouTubeId(url) {
  if (!url) return null;
  
  // Handle youtu.be short links
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  
  // Handle youtube.com/watch?v= and youtube.com/shorts/
  const longMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{11})/);
  if (longMatch) return longMatch[1];
  
  // Handle direct video IDs
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  
  return null;
}

// Get high-quality thumbnail URL
function getThumbnailUrl(videoId, quality = 'maxresdefault') {
  // YouTube thumbnail quality options: default, mqdefault, hqdefault, sddefault, maxresdefault
  return `https://i.ytimg.com/vi/${videoId}/${quality}.jpg`;
}

// YouTube IFrame API Manager - Singleton
class YouTubeAPIManager {
  constructor() {
    this.isLoaded = false;
    this.isLoading = false;
    this.callbacks = [];
    this.players = new Map();
  }

  load() {
    if (this.isLoaded) {
      return Promise.resolve();
    }

    if (this.isLoading) {
      return new Promise((resolve) => this.callbacks.push(resolve));
    }

    this.isLoading = true;

    return new Promise((resolve) => {
      this.callbacks.push(resolve);

      // Create script tag
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      
      // Setup callback
      window.onYouTubeIframeAPIReady = () => {
        this.isLoaded = true;
        this.isLoading = false;
        this.callbacks.forEach(cb => cb());
        this.callbacks = [];
      };

      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    });
  }

  createPlayer(containerId, videoId, options = {}) {
    if (!this.isLoaded || !window.YT) {
      console.warn('YouTube API not loaded yet');
      return null;
    }

    const player = new window.YT.Player(containerId, {
      videoId,
      playerVars: {
        autoplay: 0,
        controls: 0, // No controls for cleaner look
        disablekb: 1,
        fs: 0, // No fullscreen button
        iv_load_policy: 3, // No annotations
        loop: 1,
        modestbranding: 1,
        playsinline: 1, // Important for mobile
        rel: 0, // No related videos
        showinfo: 0,
        mute: 1, // Start muted for autoplay
        origin: window.location.origin,
        enablejsapi: 1,
      },
      events: {
        onReady: options.onReady,
        onStateChange: options.onStateChange,
        onError: options.onError,
      },
    });

    this.players.set(containerId, player);
    return player;
  }

  getPlayer(containerId) {
    return this.players.get(containerId);
  }

  destroyPlayer(containerId) {
    const player = this.players.get(containerId);
    if (player) {
      try {
        player.destroy();
      } catch (e) {
        // Ignore destroy errors
      }
      this.players.delete(containerId);
    }
  }

  destroyAll() {
    this.players.forEach((player, id) => {
      try {
        player.destroy();
      } catch (e) {}
    });
    this.players.clear();
  }
}

const ytManager = new YouTubeAPIManager();

// Thumbnail Facade Component - Shows before player loads
const YouTubeFacade = ({ videoId, onClick, isLoading }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgSrc, setImgSrc] = useState(() => getThumbnailUrl(videoId, 'maxresdefault'));

  const handleImgError = useCallback(() => {
    // Fallback to lower quality thumbnail if maxres fails
    if (imgSrc.includes('maxresdefault')) {
      setImgSrc(getThumbnailUrl(videoId, 'hqdefault'));
    }
  }, [imgSrc, videoId]);

  return (
    <div className="youtube-facade" onClick={onClick}>
      <img
        src={imgSrc}
        alt=""
        className={`facade-thumbnail ${imgLoaded ? 'loaded' : ''}`}
        onLoad={() => setImgLoaded(true)}
        onError={handleImgError}
        loading="eager"
      />
      
      {/* Play button overlay */}
      <div className={`facade-overlay ${isLoading ? 'loading' : ''}`}>
        {isLoading ? (
          <div className="facade-spinner" />
        ) : (
          <div className="facade-play-button">
            <svg viewBox="0 0 68 48" width="68" height="48">
              <path 
                className="play-button-bg" 
                d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" 
                fill="#FF0000"
              />
              <path d="M45,24L27,14v20" fill="#fff" />
            </svg>
          </div>
        )}
      </div>

      {/* Gradient overlay for better visibility */}
      <div className="facade-gradient" />
    </div>
  );
};

// YouTube Player Component
const YouTubePlayer = ({
  videoId,
  isActive,
  isVisible,
  height,
  onReady,
  index,
  isMuted,
  onToggleMute,
}) => {
  const [playerState, setPlayerState] = useState('facade'); // facade, loading, ready, error
  const [player, setPlayer] = useState(null);
  const containerRef = useRef(null);
  const playerIdRef = useRef(`yt-player-${videoId}-${index}-${Date.now()}`);

  // Load YouTube API on mount
  useEffect(() => {
    ytManager.load();
  }, []);

  // Handle facade click - start loading player
  const handleFacadeClick = useCallback(() => {
    if (playerState !== 'facade') return;
    setPlayerState('loading');
  }, [playerState]);

  // Auto-load for active video
  useEffect(() => {
    if (isActive && playerState === 'facade') {
      setPlayerState('loading');
    }
  }, [isActive, playerState]);

  // Create player when loading state is triggered
  useEffect(() => {
    if (playerState !== 'loading' || !isVisible) return;

    const createPlayer = async () => {
      await ytManager.load();
      
      if (!containerRef.current) return;

      const newPlayer = ytManager.createPlayer(playerIdRef.current, videoId, {
        onReady: (event) => {
          setPlayer(event.target);
          setPlayerState('ready');
          onReady?.();
          
          // Auto-play if active
          if (isActive) {
            event.target.playVideo();
            if (!isMuted) {
              event.target.unMute();
            }
          }
        },
        onStateChange: (event) => {
          // Loop video when it ends
          if (event.data === window.YT?.PlayerState?.ENDED) {
            event.target.seekTo(0);
            event.target.playVideo();
          }
        },
        onError: () => {
          setPlayerState('error');
        },
      });
    };

    createPlayer();

    return () => {
      ytManager.destroyPlayer(playerIdRef.current);
    };
  }, [playerState, videoId, isActive, isVisible, onReady, isMuted]);

  // Control playback based on active state
  useEffect(() => {
    if (!player || playerState !== 'ready') return;

    try {
      if (isActive) {
        player.playVideo();
        if (!isMuted) {
          player.unMute();
        } else {
          player.mute();
        }
      } else {
        player.pauseVideo();
        player.mute();
      }
    } catch (e) {
      // Player might be destroyed
    }
  }, [isActive, player, playerState, isMuted]);

  // Handle mute toggle
  useEffect(() => {
    if (!player || playerState !== 'ready' || !isActive) return;
    
    try {
      if (isMuted) {
        player.mute();
      } else {
        player.unMute();
      }
    } catch (e) {}
  }, [isMuted, player, playerState, isActive]);

  // Don't render if not visible
  if (!isVisible) {
    return (
      <div className="youtube-skeleton" style={{ height }}>
        <div className="skeleton-shimmer" />
      </div>
    );
  }

  return (
    <div className="youtube-player-wrapper" style={{ height }} ref={containerRef}>
      {/* Show facade until player is ready */}
      {playerState !== 'ready' && (
        <YouTubeFacade 
          videoId={videoId} 
          onClick={handleFacadeClick}
          isLoading={playerState === 'loading'}
        />
      )}

      {/* Player container - hidden until ready */}
      {(playerState === 'loading' || playerState === 'ready') && (
        <div 
          className={`youtube-player-container ${playerState === 'ready' ? 'visible' : ''}`}
          style={{ height }}
        >
          <div id={playerIdRef.current} className="youtube-iframe-container" />
        </div>
      )}

      {/* Mute button */}
      {playerState === 'ready' && isActive && (
        <button 
          className="mute-button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleMute?.();
          }}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
          )}
        </button>
      )}

      {/* Error state */}
      {playerState === 'error' && (
        <div className="youtube-error">
          <span>Failed to load video</span>
        </div>
      )}
    </div>
  );
};

// Helper to compute the next index based on drag offset/velocity
function getNextIndex(currentIndex, offset, velocity, length) {
  if (!length) return currentIndex;

  let newIndex = currentIndex;

  // Swipe up - next item
  if (offset < -DRAG_BUFFER || velocity < -VELOCITY_THRESHOLD) {
    newIndex = Math.min(currentIndex + 1, length - 1);
  }
  // Swipe down - previous item
  else if (offset > DRAG_BUFFER || velocity > VELOCITY_THRESHOLD) {
    newIndex = Math.max(currentIndex - 1, 0);
  }

  return newIndex;
}

export default function YouTubeShortsCarousel({
  items = [], // Array of YouTube URLs or video IDs
  baseWidth = 300,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const y = useMotionValue(0);
  const containerRef = useRef(null);
  const isDragging = useRef(false);

  const itemsLength = items.length;
  const itemHeight = baseWidth;
  const trackItemOffset = itemHeight;

  // Extract video IDs from URLs
  const videoIds = useMemo(() => {
    return items.map(extractYouTubeId).filter(Boolean);
  }, [items]);

  // Calculate which items should be rendered (virtualization)
  const visibleIndices = useMemo(() => {
    const indices = new Set();
    for (let i = -RENDER_WINDOW; i <= RENDER_WINDOW + PRELOAD_AHEAD; i++) {
      const index = currentIndex + i;
      if (index >= 0 && index < videoIds.length) {
        indices.add(index);
      }
    }
    return indices;
  }, [currentIndex, videoIds.length]);

  // Sync y position when currentIndex changes
  useEffect(() => {
    if (!isDragging.current) {
      const targetY = -(currentIndex * trackItemOffset);
      animate(y, targetY, SPRING_OPTIONS);
    }
  }, [currentIndex, trackItemOffset, y]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      ytManager.destroyAll();
    };
  }, []);

  const handleDragStart = useCallback(() => {
    isDragging.current = true;
  }, []);

  const handleDragEnd = useCallback(
    (_, info) => {
      isDragging.current = false;
      const offset = info.offset.y;
      const velocity = info.velocity.y;

      const newIndex = getNextIndex(currentIndex, offset, velocity, videoIds.length);
      const targetY = -(newIndex * trackItemOffset);

      animate(y, targetY, SPRING_OPTIONS).then(() => {
        if (newIndex !== currentIndex) {
          setCurrentIndex(newIndex);
        }
      });
    },
    [currentIndex, videoIds.length, trackItemOffset, y]
  );

  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const dragConstraints = useMemo(() => ({
    top: -trackItemOffset * (videoIds.length - 1),
    bottom: 0
  }), [videoIds.length, trackItemOffset]);

  if (videoIds.length === 0) {
    return (
      <div className="youtube-shorts-empty">
        <span>No videos to display</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="youtube-shorts-container">
      <motion.div
        className="youtube-shorts-track"
        drag="y"
        dragElastic={0.1}
        dragMomentum={false}
        dragConstraints={dragConstraints}
        style={{
          height: itemHeight,
          y
        }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {videoIds.map((videoId, index) => {
          const isVisible = visibleIndices.has(index);
          const isActive = index === currentIndex;

          return (
            <div
              key={`yt-${videoId}-${index}`}
              className="youtube-shorts-item"
              style={{ height: itemHeight }}
            >
              <YouTubePlayer
                videoId={videoId}
                index={index}
                isActive={isActive}
                isVisible={isVisible}
                height={itemHeight}
                isMuted={isMuted}
                onToggleMute={handleToggleMute}
              />
            </div>
          );
        })}
      </motion.div>

      {/* Progress indicator */}
      <div className="yt-progress-indicator">
        <div className="yt-progress-text">
          {currentIndex + 1} / {videoIds.length}
        </div>
        <div className="yt-progress-bar">
          <div 
            className="yt-progress-fill"
            style={{ 
              width: `${((currentIndex + 1) / videoIds.length) * 100}%` 
            }}
          />
        </div>
      </div>

      {/* Swipe hint for first video */}
      {currentIndex === 0 && (
        <div className="yt-swipe-hint">
          <div className="yt-swipe-arrow">↑</div>
          <span>Swipe up for more</span>
        </div>
      )}

      {/* Tap to unmute hint */}
      {isMuted && currentIndex === 0 && (
        <div className="yt-mute-hint">
          <span>Tap 🔊 to unmute</span>
        </div>
      )}
    </div>
  );
}
