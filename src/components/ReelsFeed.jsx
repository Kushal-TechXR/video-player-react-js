import React, { useMemo } from 'react';
import ReelItem from './ReelItem';

export default function ReelsFeed() {
  // Get video ID from URL parameter
  const videoId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
  }, []);

  if (!videoId) {
    return <main className="reels-container">Please provide a video ID in the URL (?id=VIDEO_ID)</main>;
  }

  return (
    <main className="reels-container">
      <div className="reel-item">
        <ReelItem videoId={videoId} />
      </div>
    </main>
  );
}


