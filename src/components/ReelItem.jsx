import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import YouTubePlayer from './YouTubePlayer';

const ReelItem = forwardRef(function ReelItem({ videoId }, ref) {
  const playerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    play: () => playerRef.current && playerRef.current.play(),
    pause: () => playerRef.current && playerRef.current.pause(),
    unmute: () => playerRef.current && playerRef.current.unmute()
  }));

  return (
    <section className="reel-item">
      <YouTubePlayer ref={playerRef} videoId={videoId} className="yt-frame" />
    </section>
  );
});

export default ReelItem;


