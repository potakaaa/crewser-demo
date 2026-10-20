import { useEffect, useState } from 'react';
import { useDemo } from '../store';

/**
 * Crewser name as a text wordmark. The official logo could not be downloaded from
 * crewser.app in this environment: replace this element with the logo SVG when it is
 * available, and every place that shows the brand picks it up.
 */
export function Wordmark({ tone = 'light', className = '' }: { tone?: 'light' | 'dark'; className?: string }) {
  return <span className={`wordmark wordmark-${tone} ${className}`}>Crewser</span>;
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
        <Wordmark className="splash-wordmark" />
        <span className="splash-sub">Crew app</span>
      </div>
      <span className="splash-bar" aria-hidden="true">
        <span />
      </span>
    </div>
  );
}
