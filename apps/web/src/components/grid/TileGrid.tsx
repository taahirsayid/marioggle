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

function pointInRect(
  x: number,
  y: number,
  rect: DOMRect,
  expand = 0,
): boolean {
  return (
    x >= rect.left - expand &&
    x <= rect.right + expand &&
    y >= rect.top - expand &&
    y <= rect.bottom + expand
  );
}

export function TileGrid({ grid, disabled, onSubmit, onSelectionChange }: Props) {
  const [path, setPath] = useState<number[]>([]);
  const [isDraggingUi, setIsDraggingUi] = useState(false);

  const isDragging = useRef(false);
  const pointerMoved = useRef(false);
  const touchActive = useRef(false);
  const pathRef = useRef<number[]>([]);
  const lastHoverIndex = useRef<number | null>(null);
  const lastMovePoint = useRef<{ x: number; y: number } | null>(null);
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

  const measureGap = useCallback((): number => {
    const t0 = tileRefs.current.get(0);
    const t1 = tileRefs.current.get(1);
    if (t0 && t1) {
      return Math.max(0, t1.getBoundingClientRect().left - t0.getBoundingClientRect().right);
    }
    const gridEl = gridRef.current;
    if (!gridEl) return 6;
    const size = Math.min(gridEl.getBoundingClientRect().width, gridEl.getBoundingClientRect().height);
    return size / 5 * 0.1;
  }, []);

  /** Tile directly under the finger (strict bounds, then elementFromPoint). */
  const tileUnderFinger = useCallback((clientX: number, clientY: number): number | null => {
    for (const [index, el] of tileRefs.current) {
      const rect = el.getBoundingClientRect();
      if (pointInRect(clientX, clientY, rect)) {
        return index;
      }
    }

    const hit = document.elementFromPoint(clientX, clientY)?.closest('[data-tile-index]');
    const gridEl = gridRef.current;
    if (hit && gridEl?.contains(hit)) {
      const index = Number(hit.getAttribute('data-tile-index'));
      if (Number.isFinite(index)) return index;
    }

    return null;
  }, []);

  /**
   * During drag, only extend to tiles adjacent to the path tip.
   * Direct hits use strict bounds; gaps use expanded adjacent tiles + swipe direction.
   */
  const pickDragTarget = useCallback(
    (clientX: number, clientY: number): number | null => {
      const currentPath = pathRef.current;
      if (currentPath.length === 0) return null;

      const last = currentPath[currentPath.length - 1];
      const direct = tileUnderFinger(clientX, clientY);
      if (direct !== null) {
        if (direct === last || currentPath.includes(direct)) return null;
        if (areAdjacent(last, direct)) return direct;
        return null;
      }

      const lastEl = tileRefs.current.get(last);
      if (!lastEl) return null;
      const lastRect = lastEl.getBoundingClientRect();
      const lastCx = lastRect.left + lastRect.width / 2;
      const lastCy = lastRect.top + lastRect.height / 2;

      const gap = measureGap();
      const cornerExpand = gap + 6;

      let moveX = 0;
      let moveY = 0;
      const prev = lastMovePoint.current;
      if (prev) {
        moveX = clientX - prev.x;
        moveY = clientY - prev.y;
      }
      const moveLen = Math.hypot(moveX, moveY);
      const useDirection = moveLen > 4;

      let best: number | null = null;
      let bestScore = -Infinity;

      for (const index of getAdjacentIndices(last)) {
        if (currentPath.includes(index)) continue;
        const el = tileRefs.current.get(index);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (!pointInRect(clientX, clientY, rect, cornerExpand)) continue;

        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const distSq = (clientX - cx) ** 2 + (clientY - cy) ** 2;

        let score = -distSq;
        if (useDirection) {
          const toX = cx - lastCx;
          const toY = cy - lastCy;
          const toLen = Math.hypot(toX, toY) || 1;
          const dot = (moveX * toX + moveY * toY) / (moveLen * toLen);
          if (dot < 0.15) continue;
          score += dot * 1e4;
        }

        if (score > bestScore) {
          bestScore = score;
          best = index;
        }
      }

      return best;
    },
    [measureGap, tileUnderFinger],
  );

  const tryExtendDrag = useCallback(
    (index: number) => {
      if (disabledRef.current) return;

      const prev = pathRef.current;
      if (prev.length === 0) {
        applyPath([index]);
        return;
      }

      const last = prev[prev.length - 1];
      if (index === last) return;
      if (prev.includes(index)) return;
      if (!areAdjacent(last, index)) return;

      applyPath([...prev, index]);
    },
    [applyPath],
  );

  const finishDrag = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    touchActive.current = false;
    lastHoverIndex.current = null;
    lastMovePoint.current = null;
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
      lastHoverIndex.current = index;
      lastMovePoint.current = null;
      setIsDraggingUi(true);
      applyPath([index]);
    },
    [applyPath],
  );

  const handleMoveAt = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging.current || disabledRef.current) return;
      pointerMoved.current = true;

      const index = pickDragTarget(clientX, clientY);
      if (index !== null && index !== lastHoverIndex.current) {
        lastHoverIndex.current = index;
        tryExtendDrag(index);
      }

      lastMovePoint.current = { x: clientX, y: clientY };
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
