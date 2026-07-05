import { useEffect, useState } from 'react';
import { wakeServer, getApiBase } from '../services/api';

export function ApiStatusBanner() {
  const [status, setStatus] = useState<'idle' | 'waking' | 'ready' | 'missing' | 'failed'>('idle');

  useEffect(() => {
    if (!getApiBase()) {
      setStatus('missing');
      return;
    }
    setStatus('waking');
    wakeServer().then((ok) => setStatus(ok ? 'ready' : 'failed'));
  }, []);

  if (status === 'idle' || status === 'ready') return null;

  if (status === 'missing') {
    return (
      <div className="feedback invalid" style={{ margin: '1rem' }}>
        Game server URL not configured. Set VITE_API_URL when building the frontend.
      </div>
    );
  }

  if (status === 'waking') {
    return (
      <div className="feedback duplicate" style={{ margin: '1rem' }}>
        Waking game server… (free tier may take up to 30 seconds)
      </div>
    );
  }

  return (
    <div className="feedback invalid" style={{ margin: '1rem' }}>
      Could not reach game server. Wait a moment and refresh — Render free instances spin down when idle.
    </div>
  );
}
