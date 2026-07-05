import { useCallback, useRef, useState } from 'react';
import type { TileDto } from '../services/api';
import styles from './TileGrid.module.css';

type Props = {
  grid: TileDto[];
  disabled?: boolean;
  onSubmit: (path: number[]) => void;
  onSelectionChange?: (path: number[]) => void;
};

function areAdjacent(a: number, b: number): boolean {
  const row = (i: number) => Math.floor(i / 5);
  const col = (i: number) => i % 5;
  return Math.abs(row(a) - row(b)) <= 1 && Math.abs(col(a) - col(b)) <= 1 && a !== b;
}

export function TileGrid({ grid, disabled, onSubmit, onSelectionChange }: Props) {
  const [path, setPath] = useState<number[]>([]);
  const isDragging = useRef(false);

  const updatePath = useCallback(
    (next: number[]) => {
      setPath(next);
      onSelectionChange?.(next);
    },
    [onSelectionChange],
  );

  const tryExtend = (index: number) => {
    if (disabled) return;
    setPath((prev) => {
      if (prev.length === 0) {
        const next = [index];
        onSelectionChange?.(next);
        return next;
      }
      const last = prev[prev.length - 1];
      if (index === last && prev.length > 1) {
        const next = prev.slice(0, -1);
        onSelectionChange?.(next);
        return next;
      }
      if (prev.includes(index)) return prev;
      if (!areAdjacent(last, index)) return prev;
      const next = [...prev, index];
      onSelectionChange?.(next);
      return next;
    });
  };

  const handlePointerDown = (index: number) => {
    isDragging.current = true;
    updatePath([index]);
  };

  const handlePointerEnter = (index: number) => {
    if (!isDragging.current || disabled) return;
    tryExtend(index);
  };

  const handlePointerUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (path.length >= 1) {
      onSubmit(path);
      updatePath([]);
    }
  };

  const handleClick = (index: number) => {
    if (disabled) return;
    setPath((prev) => {
      if (prev.length > 0 && prev[prev.length - 1] === index) {
        if (prev.length >= 1) {
          onSubmit(prev);
          onSelectionChange?.([]);
          return [];
        }
      }
      if (prev.length === 0) {
        const next = [index];
        onSelectionChange?.(next);
        return next;
      }
      const last = prev[prev.length - 1];
      if (index === last && prev.length > 1) {
        const next = prev.slice(0, -1);
        onSelectionChange?.(next);
        return next;
      }
      if (prev.includes(index)) return prev;
      if (!areAdjacent(last, index)) return prev;
      const next = [...prev, index];
      onSelectionChange?.(next);
      return next;
    });
  };

  const currentWord = path.map((i) => grid[i]?.display ?? '').join('');

  return (
    <div
      className={styles.wrapper}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div className={styles.wordPreview} aria-live="polite">
        {currentWord || '\u00A0'}
      </div>
      <div className={styles.grid} role="grid" aria-label="Letter grid">
        {grid.map((tile) => {
          const selected = path.includes(tile.index);
          const order = path.indexOf(tile.index);
          return (
            <button
              key={tile.index}
              type="button"
              className={`${styles.tile} ${selected ? styles.selected : ''}`}
              role="gridcell"
              aria-selected={selected}
              aria-label={`Tile ${tile.display}${selected ? `, position ${order + 1} in word` : ''}`}
              onPointerDown={(e) => {
                e.preventDefault();
                handlePointerDown(tile.index);
              }}
              onPointerEnter={() => handlePointerEnter(tile.index)}
              onClick={() => handleClick(tile.index)}
              disabled={disabled}
            >
              <span className={styles.letter}>{tile.display}</span>
              {selected && <span className={styles.order}>{order + 1}</span>}
            </button>
          );
        })}
      </div>
      <p className={styles.hint}>Swipe or click tiles. Click the last tile again to submit.</p>
    </div>
  );
}
