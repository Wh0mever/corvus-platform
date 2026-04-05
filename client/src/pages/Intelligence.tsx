import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { lookupCompany, addCompanyToDb, getLiveTenders, crosscheckCompany } from '../api';
import { Card, LoadingCenter, ErrorMsg, EmptyState, SectionHeader } from '../components/ui';
import { formatAmount, getRiskColor } from '../types';
import type { OrgInfoResult, LiveTender } from '../types';

type Tab = 'lookup' | 'tenders' | 'crosscheck';

export default function Intelligence() {
  const [tab, setTab] = useState<Tab>('lookup');
  const [query, setQuery] = useState('');
  const [inn, setInn] = useState('');
  const [crossQuery, setCrossQuery] = useState('');
  const [crossInn, setCrossInn] = useState('');
  const qc = useQueryClient();

  // Company lookup
  const { data: lookupData, isFetching: lookupLoading, refetch: doLookup, error: lookupError } = useQuery({
    queryKey: ['intelligence-lookup', query, inn],
    queryFn: () => lookupCompany({ q: query || undefined, inn: inn || undefined }),
    enabled: false,
  });

  // Live tenders
  const { data: tendersData, isLoading: tendersLoading, error: tendersError } = useQuery({
    queryKey: ['live-tenders'],
    queryFn: getLiveTenders,
    enabled: tab === 'tenders',
    staleTime: 5 * 60_000,
  });

  // Crosscheck
  const { data: crossData, isFetching: crossLoading, refetch: doCross } = useQuery({
    queryKey: ['crosscheck', crossQuery, crossInn],
    queryFn: () => crosscheckCompany({ name: crossQuery || undefined, inn: crossInn || undefined }),
    enabled: false,
  });

  // Add company to DB
  const { mutate: addCompany, isPending: adding } = useMutation({
    mutationFn: (d: OrgInfoResult) => addCompanyToDb({ inn: d.inn, name: d.name, region: 'Ташкент' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stats'] }),
  });

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'lookup',     label: 'Поиск компании',   icon: '🔍' },
    { key: 'tenders',   label: 'Живые тендеры',     icon: '📋' },
    { key: 'crosscheck',label: 'Перекрёстная проверка', icon: '🕸' },
  ];

  const orgResult: OrgInfoResult | null = lookupData?.data ?? null;
  const crossResult = (crossData?.data as { company?: object; relationships?: object[]; contracts?: object[] } | null) ?? null;
  const tenders: LiveTender[] = tendersData?.data ?? [];

  return (
    <div className="page-inner">
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.key} className={`filter-tab${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)} style={{ fontSize: 12, padding: '7px 16px' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Company Lookup ── */}
      {tab === 'lookup' && (
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16, alignItems: 'start' }}>
          <Card title="Поиск по orginfo.uz" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.08em' }}>ИНН компании</div>
                <input className="search-box" placeholder="123456789 (9 цифр)" value={inn}
                  onChange={e => setInn(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  style={{ width: '100%' }} />
              </div>
              <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-3)' }}>— или —</div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.08em' }}>Название компании</div>
                <input className="search-box" placeholder="ООО Ромашка..." value={query}
                  onChange={e => setQuery(e.target.value)} style={{ width: '100%' }} />
              </div>
              <button className="btn-primary" style={{ marginTop: 4 }}
                onClick={() => doLookup()} disabled={(!inn && !query) || lookupLoading}>
                {lookupLoading ? 'Запрос...' : '🔍 Найти компанию'}
              </button>
              {lookupError && <div style={{ fontSize: 11, color: 'var(--red)' }}>Ошибка запроса</div>}
            </div>

            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 10.5, color: 'var(--text-3)', lineHeight: 1.6 }}>
              Данные запрашиваются из <span style={{ color: 'var(--cyan)' }}>orginfo.uz</span> — официального реестра юридических лиц Узбекистана
            </div>
          </Card>

          <Card title="Результат поиска" style={{ position: 'relative', minHeight: 200 }}>
            {lookupLoading && <LoadingCenter />}
            {!lookupLoading && !lookupData && (
              <div style={{ color: 'var(--text-3)', fontSize: 12, fontFamily: 'var(--font-mono)', padding: '20px 0', textAlign: 'center' }}>
                Введите ИНН или название компании и нажмите «Найти»
              </div>
            )}
            {lookupData && !orgResult && (
              <div style={{ color: 'var(--text-3)', fontSize: 12, padding: '20px 0', textAlign: 'center' }}>
                Компания не найдена в реестре orginfo.uz
              </div>
            )}
            {orgResult && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>{orgResult.name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)' }}>ИНН: {orgResult.inn}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {lookupData?.db_company ? (
                      <span style={{ fontSize: 10, padding: '4px 10px', background: 'rgba(16,185,129,.12)', color: 'var(--green)', border: '1px solid rgba(16,185,129,.3)', borderRadius: 4 }}>
                        ✓ В базе CORVUS
                      </span>
                    ) : (
                      <button className="btn-primary" style={{ fontSize: 10, padding: '4px 12px' }}
                        onClick={() => addCompany(orgResult)} disabled={adding}>
                        {adding ? '...' : '+ Добавить в базу'}
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Директор',           value: orgResult.director },
                    { label: 'Адрес',              value: orgResult.address },
                    { label: 'Дата регистрации',   value: orgResult.registration_date },
                    { label: 'Основная деятельность', value: orgResult.main_activity },
                    { label: 'Статус',             value: orgResult.status },
                    { label: 'Источник данных',    value: orgResult.source === 'orginfo' ? 'orginfo.uz' : 'Perplexity AI' },
                  ].filter(r => r.value).map(({ label, value }) => (
                    <div key={label} style={{ fontSize: 12 }}>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2 }}>{label}</div>
                      <div style={{ color: 'var(--text-1)' }}>{value}</div>
                    </div>
                  ))}
                </div>

                {orgResult.founders && orgResult.founders.length > 0 && (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 6 }}>УЧРЕДИТЕЛИ</div>
                    {orgResult.founders.map((f, i) => (
                      <div key={i} style={{ fontSize: 12, color: 'var(--text-1)', padding: '3px 0' }}>• {f}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Live Tenders ── */}
      {tab === 'tenders' && (
        <Card style={{ position: 'relative' }}>
          <SectionHeader title={`Активные тендеры — xarid.uzex.uz${tendersData ? ` (${tenders.length})` : ''}`} />
          {tendersLoading && <LoadingCenter />}
          {tendersError && <ErrorMsg message="Не удалось получить данные с xarid.uzex.uz" />}
          {!tendersLoading && tenders.length === 0 && <EmptyState message="Тендеры не найдены" />}
          {tenders.length > 0 && (
            <table className="data-table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Заказчик</th>
                  <th>Сумма</th>
                  <th>Категория</th>
                  <th>Регион</th>
                  <th>Дедлайн</th>
                  <th>Опубликован</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tenders.map(t => (
                  <tr key={t.id}>
                    <td style={{ maxWidth: 280, fontWeight: 500, fontSize: 12 }}>{t.title}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-2)' }}>{t.customer}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)', whiteSpace: 'nowrap' }}>
                      {t.amount ? formatAmount(t.amount) : '—'}
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{t.category ?? '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{t.region ?? '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: t.deadline && new Date(t.deadline) < new Date() ? 'var(--red)' : 'var(--amber)' }}>
                      {t.deadline ?? '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)' }}>{t.published_at}</td>
                    <td>
                      <a href={t.url} target="_blank" rel="noreferrer"
                        style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--cyan)', opacity: 0.7 }}>
                        ↗
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ marginTop: 12, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>
            Источник: {tendersData?.source ?? 'xarid.uzex.uz'} · Обновляется каждые 5 минут
          </div>
        </Card>
      )}

      {/* ── Crosscheck ── */}
      {tab === 'crosscheck' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }}>
          <Card title="Перекрёстная проверка" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.08em' }}>ИНН</div>
                <input className="search-box" placeholder="123456789" value={crossInn}
                  onChange={e => setCrossInn(e.target.value.replace(/\D/g, '').slice(0, 9))} style={{ width: '100%' }} />
              </div>
              <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-3)' }}>— или —</div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.08em' }}>Название</div>
                <input className="search-box" placeholder="ООО Название..." value={crossQuery}
                  onChange={e => setCrossQuery(e.target.value)} style={{ width: '100%' }} />
              </div>
              <button className="btn-primary" style={{ marginTop: 4 }}
                onClick={() => doCross()} disabled={(!crossInn && !crossQuery) || crossLoading}>
                {crossLoading ? 'Проверяю...' : '🕸 Проверить связи'}
              </button>
            </div>
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 10.5, color: 'var(--text-3)', lineHeight: 1.5 }}>
              Выявляет связи между компанией, физлицами и другими организациями в базе CORVUS
            </div>
          </Card>

          <Card title="Результат проверки" style={{ position: 'relative', minHeight: 200 }}>
            {crossLoading && <LoadingCenter />}
            {!crossLoading && !crossData && (
              <div style={{ color: 'var(--text-3)', fontSize: 12, fontFamily: 'var(--font-mono)', padding: '20px 0', textAlign: 'center' }}>
                Введите данные и нажмите «Проверить связи»
              </div>
            )}
            {crossData && !crossResult?.company && (
              <div style={{ color: 'var(--text-3)', fontSize: 12, padding: '20px 0', textAlign: 'center' }}>
                Компания не найдена в базе данных CORVUS
              </div>
            )}
            {crossResult?.company && (
              <div>
                {/* Company */}
                {(() => {
                  const c = crossResult.company as { name: string; risk_score: number; wins_count: number; region: string; inn: string };
                  return (
                    <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(0,212,255,.05)', borderRadius: 6, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{c.name}</div>
                      <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                        <span style={{ color: 'var(--text-3)' }}>ИНН: {c.inn}</span>
                        <span style={{ color: 'var(--text-3)' }}>Регион: {c.region}</span>
                        <span style={{ color: 'var(--text-3)' }}>Побед: {c.wins_count}</span>
                        <span style={{ color: getRiskColor(c.risk_score) }}>Риск: {c.risk_score}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Relationships */}
                {(crossResult.relationships as Array<{ rel_type: string; from_name: string; to_name: string }> || []).length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.1em' }}>
                      Связи ({(crossResult.relationships as object[]).length})
                    </div>
                    {(crossResult.relationships as Array<{ rel_type: string; from_name: string; to_name: string }>).map((r, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 12, borderBottom: '1px solid var(--border)' }}>
                        <span style={{ color: 'var(--text-1)' }}>{r.from_name}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--amber)', padding: '1px 6px', background: 'rgba(245,158,11,.1)', borderRadius: 3 }}>{r.rel_type}</span>
                        <span style={{ color: 'var(--text-1)' }}>{r.to_name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Contracts */}
                {(crossResult.contracts as object[] || []).length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.1em' }}>
                      Контракты ({(crossResult.contracts as object[]).length})
                    </div>
                    {(crossResult.contracts as Array<{ id: number; title: string; amount: number; risk_score: number; date: string }>).map(c => (
                      <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 12, borderBottom: '1px solid var(--border)' }}>
                        <span style={{ color: 'var(--text-1)', flex: 1 }}>{c.title}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan)', marginLeft: 12 }}>{formatAmount(c.amount)}</span>
                        <span className={`risk-badge ${c.risk_score >= 80 ? 'critical' : c.risk_score >= 60 ? 'high' : c.risk_score >= 40 ? 'medium' : 'low'}`}
                          style={{ marginLeft: 8 }}>{c.risk_score}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
