import { useEffect, useState } from 'react';

export default function useActiveIndex(itemRefs, { threshold = 0.6 } = {}) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const nodes = itemRefs.current ? itemRefs.current : [];
    if (!nodes || nodes.length === 0) return;

    const visibility = new Map();

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = Number(entry.target.getAttribute('data-index'));
          visibility.set(idx, entry.intersectionRatio);
        });
        let bestIdx = 0;
        let bestRatio = 0;
        visibility.forEach((ratio, idx) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestIdx = idx;
          }
        });
        if (bestRatio >= threshold) {
          setActiveIndex(bestIdx);
        }
      },
      { root: null, rootMargin: '0px', threshold: buildThresholdList() }
    );

    nodes.forEach((node, idx) => {
      if (node) io.observe(node);
    });

    return () => io.disconnect();
  }, [itemRefs, threshold]);

  return activeIndex;
}

function buildThresholdList() {
  const thresholds = [];
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    thresholds.push(i / steps);
  }
  return thresholds;
}


