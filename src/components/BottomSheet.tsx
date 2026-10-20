import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Icon } from './Icon';

const CLOSE_MS = 300;

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
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

function SheetBody({ onClose, title, subtitle, children, closing }: Props & { closing: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useRef(`sheet-${Math.random().toString(36).slice(2, 8)}`).current;

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true });
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !ref.current) return;
    const items = ref.current.querySelectorAll<HTMLElement>('button:not([disabled])');
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus({ preventScroll: true });
    }
  };

  return (
    <div className={`scrim${closing ? ' closing' : ''}`}>
      <button type="button" className="scrim-hit" tabIndex={-1} aria-hidden="true" onClick={onClose} />
      <div ref={ref} className="log-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={onKeyDown}>
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
