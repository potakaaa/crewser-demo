import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { today } from '../mock';

/** Dark gradient header with the faint lime glow, used on every main screen. */
export function GradientHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <header className={`gh grain ${className}`}>{children}</header>;
}

/** The light sheet that overlaps the header by 20 px. */
export function Sheet({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`sheet ${className}`}>{children}</div>;
}

export function ScreenTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="gh-titlebar">
      <div className="gh-titles">
        <span className="gh-eyebrow">{eyebrow}</span>
        <h1 className="display">{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function OfflineBanner({ tone }: { tone: 'dark' | 'light' }) {
  if (tone === 'light') {
    return (
      <div className="offline offline-light" role="status">
        <Icon name="wifiOff" size={16} color="#6B4A00" />
        Offline · last synced {today.lastSynced}
      </div>
    );
  }
  return (
    <div className="offline offline-dark" role="status">
      <Icon name="wifiOff" size={20} color="#F4C35A" />
      <div className="offline-copy">
        <strong>Offline · last synced {today.lastSynced}</strong>
        <span>Tickets and attachments are saved on this phone.</span>
      </div>
    </div>
  );
}

export function SectionHead({ title, sub, link, onLink }: { title: string; sub?: string; link?: string; onLink?: () => void }) {
  return (
    <div className="section-head">
      <div className="section-titles">
        <h2>{title}</h2>
        {sub && <span>{sub}</span>}
      </div>
      {link && (
        <button type="button" className="link-btn" onClick={onLink}>
          {link}
        </button>
      )}
    </div>
  );
}

export function Collapse({ open, id, children }: { open: boolean; id?: string; children: ReactNode }) {
  return (
    <div className="collapse" data-open={open} id={id} inert={!open}>
      <div className="collapse-inner">{children}</div>
    </div>
  );
}
