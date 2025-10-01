// client/src/components/EmojiPicker.jsx
import React from 'react';

const EMOJI = ['🙂','😀','😎','🤓','🧑‍💻','🧠','🚀','🔥','⭐','🦊','🐼','🐨','🐵','🐯','🐸'];

export default function EmojiPicker({ value, onPick }) {
  return (
    <div className="card" style={{ padding: 12, maxWidth: 320 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
        {EMOJI.map(e => (
          <button
            key={e}
            onClick={() => onPick && onPick(e)}
            className="btn-ghost"
            style={{
              fontSize: 22,
              lineHeight: '28px',
              padding: 6,
              border: value === e ? '2px solid #0f172a' : '1px solid #e2e8f0',
              borderRadius: 10
            }}
            title={e}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
