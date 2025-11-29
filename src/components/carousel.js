import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { motion, useMotionValue, animate } from 'motion/react';
// replace icons with your own if needed
import { MediaPlayer, MediaProvider } from '@vidstack/react';
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default';


import './css/carousel.css';




const DRAG_BUFFER = 100;
const VELOCITY_THRESHOLD = 300;
const GAP = 0;
const SPRING_OPTIONS = { type: 'tween', duration: 0.5, ease: 'easeOut' };

// Helper to compute the next index based on drag offset/velocity.
function getNextIndex(currentIndex, offset, velocity, length, loop) {
  if (!length) return currentIndex;

  let newIndex = currentIndex;

  // Swipe up - next item
  if (offset < -DRAG_BUFFER || velocity < -VELOCITY_THRESHOLD) {
    newIndex = loop
      ? (currentIndex + 1 + length) % length
      : Math.min(currentIndex + 1, length - 1);
  }
  // Swipe down - previous item
  else if (offset > DRAG_BUFFER || velocity > VELOCITY_THRESHOLD) {
    newIndex = loop
      ? (currentIndex - 1 + length) % length
      : Math.max(currentIndex - 1, 0);
  }

  return newIndex;
}

// Helper for autoplay index updates.
function getAutoPlayIndex(currentIndex, length, loop) {
  if (!length) return currentIndex;
  if (loop) {
    return (currentIndex + 1) % length;
  }
  return Math.min(currentIndex + 1, length - 1);
}

