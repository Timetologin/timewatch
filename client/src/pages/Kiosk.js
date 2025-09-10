// client/src/pages/Kiosk.js
import React, { useMemo, useState } from 'react';

export default function Kiosk() {
  const [refresh, setRefresh] = useState(0);

  // QR אחד שמפנה למסך לקוח /qr/auto (שם מתבצע Toggle + GPS)
  const qrUrl = useMemo(() => {
    const url = new URL('/qr/auto', window.location.origin);
    url.searchParams.set('ts', String(Date.now()));
    return url.toString();
  }, [refresh]);

  const qrImg = useMemo(() => {
    const encoded = encodeURIComponent(qrUrl);
    return `https://api.qrserver.com/v1/create-qr-code/?data=${encoded}&size=360x360&margin=0`;
  }, [qrUrl]);

  return (
    <div
      className="container"
      style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div className="card" style={{ padding: 24, textAlign: 'center' }}>
        <h2 className="h2" style={{ marginBottom: 8 }}>Kiosk</h2>
        <div className="muted" style={{ marginBottom: 16 }}>
          Scan once — we will clock you <b>in</b> or <b>out</b> automatically (with GPS).
        </div>

        <img src={qrImg} width={360} height={360} alt="Auto toggle QR" style={{ borderRadius: 12 }} />

        <div style={{ marginTop: 12 }}>
          <button className="btn" onClick={() => setRefresh(x => x + 1)}>Refresh QR</button>
        </div>

        <div className="muted" style={{ marginTop: 10, direction: 'ltr', overflowWrap: 'anywhere' }}>
          {qrUrl}
        </div>
      </div>
    </div>
  );
}
