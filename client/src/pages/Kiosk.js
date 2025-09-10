// client/src/pages/Kiosk.js
import React, { useEffect, useMemo, useState } from 'react';

export default function Kiosk() {
  const [refresh, setRefresh] = useState(0);
  const [qrSize, setQrSize] = useState(320);

  // מחשב גודל QR לפי רוחב המסך (ידידותי למובייל)
  useEffect(() => {
    const calc = () => {
      const gutter = 48; // שוליים
      const size = Math.min(360, Math.max(200, Math.floor(window.innerWidth - gutter)));
      setQrSize(size);
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  // QR אחד שמפנה ל /qr/auto (שם מתבצע Toggle + GPS)
  const qrUrl = useMemo(() => {
    const url = new URL('/qr/auto', window.location.origin);
    url.searchParams.set('ts', String(Date.now()));
    return url.toString();
  }, [refresh]);

  const qrImg = useMemo(() => {
    const encoded = encodeURIComponent(qrUrl);
    return `https://api.qrserver.com/v1/create-qr-code/?data=${encoded}&size=${qrSize}x${qrSize}&margin=0`;
  }, [qrUrl, qrSize]);

  return (
    <div
      className="container"
      style={{
        minHeight: 'calc(100vh - 120px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div className="card" style={{ padding: 16, textAlign: 'center', borderRadius: 16, width: '100%', maxWidth: 560 }}>
        <h2 className="h2" style={{ marginBottom: 6 }}>Kiosk</h2>
        <div className="muted" style={{ marginBottom: 12 }}>
          Scan once — we will clock you <b>in</b> or <b>out</b> automatically (with GPS).
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <img
            src={qrImg}
            width={qrSize}
            height={qrSize}
            alt="Auto toggle QR"
            style={{ borderRadius: 12, width: qrSize, height: qrSize }}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <button className="btn" onClick={() => setRefresh((x) => x + 1)}>Refresh QR</button>
        </div>

        <div className="muted" style={{ marginTop: 10, direction: 'ltr', overflowWrap: 'anywhere', fontSize: 12 }}>
          {qrUrl}
        </div>
      </div>
    </div>
  );
}
