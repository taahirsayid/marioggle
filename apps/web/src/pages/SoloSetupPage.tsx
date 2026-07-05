import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DEFAULT_DURATION_SECONDS,
  MAX_DURATION_SECONDS,
  MIN_DURATION_SECONDS,
  DURATION_STEP_SECONDS,
  MAX_DISPLAY_NAME_LENGTH,
} from '@marioggle/shared';
import { api, wakeServer } from '../services/api';

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

export function SoloSetupPage() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>('medium');
  const [duration, setDuration] = useState(DEFAULT_DURATION_SECONDS);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setError('');
    setLoading(true);
    try {
      await wakeServer();
      await api.ensureSession();
      const { gameId } = await api.startSoloGame({
        displayName: displayName.trim(),
        difficulty,
        durationSeconds: duration,
      });
      navigate(`/game/${gameId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">Play Solo</h1>
      <div className="card stack">
        <div>
          <label className="label" htmlFor="name">Display name</label>
          <input
            id="name"
            maxLength={MAX_DISPLAY_NAME_LENGTH}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Up to 10 characters"
          />
        </div>
        <div>
          <label className="label" htmlFor="difficulty">Difficulty</label>
          <select
            id="difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="duration">
            Duration: {duration} seconds
          </label>
          <input
            id="duration"
            type="range"
            min={MIN_DURATION_SECONDS}
            max={MAX_DURATION_SECONDS}
            step={DURATION_STEP_SECONDS}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </div>
        {error && <p className="feedback invalid">{error}</p>}
        <button
          type="button"
          className="btn-primary"
          disabled={!displayName.trim() || loading}
          onClick={handleStart}
        >
          {loading ? 'Starting…' : 'Start Game'}
        </button>
      </div>
    </div>
  );
}
