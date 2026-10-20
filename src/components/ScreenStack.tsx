import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { routeToHash, useDemo, useRoute, type NavDir, type Route } from '../store';

interface Layer {
  key: string;
  route: Route;
  role: 'current' | 'leaving';
  dir: NavDir;
}

const EXIT_FALLBACK_MS = 700;

/**
 * Keeps the outgoing screen mounted while it animates out, so pushes slide in from
 * the right, back slides out to the right, and tab switches cross-fade.
 * Layers are keyed by route, so a screen keeps its state while it moves to "leaving".
 */
export function ScreenStack({ render }: { render: (route: Route) => ReactNode }) {
  const route = useRoute();
  const dir = useDemo((s) => s.navDir);
  const key = routeToHash(route);
  const [layers, setLayers] = useState<Layer[]>([{ key, route, role: 'current', dir: 'none' }]);
  const timers = useRef(new Map<string, number>());

  const drop = (k: string) => {
    window.clearTimeout(timers.current.get(k));
    timers.current.delete(k);
    setLayers((prev) => prev.filter((l) => !(l.role === 'leaving' && l.key === k)));
  };

  useLayoutEffect(() => {
    setLayers((prev) => {
      const cur = prev.find((l) => l.role === 'current');
      if (cur?.key === key) return prev;
      const leaving: Layer[] = cur && dir !== 'none' ? [{ ...cur, role: 'leaving', dir }] : [];
      leaving.forEach((l) => timers.current.set(l.key, window.setTimeout(() => drop(l.key), EXIT_FALLBACK_MS)));
      return [...leaving, { key, route, role: 'current', dir }];
    });
    // `route` and `dir` always change together with `key`.
  }, [key]);

  return (
    <>
      {layers.map((l) => (
        <div
          key={l.key}
          className={`layer layer-${l.role} nav-${l.dir}`}
          inert={l.role === 'leaving'}
          aria-hidden={l.role === 'leaving' || undefined}
          onAnimationEnd={(e) => {
            if (l.role === 'leaving' && e.target === e.currentTarget) drop(l.key);
          }}
        >
          {render(l.route)}
        </div>
      ))}
    </>
  );
}
