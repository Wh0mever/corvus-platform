import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCases, createCase, getCase, addCaseNote, addCaseEntity, removeCaseEntity, deleteCase, updateCase } from '../api';
import { Card, LoadingCenter, ErrorMsg, EmptyState, SeverityBadge, SectionHeader } from '../components/ui';
import type { Case, CaseDetail, CaseEntity, CaseNote } from '../types';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open:         { label: 'Открыто',       color: 'var(--cyan)'   },
  investigating:{ label: 'Расследование', color: 'var(--amber)'  },
  closed:       { label: 'Закрыто',       color: 'var(--green)'  },
  referred:     { label: 'Передано',      color: 'var(--purple)' },
};

const RISK_COLORS: Record<string, string> = {
  critical: 'var(--red)', high: 'var(--amber)', medium: 'var(--purple)', low: 'var(--green)',
};

export default function Cases() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newEntity, setNewEntity] = useState({ name: '', type: 'company', note: '' });
  const [newCase, setNewCase] = useState<{ title: string; description: string; risk_level: 'critical' | 'high' | 'medium' | 'low'; investigator: string }>({ title: '', description: '', risk_level: 'medium', investigator: 'Аналитик' });

  const { data: casesData, isLoading, error } = useQuery({
    queryKey: ['cases'],
    queryFn: getCases,
  });

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['case', selectedId],
    queryFn: () => getCase(selectedId!),
    enabled: !!selectedId,
  });

  const { mutate: create } = useMutation({
    mutationFn: (d: Partial<Case>) => createCase(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cases'] }); setShowCreate(false); setNewCase({ title: '', description: '', risk_level: 'medium', investigator: 'Аналитик' }); },
  });

  const { mutate: addNote } = useMutation({
    mutationFn: (content: string) => addCaseNote(selectedId!, content),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['case', selectedId] }); setNewNote(''); },
  });

  const { mutate: addEntity } = useMutation({
    mutationFn: () => addCaseEntity(selectedId!, { entity_type: newEntity.type, entity_name: newEntity.name, note: newEntity.note }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['case', selectedId] }); setNewEntity({ name: '', type: 'company', note: '' }); },
  });

  const { mutate: removeEntity } = useMutation({
    mutationFn: (entityId: number) => removeCaseEntity(selectedId!, entityId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['case', selectedId] }),
  });

  const { mutate: closeCase } = useMutation({
    mutationFn: (id: number) => updateCase(id, { status: 'closed' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cases'] }); qc.invalidateQueries({ queryKey: ['case', selectedId] }); },
  });

  const { mutate: delCase } = useMutation({
    mutationFn: (id: number) => deleteCase(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cases'] }); setSelectedId(null); },
  });

  const cases = casesData?.data ?? [];
  const detail: CaseDetail | null = detailData?.data ?? null;

  if (isLoading) return <LoadingCenter />;
  if (error) return <ErrorMsg message="Ошибка загрузки дел" />;

  return (
    <div className="page-inner" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, height: '100%', alignItems: 'start' }}>
      {/* Case list */}
      <div>
        <div style={{ marginBottom: 10, display: 'flex', gap: 8 }}>
          <button className="btn-primary" style={{ flex: 1, fontSize: 11 }} onClick={() => setShowCreate(true)}>
            + Новое дело
          </button>
        </div>

        {/* Create form */}
        {showCreate && (
          <Card accent="cyan" style={{ marginBottom: 10, position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--cyan)', marginBottom: 2 }}>НОВОЕ ДЕЛО</div>
              <input className="search-box" placeholder="Название дела *" value={newCase.title}
                onChange={e => setNewCase(p => ({ ...p, title: e.target.value }))} style={{ width: '100%' }} />
              <textarea value={newCase.description} onChange={e => setNewCase(p => ({ ...p, description: e.target.value }))}
                placeholder="Описание..." rows={2}
                style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 12px', color: 'var(--text-1)', fontSize: 12, fontFamily: 'var(--font-ui)', resize: 'none', width: '100%' }} />
              <select value={newCase.risk_level} onChange={e => setNewCase(p => ({ ...p, risk_level: e.target.value as 'critical' | 'high' | 'medium' | 'low' }))}
                style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', color: 'var(--text-1)', fontSize: 12 }}>
                <option value="critical">Критический риск</option>
                <option value="high">Высокий риск</option>
                <option value="medium">Средний риск</option>
                <option value="low">Низкий риск</option>
              </select>
              <input className="search-box" placeholder="Следователь" value={newCase.investigator}
                onChange={e => setNewCase(p => ({ ...p, investigator: e.target.value }))} style={{ width: '100%' }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn-primary" style={{ flex: 1, fontSize: 11 }} onClick={() => create(newCase)} disabled={!newCase.title}>
                  Создать
                </button>
                <button className="btn-ghost" style={{ fontSize: 11 }} onClick={() => setShowCreate(false)}>✕</button>
              </div>
            </div>
          </Card>
        )}

        {cases.length === 0 && <EmptyState message="Нет открытых дел" />}

        {cases.map((c: Case) => (
          <div key={c.id} onClick={() => setSelectedId(c.id)}
            style={{
              padding: '12px 14px', marginBottom: 6, borderRadius: 8, cursor: 'pointer',
              background: selectedId === c.id ? 'rgba(0,212,255,.07)' : 'var(--card)',
              border: `1px solid ${selectedId === c.id ? 'var(--cyan)' : 'var(--border)'}`,
              transition: 'all .15s',
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)', flex: 1, lineHeight: 1.3 }}>{c.title}</div>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: RISK_COLORS[c.risk_level], flexShrink: 0, marginLeft: 8, marginTop: 3 }} />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: STATUS_LABELS[c.status]?.color ?? 'var(--text-3)' }}>
                {STATUS_LABELS[c.status]?.label ?? c.status}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{c.entity_count ?? 0} объектов · {c.note_count ?? 0} заметок</span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
              {c.investigator} · {c.updated_at.slice(0, 10)}
            </div>
          </div>
        ))}
      </div>

      {/* Case detail */}
      <div>
        {!selectedId && (
          <Card style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>🗂</div>
            <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 4 }}>Выберите дело</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Или создайте новое расследование</div>
          </Card>
        )}

        {selectedId && detailLoading && <LoadingCenter />}

        {detail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Header */}
            <Card accent="cyan" style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', marginBottom: 4 }}>
                    ДЕЛО #{detail.id} · {detail.investigator}
                  </div>
                  <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>{detail.title}</h2>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: STATUS_LABELS[detail.status]?.color }}>
                      {STATUS_LABELS[detail.status]?.label}
                    </span>
                    <span style={{ fontSize: 10, color: RISK_COLORS[detail.risk_level] }}>● {detail.risk_level}</span>
                  </div>
                  {detail.description && <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--text-2)' }}>{detail.description}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {detail.status !== 'closed' && (
                    <button className="btn-ghost" style={{ fontSize: 10 }} onClick={() => closeCase(detail.id)}>Закрыть</button>
                  )}
                  <button style={{ fontSize: 10, padding: '5px 10px', background: 'rgba(255,59,92,.1)', border: '1px solid rgba(255,59,92,.3)', color: 'var(--red)', borderRadius: 4, cursor: 'pointer' }}
                    onClick={() => { if (confirm('Удалить дело?')) delCase(detail.id); }}>
                    Удалить
                  </button>
                </div>
              </div>
            </Card>

            {/* Entities + Notes grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {/* Entities */}
              <Card title="Объекты расследования" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  <input className="search-box" placeholder="Название объекта" value={newEntity.name}
                    onChange={e => setNewEntity(p => ({ ...p, name: e.target.value }))} style={{ flex: 1 }} />
                  <select value={newEntity.type} onChange={e => setNewEntity(p => ({ ...p, type: e.target.value }))}
                    style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', color: 'var(--text-2)', fontSize: 11 }}>
                    <option value="company">Компания</option>
                    <option value="person">Персона</option>
                    <option value="contract">Контракт</option>
                    <option value="tender">Тендер</option>
                  </select>
                  <button className="btn-primary" style={{ fontSize: 11, padding: '5px 10px' }}
                    onClick={() => addEntity()} disabled={!newEntity.name}>+</button>
                </div>

                {detail.entities.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '8px 0' }}>Нет объектов</div>}
                {detail.entities.map((e: CaseEntity) => (
                  <div key={e.id} style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: 'rgba(0,212,255,.08)', color: 'var(--cyan)' }}>
                      {e.entity_type}
                    </span>
                    <span style={{ flex: 1, fontSize: 12, color: 'var(--text-1)' }}>{e.entity_name}</span>
                    <button onClick={() => removeEntity(e.id)}
                      style={{ fontSize: 10, background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer' }}>✕</button>
                  </div>
                ))}
              </Card>

              {/* Notes */}
              <Card title="Заметки аналитика" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                  <textarea value={newNote} onChange={e => setNewNote(e.target.value)}
                    placeholder="Добавить заметку..." rows={2}
                    style={{ background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', color: 'var(--text-1)', fontSize: 12, fontFamily: 'var(--font-ui)', resize: 'none', width: '100%' }} />
                  <button className="btn-primary" style={{ fontSize: 11, alignSelf: 'flex-end', padding: '5px 14px' }}
                    onClick={() => addNote(newNote)} disabled={!newNote.trim()}>
                    Сохранить
                  </button>
                </div>

                <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {detail.notes.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Нет заметок</div>}
                  {[...detail.notes].reverse().map((n: CaseNote) => (
                    <div key={n.id} style={{ padding: '8px 10px', background: 'rgba(255,255,255,.02)', borderRadius: 6, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 12.5, color: 'var(--text-1)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{n.content}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                        {n.author} · {n.created_at.slice(0, 16).replace('T', ' ')}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
