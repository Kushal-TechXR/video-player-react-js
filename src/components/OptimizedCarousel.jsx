import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { motion, useMotionValue, animate } from 'motion/react';
import { MediaPlayer, MediaProvider } from '@vidstack/react';
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default';
import './css/optimizedCarousel.css';

const DRAG_BUFFER = 100;
const VELOCITY_THRESHOLD = 200;
const SPRING_OPTIONS = { type: 'tween', duration: 0.35, ease: 'easeOut' };

// Number of videos to render around current (for virtualization)
const RENDER_WINDOW = 2; // Render current ± 2 = 5 videos max
const PRELOAD_AHEAD = 3; // Preload 3 videos ahead

// Video preloader - creates hidden video elements to cache videos
class VideoPreloader {
  constructor(maxCacheSize = 5) {
    this.cache = new Map();
    this.maxCacheSize = maxCacheSize;
    this.loadingPromises = new Map();
  }

  preload(url) {
    if (this.cache.has(url) || this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url) || Promise.resolve();
    }

    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;

    const promise = new Promise((resolve) => {
      const handleCanPlay = () => {
        this.cache.set(url, { video, timestamp: Date.now() });
        this.loadingPromises.delete(url);
        this.cleanup();
        resolve();
      };

      const handleError = () => {
        this.loadingPromises.delete(url);
        resolve(); // Resolve anyway to not block
      };

      video.addEventListener('canplaythrough', handleCanPlay, { once: true });
      video.addEventListener('error', handleError, { once: true });
      
      // Timeout fallback
      setTimeout(() => {
        if (this.loadingPromises.has(url)) {
          this.loadingPromises.delete(url);
          resolve();
        }
      }, 5000);
    });

    this.loadingPromises.set(url, promise);
    video.src = url;
    video.load();

    return promise;
  }

  isLoaded(url) {
    return this.cache.has(url);
  }

  cleanup() {
    if (this.cache.size > this.maxCacheSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      while (this.cache.size > this.maxCacheSize) {
        const [oldestUrl, { video }] = entries.shift();
        video.src = '';
        video.load();
        this.cache.delete(oldestUrl);
      }
    }
  }

  clear() {
    this.cache.forEach(({ video }) => {
      video.src = '';
      video.load();
    });
    this.cache.clear();
    this.loadingPromises.clear();
  }
}

// Singleton preloader instance
const preloader = new VideoPreloader(8);

// Skeleton Loading Component
const VideoSkeleton = ({ height }) => (
  <div className="video-skeleton" style={{ height }}>
    <div className="skeleton-shimmer" />
    <div className="skeleton-content">
      <div className="skeleton-icon">
        <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </div>
  </div>
);

// Optimized Video Item Component
const VideoItem = ({
  url,
  isActive,
  isVisible,
  height,
  onReady,
  onError,
  playerRef
}) => {
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const localPlayerRef = useRef(null);

  // Use provided ref or local ref
  const effectiveRef = playerRef || localPlayerRef;

  const handleCanPlay = useCallback((detail, nativeEvent) => {
    setIsReady(true);
    onReady?.();

    const player = nativeEvent.target;
    const qualities = player?.qualities;

    if (!qualities || qualities.length === 0) return;

    // Select optimal quality based on device
    let targetIndex = 0;
    if (qualities.length === 1) {
      targetIndex = 0;
    } else if (qualities.length === 2) {
      targetIndex = 1; // Lower quality for faster loading
    } else {
      targetIndex = Math.floor(qualities.length / 2);
    }

    try {
      qualities.selectedIndex = targetIndex;
    } catch (e) {
      console.warn('Could not set quality:', e);
    }
  }, [onReady]);

  const handleError = useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  const handleFullscreenChange = useCallback((detail, nativeEvent) => {
    if (detail.isFullscreen) {
      nativeEvent.target.exitFullscreen?.();
    }
  }, []);

  // Don't render if not visible (virtualization)
  if (!isVisible) {
    return <VideoSkeleton height={height} />;
  }

  if (hasError) {
    return (
      <div className="video-error" style={{ height }}>
        <span>Failed to load video</span>
      </div>
    );
  }

  return (
    <div className="video-wrapper" style={{ height }}>
      {!isReady && <VideoSkeleton height={height} />}
      <div 
        className={`video-player-container ${isReady ? 'ready' : 'loading'}`}
        style={{ height }}
      >
        <MediaPlayer
          ref={effectiveRef}
          src={url}
          paused={!isActive}
          autoPlay={isActive}
          muted={!isActive}
          loop
          playsInline
          preload={isActive ? 'auto' : 'metadata'}
          aspectRatio="9/16"
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: 'transparent',
          }}
          onCanPlay={handleCanPlay}
          onError={handleError}
          onFullscreenChange={handleFullscreenChange}
          fullscreenOrientation="portrait"
        >
          <MediaProvider />
          <DefaultVideoLayout 
            icons={defaultLayoutIcons}
            slots={{
              timeSlider: null,
            }}
            noGestures
            noKeyboardAnimations
            noFullscreenButton
          />
        </MediaPlayer>
      </div>
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

