import { useEffect, useState } from 'react';
import { useDemo } from '../store';

export function Toast({ raised }: { raised: boolean }) {
  const toast = useDemo((s) => s.toast);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), 2000);
    return () => window.clearTimeout(t);
  }, [toast]);

  return (
    <div className={`toast-region${raised ? ' raised' : ''}`} aria-live="polite" aria-atomic="true">
      {toast && (
        <div key={toast.id} className={`toast${visible ? ' show' : ''}`}>
          <svg className="toast-burst" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2.5v6M12 15.5v6M2.5 12h6M15.5 12h6M5.3 5.3l4.2 4.2M14.5 14.5l4.2 4.2M18.7 5.3l-4.2 4.2M9.5 14.5l-4.2 4.2" />
          </svg>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
