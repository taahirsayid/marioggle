import { Link } from 'react-router-dom';
import { ApiStatusBanner } from '../components/ApiStatusBanner';

export function HomePage() {
  return (
    <div className="page">
      <h1 className="page-title">Marioggle</h1>
      <p className="page-subtitle">Find words. Score points. Beat the clock!</p>
      <ApiStatusBanner />
      <div className="stack">
        <Link to="/solo">
          <button type="button" className="btn-primary" style={{ width: '100%' }}>
            Play Solo
          </button>
        </Link>
        <Link to="/create">
          <button type="button" className="btn-accent" style={{ width: '100%' }}>
            Create Game
          </button>
        </Link>
        <Link to="/join">
          <button type="button" className="btn-secondary" style={{ width: '100%' }}>
            Join Game
          </button>
        </Link>
        <Link to="/how-to-play" style={{ textAlign: 'center', marginTop: '1rem' }}>
          How to Play
        </Link>
      </div>
    </div>
  );
}
