/** Fraction of cell half-size used as the central hot-zone radius during drag. */
export const HOT_ZONE_RATIO = 0.7;

export function areAdjacent(a: number, b: number): boolean {
  const row = (i: number) => Math.floor(i / 5);
  const col = (i: number) => i % 5;
  return Math.abs(row(a) - row(b)) <= 1 && Math.abs(col(a) - col(b)) <= 1 && a !== b;
}

/**
 * Compute the next path given the cell under the finger:
 * - empty path → start at cell
 * - same cell → unchanged
 * - cell already in path → backtrack to that cell
 * - new cell not adjacent → unchanged
 * - otherwise → append
 */
export function extendPath(path: number[], cell: number): number[] {
  if (path.length === 0) return [cell];
  const last = path[path.length - 1];
  if (cell === last) return path;
  const idx = path.indexOf(cell);
  if (idx !== -1) {
    return path.slice(0, idx + 1);
  }
  if (!areAdjacent(last, cell)) return path;
  return [...path, cell];
}

export function isWithinHotZone(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  ratio = HOT_ZONE_RATIO,
): boolean {
  const dx = clientX - (rect.left + rect.width / 2);
  const dy = clientY - (rect.top + rect.height / 2);
  const radius = (ratio * Math.min(rect.width, rect.height)) / 2;
  return dx * dx + dy * dy <= radius * radius;
}

/**
 * Cell index under the pointer. When `hotZone` is true the pointer must be
 * near the cell center, not merely inside its box.
 */
export function cellIndexFromPoint(
  clientX: number,
  clientY: number,
  gridRoot: HTMLElement | null,
  hotZone: boolean,
): number | null {
  if (!gridRoot) return null;

  const hit = document.elementFromPoint(clientX, clientY)?.closest('[data-tile-index]');
  if (!hit || !gridRoot.contains(hit)) return null;

  const index = Number(hit.getAttribute('data-tile-index'));
  if (!Number.isFinite(index)) return null;

  if (hotZone) {
    const rect = hit.getBoundingClientRect();
    if (!isWithinHotZone(clientX, clientY, rect)) return null;
  }

  return index;
}
