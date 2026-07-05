import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  DEFAULT_DURATION_SECONDS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  MAX_DURATION_SECONDS,
  MIN_DURATION_SECONDS,
  DURATION_STEP_SECONDS,
  MAX_DISPLAY_NAME_LENGTH,
} from '@marioggle/shared';
import { api, wakeServer, type RoomResponse } from '../services/api';
import { reconnectSocket } from '../services/socket';

const VISUAL_CLASSES = ['', 'player-blue', 'player-green', 'player-yellow', 'player-orange', 'player-purple', 'player-pink'];

export function CreateRoomPage() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [duration, setDuration] = useState(DEFAULT_DURATION_SECONDS);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [room, setRoom] = useState<RoomResponse | null>(null);

  const handleCreate = async () => {
    setError('');
    setLoading(true);
    try {
      await wakeServer();
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
          <input readOnly value={room.inviteUrl} onFocus={(e) => e.target.select()} />
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
  const { inviteToken } = useParams<{ inviteToken?: string }>();
  const [displayName, setDisplayName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    setError('');
    setLoading(true);
    try {
      await wakeServer();
      await api.ensureSession();
      const r = await api.joinRoom({
        displayName: displayName.trim(),
        code: inviteToken ? undefined : code.trim(),
        inviteToken: inviteToken ?? undefined,
      });
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
        {!inviteToken && (
          <div>
            <label className="label" htmlFor="code">6-digit room code</label>
            <input id="code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="123456" />
          </div>
        )}
        {inviteToken && <p>You were invited to a private room.</p>}
        {error && <p className="feedback invalid">{error}</p>}
        <button
          type="button"
          className="btn-primary"
          disabled={!displayName.trim() || loading || (!inviteToken && code.length !== 6)}
          onClick={handleJoin}
        >
          {loading ? 'Joining…' : 'Join Room'}
        </button>
      </div>
    </div>
  );
}

export function RoomLobbyPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomResponse | null>(null);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const socketRef = useRef<ReturnType<typeof reconnectSocket> | null>(null);

  useEffect(() => {
    if (!roomId) return;

    let pollId: ReturnType<typeof setInterval> | undefined;

    (async () => {
      try {
        await wakeServer();
        const { sessionId: sid } = await api.ensureSession();
        setSessionId(sid);
        socketRef.current = reconnectSocket(sid);
        socketRef.current.emit('join_room', { roomId });

        socketRef.current.on('room_state', (r: RoomResponse) => setRoom(r));
        socketRef.current.on('game_started', ({ gameId }: { gameId: string }) => {
          navigate(`/game/${gameId}`);
        });
        socketRef.current.on('error', (err: { message: string }) => setError(err.message));

        const initial = await api.getRoom(roomId);
        setRoom(initial);

        pollId = setInterval(async () => {
          try {
            const r = await api.getRoom(roomId);
            setRoom(r);
          } catch {
            // ignore transient errors
          }
        }, 2000);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load lobby');
      }
    })();

    return () => {
      if (pollId) clearInterval(pollId);
      socketRef.current?.off('room_state');
      socketRef.current?.off('game_started');
      socketRef.current?.off('error');
    };
  }, [roomId, navigate]);

  const handleStart = () => {
    if (!roomId) return;
    socketRef.current?.emit('start_game', { roomId });
  };

  if (!room) {
    return (
      <div className="page">
        <p style={{ textAlign: 'center' }}>{error || 'Loading lobby…'}</p>
      </div>
    );
  }

  const isHost = sessionId === room.hostSessionId;
  const canStart = room.players.length >= MIN_PLAYERS && !room.gameStarted;

  return (
    <div className="page">
      <h1 className="page-title">Lobby</h1>
      <div className="card stack">
        <p>Room code: <strong style={{ letterSpacing: '0.15em' }}>{room.code}</strong></p>
        <p>{room.players.length} / {room.maxPlayers} players · {room.durationSeconds}s</p>
        <ul style={{ listStyle: 'none' }}>
          {room.players.map((p) => (
            <li key={p.sessionId} style={{ padding: '0.25rem 0' }}>
              <span className={`player-badge ${VISUAL_CLASSES[p.visualId] ?? ''}`}>●</span>
              {p.displayName} {p.isHost ? '(Host)' : ''}
            </li>
          ))}
        </ul>
        {error && <p className="feedback invalid">{error}</p>}
        {isHost && (
          <button type="button" className="btn-primary" disabled={!canStart} onClick={handleStart}>
            {canStart ? 'Start Game' : `Need at least ${MIN_PLAYERS} players`}
          </button>
        )}
        {!isHost && <p style={{ color: 'var(--text-muted)' }}>Waiting for host to start…</p>}
      </div>
    </div>
  );
}

export function ResultsPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [rankings, setRankings] = useState<Awaited<ReturnType<typeof api.getResults>>['rankings'] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!gameId) return;
    api.getResults(gameId)
      .then((r) => setRankings(r.rankings))
      .catch((e) => setError(e instanceof Error ? e.message : 'Results unavailable'));
  }, [gameId]);

  if (error) {
    return (
      <div className="page">
        <p className="feedback invalid">{error}</p>
        <button type="button" className="btn-secondary" onClick={() => navigate('/')}>Home</button>
      </div>
    );
  }

  if (!rankings) {
    return <div className="page"><p>Loading results…</p></div>;
  }

  return (
    <div className="page">
      <h1 className="page-title">Results</h1>
      <div className="card stack">
        {rankings.map((r, i) => (
          <div key={r.sessionId}>
            <strong>#{i + 1} {r.displayName}</strong> — {r.score} pts ({r.wordCount} words)
            {r.words.length > 0 && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{r.words.join(', ')}</p>
            )}
          </div>
        ))}
        <button type="button" className="btn-primary" onClick={() => navigate('/')}>Home</button>
      </div>
    </div>
  );
}
