import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getStats } from '../../api';

const NAV = [
  { to: '/',             label: 'Обзор',       icon: '⊞' },
  { to: '/contracts',    label: 'Контракты',   icon: '≡' },
  { to: '/intelligence', label: 'Разведка',    icon: '◉' },
  { to: '/graph',        label: 'Граф связей', icon: '◎' },
  { to: '/cases',        label: 'Дела',        icon: '⚑' },
  { to: '/ai',           label: 'AI Аналитик', icon: '◈' },
  { to: '/alerts',       label: 'Уведомления', icon: '⚠', badge: true },
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
      display: 'flex', alignItems: 'center', padding: '0 20px',
      height: 54, background: 'rgba(7,16,26,.97)',
      borderBottom: '1px solid var(--border)',
      flexShrink: 0, position: 'relative', zIndex: 100,
    }}>
      {/* Logo */}
      <button onClick={() => navigate('/')}
        style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 24, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <svg width="30" height="30" viewBox="0 0 34 34" fill="none">
          <circle cx="17" cy="17" r="13" stroke="#00d4ff" strokeWidth="1.2" opacity=".28"/>
          <circle cx="17" cy="17" r="9"  stroke="#00d4ff" strokeWidth="1.2" opacity=".5"/>
          <circle cx="17" cy="17" r="5.5" stroke="#00d4ff" strokeWidth="1.5"/>
          <circle cx="17" cy="17" r="2.8" fill="#00d4ff"/>
          <line x1="4" y1="17" x2="11.5" y2="17" stroke="#00d4ff" strokeWidth="1" opacity=".5"/>
          <line x1="22.5" y1="17" x2="30" y2="17" stroke="#00d4ff" strokeWidth="1" opacity=".5"/>
          <line x1="17" y1="4" x2="17" y2="11.5" stroke="#00d4ff" strokeWidth="1" opacity=".5"/>
          <line x1="17" y1="22.5" x2="17" y2="30" stroke="#00d4ff" strokeWidth="1" opacity=".5"/>
        </svg>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '.12em', color: 'var(--cyan)', textShadow: '0 0 24px rgba(0,212,255,.5)' }}>CORVUS</div>
          <div style={{ fontSize: 7.5, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', letterSpacing: '.18em', textTransform: 'uppercase', marginTop: -2 }}>v3 · Anti-Corruption</div>
        </div>
      </button>

      {/* Navigation */}
      <nav style={{ display: 'flex', gap: 1, flex: 1, overflow: 'hidden' }}>
        {NAV.map(({ to, label, icon, badge }) => (
          <NavLink key={to} to={to} end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 11px', border: 'none',
              background: isActive ? 'rgba(0,212,255,.09)' : 'transparent',
              color: isActive ? 'var(--cyan)' : 'var(--text-2)',
              borderRadius: 6, fontSize: 11.5, fontWeight: 500,
              letterSpacing: '.05em', textTransform: 'uppercase',
              textDecoration: 'none', transition: 'all .18s',
              position: 'relative', whiteSpace: 'nowrap',
            })}
          >
            {({ isActive }) => (
              <>
                <span style={{ fontSize: 12 }}>{icon}</span>
                {label}
                {badge && stats && stats.unread_alerts > 0 && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    minWidth: 15, height: 15, padding: '0 3px',
                    background: 'var(--red)', color: '#fff',
                    borderRadius: 8, fontSize: 8, fontFamily: 'var(--font-mono)', fontWeight: 700,
                  }}>
                    {stats.unread_alerts}
                  </span>
                )}
                {isActive && (
                  <span style={{
                    position: 'absolute', bottom: -1, left: 11, right: 11,
                    height: 2, background: 'var(--cyan)', borderRadius: 1,
                    boxShadow: '0 0 8px var(--cyan)',
                  }}/>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>
          <span style={{ width: 5, height: 5, background: 'var(--green)', borderRadius: '50%' }} className="blink"/>
          СИСТЕМА АКТИВНА
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' }}>{time}</div>
      </div>
    </header>
  );
}
