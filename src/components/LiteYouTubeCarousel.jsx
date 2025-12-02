/**
 * LITE YouTube Shorts Carousel
 * 
 * This is the FASTEST approach for YouTube videos.
 * Uses react-lite-youtube-embed for instant perceived loading.
 * 
 * How it works:
 * 1. Shows YouTube thumbnail instantly (from CDN)
 * 2. Only loads the actual iframe when user interacts
 * 3. Much better performance than loading all iframes upfront
 */

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { motion, useMotionValue, animate } from 'motion/react';
import LiteYouTubeEmbed from 'react-lite-youtube-embed';
import 'react-lite-youtube-embed/dist/LiteYouTubeEmbed.css';
import './css/liteYouTubeCarousel.css';

const DRAG_BUFFER = 80;
const VELOCITY_THRESHOLD = 200;
const SPRING_OPTIONS = { type: 'tween', duration: 0.3, ease: 'easeOut' };
const RENDER_WINDOW = 1;

// Extract YouTube video ID from various URL formats
function extractYouTubeId(url) {
  if (!url) return null;
  
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  
  const longMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{11})/);
  if (longMatch) return longMatch[1];
  
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  
  return null;
}

// Video Item with Lite YouTube
const LiteVideoItem = ({
  videoId,
  isActive,
  isVisible,
  height,
  title = 'YouTube Video',
  index,
}) => {
  const [isActivated, setIsActivated] = useState(false);
  const containerRef = useRef(null);

  // Auto-activate when becomes active
  useEffect(() => {
    if (isActive && !isActivated) {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setIsActivated(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isActive, isActivated]);

  // Reset when becomes inactive (optional - for memory optimization)
  // useEffect(() => {
  //   if (!isActive && isActivated) {
  //     setIsActivated(false);
  //   }
  // }, [isActive, isActivated]);

  if (!isVisible) {
    return (
      <div className="lite-yt-skeleton" style={{ height }}>
        <div className="lite-yt-skeleton-shimmer" />
      </div>
    );
  }

  return (
    <div 
      className="lite-yt-item-wrapper" 
      style={{ height }}
      ref={containerRef}
    >
      <div className={`lite-yt-player ${isActivated ? 'activated' : ''}`}>
        <LiteYouTubeEmbed
          id={videoId}
          title={title}
          poster="maxresdefault"
          webp={true}
          noCookie={true}
          params="autoplay=1&mute=1&loop=1&controls=0&modestbranding=1&playsinline=1&rel=0&fs=0"
          aspectHeight={16}
          aspectWidth={9}
          iframeClass="lite-yt-iframe"
          playerClass="lite-yt-player-inner"
          wrapperClass="lite-yt-wrapper"
          activatedClass="lite-yt-activated"
          announce="Watch"
          activeClass={isActive ? 'active' : ''}
        />
      </div>
      
      {/* Index indicator */}
      <div className="lite-yt-index">#{index + 1}</div>
    </div>
  );
};

// Helper to compute next index
function getNextIndex(currentIndex, offset, velocity, length) {
  if (!length) return currentIndex;
  let newIndex = currentIndex;
  if (offset < -DRAG_BUFFER || velocity < -VELOCITY_THRESHOLD) {
    newIndex = Math.min(currentIndex + 1, length - 1);
  } else if (offset > DRAG_BUFFER || velocity > VELOCITY_THRESHOLD) {
    newIndex = Math.max(currentIndex - 1, 0);
  }
  return newIndex;
}

export default function LiteYouTubeCarousel({
  items = [],
  baseWidth = 300,
  titles = [], // Optional array of titles for each video
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const y = useMotionValue(0);
  const containerRef = useRef(null);
  const isDragging = useRef(false);

  const itemHeight = baseWidth;
  const trackItemOffset = itemHeight;

  // Extract video IDs
  const videoIds = useMemo(() => {
    return items.map(extractYouTubeId).filter(Boolean);
  }, [items]);

  // Visible indices for virtualization
  const visibleIndices = useMemo(() => {
    const indices = new Set();
    for (let i = -RENDER_WINDOW; i <= RENDER_WINDOW + 1; i++) {
      const index = currentIndex + i;
      if (index >= 0 && index < videoIds.length) {
        indices.add(index);
      }
    }
    return indices;
  }, [currentIndex, videoIds.length]);

  // Sync position
  useEffect(() => {
    if (!isDragging.current) {
      const targetY = -(currentIndex * trackItemOffset);
      animate(y, targetY, SPRING_OPTIONS);
    }
  }, [currentIndex, trackItemOffset, y]);

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

  const dragConstraints = useMemo(() => ({
    top: -trackItemOffset * (videoIds.length - 1),
    bottom: 0
  }), [videoIds.length, trackItemOffset]);

  if (videoIds.length === 0) {
    return (
      <div className="lite-yt-empty">
        <span>No videos to display</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="lite-yt-container">
      <motion.div
        className="lite-yt-track"
        drag="y"
        dragElastic={0.1}
        dragMomentum={false}
        dragConstraints={dragConstraints}
        style={{ height: itemHeight, y }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {videoIds.map((videoId, index) => (
          <div
            key={`lite-${videoId}-${index}`}
            className="lite-yt-slide"
            style={{ height: itemHeight }}
          >
            <LiteVideoItem
              videoId={videoId}
              index={index}
              isActive={index === currentIndex}
              isVisible={visibleIndices.has(index)}
              height={itemHeight}
              title={titles[index] || `Video ${index + 1}`}
            />
          </div>
        ))}
      </motion.div>

      {/* Progress */}
      <div className="lite-yt-progress">
        <span>{currentIndex + 1} / {videoIds.length}</span>
      </div>

      {/* Navigation dots */}
      <div className="lite-yt-dots">
        {videoIds.slice(0, Math.min(10, videoIds.length)).map((_, i) => (
          <div 
            key={i} 
            className={`lite-yt-dot ${i === currentIndex ? 'active' : ''}`}
            onClick={() => setCurrentIndex(i)}
          />
        ))}
        {videoIds.length > 10 && <span className="lite-yt-more">+{videoIds.length - 10}</span>}
      </div>
    </div>
  );
}
