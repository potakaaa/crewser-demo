import { useEffect, useState } from 'react';
import { useDemo } from '../store';
import logoDark from '../assets/crewser-logo.png';
import logoLight from '../assets/crewser-logo-light.png';

type Tone = 'light' | 'dark';

/** The Crewser mark: slate on light backgrounds, white on dark ones. The lime burst stays. */
export function LogoMark({ tone = 'light', size = 24, className = '' }: { tone?: Tone; size?: number; className?: string }) {
  return (
    <img
      src={tone === 'light' ? logoLight : logoDark}
      alt=""
      aria-hidden="true"
      className={`logo-mark ${className}`}
      width={Math.round((size * 237) / 213)}
      height={size}
      draggable={false}
    />
  );
}

/** Mark plus the Crewser name. `tone` is the colour of the text and mark: light for dark backgrounds. */
export function Wordmark({ tone = 'light', className = '' }: { tone?: Tone; className?: string }) {
  return (
    <span className={`wordmark wordmark-${tone} ${className}`}>
      <LogoMark tone={tone} size={0} className="wordmark-mark" />
      Crewser
    </span>
  );
}

const HOLD_MS = 950;
const FADE_MS = 450;

/** Launch screen: the brand on the header gradient with film grain, then it fades into Home. */
export function Splash() {
  const hide = useDemo((s) => s.hideSplash);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const t1 = window.setTimeout(() => setLeaving(true), HOLD_MS);
    const t2 = window.setTimeout(hide, HOLD_MS + FADE_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [hide]);
  return (
    <div className={`splash grain${leaving ? ' is-leaving' : ''}`} role="status" aria-label="Loading Crewser">
      <div className="splash-mark">
        <LogoMark size={88} className="splash-logo" />
        <Wordmark className="splash-wordmark" />
        <span className="splash-sub">Crew app</span>
      </div>
      <span className="splash-bar" aria-hidden="true">
        <span />
      </span>
    </div>
  );
}