export default function OptimizedCarousel({
  items = [],
  baseWidth = 300,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadedVideos, setLoadedVideos] = useState(new Set([0]));
  const y = useMotionValue(0);
  const containerRef = useRef(null);
  const isDragging = useRef(false);
  const playerRefs = useRef({});

  const itemsLength = items.length;
  const itemHeight = baseWidth;
  const trackItemOffset = itemHeight;

  // Calculate which items should be rendered (virtualization window)
  const visibleIndices = useMemo(() => {
    const indices = new Set();
    for (let i = -RENDER_WINDOW; i <= RENDER_WINDOW; i++) {
      const index = currentIndex + i;
      if (index >= 0 && index < itemsLength) {
        indices.add(index);
      }
    }
    return indices;
  }, [currentIndex, itemsLength]);

  // Preload upcoming videos
  useEffect(() => {
    const preloadVideos = async () => {
      const indicesToPreload = [];
      
      // Preload ahead
      for (let i = 1; i <= PRELOAD_AHEAD; i++) {
        const nextIndex = currentIndex + i;
        if (nextIndex < itemsLength && items[nextIndex]) {
          indicesToPreload.push(nextIndex);
        }
      }
      
      // Also preload one behind
      const prevIndex = currentIndex - 1;
      if (prevIndex >= 0 && items[prevIndex]) {
        indicesToPreload.push(prevIndex);
      }

      // Preload current first
      if (items[currentIndex]) {
        await preloader.preload(items[currentIndex]);
      }

      // Then preload others in parallel
      await Promise.all(
        indicesToPreload.map(idx => preloader.preload(items[idx]))
      );

      // Update loaded state
      setLoadedVideos(prev => {
        const newSet = new Set(prev);
        indicesToPreload.forEach(idx => newSet.add(idx));
        newSet.add(currentIndex);
        return newSet;
      });
    };

    preloadVideos();
  }, [currentIndex, items, itemsLength]);

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
      preloader.clear();
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

      const newIndex = getNextIndex(currentIndex, offset, velocity, itemsLength);
      const targetY = -(newIndex * trackItemOffset);

      animate(y, targetY, SPRING_OPTIONS).then(() => {
        if (newIndex !== currentIndex) {
          setCurrentIndex(newIndex);
        }
      });
    },
    [currentIndex, itemsLength, trackItemOffset, y]
  );

  const handleVideoReady = useCallback((index) => {
    setLoadedVideos(prev => {
      const newSet = new Set(prev);
      newSet.add(index);
      return newSet;
    });
  }, []);

  const dragConstraints = useMemo(() => ({
    top: -trackItemOffset * (itemsLength - 1),
    bottom: 0
  }), [itemsLength, trackItemOffset]);

  return (
    <div ref={containerRef} className="optimized-carousel-container">
      <motion.div
        className="optimized-carousel-track"
        drag="y"
        dragElastic={0.15}
        dragMomentum={false}
        dragConstraints={dragConstraints}
        style={{
          height: itemHeight,
          y
        }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {items.map((url, index) => {
          const isVisible = visibleIndices.has(index);
          const isActive = index === currentIndex;
          const isPreloaded = loadedVideos.has(index);

          return (
            <div
              key={`video-${index}`}
              className="optimized-carousel-item"
              style={{
                height: itemHeight,
              }}
            >
              <VideoItem
                url={url}
                isActive={isActive}
                isVisible={isVisible || isPreloaded}
                height={itemHeight}
                onReady={() => handleVideoReady(index)}
                playerRef={(ref) => {
                  if (ref) playerRefs.current[index] = ref;
                }}
              />
            </div>
          );
        })}
      </motion.div>

      {/* Progress indicator */}
      <div className="progress-indicator">
        <div className="progress-text">
          {currentIndex + 1} / {itemsLength}
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ 
              width: `${((currentIndex + 1) / itemsLength) * 100}%` 
            }}
          />
        </div>
      </div>

      {/* Swipe hint for first video */}
      {currentIndex === 0 && (
        <div className="swipe-hint">
          <div className="swipe-arrow">↑</div>
          <span>Swipe up for more</span>
        </div>
      )}
    </div>
  );
}
