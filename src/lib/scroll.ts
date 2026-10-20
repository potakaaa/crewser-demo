import { useLayoutEffect, useRef } from 'react';

// Remembers each screen's scroll position so going back from a detail lands where you were.
const positions = new Map<string, number>();

export const clearScrollPositions = () => positions.clear();

export const scrollAllToTop = () => {
  positions.clear();
  document.querySelectorAll<HTMLElement>('.screen, .screen-scroll').forEach((el) => (el.scrollTop = 0));
};

/**
 * Restores the scroll position for `key` and reports when the light sheet has
 * scrolled up under the status bar, so the status bar can switch to dark text.
 */
export function useScrollRestore<T extends HTMLElement>(key: string, onPastHeader?: (past: boolean) => void) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let last: string | null = null;
    const update = () => {
      positions.set(key, el.scrollTop);
      const header = el.querySelector<HTMLElement>('.gh');
      const band = el.querySelector<HTMLElement>('.sat-band');
      const past = !!header && el.scrollTop > header.offsetHeight - 20 - (band?.offsetHeight ?? 0);
      // top: nothing under the status bar yet · header: dark header under it · sheet: light sheet under it
      const phase = past ? 'sheet' : el.scrollTop > 4 ? 'header' : 'top';
      if (phase !== last) {
        last = phase;
        el.dataset.scrolled = phase;
        onPastHeader?.(past);
      }
    };
    el.scrollTop = positions.get(key) ?? 0;
    update();
    el.addEventListener('scroll', update, { passive: true });
    return () => el.removeEventListener('scroll', update);
  }, [key, onPastHeader]);
  return ref;
}
