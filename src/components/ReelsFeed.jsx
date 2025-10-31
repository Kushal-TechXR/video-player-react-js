import React, { useMemo } from 'react';
import ReelItem from './ReelItem';

export default function ReelsFeed() {
  // Get video ID and autoplay from URL parameters
  const { videoId, autoplay } = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const autoplayParam = params.get('autoplay');
    return {
      videoId: id,
      autoplay: autoplayParam === 'true'
    };
  }, []);

  if (!videoId) {
    return <main className="reels-container">Please provide a video ID in the URL (?id=VIDEO_ID)</main>;
  }

  return (
    <main className="reels-container">
      <div className="reel-item">
        <ReelItem videoId={videoId} autoplay={autoplay} />
      </div>
    </main>
  );
}


