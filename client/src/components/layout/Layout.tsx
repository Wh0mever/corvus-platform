import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Header from './Header';
import CookieBanner from '../CookieBanner';

interface Props { children: ReactNode; }

export default function Layout({ children }: Props) {
  return (
    <div className="layout bg-grid">
      <Header />
      <main className="page-content">{children}</main>
      <footer style={{
        height: 30, background: 'rgba(7,16,26,.97)',
        borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 24px',
        flexShrink: 0,
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)', display: 'flex', gap: 14, alignItems: 'center' }}>
          <span>CORVUS v3.0</span>
          <span>·</span>
          <span>Perplexity AI</span>
          <span>·</span>
          <Link to="/privacy" style={{ color: 'var(--text-3)', opacity: .7 }}>Конфиденциальность</Link>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span>🇺🇿</span>
          <span>Разработано в Узбекистане ·</span>
          <a href="https://whomever.uz" target="_blank" rel="noreferrer"
            style={{ color: 'var(--cyan)', opacity: .65, letterSpacing: '.1em' }}>
            WHOMEVER
          </a>
        </div>
      </footer>
      <CookieBanner />
    </div>
  );
}
