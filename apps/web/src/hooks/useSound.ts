import { useRef } from 'react';

type SoundId = 'valid' | 'invalid' | 'duplicate' | 'countdown' | 'timerEnd' | 'warning';

export function useSound() {
  const muted = useRef(localStorage.getItem('marioggle-muted') === 'true');

  const play = (id: SoundId) => {
    if (muted.current) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const freqs: Record<SoundId, number> = {
      valid: 880,
      invalid: 220,
      duplicate: 440,
      countdown: 660,
      timerEnd: 330,
      warning: 550,
    };
    osc.frequency.value = freqs[id];
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  };

  const toggleMute = () => {
    muted.current = !muted.current;
    localStorage.setItem('marioggle-muted', String(muted.current));
    return muted.current;
  };

  return { play, toggleMute, isMuted: () => muted.current };
}
