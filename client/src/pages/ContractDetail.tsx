import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getContract, analyzeContract } from '../api';
import {
  Card, LoadingCenter, ErrorMsg, RiskBadge, RiskBar,
  StatusBadge, SeverityBadge, AIText, SectionHeader,
} from '../components/ui';
import { formatAmount } from '../types';

export default function ContractDetail() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['contract', id],
    queryFn: () => getContract(Number(id)),
    enabled: !!id,
  });

  const { mutate: analyze, isPending: analyzing, data: aiReport } = useMutation({
    mutationFn: () => analyzeContract(Number(id)),
  });

  if (isLoading) return <LoadingCenter />;
  if (error || !data) return <ErrorMsg message="Контракт не найден" />;

  // getContract returns ContractDetail directly (server wraps in {data:...}, api strips it)
  const contract   = data;
  const anomalies  = data.anomalies ?? [];
  const breakdown  = data.risk_breakdown;

  return (
    <div className="page-inner">
      <button className="btn-ghost" onClick={() => navigate('/contracts')}
        style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
        ← Назад к контрактам
      </button>

      {/* Header card */}
      <Card accent="cyan" style={{ marginBottom: 16, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', marginBottom: 6 }}>
              КОНТРАКТ #{contract.id} · {contract.category} · {contract.region}
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.35, marginBottom: 10 }}>
              {contract.title}
            </h2>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <StatusBadge status={contract.status} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' }}>
                {contract.date?.slice(0, 10) ?? '—'}
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--cyan)', marginBottom: 4 }}>
              {formatAmount(contract.amount)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>
              Рынок: {formatAmount(contract.market_avg_price)}
            </div>
            <RiskBadge score={contract.risk_score} showLabel />
          </div>
        </div>
      </Card>

      {/* Details grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Supplier */}
        <Card title="Поставщик" style={{ position: 'relative' }}>
          {contract.company ? (
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', marginBottom: 8 }}>
                {contract.company.name}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                <div><span style={{ color: 'var(--text-3)' }}>ИНН: </span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{contract.company.inn}</span></div>
                <div><span style={{ color: 'var(--text-3)' }}>Регион: </span>{contract.company.region}</div>
                <div><span style={{ color: 'var(--text-3)' }}>Побед: </span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan)' }}>{contract.company.wins_count}</span></div>
                <div><span style={{ color: 'var(--text-3)' }}>Риск: </span>
                  <RiskBadge score={contract.company.risk_score} /></div>
              </div>
            </div>
          ) : (
            <span style={{ color: 'var(--text-3)' }}>Нет данных</span>
          )}
        </Card>

        {/* Risk breakdown */}
        <Card title="Декомпозиция риска" style={{ position: 'relative' }}>
          {breakdown ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { key: 'price_score'      as const, label: 'Завышение цены',      weight: '30%' },
                { key: 'repeat_score'     as const, label: 'Повторный победитель', weight: '25%' },
                { key: 'affiliation_score'as const, label: 'Аффилированность',     weight: '25%' },
                { key: 'competition_score'as const, label: 'Конкуренция',          weight: '20%' },
              ].map(({ key, label, weight }) => (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 11 }}>
                    <span style={{ color: 'var(--text-2)' }}>{label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-3)', fontSize: 10 }}>{weight}</span>
                  </div>
                  <RiskBar score={breakdown[key] ?? 0} width={120} />
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Итоговый балл</span>
                <RiskBadge score={contract.risk_score} showLabel />
              </div>
            </div>
          ) : (
            <span style={{ color: 'var(--text-3)', fontSize: 12 }}>Нет данных декомпозиции</span>
          )}
        </Card>
      </div>

      {/* Contract info */}
      <Card title="Данные контракта" style={{ marginBottom: 16, position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, fontSize: 12 }}>
          {[
            { label: 'Сумма контракта',    value: formatAmount(contract.amount),          mono: true },
            { label: 'Рыночная цена',       value: formatAmount(contract.market_avg_price), mono: true },
            { label: 'Участников тендера',  value: String(contract.bidder_count),           mono: true },
            { label: 'Категория',           value: contract.category ?? '—' },
            { label: 'Регион',              value: contract.region ?? '—' },
            { label: 'Дата заключения',     value: contract.date?.slice(0, 10) ?? '—',      mono: true },
          ].map(({ label, value, mono }) => (
            <div key={label}>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
              <div style={{ fontFamily: mono ? 'var(--font-mono)' : undefined, color: 'var(--text-1)', fontWeight: 500 }}>{value}</div>
            </div>
          ))}
        </div>
        {contract.description && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.6 }}>
            {contract.description}
          </div>
        )}
      </Card>

      {/* Anomalies */}
      {anomalies.length > 0 && (
        <Card accent="red" style={{ marginBottom: 16, position: 'relative' }}>
          <SectionHeader title={`Аномалии (${anomalies.length})`} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {anomalies.map((a) => (
              <div key={a.id} style={{
                padding: '10px 14px', borderRadius: 6,
                background: 'rgba(255,71,71,.06)', border: '1px solid rgba(255,71,71,.15)',
                display: 'flex', gap: 12, alignItems: 'flex-start',
              }}>
                <SeverityBadge severity={a.severity} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 3 }}>{a.type}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{a.description}</div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                  {a.detected_at.slice(0, 10)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* AI Analysis */}
      <Card accent="purple" style={{ position: 'relative' }}>
        <SectionHeader
          title="AI Анализ"
          action={
            <button className="btn-primary" onClick={() => analyze()} disabled={analyzing}
              style={{ fontSize: 11, padding: '5px 14px' }}>
              {analyzing ? 'Анализирую...' : 'Запустить анализ'}
            </button>
          }
        />
        <div style={{ marginTop: 12 }}>
          {analyzing && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '12px 0' }}>
              <div className="thinking-dots"><span /><span /><span /></div>
              <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Анализирую контракт...</span>
            </div>
          )}
          {aiReport?.analysis && <AIText text={aiReport.analysis} />}
          {!analyzing && !aiReport && data.ai_analysis && <AIText text={data.ai_analysis} />}
          {!analyzing && !aiReport && !data.ai_analysis && (
            <div style={{ color: 'var(--text-3)', fontSize: 12, fontFamily: 'var(--font-mono)', padding: '8px 0' }}>
              Нажмите «Запустить анализ» для получения AI-заключения по данному контракту.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
