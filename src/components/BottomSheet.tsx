import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Icon } from './Icon';

const CLOSE_MS = 300;

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  /** 'soft' puts white cards on the light sheet colour instead of a white sheet. */
  tone?: 'white' | 'soft';
  /** Changes when the sheet shows different content (another note, contact...): focus and scroll start over. */
  contentKey?: string;
  children: ReactNode;
}

const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** Tabbable elements inside `root`: not disabled, not inside [inert] or [hidden], actually rendered. */
function focusables(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) =>
      el.tabIndex >= 0 &&
      !el.matches(':disabled') &&
      !el.closest('[inert], [hidden]') &&
      el.getClientRects().length > 0 &&
      getComputedStyle(el).visibility !== 'hidden',
  );
}

/**
 * Modal bottom sheet over the current screen: slides up, scrim closes it,
 * Esc closes it, focus stays inside and returns to where it came from.
 */
export function BottomSheet(props: Props) {
  const [mounted, setMounted] = useState(props.open);
  const [closing, setClosing] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  // Remember who opened the sheet during render: once committed, the screen behind
  // becomes inert and the browser drops focus from that element.
  if (props.open && !wasOpen.current) opener.current = document.activeElement as HTMLElement | null;
  wasOpen.current = props.open;

  useEffect(() => {
    if (props.open) {
      setMounted(true);
      setClosing(false);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const t = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
      opener.current?.focus?.({ preventScroll: true });
    }, CLOSE_MS);
    return () => window.clearTimeout(t);
  }, [props.open, mounted]);

  if (!mounted) return null;
  return <SheetBody {...props} closing={closing} />;
}

function SheetBody({ onClose, title, subtitle, tone = 'white', contentKey, children, closing }: Props & { closing: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // On open and whenever the content changes: back to the top, focus on the close button.
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const scroll = root.querySelector<HTMLElement>('.sheet-scroll');
    if (scroll) scroll.scrollTop = 0;
    root.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true });
  }, [contentKey]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !ref.current) return;
    const items = focusables(ref.current);
    if (items.length === 0) {
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (!ref.current.contains(active) || active === ref.current) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus({ preventScroll: true });
    } else if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus({ preventScroll: true });
    }
  };

  return (
    <div className={`scrim${closing ? ' closing' : ''}`} inert={closing}>
      <button type="button" className="scrim-hit" tabIndex={-1} aria-hidden="true" onClick={onClose} />
      <div ref={ref} className={`log-dialog${tone === 'soft' ? ' log-dialog-soft' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={onKeyDown}>
        <span className="grabber" aria-hidden="true" />
        <div className="log-head">
          <div className="log-titles">
            <h2 id={titleId}>{title}</h2>
            {subtitle && <span>{subtitle}</span>}
          </div>
          <button type="button" className="icon-btn icon-btn-soft" aria-label="Close" onClick={onClose} data-autofocus>
            <Icon name="close" size={18} color="#111A1B" />
          </button>
        </div>
        <div className="sheet-scroll">{children}</div>
      </div>
    </div>
  );
}
