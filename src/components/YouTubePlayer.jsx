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
        autoplay: 0,
        mute: 0,
        controls: 0,
        playsinline: 0,
        modestbranding: 0,
        rel: 0,
        iv_load_policy: 3, 
        fs: 0,
        disablekb: 1,
        loop: 1,
        // playlist: videoId, 
        origin: window.location.origin
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


