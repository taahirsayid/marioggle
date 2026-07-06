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

function getAdjacentIndices(index: number): number[] {
  const row = Math.floor(index / 5);
  const col = index % 5;
  const neighbors: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < 5 && c >= 0 && c < 5) {
        neighbors.push(r * 5 + c);
      }
    }
  }
  return neighbors;
}

export function TileGrid({ grid, disabled, onSubmit, onSelectionChange }: Props) {
  const [path, setPath] = useState<number[]>([]);
  const [isDraggingUi, setIsDraggingUi] = useState(false);

  const isDragging = useRef(false);
  const pointerMoved = useRef(false);
  const touchActive = useRef(false);
  const pathRef = useRef<number[]>([]);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const tileRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const gridRef = useRef<HTMLDivElement>(null);

  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;

  const applyPath = useCallback((next: number[]) => {
    pathRef.current = next;
    setPath(next);
    onSelectionChangeRef.current?.(next);
  }, []);

  /** Map touch position to grid cell (includes gaps — reliable for diagonal swipes). */
  const cellFromPoint = useCallback((clientX: number, clientY: number): number | null => {
    const gridEl = gridRef.current;
    if (!gridEl) return null;

    const rect = gridEl.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null;

    const col = Math.min(4, Math.max(0, Math.floor((x / rect.width) * 5)));
    const row = Math.min(4, Math.max(0, Math.floor((y / rect.height) * 5)));
    return row * 5 + col;
  }, []);

  /**
   * During a drag, only consider tiles adjacent to the path tip (8 directions).
   * Uses grid-cell mapping first, then nearest-neighbor fallback for corner gaps.
   */
  const pickDragTarget = useCallback(
    (clientX: number, clientY: number): number | null => {
      const currentPath = pathRef.current;
      if (currentPath.length === 0) return null;

      const last = currentPath[currentPath.length - 1];

      const cell = cellFromPoint(clientX, clientY);
      if (cell !== null) {
        if (currentPath.length >= 2 && cell === currentPath[currentPath.length - 2]) {
          return cell;
        }
        if (cell !== last && !currentPath.includes(cell) && areAdjacent(last, cell)) {
          return cell;
        }
      }

      const gridEl = gridRef.current;
      if (!gridEl) return null;
      const rect = gridEl.getBoundingClientRect();
      const cellSize = Math.min(rect.width, rect.height) / 5;
      const maxDistSq = (cellSize * 1.1) ** 2;

      let best: number | null = null;
      let bestDistSq = Infinity;

      for (const index of getAdjacentIndices(last)) {
        if (currentPath.includes(index)) continue;
        const el = tileRefs.current.get(index);
        if (!el) continue;
        const tr = el.getBoundingClientRect();
        const cx = tr.left + tr.width / 2;
        const cy = tr.top + tr.height / 2;
        const dx = clientX - cx;
        const dy = clientY - cy;
        const distSq = dx * dx + dy * dy;
        if (distSq < bestDistSq) {
          bestDistSq = distSq;
          best = index;
        }
      }

      if (best !== null && bestDistSq <= maxDistSq) return best;
      return null;
    },
    [cellFromPoint],
  );

  const tryExtendDrag = useCallback(
    (index: number): boolean => {
      if (disabledRef.current) return false;

      const prev = pathRef.current;
      if (prev.length === 0) {
        applyPath([index]);
        return true;
      }

      const last = prev[prev.length - 1];
      if (index === last) return false;

      if (prev.length >= 2 && index === prev[prev.length - 2]) {
        applyPath(prev.slice(0, -1));
        return true;
      }

      if (prev.includes(index)) return false;
      if (!areAdjacent(last, index)) return false;

      applyPath([...prev, index]);
      return true;
    },
    [applyPath],
  );

  const finishDrag = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    touchActive.current = false;
    lastPointRef.current = null;
    setIsDraggingUi(false);

    const currentPath = pathRef.current;
    if (currentPath.length >= 1) {
      onSubmitRef.current(currentPath);
      applyPath([]);
    }
  }, [applyPath]);

  const startDrag = useCallback(
    (index: number) => {
      if (disabledRef.current) return;
      isDragging.current = true;
      pointerMoved.current = false;
      lastPointRef.current = null;
      setIsDraggingUi(true);
      applyPath([index]);
    },
    [applyPath],
  );

  const handleMoveAt = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging.current || disabledRef.current) return;
      pointerMoved.current = true;

      const gridEl = gridRef.current;
      const lastPt = lastPointRef.current;

      const processPoint = (x: number, y: number) => {
        const index = pickDragTarget(x, y);
        if (index !== null) {
          tryExtendDrag(index);
        }
      };

      if (lastPt && gridEl) {
        const rect = gridEl.getBoundingClientRect();
        const cellSize = Math.min(rect.width, rect.height) / 5;
        const dx = clientX - lastPt.x;
        const dy = clientY - lastPt.y;
        const steps = Math.max(
          Math.ceil(Math.abs(dx) / (cellSize * 0.35)),
          Math.ceil(Math.abs(dy) / (cellSize * 0.35)),
          1,
        );
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          processPoint(lastPt.x + dx * t, lastPt.y + dy * t);
        }
      } else {
        processPoint(clientX, clientY);
      }

      lastPointRef.current = { x: clientX, y: clientY };
    },
    [pickDragTarget, tryExtendDrag],
  );

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) return;
      const target = (e.target as Element | null)?.closest('[data-tile-index]');
      if (!target || !grid.contains(target)) return;
      const index = Number(target.getAttribute('data-tile-index'));
      if (!Number.isFinite(index) || disabledRef.current) return;
      e.preventDefault();
      touchActive.current = true;
      startDrag(index);
    };

    grid.addEventListener('touchstart', onTouchStart, { passive: false });
    return () => grid.removeEventListener('touchstart', onTouchStart);
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
      if (e.touches.length > 1) return;
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) handleMoveAt(touch.clientX, touch.clientY);
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchActive.current) return;
      if (e.touches.length > 0) return;
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

    const prev = pathRef.current;
    if (prev.length > 0 && prev[prev.length - 1] === index) {
      onSubmitRef.current(prev);
      applyPath([]);
      return;
    }
    if (prev.length === 0) {
      applyPath([index]);
      return;
    }
    const last = prev[prev.length - 1];
    if (index === last && prev.length > 1) {
      applyPath(prev.slice(0, -1));
      return;
    }
    if (prev.includes(index)) return;
    if (!areAdjacent(last, index)) return;
    applyPath([...prev, index]);
  };

  const currentWord = path.map((i) => grid[i]?.display ?? '').join('');

  return (
    <div className={styles.wrapper}>
      <div className={styles.wordPreview} aria-live="polite">
        {currentWord || '\u00A0'}
      </div>
      <div
        ref={gridRef}
        className={`${styles.grid} ${isDraggingUi ? styles.dragging : ''}`}
        role="grid"
        aria-label="Letter grid"
      >
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
