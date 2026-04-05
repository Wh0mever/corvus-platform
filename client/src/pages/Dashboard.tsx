import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStats } from '../api';
import axios from 'axios';
import { Card, LoadingCenter, ErrorMsg, SectionHeader } from '../components/ui';
import { formatAmount } from '../types';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

async function seedDemo(): Promise<{ message: string; contracts: number }> {
  const res = await axios.post('/api/seed');
  return res.data;
}

export default function Dashboard() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['stats'], queryFn: getStats });

  const { mutate: loadDemo, isPending: seeding } = useMutation({
    mutationFn: seedDemo,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  if (isLoading) return <LoadingCenter />;
  if (error || !data) return <ErrorMsg message="Ошибка загрузки данных" />;

  const isEmpty = data.total_contracts === 0;

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
    { label: 'Всего контрактов',      value: data.total_contracts,            accent: 'cyan',   fmt: (v: number) => String(v) },
    { label: 'Под риском (сумма)',     value: data.total_at_risk,              accent: 'purple', fmt: formatAmount },
    { label: 'Подозрительных',         value: data.suspicious_count,           accent: 'red',    fmt: (v: number) => String(v) },
    { label: 'Ср. риск по базе',       value: data.avg_risk_score,             accent: 'amber',  fmt: (v: number) => v.toFixed(1) },
    { label: 'Критических',            value: data.risk_distribution.critical, accent: 'red',    fmt: (v: number) => String(v) },
    { label: 'Непрочитанных алертов',  value: data.unread_alerts,              accent: 'cyan',   fmt: (v: number) => String(v) },
  ] as const;

  return (
    <div className="page-inner">

      {/* Empty-state onboarding banner */}
      {isEmpty && (
        <div style={{
          marginBottom: 24, padding: '20px 24px', borderRadius: 10,
          background: 'rgba(0,212,255,.06)', border: '1px solid rgba(0,212,255,.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--cyan)', marginBottom: 4 }}>
              База данных пуста
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', maxWidth: 560 }}>
              Загрузите демонстрационные данные для работы с платформой, или перейдите в раздел{' '}
              <strong style={{ color: 'var(--text-1)' }}>Разведка</strong> для поиска реальных компаний и тендеров.
            </div>
          </div>
          <button className="btn-primary" style={{ whiteSpace: 'nowrap', minWidth: 200, fontSize: 12 }}
            onClick={() => loadDemo()} disabled={seeding}>
            {seeding ? '⏳ Загрузка...' : '🗂 Загрузить демо-данные'}
          </button>
        </div>
      )}

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
      {data.top_risks.length > 0 && (
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
      )}

      {isEmpty && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
          {[
            { icon: '🔍', title: 'Поиск компаний', desc: 'Найдите любую компанию Узбекистана по ИНН или названию — данные из orginfo.uz', link: '/intelligence' },
            { icon: '📋', title: 'Живые тендеры',  desc: 'Мониторинг государственных закупок в реальном времени через xarid.uzex.uz',   link: '/intelligence' },
            { icon: '🤖', title: 'AI Разведка',    desc: 'Глубокий анализ компаний, чиновников и контрактов с помощью Perplexity AI',   link: '/intelligence' },
          ].map(card => (
            <div key={card.title} style={{ padding: '20px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10 }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{card.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 6 }}>{card.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5, marginBottom: 12 }}>{card.desc}</div>
              <a href={card.link} style={{ fontSize: 11, color: 'var(--cyan)', textDecoration: 'none' }}>Открыть →</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
