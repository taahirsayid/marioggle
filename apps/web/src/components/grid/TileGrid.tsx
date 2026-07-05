import { useCallback, useEffect, useRef, useState } from 'react';
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
  const pointerMoved = useRef(false);
  const touchActive = useRef(false);
  const tileRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const gridRef = useRef<HTMLDivElement>(null);

  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;

  const tileIndexFromPoint = useCallback((clientX: number, clientY: number): number | null => {
    for (const [index, el] of tileRefs.current) {
      const rect = el.getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return index;
      }
    }
    return null;
  }, []);

  const tryExtend = useCallback((index: number) => {
    if (disabledRef.current) return;
    setPath((prev) => {
      if (prev.length === 0) {
        const next = [index];
        onSelectionChangeRef.current?.(next);
        return next;
      }
      const last = prev[prev.length - 1];
      if (index === last && prev.length > 1) {
        const next = prev.slice(0, -1);
        onSelectionChangeRef.current?.(next);
        return next;
      }
      if (prev.includes(index)) return prev;
      if (!areAdjacent(last, index)) return prev;
      const next = [...prev, index];
      onSelectionChangeRef.current?.(next);
      return next;
    });
  }, []);

  const finishDrag = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    touchActive.current = false;
    setPath((currentPath) => {
      if (currentPath.length >= 1) {
        onSubmitRef.current(currentPath);
        onSelectionChangeRef.current?.([]);
      }
      return [];
    });
  }, []);

  const startDrag = useCallback((index: number) => {
    if (disabledRef.current) return;
    isDragging.current = true;
    pointerMoved.current = false;
    setPath([index]);
    onSelectionChangeRef.current?.([index]);
  }, []);

  const handleMoveAt = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging.current || disabledRef.current) return;
      pointerMoved.current = true;
      const index = tileIndexFromPoint(clientX, clientY);
      if (index !== null) {
        tryExtend(index);
      }
    },
    [tileIndexFromPoint, tryExtend],
  );

  // Native touch listeners — React's synthetic touch events are passive and cannot
  // preventDefault, which breaks swipe on iOS Safari.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const onTouchStart = (e: TouchEvent) => {
      const target = (e.target as Element | null)?.closest('[data-tile-index]');
      if (!target || !grid.contains(target)) return;
      const index = Number(target.getAttribute('data-tile-index'));
      if (!Number.isFinite(index) || disabledRef.current) return;
      e.preventDefault();
      touchActive.current = true;
      startDrag(index);
    };

    grid.addEventListener('touchstart', onTouchStart, { passive: false });

    return () => {
      grid.removeEventListener('touchstart', onTouchStart);
    };
  }, [startDrag]);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (touchActive.current) return;
      if (!isDragging.current) return;
      if (e.pointerType === 'mouse' && e.buttons === 0) return;
      handleMoveAt(e.clientX, e.clientY);
    };

    const onPointerUp = () => {
      if (touchActive.current) return;
      finishDrag();
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging.current || !touchActive.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) {
        handleMoveAt(touch.clientX, touch.clientY);
      }
    };

    const onTouchEnd = () => {
      if (!touchActive.current) return;
      finishDrag();
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchEnd);

    return () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [finishDrag, handleMoveAt]);

  const handlePointerDown = (e: React.PointerEvent, index: number) => {
    if (disabled || e.pointerType === 'touch') return;
    e.preventDefault();
    startDrag(index);
  };

  const handleClick = (index: number) => {
    if (pointerMoved.current) {
      pointerMoved.current = false;
      return;
    }
    if (disabled) return;
    setPath((prev) => {
      if (prev.length > 0 && prev[prev.length - 1] === index) {
        if (prev.length >= 1) {
          onSubmitRef.current(prev);
          onSelectionChangeRef.current?.([]);
          return [];
        }
      }
      if (prev.length === 0) {
        const next = [index];
        onSelectionChangeRef.current?.(next);
        return next;
      }
      const last = prev[prev.length - 1];
      if (index === last && prev.length > 1) {
        const next = prev.slice(0, -1);
        onSelectionChangeRef.current?.(next);
        return next;
      }
      if (prev.includes(index)) return prev;
      if (!areAdjacent(last, index)) return prev;
      const next = [...prev, index];
      onSelectionChangeRef.current?.(next);
      return next;
    });
  };

  const currentWord = path.map((i) => grid[i]?.display ?? '').join('');

  return (
    <div className={styles.wrapper}>
      <div className={styles.wordPreview} aria-live="polite">
        {currentWord || '\u00A0'}
      </div>
      <div ref={gridRef} className={styles.grid} role="grid" aria-label="Letter grid">
        {grid.map((tile) => {
          const selected = path.includes(tile.index);
          const order = path.indexOf(tile.index);
          return (
            <div
              key={tile.index}
              ref={(el) => {
                if (el) tileRefs.current.set(tile.index, el);
                else tileRefs.current.delete(tile.index);
              }}
              data-tile-index={tile.index}
              className={`${styles.tile} ${selected ? styles.selected : ''}`}
              role="gridcell"
              aria-selected={selected}
              aria-disabled={disabled || undefined}
              aria-label={`Tile ${tile.display}${selected ? `, position ${order + 1} in word` : ''}`}
              onPointerDown={(e) => handlePointerDown(e, tile.index)}
              onClick={() => handleClick(tile.index)}
            >
              <span className={styles.letter}>{tile.display}</span>
              {selected && <span className={styles.order}>{order + 1}</span>}
            </div>
          );
        })}
      </div>
      <p className={styles.hint}>Swipe or tap tiles. Tap the last tile again to submit.</p>
    </div>
  );
}
