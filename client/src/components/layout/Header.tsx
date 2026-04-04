import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getStats } from '../../api';

const NAV = [
  { to: '/',          label: 'Обзор',       icon: '⊞' },
  { to: '/contracts', label: 'Контракты',   icon: '≡' },
  { to: '/graph',     label: 'Граф связей', icon: '◎' },
  { to: '/ai',        label: 'AI Аналитик', icon: '◈' },
  { to: '/alerts',    label: 'Уведомления', icon: '⚠', badge: true },
];

export default function Header() {
  const [time, setTime] = useState('');
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    const update = () => {
      const n = new Date();
      const p = (x: number) => String(x).padStart(2, '0');
      setTime(`${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header style={{
      display: 'flex', alignItems: 'center', padding: '0 24px',
      height: 58, background: 'rgba(7,16,26,.97)',
      borderBottom: '1px solid var(--border)',
      flexShrink: 0, position: 'relative', zIndex: 100,
    }}>
      {/* Logo */}
      <button
        onClick={() => navigate('/')}
        style={{ display: 'flex', alignItems: 'center', gap: 12, marginRight: 32, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
          <circle cx="17" cy="17" r="13" stroke="#00d4ff" strokeWidth="1.2" opacity=".28"/>
          <circle cx="17" cy="17" r="9"  stroke="#00d4ff" strokeWidth="1.2" opacity=".5"/>
          <circle cx="17" cy="17" r="5.5" stroke="#00d4ff" strokeWidth="1.5"/>
          <circle cx="17" cy="17" r="2.8" fill="#00d4ff"/>
          <line x1="4"  y1="17" x2="11.5" y2="17" stroke="#00d4ff" strokeWidth="1" opacity=".5"/>
          <line x1="22.5" y1="17" x2="30" y2="17" stroke="#00d4ff" strokeWidth="1" opacity=".5"/>
          <line x1="17" y1="4"  x2="17" y2="11.5" stroke="#00d4ff" strokeWidth="1" opacity=".5"/>
          <line x1="17" y1="22.5" x2="17" y2="30" stroke="#00d4ff" strokeWidth="1" opacity=".5"/>
        </svg>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '.12em', color: 'var(--cyan)', textShadow: '0 0 24px rgba(0,212,255,.5)' }}>CORVUS</div>
          <div style={{ fontSize: 8.5, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', letterSpacing: '.18em', textTransform: 'uppercase', marginTop: -3 }}>Anti-Corruption Intelligence</div>
        </div>
      </button>

      {/* Navigation */}
      <nav style={{ display: 'flex', gap: 2, flex: 1 }}>
        {NAV.map(({ to, label, icon, badge }) => (
          <NavLink key={to} to={to} end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '5px 14px', border: 'none',
              background: isActive ? 'rgba(0,212,255,.09)' : 'transparent',
              color: isActive ? 'var(--cyan)' : 'var(--text-2)',
              borderRadius: 6, fontSize: 12.5, fontWeight: 500,
              letterSpacing: '.06em', textTransform: 'uppercase',
              textDecoration: 'none', transition: 'all .2s',
              position: 'relative',
            })}
          >
            {({ isActive }) => (
              <>
                <span style={{ fontSize: 13 }}>{icon}</span>
                {label}
                {badge && stats && stats.unread_alerts > 0 && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    minWidth: 16, height: 16, padding: '0 4px',
                    background: 'var(--red)', color: '#fff',
                    borderRadius: 8, fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700,
                  }}>
                    {stats.unread_alerts}
                  </span>
                )}
                {isActive && (
                  <span style={{
                    position: 'absolute', bottom: -1, left: 14, right: 14,
                    height: 2, background: 'var(--cyan)', borderRadius: 1,
                    boxShadow: '0 0 10px var(--cyan)',
                  }}/>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>
          <span style={{ width: 6, height: 6, background: 'var(--green)', borderRadius: '50%' }} className="blink"/>
          СИСТЕМА АКТИВНА
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)', letterSpacing: '.05em' }}>
          {time}
        </div>
      </div>
    </header>
  );
}
