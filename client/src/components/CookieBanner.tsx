import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const COOKIE_KEY = 'corvus_cookie_consent';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY);
    if (!consent) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, 'accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(COOKIE_KEY, 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      background: 'rgba(7,16,26,.98)',
      borderTop: '1px solid var(--border)',
      backdropFilter: 'blur(12px)',
      padding: '14px 24px',
      display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
    }}>
      <div style={{ flex: 1, minWidth: 260, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
        <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>CORVUS</span> использует технические cookies для работы платформы.
        Мы не используем рекламные трекеры.{' '}
        <Link to="/privacy" style={{ color: 'var(--cyan)', opacity: 0.8 }}>
          Политика конфиденциальности
        </Link>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button onClick={decline} className="btn-ghost"
          style={{ fontSize: 11, padding: '6px 16px' }}>
          Отклонить
        </button>
        <button onClick={accept} className="btn-primary"
          style={{ fontSize: 11, padding: '6px 16px' }}>
          Принять
        </button>
      </div>
    </div>
  );
}