export default function Carousel({
  items = [],
  baseWidth = 300,
  autoplay = false,
  autoplayDelay = 3000,
  pauseOnHover = false,
  loop = false,
  round = false
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const y = useMotionValue(0);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef(null);
  const isDragging = useRef(false);
  const playerRef = useRef(null);

  const itemsLength = items.length;

  const itemHeight = useMemo(() => baseWidth, [baseWidth]);
  const trackItemOffset = useMemo(() => itemHeight, [itemHeight]);

  // Effective index using circular buffer pattern.
  const effectiveIndex = useMemo(
    () => (itemsLength ? currentIndex % itemsLength : 0),
    [currentIndex, itemsLength]
  );

  const dragConstraints = useMemo(() => {
    if (loop || itemsLength <= 1) return null;
    return {
      top: -trackItemOffset * (itemsLength - 1),
      bottom: 0
    };
  }, [loop, itemsLength, trackItemOffset]);

  const dragProps = dragConstraints ? { dragConstraints } : {};
  useEffect(() => {
    if (pauseOnHover && containerRef.current) {
      const container = containerRef.current;
      const handleMouseEnter = () => setIsHovered(true);
      const handleMouseLeave = () => setIsHovered(false);
      container.addEventListener('mouseenter', handleMouseEnter);
      container.addEventListener('mouseleave', handleMouseLeave);
      return () => {
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, [pauseOnHover]);

  useEffect(() => {
    if (!autoplay || (pauseOnHover && isHovered) || itemsLength <= 1) {
      return;
    }

    const timer = setInterval(() => {
      setCurrentIndex(prev => getAutoPlayIndex(prev, itemsLength, loop));
    }, autoplayDelay);

    return () => clearInterval(timer);
  }, [autoplay, autoplayDelay, isHovered, loop, itemsLength, pauseOnHover]);

  // Sync y position when currentIndex changes (but not during drag)
  useEffect(() => {
    if (!isDragging.current) {
      const targetY = -(effectiveIndex * trackItemOffset);
      animate(y, targetY, SPRING_OPTIONS);
    }
  }, [effectiveIndex, trackItemOffset, y]);

  const handleAnimationComplete = useCallback(() => {
    // Loop logic placeholder (kept for future extension).
  }, []);

  // Track when drag starts
  const handleDragStart = useCallback(() => {
    isDragging.current = true;
  }, []);

  // Immediate snap-to-position on drag end using helper.
  const handleDragEnd = useCallback(
    (_, info) => {
      isDragging.current = false;
      const offset = info.offset.y;
      const velocity = info.velocity.y;

      const newIndex = getNextIndex(currentIndex, offset, velocity, itemsLength, loop);

      const targetY = -((itemsLength ? newIndex % itemsLength : 0) * trackItemOffset);
      animate(y, targetY, SPRING_OPTIONS).then(() => {
        setCurrentIndex(newIndex);
      });
    },
    [currentIndex, itemsLength, loop, trackItemOffset, y]
  );

  const handleIndicatorClick = useCallback((index) => {
    setCurrentIndex(index);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`carousel-container ${round ? 'round' : ''}`}
    >
      <motion.div
        className="carousel-track"
        drag="y"
        dragElastic={0.2}
        dragMomentum={false}
        {...dragProps}
        style={{
          height: itemHeight,
          gap: `${GAP}px`,
          y
        }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onAnimationComplete={handleAnimationComplete}
      >
        {items.map((item, index) => {
          return (
            <div
              key={index}
              className={`carousel-item ${round ? 'round' : ''}`}
              style={{
                width: '100%',
                height: itemHeight,
                ...(round && { borderRadius: '50%' })
              }}
            >

              <MediaPlayer
                ref={playerRef}
                src={item}
                paused={!(index === effectiveIndex)}
                autoPlay
                muted={!(index === effectiveIndex)}
                loop={index === effectiveIndex}
                playsInline
                aspectRatio="9/16"
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'black',
                }}
                onFullscreenChange={(detail, nativeEvent) => {
                  // Exit fullscreen immediately if it was entered
                  if (detail.isFullscreen) {
                    nativeEvent.target.exitFullscreen();
                  }
                }}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('double click');
                }}
                fullscreenOrientation='portrait'
                onCanPlay={(detail, nativeEvent) => {
                  // Access qualities and set auto
                  const player = nativeEvent.target;
                  if (player && player.qualities && player.qualities.length > 0) {
                    player.qualities.autoSelect();
                  }
                }}
              >
                <MediaProvider />
                <DefaultVideoLayout icons={defaultLayoutIcons}
                slots={{
                  timeSlider: null,
                  
                }}
                noGestures
                noKeyboardAnimations
                noFullscreenButton />
              </MediaPlayer>
            </div>
          );
        })}
      </motion.div>
      <div className={`carousel-indicators-container ${round ? 'round' : ''}`}>
        <div className="carousel-indicators">
          {items.map((_, index) => (
            <motion.div
              key={index}
              className={`carousel-indicator ${effectiveIndex === index ? 'active' : 'inactive'}`}
              animate={{
                scale: effectiveIndex === index ? 1.2 : 1
              }}
              onClick={() => handleIndicatorClick(index)}
              transition={{ duration: 0.15 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
//       "https://www.youtube.com/embed/RfInag2mS5Q",
    // "https://www.youtube.com/embed/S0Lx1oBUyQA",
    // "https://www.youtube.com/embed/SUeiaOH0RV4",
    // "https://www.youtube.com/embed/SaQwk035TRA",
    // "https://www.youtube.com/embed/6VpE1BCuhoA",
    // "https://www.youtube.com/embed/94LxYCNovf4",
    // "https://www.youtube.com/embed/Ap65wTLp_7w",
    // "https://www.youtube.com/embed/CDQ-lGAXXuI",
    // "https://www.youtube.com/embed/HgOhsYQoByw",
    // "https://www.youtube.com/embed/QPDcLA5W_vE",
    // "https://www.youtube.com/embed/PddCqhZQKXE",
    // "https://www.youtube.com/embed/PddCqhZQKXE",
    // "https://www.youtube.com/embed/Qda7DmVbizc",
    // "https://www.youtube.com/embed/QyI273lJqm4",
    // "https://www.youtube.com/embed/RM2xAvcRPWQ",
    // "https://www.youtube.com/embed/RW61QmjnJs8",
    // "https://www.youtube.com/embed/RdhVFSNj910",

    // "https://www.youtube.com/embed/QST1PASFy_Y",
    // "https://www.youtube.com/embed/Ss0eAZzbEso",
    // "https://www.youtube.com/embed/Sve0SKsVn5w",
    // "https://www.youtube.com/embed/TBKjfJN7Z3E",
    // "https://www.youtube.com/embed/U6mWI6gdXeY",
    // "https://www.youtube.com/embed/VM0JnDHYzKI"