import React, { useEffect, useImperativeHandle, useRef, forwardRef, useState } from 'react';

// Loads the YouTube IFrame API once per app
function useYouTubeApi() {
  const [ready, setReady] = useState(() => !!(window.YT && window.YT.Player));

  useEffect(() => {
    if (ready) return;
    const onReady = () => setReady(true);
    if (window.YT && window.YT.Player) {
      setReady(true);
      return;
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      if (typeof prev === 'function') prev();
      onReady();
    };
    if (!document.getElementById('youtube-iframe-api')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.id = 'youtube-iframe-api';
      document.body.appendChild(tag);
    }
  }, [ready]);

  return ready;
}

const YouTubePlayer = forwardRef(function YouTubePlayer(
  { videoId, className, onReady: onPlayerReady },
  ref
) {
  const apiReady = useYouTubeApi();
  const containerRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    if (!apiReady || !containerRef.current || playerRef.current) return;

    playerRef.current = new window.YT.Player(containerRef.current, {
      width: '100%',
      height: '100%',
      videoId,
      playerVars: {
        autoplay: 1,            // Automatically start playing the video when the player loads (1 = enabled)
        mute: 0,                // Do not mute the video on start (0 = sound on)
        controls: 0,            // Hide the player controls (0 = no controls)
        playsinline: 1,         // Play the video inline on mobile devices instead of fullscreen (1 = inline)
        modestbranding: 0,      // Display the standard YouTube branding (0 = show logo in video)
        rel: 0,                 // Do not show related videos from other channels at the end (0 = related videos from same channel only)
        iv_load_policy: 3,      // Hide video annotations by default (3 = annotations off)
        fs: 1,                  // Allow the fullscreen button to appear and be used (1 = allowed)
        disablekb: 1,           // Disable keyboard controls to interact with the player (1 = disabled)
        loop: 1,                // Enable looping of the video (1 = loop enabled)
        // playlist: videoId,   // (commented out) Would be used for looping the current video
        origin: window.location.origin // Set the origin for security and to enable certain features (identifies the site)
      },
      events: {
        onReady: (e) => {
          // Play video with audio enabled
          try {
            e.target.playVideo();
          } catch (_) {}
          if (onPlayerReady) onPlayerReady(e);
        }
      }
    });

    return () => {
      try {
        playerRef.current && playerRef.current.destroy();
      } catch (_) {}
      playerRef.current = null;
    };
  }, [apiReady, videoId, onPlayerReady]);

  useEffect(() => {
    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.action === 'play' && playerRef.current) {
          playerRef.current.playVideo();
        } else if (data.action === 'pause' && playerRef.current) {
          playerRef.current.pauseVideo();
        }
      } catch (e) {
        // Ignore non-JSON messages
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Handle click events to toggle play/pause
  useEffect(() => {
    const handleClick = () => {
      if (!playerRef.current) return;
      try {
        const playerState = playerRef.current.getPlayerState();
        // PlayerState: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
        if (playerState === 1) {
          playerRef.current.pauseVideo();
        } else if (playerState === 2 || playerState === -1 || playerState === 0 || playerState === 5) {
          playerRef.current.playVideo();
        }
      } catch (_) {}
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('click', handleClick);
      return () => {
        container.removeEventListener('click', handleClick);
      };
    }
  }, []);

  // Handle visibility change events (pause when tab is hidden, resume when visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!playerRef.current) return;
      try {
        if (document.hidden) {
          playerRef.current.pauseVideo();
        } else {
          const playerState = playerRef.current.getPlayerState();
          // Only resume if it was playing before
          if (playerState === 2) {
            playerRef.current.playVideo();
          }
        }
      } catch (_) {}
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useImperativeHandle(ref, () => ({
    play: () => {
      if (!playerRef.current) return;
      try {
        playerRef.current.playVideo();
      } catch (_) {}
    },
    pause: () => {
      if (!playerRef.current) return;
      try {
        playerRef.current.pauseVideo();
      } catch (_) {}
    },
    unmute: () => {
      if (!playerRef.current) return;
      try {
        playerRef.current.unMute();
      } catch (_) {}
    }
  }), []);

  return (
    <div
      ref={containerRef}
      className={className}
      title="YouTube video player"
      role="region"
      aria-label="YouTube video"
    />
  );
});

export default YouTubePlayer;


