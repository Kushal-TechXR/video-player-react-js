import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Reels from '../../reels.json'

// VerticalSwipeReelsComponent.jsx
// A self-contained React component that mimics a Reels/Shorts vertical swipe UX.
// - Uses Tailwind for styling
// - Supports touch swipe up/down, mouse wheel, keyboard (ArrowUp/ArrowDown), and buttons
// - Autoplays the active YouTube embed (muted to allow autoplay in most browsers)
// - Lazy-loads iframes and shows a loading indicator
// - Preloads the next iframe to reduce perceived latency

 function VerticalSwipeReels({ videoUrls = [] }) {
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);
  const touchStartY = useRef(null);
  const touchDeltaY = useRef(0);
  const wheelTimeout = useRef(null);
  const isAnimating = useRef(false);

  useEffect(() => {
    // Keyboard navigation
    function onKey(e) {
      if (e.key === "ArrowDown") goNext();
      if (e.key === "ArrowUp") goPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index]);

  useEffect(() => {
    // reset loading when index changes
    setLoading(true);
    // preload next iframe by creating an offscreen element (simple technique)
    const nextIdx = index + 1;
    if (videoUrls[nextIdx]) {
      const tmp = document.createElement("iframe");
      tmp.src = youtubeSrc(videoUrls[nextIdx], { autoplay: 1, mute: 0 });
      tmp.style.position = "absolute";
      tmp.style.left = "-9999px";
      tmp.setAttribute("aria-hidden", "true");
      document.body.appendChild(tmp);
      // remove after a short while
      setTimeout(() => document.body.removeChild(tmp), 5000);
    }
  }, [index, videoUrls]);

  function youtubeSrc(idOrUrl, params = {}) {
    // Accept either a YouTube id or a full URL. Extract id if needed.
    const idMatch = idOrUrl.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
    const id = idMatch ? idMatch[1] : idOrUrl;
    const search = new URLSearchParams({
      autoplay: params.autoplay ?? 1,
      mute: params.mute,
      controls: params.controls ?? 0,
      modestbranding: 1,
      rel: 0,
      playsinline: 1,
      enablejsapi: 1,
    }).toString();
    return `https://www.youtube.com/embed/${id}?${search}`;
  }

  function goNext() {
    if (isAnimating.current) return;
    if (index < videoUrls.length - 1) {
      isAnimating.current = true;
      setIndex((i) => i + 1);
      // small delay to avoid rapid-fire navigation
      setTimeout(() => (isAnimating.current = false), 400);
    }
  }
  function goPrev() {
    if (isAnimating.current) return;
    if (index > 0) {
      isAnimating.current = true;
      setIndex((i) => i - 1);
      setTimeout(() => (isAnimating.current = false), 400);
    }
  }

  // Touch handlers for swipe detection
  function onTouchStart(e) {
    touchStartY.current = e.touches[0].clientY;
    touchDeltaY.current = 0;
  }
  function onTouchMove(e) {
    if (touchStartY.current == null) return;
    touchDeltaY.current = e.touches[0].clientY - touchStartY.current;
  }
  function onTouchEnd() {
    const threshold = 60; // px threshold to count as a swipe
    if (touchDeltaY.current < -threshold) goNext();
    else if (touchDeltaY.current > threshold) goPrev();
    touchStartY.current = null;
    touchDeltaY.current = 0;
  }

  // Wheel handler (debounced) for desktop scroll -> controls swipe
  function onWheel(e) {
    e.preventDefault();
    if (wheelTimeout.current) return;
    if (e.deltaY > 30) goNext();
    else if (e.deltaY < -30) goPrev();
    wheelTimeout.current = setTimeout(() => (wheelTimeout.current = null), 300);
  }

  return (
    <div
      ref={containerRef}
      className="w-screen h-screen bg-black relative overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onWheel={onWheel}
    >
      {/* top-right small controls */}
      <div className="absolute top-6 right-4 z-30 flex flex-col gap-2 items-end">
        <button
          onClick={goPrev}
          className="bg-white/10 backdrop-blur-sm text-white rounded-full p-2 shadow-md"
          aria-label="previous"
        >
          ▲
        </button>
        <button
          onClick={goNext}
          className="bg-white/10 backdrop-blur-sm text-white rounded-full p-2 shadow-md"
          aria-label="next"
        >
          ▼
        </button>
      </div>

      <AnimatePresence initial={false} mode="wait">
        {videoUrls.map((v, i) =>
          i === index ? (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.35 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-full h-full flex items-center justify-center relative">
                {/* iframe container to maintain aspect and fullscreen behavior */}
                <div className="w-full h-full flex items-center justify-center">
                  {/* Loading overlay */}
                  {loading && (
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="animate-spin w-12 h-12 border-4 border-white/30 border-t-white rounded-full" />
                    </div>
                  )}

                  <iframe
                    title={`reel-${i}`}
                    src={youtubeSrc(v, { autoplay: 1, mute: 1, controls: 0 })}
                    allow="autoplay; fullscreen; picture-in-picture"
                    className="w-full h-full min-h-[360px]"
                    frameBorder="0"
                    onLoad={() => setLoading(false)}
                  />
                </div>

                {/* bottom-left metadata / actions (example) */}
                <div className="absolute left-4 bottom-6 text-white z-30 max-w-[60%]">
                  <h3 className="text-lg font-semibold">Video {i + 1}</h3>
                  <p className="text-sm opacity-80">Swipe up or down to navigate — keyboard & wheel supported.</p>
                </div>

                {/* right-side action column */}
                <div className="absolute right-4 bottom-24 flex flex-col items-center gap-4 z-30 text-white">
                  <button className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-2xl bg-white/8 flex items-center justify-center">♥</div>
                    <span className="text-xs mt-1">Like</span>
                  </button>
                  <button className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-2xl bg-white/8 flex items-center justify-center">↗</div>
                    <span className="text-xs mt-1">Share</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ) : null
        )}
      </AnimatePresence>

      {/* footer: position indicator */}
      <div className="absolute left-0 right-0 bottom-4 flex items-center justify-center z-40">
        <div className="flex gap-2">
          {videoUrls.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-8 rounded-full ${i === index ? 'bg-white' : 'bg-white/20'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Example usage (put in your app):
// import VerticalSwipeReels from './VerticalSwipeReelsComponent';
// const urls = [
//   'https://www.youtube.com/watch?v=VIDEO_ID_1',
//   'https://www.youtube.com/watch?v=VIDEO_ID_2',
//   'VIDEO_ID_3',
// ];
// <VerticalSwipeReels videoUrls={urls} />


function App() {
  const urls = Reels.map(reel => reel.url);

  return <VerticalSwipeReels videoUrls={urls} />
}

export default App