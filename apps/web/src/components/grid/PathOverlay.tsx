import { useLayoutEffect, useState } from 'react';
import styles from './TileGrid.module.css';

type Props = {
  path: number[];
  gridRef: React.RefObject<HTMLDivElement | null>;
};

export function PathOverlay({ path, gridRef }: Props) {
  const [points, setPoints] = useState('');

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid || path.length < 2) {
      setPoints('');
      return;
    }

    const wrapRect = grid.getBoundingClientRect();
    const parts: string[] = [];

    for (const index of path) {
      const el = grid.querySelector(`[data-tile-index="${index}"]`);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      parts.push(`${r.left - wrapRect.left + r.width / 2},${r.top - wrapRect.top + r.height / 2}`);
    }

    setPoints(parts.join(' '));
  }, [path, gridRef]);

  if (!points) return null;

  return (
    <svg className={styles.pathOverlay} aria-hidden="true">
      <polyline className={styles.pathLine} points={points} />
    </svg>
  );
}
