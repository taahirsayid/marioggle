/** Deferred imports so the HTTP server can respond to health checks before heavy modules load. */
export function getGameManager() {
  return import('./game/gameManager.js').then((m) => m.gameManager);
}
