import type { ReactNode, CSSProperties } from 'react';
import { getRiskLevel, getRiskColor, type RiskLevel } from '../../types';

// ─── Loading Spinner ──────────────────────────────────────────────────────────
export function Spinner({ size = 32 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', border: '2px solid rgba(0,212,255,.15)', borderTopColor: 'var(--cyan)', animation: 'spin .8s linear infinite' }} />
  );
}

export function LoadingCenter() {
  return <div className="loading-center"><Spinner /></div>;
}

// ─── Error ────────────────────────────────────────────────────────────────────
export function ErrorMsg({ message }: { message: string }) {
  return (
    <div style={{ padding: 24, textAlign: 'center', color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
      ⚠ {message}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({ message = 'Данные не найдены' }: { message?: string }) {
  return (
    <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
      {message}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
interface CardProps {
  children: ReactNode;
  title?: string;
  accent?: 'cyan' | 'red' | 'amber' | 'purple' | 'green';
  style?: CSSProperties;
  className?: string;
}

export function Card({ children, title, accent, style, className }: CardProps) {
  return (
    <div className={`card${className ? ' ' + className : ''}`} style={style}>
      {accent && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          borderRadius: 'var(--radius) var(--radius) 0 0',
          background: `linear-gradient(90deg, var(--${accent}), transparent)`,
          pointerEvents: 'none',
        }} />
      )}
      {title && <div className="card-title">{title}</div>}
      {children}
    </div>
  );
}

// ─── Risk Badge ───────────────────────────────────────────────────────────────
export function RiskBadge({ score, showLabel = false }: { score: number; showLabel?: boolean }) {
  const level: RiskLevel = getRiskLevel(score);
  const label = { critical: 'Крит.', high: 'Высок.', medium: 'Умер.', low: 'Низк.' }[level];
  return (
    <span className={`risk-badge ${level}`}>
      {score}{showLabel && <span style={{ marginLeft: 4, fontSize: 10, opacity: .8 }}>{label}</span>}
    </span>
  );
}

// ─── Risk Bar ─────────────────────────────────────────────────────────────────
export function RiskBar({ score, width = 64 }: { score: number; width?: number }) {
  const color = getRiskColor(score);
  return (
    <div className="risk-bar">
      <div className="risk-track" style={{ width }}>
        <div className="risk-fill" style={{ width: `${score}%`, background: color }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color, fontWeight: 600 }}>{score}</span>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active:       { label: 'Активный',      color: 'var(--cyan)'   },
  completed:    { label: 'Завершён',      color: 'var(--green)'  },
  suspended:    { label: 'Приостановлен', color: 'var(--amber)'  },
  investigating:{ label: 'Расследование', color: 'var(--red)'    },
};

export function StatusBadge({ status }: { status: string }) {
  const { label, color } = STATUS_MAP[status] ?? { label: status, color: 'var(--text-2)' };
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 4,
      fontSize: 10.5, fontFamily: 'var(--font-mono)',
      background: color + '18', color, border: `1px solid ${color}30`,
    }}>
      {label}
    </span>
  );
}

// ─── Severity Badge ───────────────────────────────────────────────────────────
const SEV_MAP: Record<string, { label: string; color: string; icon: string }> = {
  critical: { label: 'Критический', color: 'var(--red)',    icon: '🔴' },
  high:     { label: 'Высокий',     color: 'var(--amber)',  icon: '🟡' },
  medium:   { label: 'Средний',     color: 'var(--purple)', icon: '🟣' },
  low:      { label: 'Низкий',      color: 'var(--green)',  icon: '🟢' },
};

export function SeverityBadge({ severity }: { severity: string }) {
  const { label, color, icon } = SEV_MAP[severity] ?? { label: severity, color: 'var(--text-2)', icon: '⚪' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 8px', borderRadius: 4,
      fontSize: 11, fontFamily: 'var(--font-mono)',
      background: color + '18', color, border: `1px solid ${color}30`,
    }}>
      {icon} {label}
    </span>
  );
}

// ─── Tags from risk_flags JSON ────────────────────────────────────────────────
export function AnomalyTags({ flags, maxShow = 2 }: { flags: string; maxShow?: number }) {
  let items: string[] = [];
  try { items = JSON.parse(flags); } catch { return null; }
  if (!items.length) return null;
  const visible = items.slice(0, maxShow);
  const rest    = items.length - maxShow;
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {visible.map((f, i) => (
        <span key={i} className="tag red" style={{ fontSize: 10 }}>
          {f.length > 22 ? f.substring(0, 22) + '…' : f}
        </span>
      ))}
      {rest > 0 && <span className="tag amber" style={{ fontSize: 10 }}>+{rest}</span>}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
interface SectionHeaderProps {
  title: string;
  action?: ReactNode;
}
export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <div className="section-header">
      <div className="section-title">{title}</div>
      {action}
    </div>
  );
}

// ─── AI response renderer (simple markdown-like) ──────────────────────────────
export function AIText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="ai-text" style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text-1)' }}>
      {lines.map((line, i) => {
        if (line.startsWith('## '))  return <h3 key={i} style={{ color: 'var(--cyan)', marginTop: i > 0 ? 12 : 0, marginBottom: 6, fontSize: 14 }}>{line.slice(3)}</h3>;
        if (line.startsWith('### ')) return <h4 key={i} style={{ color: 'var(--text-1)', marginTop: 10, marginBottom: 4, fontSize: 13 }}>{line.slice(4)}</h4>;
        if (line.startsWith('---'))  return <hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '8px 0' }} />;
        if (!line.trim())            return <br key={i} />;

        const html = line
          .replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text-1)">$1</strong>')
          .replace(/`(.*?)`/g, `<code style="font-family:var(--font-mono);font-size:11px;background:rgba(0,212,255,.08);padding:1px 5px;border-radius:3px;color:var(--cyan)">$1</code>`);

        return <p key={i} style={{ margin: '3px 0' }} dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </div>
  );
}
