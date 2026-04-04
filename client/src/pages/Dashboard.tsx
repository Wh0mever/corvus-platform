import { useQuery } from '@tanstack/react-query';
import { getStats } from '../api';
import { Card, LoadingCenter, ErrorMsg, RiskBadge, SectionHeader } from '../components/ui';
import { formatAmount, getRiskColor } from '../types';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({ queryKey: ['stats'], queryFn: getStats });

  if (isLoading) return <LoadingCenter />;
  if (error || !data) return <ErrorMsg message="Ошибка загрузки данных" />;

  const chartData = data.monthly_trend.map((m) => ({
    month: m.month,
    contracts: m.total,
    amount: +(m.amount / 1_000_000).toFixed(1),
  }));

  const pieData = [
    { name: 'Критический', value: data.risk_distribution.critical, color: 'var(--red)'    },
    { name: 'Высокий',     value: data.risk_distribution.high,     color: 'var(--amber)'  },
    { name: 'Средний',     value: data.risk_distribution.medium,   color: 'var(--purple)' },
    { name: 'Низкий',      value: data.risk_distribution.low,      color: 'var(--green)'  },
  ].filter((d) => d.value > 0);

  const statCards = [
    { label: 'Всего контрактов',    value: data.total_contracts,                  accent: 'cyan',   fmt: (v: number) => String(v) },
    { label: 'Под риском (сумма)',  value: data.total_at_risk,                    accent: 'purple', fmt: formatAmount },
    { label: 'Подозрительных',      value: data.suspicious_count,                 accent: 'red',    fmt: (v: number) => String(v) },
    { label: 'Ср. риск по базе',    value: data.avg_risk_score,                   accent: 'amber',  fmt: (v: number) => v.toFixed(1) },
    { label: 'Критических',         value: data.risk_distribution.critical,       accent: 'red',    fmt: (v: number) => String(v) },
    { label: 'Непрочитанных алертов', value: data.unread_alerts,                  accent: 'cyan',   fmt: (v: number) => String(v) },
  ] as const;

  return (
    <div className="page-inner">
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        {statCards.map(({ label, value, accent, fmt }) => (
          <div key={label} className={`stat-card ${accent}`}>
            <div className="stat-value">{fmt(value as number)}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, marginBottom: 24 }}>
        <Card title="Динамика контрактов (12 месяцев)" accent="cyan" style={{ position: 'relative' }}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <XAxis dataKey="month" tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11 }}
                labelStyle={{ color: 'var(--text-1)' }}
              />
              <Line type="monotone" dataKey="contracts" stroke="var(--cyan)"   strokeWidth={2}   dot={false} name="Контракты" />
              <Line type="monotone" dataKey="amount"    stroke="var(--purple)" strokeWidth={1.5} dot={false} name="Сумма (млн)" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Распределение рисков" accent="red" style={{ position: 'relative' }}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                dataKey="value" paddingAngle={3}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} opacity={0.85} />)}
              </Pie>
              <Legend iconType="circle" iconSize={8}
                formatter={(value) => <span style={{ fontSize: 10.5, color: 'var(--text-2)' }}>{value}</span>}
              />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Top risks */}
      <Card accent="red">
        <SectionHeader title="Топ рисков" />
        <table className="data-table" style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>Объект</th>
              <th>Тип</th>
              <th>Риск</th>
              <th>Детали</th>
            </tr>
          </thead>
          <tbody>
            {data.top_risks.map((item, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 500 }}>{item.name}</td>
                <td>
                  <span className="tag" style={{
                    fontSize: 10,
                    background: item.type === 'contract' ? 'rgba(0,212,255,.12)' : item.type === 'company' ? 'rgba(168,85,247,.12)' : 'rgba(245,158,11,.12)',
                    color: item.type === 'contract' ? 'var(--cyan)' : item.type === 'company' ? 'var(--purple)' : 'var(--amber)',
                  }}>
                    {item.type === 'contract' ? 'Контракт' : item.type === 'company' ? 'Компания' : 'Персона'}
                  </span>
                </td>
                <td>
                  <span className={`risk-badge ${item.risk >= 80 ? 'critical' : item.risk >= 60 ? 'high' : item.risk >= 40 ? 'medium' : 'low'}`}>
                    {item.risk}
                  </span>
                </td>
                <td style={{ color: 'var(--text-3)', fontSize: 11 }}>{item.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
