import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  lookupCompany, addCompanyToDb, getLiveTenders, crosscheckCompany,
  researchCompany, researchTenderSector, researchOfficial, benchmarkContractPrice,
} from '../api';
import { Card, LoadingCenter, ErrorMsg, EmptyState, SectionHeader } from '../components/ui';
import { formatAmount, getRiskColor } from '../types';
import type { OrgInfoResult, LiveTender } from '../types';

type Tab = 'lookup' | 'tenders' | 'crosscheck' | 'ai';

// Markdown → styled HTML (simple renderer for Perplexity output)
function MarkdownBlock({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, lineHeight: 1.7, color: 'var(--text-1)' }}>
      {lines.map((line, i) => {
        if (line.startsWith('## ')) {
          return (
            <div key={i} style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--cyan)', marginTop: 18, marginBottom: 6, borderBottom: '1px solid rgba(0,212,255,.15)', paddingBottom: 4 }}>
              {line.slice(3)}
            </div>
          );
        }
        if (line.startsWith('### ')) {
          return (
            <div key={i} style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--amber)', marginTop: 12, marginBottom: 4 }}>
              {line.slice(4)}
            </div>
          );
        }
        if (line.startsWith('• ') || line.startsWith('- ')) {
          return (
            <div key={i} style={{ paddingLeft: 16, marginBottom: 2, color: 'var(--text-2)' }}>
              <span style={{ color: 'var(--cyan)', marginRight: 6 }}>›</span>
              <InlineMarkdown text={line.slice(2)} />
            </div>
          );
        }
        if (line.trim() === '') return <div key={i} style={{ height: 6 }} />;
        return <div key={i} style={{ marginBottom: 2 }}><InlineMarkdown text={line} /></div>;
      })}
    </div>
  );
}

