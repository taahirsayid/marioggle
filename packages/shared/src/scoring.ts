/** Points by letter count (BR-SCORE-001). Qu counts as 2 letters. */
export function scoreForWordLength(letterCount: number): number {
  if (letterCount < 3) return 0;
  if (letterCount <= 4) return 1;
  if (letterCount === 5) return 2;
  if (letterCount === 6) return 3;
  if (letterCount === 7) return 5;
  return 11;
}

export function applyInvalidPenalty(currentScore: number): number {
  return Math.max(0, currentScore - 1);
}
