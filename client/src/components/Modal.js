// client/src/components/Modal.js
import React from 'react';

export default function Modal({ open, title, children, onClose, actions }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative modal-panel w-full max-w-lg">
        <div className="px-5 pt-4 pb-3 border-b border-[var(--border)] bg-gradient-to-r from-[var(--primary)] to-[var(--primary-600)] rounded-t-[18px]">
          <div className="flex items-center justify-between">
            <h3 className="text-white text-lg font-semibold">{title}</h3>
            <button
              className="px-2 py-1 rounded bg-white/15 hover:bg-white/25 text-white"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-5 space-y-3">
          {children}
        </div>

        <div className="px-5 pb-5 flex justify-end gap-2">
          {actions}
        </div>
      </div>
    </div>
  );
}
