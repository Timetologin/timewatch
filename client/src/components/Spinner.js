// client/src/components/Spinner.jsx
import React from 'react';

export default function Spinner({ label = 'Loading...' }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:12 }}>
      <div style={{
        width: 18, height: 18, border: '3px solid #ddd',
        borderTopColor: '#555', borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <span>{label}</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
