import React, { useEffect, useMemo, useRef } from 'react';
import data from '../data/reels.json';
import useActiveIndex from '../hooks/useActiveIndex';
import ReelItem from './ReelItem';

export default function ReelsFeed() {
  const itemRefs = useRef([]);
  const playerRefs = useRef([]);

  // Build videos list from URL (?ids=a,b,c or ?id=a), fallback to data
  const videos = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const idsParam = params.get('ids');
    const idParam = params.get('id');
    if (idsParam) {
      const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
      if (ids.length > 0) return ids.map((id) => ({ id }));
    }
    if (idParam) {
      return [{ id: idParam }];
    }
    return data;
  }, []);

  // Ensure refs array length matches videos
  useMemo(() => {
    itemRefs.current = videos.map((_, i) => itemRefs.current[i] || null);
    playerRefs.current = videos.map((_, i) => playerRefs.current[i] || null);
  }, [videos]);

  const activeIndex = useActiveIndex(itemRefs, { threshold: 0.6 });

  useEffect(() => {
    // Pause all, play active
    playerRefs.current.forEach((ref, idx) => {
      if (ref && typeof ref.pause === 'function') ref.pause();
      if (idx === activeIndex && ref && typeof ref.play === 'function') {
        ref.play();
      }
    });
  }, [activeIndex]);

  return (
    <main className="reels-container">
      {videos.map((item, idx) => (
        <div
          key={item.id}
          data-index={idx}
          ref={(el) => (itemRefs.current[idx] = el)}
          className="reel-item"
        >
          <ReelItem
            videoId={item.id}
            ref={(el) => (playerRefs.current[idx] = el)}
          />
        </div>
      ))}
    </main>
  );
}


