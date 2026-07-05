import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TileGrid } from '../components/grid/TileGrid';
import { api, type GameStateResponse } from '../services/api';
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

  const poll = useCallback(async () => {
    if (!gameId) return;
    try {
      const s = await api.getGameState(gameId);
      setState(s);
      syncTimer(s);
      if (s.status === 'results') {
        navigate(`/results/${gameId}`);
      }
    } catch {
      setFeedback({ message: 'Connection lost — retrying…', type: 'invalid' });
    }
  }, [gameId, navigate, syncTimer]);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 1000);
    return () => clearInterval(id);
  }, [poll]);

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
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
        <span>Score: <strong>{state.score}</strong></span>
      </div>
      {feedback && (
        <div className={`feedback ${feedback.type}`}>{feedback.message}</div>
      )}
      {state.grid.length > 0 && (
        <TileGrid
          grid={state.grid}
          disabled={!active}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
