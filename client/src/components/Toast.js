import React, { useEffect } from 'react';

export default function Toast({ show, type = 'success', title, message, onClose, duration = 3000 }) {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(t);
  }, [show, duration, onClose]);

  if (!show) return null;

  const isOk = type === 'success';
  const cls = isOk ? 'toast-ok' : 'toast-error';

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <div className={`toast-box ${cls}`}>
        <div className="font-semibold text-sm mb-0.5">{title}</div>
        {message && <div className="text-sm/5 opacity-95">{message}</div>}
      </div>
    </div>
  );
}
