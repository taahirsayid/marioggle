import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TileGrid } from '../components/grid/TileGrid';
import { api, type GameStateResponse, getSessionId } from '../services/api';

const VISUAL_CLASSES = ['', 'player-blue', 'player-green', 'player-yellow', 'player-orange', 'player-purple', 'player-pink'];
import { getSocket, reconnectSocket } from '../services/socket';
import { useSound } from '../hooks/useSound';

export function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<GameStateResponse | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const { play } = useSound();
  const warned30 = useRef(false);
  const warned10 = useRef(false);

  const syncTimer = useCallback((s: GameStateResponse) => {
    if (s.status === 'countdown' && s.countdownEndsAt) {
      setTimeLeft(Math.max(0, Math.ceil((s.countdownEndsAt - s.serverNow) / 1000)));
    } else if (s.activeEndsAt) {
      const left = Math.max(0, Math.ceil((s.activeEndsAt - s.serverNow) / 1000));
      setTimeLeft(left);
      if (left <= 30 && !warned30.current) {
        warned30.current = true;
        play('warning');
      }
      if (left <= 10 && !warned10.current) {
        warned10.current = true;
        play('warning');
      }
    }
  }, [play]);

  const applyState = useCallback((s: GameStateResponse) => {
    setState(s);
    syncTimer(s);
    if (s.status === 'results') {
      navigate(`/results/${gameId}`);
    }
  }, [gameId, navigate, syncTimer]);

  const poll = useCallback(async () => {
    if (!gameId) return;
    try {
      const s = await api.getGameState(gameId);
      applyState(s);
    } catch {
      setFeedback({ message: 'Connection lost — retrying…', type: 'invalid' });
    }
  }, [gameId, applyState]);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, [poll]);

  useEffect(() => {
    if (!gameId) return;
    const sessionId = getSessionId();
    if (!sessionId) return;

    const socket = reconnectSocket(sessionId);
    socket.emit('join_game', { gameId });

    socket.on('game_state', (s: GameStateResponse) => applyState(s));
    socket.on('round_started', (payload: { grid: GameStateResponse['grid']; activeEndsAt: number; serverNow: number }) => {
      setState((prev) =>
        prev
          ? {
              ...prev,
              status: 'active',
              grid: payload.grid,
              activeEndsAt: payload.activeEndsAt,
              countdownEndsAt: null,
              serverNow: payload.serverNow,
            }
          : prev,
      );
      play('countdown');
    });
    socket.on('word_result', (result: { message: string; outcome: string; totalScore: number; sessionId?: string }) => {
      setFeedback({ message: result.message, type: result.outcome });
      if (result.outcome === 'accepted') play('valid');
      else if (result.outcome === 'duplicate') play('duplicate');
      else play('invalid');
      const sid = result.sessionId ?? sessionId;
      setState((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        if (sid === sessionId) {
          next.score = result.totalScore;
        }
        if (prev.players && sid) {
          next.players = prev.players.map((p) =>
            p.sessionId === sid ? { ...p, score: result.totalScore } : p,
          );
        }
        return next;
      });
    });
    socket.on('round_ended', () => navigate(`/results/${gameId}`));

    return () => {
      socket.off('game_state');
      socket.off('round_started');
      socket.off('word_result');
      socket.off('round_ended');
    };
  }, [gameId, applyState, navigate, play]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (state?.status === 'active' || state?.status === 'countdown') {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [state?.status]);

  const handleSubmit = async (path: number[]) => {
    if (!gameId || !state || state.status !== 'active') return;
    const key = `${Date.now()}-${path.join('-')}`;

    if (state.mode === 'multiplayer') {
      getSocket().emit('submit_word', { gameId, path, idempotencyKey: key });
      return;
    }

    try {
      const result = await api.submitWord(gameId, path, key);
      setFeedback({ message: result.message, type: result.outcome });
      if (result.outcome === 'accepted') play('valid');
      else if (result.outcome === 'duplicate') play('duplicate');
      else play('invalid');
      setState((prev) => (prev ? { ...prev, score: result.totalScore } : prev));
    } catch {
      setFeedback({ message: 'Submit failed', type: 'invalid' });
    }
  };

  if (!state) {
    return (
      <div className="page">
        <p style={{ textAlign: 'center' }}>Loading game…</p>
      </div>
    );
  }

  const active = state.status === 'active';
  const countdown = state.status === 'countdown';
  const timerClass =
    timeLeft !== null && timeLeft <= 10 ? 'timer-bar warning' : 'timer-bar';

  return (
    <div className="page">
      <div className={timerClass} role="timer" aria-live="polite">
        {countdown && timeLeft !== null && `Starting in ${timeLeft}…`}
        {active && timeLeft !== null && `${timeLeft}s remaining`}
        {!countdown && !active && state.status}
      </div>
      {state.mode === 'multiplayer' && state.players && state.players.length > 0 ? (
        <ul className="scoreboard" aria-label="Player scores">
          {state.players.map((p) => {
            const isYou = p.sessionId === getSessionId();
            return (
              <li key={p.sessionId} className={isYou ? 'scoreboard-row scoreboard-you' : 'scoreboard-row'}>
                <span className={`player-badge ${VISUAL_CLASSES[p.visualId] ?? ''}`} aria-hidden="true">●</span>
                <span className="scoreboard-name">{p.displayName}{isYou ? ' (you)' : ''}</span>
                <strong className="scoreboard-score">{p.score}</strong>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
          <span>Score: <strong>{state.score}</strong></span>
        </div>
      )}
      {feedback && (
        <div className={`feedback ${feedback.type}`}>{feedback.message}</div>
      )}
      {state.grid.length > 0 && (
        <TileGrid grid={state.grid} disabled={!active} onSubmit={handleSubmit} />
      )}
    </div>
  );
}
