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

function tileIndexFromPoint(clientX: number, clientY: number): number | null {
  const el = document.elementFromPoint(clientX, clientY);
  const tileEl = el?.closest('[data-tile-index]');
  if (!tileEl) return null;
  const index = Number(tileEl.getAttribute('data-tile-index'));
  return Number.isFinite(index) ? index : null;
}

export function TileGrid({ grid, disabled, onSubmit, onSelectionChange }: Props) {
  const [path, setPath] = useState<number[]>([]);
  const isDragging = useRef(false);
  const pointerMoved = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const updatePath = useCallback(
    (next: number[]) => {
      setPath(next);
      onSelectionChange?.(next);
    },
    [onSelectionChange],
  );

  const tryExtend = useCallback(
    (index: number) => {
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
    },
    [disabled, onSelectionChange],
  );

  const finishDrag = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    setPath((currentPath) => {
      if (currentPath.length >= 1) {
        onSubmit(currentPath);
        onSelectionChange?.([]);
      }
      return [];
    });
  }, [onSubmit, onSelectionChange]);

  const handlePointerDown = (e: React.PointerEvent, index: number) => {
    if (disabled) return;
    e.preventDefault();
    isDragging.current = true;
    pointerMoved.current = false;
    gridRef.current?.setPointerCapture(e.pointerId);
    updatePath([index]);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || disabled) return;
    pointerMoved.current = true;
    const index = tileIndexFromPoint(e.clientX, e.clientY);
    if (index !== null) {
      tryExtend(index);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (gridRef.current?.hasPointerCapture(e.pointerId)) {
      gridRef.current.releasePointerCapture(e.pointerId);
    }
    finishDrag();
  };

  const handleClick = (index: number) => {
    // After a swipe, mobile browsers fire a synthetic click — ignore it.
    if (pointerMoved.current) {
      pointerMoved.current = false;
      return;
    }
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
    <div className={styles.wrapper}>
      <div className={styles.wordPreview} aria-live="polite">
        {currentWord || '\u00A0'}
      </div>
      <div
        ref={gridRef}
        className={styles.grid}
        role="grid"
        aria-label="Letter grid"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {grid.map((tile) => {
          const selected = path.includes(tile.index);
          const order = path.indexOf(tile.index);
          return (
            <button
              key={tile.index}
              type="button"
              data-tile-index={tile.index}
              className={`${styles.tile} ${selected ? styles.selected : ''}`}
              role="gridcell"
              aria-selected={selected}
              aria-label={`Tile ${tile.display}${selected ? `, position ${order + 1} in word` : ''}`}
              onPointerDown={(e) => handlePointerDown(e, tile.index)}
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
