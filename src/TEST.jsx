import { useEffect, useRef, useState, useMemo } from "react";

// Extract YouTube video ID from embed URL
function extractVideoId(url) {
  if (!url) return null;
  
  // Handle full embed URLs like https://www.youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/youtube\.com\/embed\/([^/?]+)/);
  if (embedMatch) {
    return embedMatch[1];
  }
  
  // Handle regular YouTube URLs like https://www.youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/youtube\.com\/watch\?v=([^&]+)/);
  if (watchMatch) {
    return watchMatch[1];
  }
  
  // Handle youtu.be short URLs
  const shortMatch = url.match(/youtu\.be\/([^/?]+)/);
  if (shortMatch) {
    return shortMatch[1];
  }
  
  // If it's already just a video ID, return it
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }
  
  return null;
}

export default function TEST({ videoUrls = [] }) {
  const containerRef = useRef(null);
  const players = useRef({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [apiReady, setApiReady] = useState(false);

  // Extract video IDs from embed URLs
  const videoIds = useMemo(() => {
    return videoUrls
      .map(url => extractVideoId(url))
      .filter(id => id !== null);
  }, [videoUrls]);

  // Initialize YouTube API
  useEffect(() => {
    // Check if API is already loaded
    if (window.YT && window.YT.Player) {
      setApiReady(true);
      return;
    }

    // Set up callback for when API loads
    window.onYouTubeIframeAPIReady = () => {
      setApiReady(true);
    };

    // If API script hasn't loaded yet, wait for it
    if (!window.YT) {
      const checkApi = setInterval(() => {
        if (window.YT && window.YT.Player) {
          setApiReady(true);
          clearInterval(checkApi);
        }
      }, 100);

      return () => clearInterval(checkApi);
    }
  }, []);

  // Initialize YouTube players when API is ready and videoIds are available
  useEffect(() => {
    if (!apiReady || !videoIds.length || !containerRef.current) return;

    // Clean up existing players
    Object.values(players.current).forEach((player) => {
      if (player && player.destroy) {
        try {
          player.destroy();
        } catch (e) {
          console.warn("Error destroying player:", e);
        }
      }
    });
    players.current = {};

    // Initialize new players
    videoIds.forEach((videoId, index) => {
      const el = document.getElementById(`player-${index}`);
      if (!el) return;

      try {
        players.current[index] = new window.YT.Player(el, {
          videoId: videoId,
          playerVars: {
            autoplay: 1, // Start paused, will play when visible
            controls: 0,
            mute: 0,
            playsinline: 1,
            origin: window.location.origin,
            widget_referrer: window.location.origin,
            loop: 1,
          },
        });
      } catch (error) {
        console.error(`Error initializing player ${index}:`, error);
      }
    });
  }, [apiReady, videoIds]);

  // Detect which video is visible using IntersectionObserver
  useEffect(() => {
    if (!containerRef.current || !videoIds.length) return;

    const elements = containerRef.current.querySelectorAll(".reel");
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ isIntersecting, target }) => {
          if (isIntersecting) {
            const index = Number(target.dataset.index);
            setActiveIndex(index);
          }
        });
      },
      { threshold: 0.7 }
    );

    elements.forEach((el) => observer.observe(el));
    
    return () => {
      observer.disconnect();
    };
  }, [videoIds]);

  // Auto-play the visible video, pause others
  useEffect(() => {
    if (!videoIds.length) return;

    Object.keys(players.current).forEach((key) => {
      const player = players.current[key];
      if (!player || typeof player.playVideo !== 'function' || typeof player.pauseVideo !== 'function') return;
      
      try {
        if (Number(key) === activeIndex) {
          player.playVideo();
        } else {
          player.pauseVideo();
        }
      } catch (error) {
        console.warn(`Error controlling player ${key}:`, error);
      }
    });
  }, [activeIndex, videoIds]);

  if (!videoIds.length) {
    return (
      <div style={{ 
        height: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        color: "#fff"
      }}>
        No videos available
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        height: "100vh",
        overflowY: "scroll",
        scrollSnapType: "y mandatory",
        WebkitOverflowScrolling: "touch",
        position: "relative",
      }}
    >
      {videoIds.map((videoId, index) => (
        <div
          key={`${videoId}-${index}`}
          className="reel"
          data-index={index}
          style={{
            height: "100vh",
            scrollSnapAlign: "start",
            scrollSnapStop: "always",
            position: "relative",
          }}
        >
          <div
            id={`player-${index}`}
            style={{
              width: "100%",
              height: "100%",
            }}
          />
        </div>
      ))}
    </div>
  );
}
