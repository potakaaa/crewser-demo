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
          {toast.message}
        </div>
      )}
    </div>
  );
}
