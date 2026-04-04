import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getContracts } from '../api';
import { Card, LoadingCenter, ErrorMsg, EmptyState, RiskBadge, StatusBadge, AnomalyTags } from '../components/ui';
import { formatAmount } from '../types';

const RISK_TABS = [
  { key: '', label: 'Все' },
  { key: 'critical', label: 'Критический' },
  { key: 'high',     label: 'Высокий' },
  { key: 'medium',   label: 'Средний' },
  { key: 'low',      label: 'Низкий' },
];

export default function Contracts() {
  const navigate = useNavigate();
  const [search, setSearch]   = useState('');
  const [riskLevel, setRisk]  = useState('');
  const [page, setPage]       = useState(1);

  const filters = {
    search:     search || undefined,
    risk_level: riskLevel || undefined,
    page,
    limit: 15,
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['contracts', filters],
    queryFn: () => getContracts(filters),
    placeholderData: (prev) => prev,
  });

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleRisk   = (v: string) => { setRisk(v);   setPage(1); };

  return (
    <div className="page-inner">
      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="search-box"
          style={{ flex: '1 1 260px', maxWidth: 360 }}
          placeholder="Поиск по названию, поставщику, региону..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          {RISK_TABS.map(({ key, label }) => (
            <button key={key} className={`filter-tab${riskLevel === key ? ' active' : ''}`}
              onClick={() => handleRisk(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <Card style={{ position: 'relative' }}>
        {isLoading && <LoadingCenter />}
        {error    && <ErrorMsg message="Ошибка загрузки контрактов" />}
        {!isLoading && !error && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>
                Найдено: {data?.total ?? 0} контрактов
              </span>
            </div>

            {(!data?.contracts.length) ? <EmptyState /> : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Название контракта</th>
                    <th>Поставщик</th>
                    <th>Сумма</th>
                    <th>Регион</th>
                    <th>Риск</th>
                    <th>Аномалии</th>
                    <th>Статус</th>
                    <th>Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {data.contracts.map((c) => (
                    <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/contracts/${c.id}`)}>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-3)', fontSize: 10 }}>#{c.id}</td>
                      <td style={{ maxWidth: 260 }}>
                        <div style={{ fontWeight: 500, fontSize: 12.5, color: 'var(--text-1)', lineHeight: 1.3 }}>{c.title}</div>
                        {c.category && <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{c.category}</div>}
                      </td>
                      <td style={{ fontSize: 12 }}>{c.supplier_name}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--cyan)', whiteSpace: 'nowrap' }}>
                        {formatAmount(c.amount)}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{c.region}</td>
                      <td><RiskBadge score={c.risk_score} showLabel /></td>
                      <td><AnomalyTags flags={c.risk_flags} maxShow={2} /></td>
                      <td><StatusBadge status={c.status} /></td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                        {c.date?.slice(0, 10) ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Pagination */}
            {data && data.total > 15 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 }}>
                {Array.from({ length: Math.ceil(data.total / 15) }, (_, i) => i + 1).map((p) => (
                  <button key={p} className={`filter-tab${page === p ? ' active' : ''}`}
                    onClick={() => setPage(p)} style={{ minWidth: 32 }}>
                    {p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
