import { Link } from 'react-router-dom';

export function HowToPlayPage() {
  return (
    <div className="page">
      <h1 className="page-title">How to Play</h1>
      <div className="card stack">
        <section>
          <h2>Objective</h2>
          <p>Score more points than your opponent(s) before the timer runs out.</p>
        </section>
        <section>
          <h2>Connecting Letters</h2>
          <p>
            Find words by connecting adjacent tiles on the 5×5 grid. Swipe across tiles or click
            them one by one, then click the last tile again to submit.
          </p>
        </section>
        <section>
          <h2>Movement</h2>
          <p>
            Move horizontally, vertically, or diagonally. You can change direction as you go.
            Each tile can only be used once per word.
          </p>
        </section>
        <section>
          <h2>Minimum Length</h2>
          <p>Words must be at least 3 letters long. &quot;Qu&quot; counts as two letters.</p>
        </section>
        <section>
          <h2>Scoring</h2>
          <ul>
            <li>3–4 letters: 1 point</li>
            <li>5 letters: 2 points</li>
            <li>6 letters: 3 points</li>
            <li>7 letters: 5 points</li>
            <li>8+ letters: 11 points</li>
          </ul>
        </section>
        <section>
          <h2>Invalid Words</h2>
          <p>Invalid submissions cost 1 point (minimum score is 0). Duplicates show &quot;Already found&quot; with no penalty.</p>
        </section>
        <section>
          <h2>Timer</h2>
          <p>Each round starts with a 3-second countdown. Warnings appear at 30 and 10 seconds remaining.</p>
        </section>
        <section>
          <h2>Multiplayer</h2>
          <p>Create a private room and share the code or invite link. 2–6 players. The host starts the game when ready.</p>
        </section>
      </div>
      <Link to="/">
        <button type="button" className="btn-secondary" style={{ width: '100%', marginTop: '1rem' }}>
          Back to Home
        </button>
      </Link>
    </div>
  );
}
