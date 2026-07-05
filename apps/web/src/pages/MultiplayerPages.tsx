import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DEFAULT_DURATION_SECONDS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  MAX_DURATION_SECONDS,
  MIN_DURATION_SECONDS,
  DURATION_STEP_SECONDS,
  MAX_DISPLAY_NAME_LENGTH,
} from '@marioggle/shared';
import { api } from '../services/api';

export function CreateRoomPage() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [duration, setDuration] = useState(DEFAULT_DURATION_SECONDS);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [room, setRoom] = useState<Awaited<ReturnType<typeof api.createRoom>> | null>(null);

  const handleCreate = async () => {
    setError('');
    setLoading(true);
    try {
      await api.ensureSession();
      const r = await api.createRoom({
        displayName: displayName.trim(),
        maxPlayers,
        durationSeconds: duration,
      });
      setRoom(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  if (room) {
    return (
      <div className="page">
        <h1 className="page-title">Room Created</h1>
        <div className="card stack">
          <p>Room code: <strong style={{ fontSize: '2rem', letterSpacing: '0.2em' }}>{room.code}</strong></p>
          <p>Share this link:</p>
          <input readOnly value={window.location.origin + room.inviteUrl} />
          <ul>
            {room.players.map((p) => (
              <li key={p.sessionId}>{p.displayName} {p.isHost ? '(Host)' : ''}</li>
            ))}
          </ul>
          <button type="button" className="btn-primary" onClick={() => navigate(`/room/${room.roomId}`)}>
            Go to Lobby
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Create Game</h1>
      <div className="card stack">
        <div>
          <label className="label" htmlFor="name">Display name</label>
          <input id="name" maxLength={MAX_DISPLAY_NAME_LENGTH} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="max">Max players: {maxPlayers}</label>
          <input id="max" type="range" min={MIN_PLAYERS} max={MAX_PLAYERS} value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))} />
        </div>
        <div>
          <label className="label" htmlFor="duration">Duration: {duration}s</label>
          <input id="duration" type="range" min={MIN_DURATION_SECONDS} max={MAX_DURATION_SECONDS} step={DURATION_STEP_SECONDS} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
        </div>
        {error && <p className="feedback invalid">{error}</p>}
        <button type="button" className="btn-primary" disabled={!displayName.trim() || loading} onClick={handleCreate}>
          {loading ? 'Creating…' : 'Create Room'}
        </button>
      </div>
    </div>
  );
}

export function JoinRoomPage() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    setError('');
    setLoading(true);
    try {
      await api.ensureSession();
      const r = await api.joinRoom({ displayName: displayName.trim(), code: code.trim() });
      navigate(`/room/${r.roomId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">Join Game</h1>
      <div className="card stack">
        <div>
          <label className="label" htmlFor="name">Display name</label>
          <input id="name" maxLength={MAX_DISPLAY_NAME_LENGTH} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="code">6-digit room code</label>
          <input id="code" maxLength={6} pattern="[0-9]*" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="123456" />
        </div>
        {error && <p className="feedback invalid">{error}</p>}
        <button type="button" className="btn-primary" disabled={!displayName.trim() || code.length !== 6 || loading} onClick={handleJoin}>
          {loading ? 'Joining…' : 'Join Room'}
        </button>
      </div>
    </div>
  );
}

export function RoomLobbyPage() {
  return (
    <div className="page">
      <h1 className="page-title">Lobby</h1>
      <div className="card">
        <p>Multiplayer lobby with real-time sync is connected via WebSocket on the backend. Use the host Start button when 2+ players have joined.</p>
      </div>
    </div>
  );
}

export function ResultsPage() {
  return (
    <div className="page">
      <h1 className="page-title">Results</h1>
      <div className="card">
        <p>Results display with rankings, word lists, and replay options.</p>
      </div>
    </div>
  );
}
