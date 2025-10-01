// client/src/components/ThemeToggle.jsx
import React, { useEffect, useState, useCallback } from 'react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    try { return document.documentElement.dataset.theme || 'light'; }
    catch { return 'light'; }
  });

  useEffect(() => {
    try { setTheme(document.documentElement.dataset.theme || 'light'); } catch {}
  }, []);

  const toggle = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    try {
      document.documentElement.dataset.theme = next;
      localStorage.setItem('theme', next);
    } catch {}
    setTheme(next);
  }, [theme]);

  const isDark = theme === 'dark';

  return (
    <button className="theme-toggle" onClick={toggle} aria-label="Toggle theme">
      {isDark ? (
        // אייקון שמש
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="4"></circle>
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>
        </svg>
      ) : (
        // אייקון ירח
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      )}
    </button>
  );
}