function InlineMarkdown({ text }: { text: string }) {
  // Handle **bold** text
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i} style={{ color: 'var(--text-1)', fontWeight: 600 }}>{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

export default function Intelligence() {
  const [tab, setTab] = useState<Tab>('lookup');

  // Lookup state
  const [query, setQuery] = useState('');
  const [inn, setInn] = useState('');

  // Crosscheck state
  const [crossQuery, setCrossQuery] = useState('');
  const [crossInn, setCrossInn] = useState('');

  // AI research state
  const [aiMode, setAiMode] = useState<'company' | 'tender' | 'official' | 'price'>('company');
  const [aiCompanyName, setAiCompanyName] = useState('');
  const [aiCompanyInn, setAiCompanyInn] = useState('');
  const [aiTenderCategory, setAiTenderCategory] = useState('');
  const [aiTenderRegion, setAiTenderRegion] = useState('');
  const [aiOfficialName, setAiOfficialName] = useState('');
  const [aiOfficialPosition, setAiOfficialPosition] = useState('');
  const [aiPriceItem, setAiPriceItem] = useState('');
  const [aiPriceAmount, setAiPriceAmount] = useState('');
  const [aiPriceUnit, setAiPriceUnit] = useState('');
  const [aiResult, setAiResult] = useState<{ analysis: string; engine: string; query: string } | null>(null);

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

  // AI research mutation
  const { mutate: runAiResearch, isPending: aiLoading } = useMutation({
    mutationFn: async () => {
      if (aiMode === 'company') {
        if (!aiCompanyName) throw new Error('Введите название компании');
        const r = await researchCompany(aiCompanyName, aiCompanyInn || undefined);
        return { ...r, query: `Компания: ${aiCompanyName}${aiCompanyInn ? ` (ИНН ${aiCompanyInn})` : ''}` };
      }
      if (aiMode === 'tender') {
        if (!aiTenderCategory) throw new Error('Введите категорию');
        const r = await researchTenderSector(aiTenderCategory, aiTenderRegion || undefined);
        return { ...r, query: `Тендеры: ${aiTenderCategory}${aiTenderRegion ? ` · ${aiTenderRegion}` : ''}` };
      }
      if (aiMode === 'official') {
        if (!aiOfficialName) throw new Error('Введите имя чиновника');
        const r = await researchOfficial(aiOfficialName, aiOfficialPosition || undefined);
        return { ...r, query: `Чиновник: ${aiOfficialName}${aiOfficialPosition ? ` · ${aiOfficialPosition}` : ''}` };
      }
      if (aiMode === 'price') {
        if (!aiPriceItem || !aiPriceAmount) throw new Error('Введите товар и сумму');
        const r = await benchmarkContractPrice(aiPriceItem, Number(aiPriceAmount), aiPriceUnit || undefined);
        return { ...r, query: `Бенчмарк цены: ${aiPriceItem} — ${Number(aiPriceAmount).toLocaleString('ru-RU')} сум` };
      }
      throw new Error('Unknown mode');
    },
    onSuccess: (data) => setAiResult(data),
  });

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'lookup',     label: 'Поиск компании',       icon: '🔍' },
    { key: 'tenders',   label: 'Живые тендеры',         icon: '📋' },
    { key: 'crosscheck',label: 'Перекрёстная проверка', icon: '🕸' },
    { key: 'ai',        label: 'AI Разведка',           icon: '🤖' },
  ];

  const orgResult: OrgInfoResult | null = lookupData?.data ?? null;
  const crossResult = (crossData?.data as { company?: object; relationships?: object[]; contracts?: object[] } | null) ?? null;
  const tenders: LiveTender[] = tendersData?.data ?? [];

  const AI_MODES = [
    { key: 'company' as const,  label: 'Компания',   icon: '🏢', desc: 'Полное досье на компанию: регистрация, тендеры, суды, учредители' },
    { key: 'tender'  as const,  label: 'Сектор',     icon: '📊', desc: 'Анализ тендерного рынка по категории: монополии, картели, завышение' },
    { key: 'official'as const,  label: 'Чиновник',   icon: '👤', desc: 'Проверка госслужащего: имущество, аффилированные компании, конфликты' },
    { key: 'price'   as const,  label: 'Цена',       icon: '💰', desc: 'Бенчмарк цены контракта: сравнение с рынком и аналогичными закупками' },
  ];

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

                {/* Quick AI research button */}
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <button className="btn-primary" style={{ fontSize: 11, width: '100%' }}
                    onClick={() => {
                      setAiMode('company');
                      setAiCompanyName(orgResult.name);
                      setAiCompanyInn(orgResult.inn || '');
                      setTab('ai');
                    }}>
                    🤖 Глубокое AI-расследование
                  </button>
                </div>
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
              <CrossResultPanel crossResult={crossResult} />
            )}
          </Card>
        </div>
      )}

      {/* ── AI Разведка ── */}
      {tab === 'ai' && (
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, alignItems: 'start' }}>
          {/* Left panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Mode selector */}
            <Card title="Тип расследования" style={{ position: 'relative' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {AI_MODES.map(m => (
                  <button key={m.key}
                    onClick={() => { setAiMode(m.key); setAiResult(null); }}
                    style={{
                      display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px',
                      background: aiMode === m.key ? 'rgba(0,212,255,.1)' : 'rgba(255,255,255,.02)',
                      border: `1px solid ${aiMode === m.key ? 'var(--cyan)' : 'var(--border)'}`,
                      borderRadius: 8, cursor: 'pointer', textAlign: 'left', transition: 'all .15s',
                    }}>
                    <span style={{ fontSize: 18 }}>{m.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: aiMode === m.key ? 'var(--cyan)' : 'var(--text-1)', marginBottom: 2 }}>{m.label}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-3)', lineHeight: 1.4 }}>{m.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Input form */}
            <Card title="Параметры запроса" style={{ position: 'relative' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {aiMode === 'company' && (
                  <>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>НАЗВАНИЕ КОМПАНИИ *</div>
                      <input className="search-box" placeholder="ООО Строй Инвест..." value={aiCompanyName}
                        onChange={e => setAiCompanyName(e.target.value)} style={{ width: '100%' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>ИНН (необязательно)</div>
                      <input className="search-box" placeholder="123456789" value={aiCompanyInn}
                        onChange={e => setAiCompanyInn(e.target.value.replace(/\D/g, '').slice(0, 9))} style={{ width: '100%' }} />
                    </div>
                  </>
                )}
                {aiMode === 'tender' && (
                  <>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>КАТЕГОРИЯ ЗАКУПОК *</div>
                      <input className="search-box" placeholder="Строительство дорог..." value={aiTenderCategory}
                        onChange={e => setAiTenderCategory(e.target.value)} style={{ width: '100%' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>РЕГИОН (необязательно)</div>
                      <input className="search-box" placeholder="Ташкент, Самарканд..." value={aiTenderRegion}
                        onChange={e => setAiTenderRegion(e.target.value)} style={{ width: '100%' }} />
                    </div>
                  </>
                )}
                {aiMode === 'official' && (
                  <>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>ФИО ЧИНОВНИКА *</div>
                      <input className="search-box" placeholder="Иванов Иван Иванович" value={aiOfficialName}
                        onChange={e => setAiOfficialName(e.target.value)} style={{ width: '100%' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>ДОЛЖНОСТЬ (необязательно)</div>
                      <input className="search-box" placeholder="Министр строительства..." value={aiOfficialPosition}
                        onChange={e => setAiOfficialPosition(e.target.value)} style={{ width: '100%' }} />
                    </div>
                  </>
                )}
                {aiMode === 'price' && (
                  <>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>ТОВАР / УСЛУГА *</div>
                      <input className="search-box" placeholder="Асфальтирование дороги..." value={aiPriceItem}
                        onChange={e => setAiPriceItem(e.target.value)} style={{ width: '100%' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>СУММА КОНТРАКТА (сум) *</div>
                      <input className="search-box" placeholder="5000000000" value={aiPriceAmount}
                        onChange={e => setAiPriceAmount(e.target.value.replace(/\D/g, ''))} style={{ width: '100%' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>ЕДИНИЦА ИЗМЕРЕНИЯ</div>
                      <input className="search-box" placeholder="за 1 км, за 1 м², за тонну..." value={aiPriceUnit}
                        onChange={e => setAiPriceUnit(e.target.value)} style={{ width: '100%' }} />
                    </div>
                  </>
                )}

                <button className="btn-primary" style={{ marginTop: 4, fontSize: 12, padding: '10px' }}
                  onClick={() => runAiResearch()}
                  disabled={aiLoading || (
                    aiMode === 'company' ? !aiCompanyName :
                    aiMode === 'tender'  ? !aiTenderCategory :
                    aiMode === 'official'? !aiOfficialName :
                    !aiPriceItem || !aiPriceAmount
                  )}>
                  {aiLoading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <span className="blink" style={{ width: 6, height: 6, background: 'var(--cyan)', borderRadius: '50%', display: 'inline-block' }}/>
                      Perplexity анализирует...
                    </span>
                  ) : '🤖 Запустить AI-расследование'}
                </button>

                <div style={{ fontSize: 10, color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.5 }}>
                  Поиск по orginfo.uz · court.gov.uz · xarid.uzex.uz · СМИ Узбекистана
                </div>
              </div>
            </Card>
          </div>

          {/* Right result panel */}
          <Card style={{ position: 'relative', minHeight: 400 }}>
            {aiLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 16 }}>
                <div style={{ width: 48, height: 48, border: '2px solid var(--border)', borderTop: '2px solid var(--cyan)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Perplexity AI сканирует открытые источники...</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                  orginfo.uz · court.gov.uz · xarid.uzex.uz · kun.uz · gazeta.uz
                </div>
              </div>
            )}

            {!aiLoading && !aiResult && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12 }}>
                <div style={{ fontSize: 40, opacity: 0.3 }}>🤖</div>
                <div style={{ fontSize: 14, color: 'var(--text-3)' }}>Выберите тип расследования и введите данные</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', opacity: 0.7 }}>Powered by Perplexity sonar-pro — поиск по реальному вебу</div>
              </div>
            )}

            {!aiLoading && aiResult && (
              <div>
                {/* Result header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', marginBottom: 4 }}>
                      AI РАССЛЕДОВАНИЕ
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{aiResult.query}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{
                      fontSize: 9, fontFamily: 'var(--font-mono)', padding: '3px 8px',
                      background: 'rgba(0,212,255,.1)', border: '1px solid rgba(0,212,255,.3)',
                      borderRadius: 3, color: 'var(--cyan)', textTransform: 'uppercase',
                    }}>
                      {aiResult.engine}
                    </span>
                    <button className="btn-ghost" style={{ fontSize: 10 }}
                      onClick={() => setAiResult(null)}>Очистить</button>
                  </div>
                </div>

                {/* Analysis content */}
                <div style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto', paddingRight: 4 }}>
                  <MarkdownBlock text={aiResult.analysis} />
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// Extracted component to avoid IIFE in JSX
function CrossResultPanel({ crossResult }: {
  crossResult: { company?: object; relationships?: object[]; contracts?: object[] }
}) {
  const c = crossResult.company as { name: string; risk_score: number; wins_count: number; region: string; inn: string };
  const rels = (crossResult.relationships as Array<{ rel_type: string; from_name: string; to_name: string }>) || [];
  const contracts = (crossResult.contracts as Array<{ id: number; title: string; amount: number; risk_score: number; date: string }>) || [];

  return (
    <div>
      <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(0,212,255,.05)', borderRadius: 6, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{c.name}</div>
        <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
          <span style={{ color: 'var(--text-3)' }}>ИНН: {c.inn}</span>
          <span style={{ color: 'var(--text-3)' }}>Регион: {c.region}</span>
          <span style={{ color: 'var(--text-3)' }}>Побед: {c.wins_count}</span>
          <span style={{ color: getRiskColor(c.risk_score) }}>Риск: {c.risk_score}</span>
        </div>
      </div>

      {rels.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.1em' }}>
            Связи ({rels.length})
          </div>
          {rels.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 12, borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-1)' }}>{r.from_name}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--amber)', padding: '1px 6px', background: 'rgba(245,158,11,.1)', borderRadius: 3 }}>{r.rel_type}</span>
              <span style={{ color: 'var(--text-1)' }}>{r.to_name}</span>
            </div>
          ))}
        </div>
      )}

      {contracts.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.1em' }}>
            Контракты ({contracts.length})
          </div>
          {contracts.map(c => (
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
  );
}
