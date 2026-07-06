import { useCallback, useEffect, useRef, useState } from 'react';
import type { TileDto } from '../services/api';
import { cellIndexFromPoint, extendPath } from './swipePath';
import { PathOverlay } from './PathOverlay';
import styles from './TileGrid.module.css';

type Props = {
  grid: TileDto[];
  disabled?: boolean;
  onSubmit: (path: number[]) => void;
  onSelectionChange?: (path: number[]) => void;
};

const DRAG_THRESHOLD_PX = 8;

export function TileGrid({ grid, disabled, onSubmit, onSelectionChange }: Props) {
  const [path, setPath] = useState<number[]>([]);
  const [isDraggingUi, setIsDraggingUi] = useState(false);

  const isDragging = useRef(false);
  const pointerMoved = useRef(false);
  const skipClickRef = useRef(false);
  const pendingStartIndex = useRef<number | null>(null);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const pathRef = useRef<number[]>([]);
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

  const finishDrag = useCallback(() => {
    if (!isDragging.current) return;

    const wasSwipe = pointerMoved.current;
    const startIndex = pendingStartIndex.current;

    isDragging.current = false;
    pendingStartIndex.current = null;
    startPoint.current = null;
    setIsDraggingUi(false);

    if (wasSwipe) {
      const currentPath = pathRef.current;
      if (currentPath.length >= 1) {
        onSubmitRef.current(currentPath);
      }
      applyPath([]);
      return;
    }

    if (startIndex !== null) {
      applyPath(extendPath(pathRef.current, startIndex));
      skipClickRef.current = true;
    }
  }, [applyPath]);

  useEffect(() => {
    const gridEl = gridRef.current;
    if (!gridEl) return;

    const onPointerDown = (e: PointerEvent) => {
      if (disabledRef.current) return;
      const index = cellIndexFromPoint(e.clientX, e.clientY, gridEl, false);
      if (index === null) return;

      e.preventDefault();
      gridEl.setPointerCapture(e.pointerId);
      isDragging.current = true;
      pointerMoved.current = false;
      pendingStartIndex.current = index;
      startPoint.current = { x: e.clientX, y: e.clientY };
      setIsDraggingUi(true);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current || disabledRef.current) return;

      const start = startPoint.current;
      const startIndex = pendingStartIndex.current;
      if (!start || startIndex === null) return;

      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (!pointerMoved.current) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
        pointerMoved.current = true;
        applyPath([startIndex]);
      }

      const index = cellIndexFromPoint(e.clientX, e.clientY, gridEl, true);
      if (index === null) return;

      const next = extendPath(pathRef.current, index);
      if (next !== pathRef.current) {
        applyPath(next);
      }
    };

    const endPointer = (e: PointerEvent) => {
      if (gridEl.hasPointerCapture(e.pointerId)) {
        gridEl.releasePointerCapture(e.pointerId);
      }
      finishDrag();
    };

    gridEl.addEventListener('pointerdown', onPointerDown);
    gridEl.addEventListener('pointermove', onPointerMove);
    gridEl.addEventListener('pointerup', endPointer);
    gridEl.addEventListener('pointercancel', endPointer);

    return () => {
      gridEl.removeEventListener('pointerdown', onPointerDown);
      gridEl.removeEventListener('pointermove', onPointerMove);
      gridEl.removeEventListener('pointerup', endPointer);
      gridEl.removeEventListener('pointercancel', endPointer);
    };
  }, [applyPath, finishDrag]);

  const handleClick = (index: number) => {
    if (skipClickRef.current) {
      skipClickRef.current = false;
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

    applyPath(extendPath(prev, index));
  };

  const currentWord = path.map((i) => grid[i]?.display ?? '').join('');

  return (
    <div className={styles.wrapper}>
      <div className={styles.wordPreview} aria-live="polite">
        {currentWord || '\u00A0'}
      </div>
      <div className={styles.gridWrap}>
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
                data-tile-index={tile.index}
                className={`${styles.tile} ${selected ? styles.selected : ''}`}
                role="gridcell"
                aria-selected={selected}
                aria-disabled={disabled || undefined}
                aria-label={`Tile ${tile.display}${selected ? `, position ${order + 1} in word` : ''}`}
                onClick={() => handleClick(tile.index)}
              >
                <span className={styles.letter}>{tile.display}</span>
                {selected && <span className={styles.order}>{order + 1}</span>}
              </div>
            );
          })}
        </div>
        <PathOverlay path={path} gridRef={gridRef} />
      </div>
      <p className={styles.hint}>Swipe or tap tiles. Tap the last tile again to submit.</p>
    </div>
  );
}
