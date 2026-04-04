import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAlerts, markAlertRead } from '../api';
import { Card, LoadingCenter, ErrorMsg, EmptyState, SeverityBadge } from '../components/ui';
import type { Alert } from '../types';

const SEV_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export default function Alerts() {
  const qc = useQueryClient();

  const { data: alerts = [], isLoading, error } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => getAlerts().then((r) => r.data),
  });

  const { mutate: markRead } = useMutation({
    mutationFn: (id: number) => markAlertRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  if (isLoading) return <LoadingCenter />;
  if (error)     return <ErrorMsg message="Ошибка загрузки уведомлений" />;

  const unread = alerts.filter((a: Alert) => !a.is_read);
  const read   = alerts.filter((a: Alert) =>  a.is_read);

  const AlertRow = ({ alert: a }: { alert: Alert }) => (
    <div style={{
      display: 'flex', gap: 14, alignItems: 'flex-start',
      padding: '12px 16px',
      background: a.is_read ? 'transparent' : 'rgba(0,212,255,.03)',
      borderBottom: '1px solid var(--border)',
      opacity: a.is_read ? 0.6 : 1,
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 6,
        background: a.is_read ? 'transparent' : 'var(--cyan)',
        boxShadow: a.is_read ? 'none' : '0 0 8px var(--cyan)',
      }} />
      <SeverityBadge severity={a.severity} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>{a.title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{a.message}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)' }}>
          {a.created_at.slice(0, 16).replace('T', ' ')}
        </div>
        {!a.is_read && (
          <button className="btn-ghost" style={{ fontSize: 10, padding: '3px 10px' }}
            onClick={() => markRead(a.id)}>
            Прочитано
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="page-inner">
      {unread.length > 0 && (
        <Card accent="red" style={{ marginBottom: 16, position: 'relative', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', fontFamily: 'var(--font-mono)' }}>
              НЕПРОЧИТАННЫЕ
              <span style={{ marginLeft: 8, background: 'var(--red)', color: '#fff', borderRadius: 8, fontSize: 9, padding: '1px 6px' }}>
                {unread.length}
              </span>
            </div>
          </div>
          {unread
            .slice()
            .sort((a: Alert, b: Alert) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9))
            .map((a: Alert) => <AlertRow key={a.id} alert={a} />)
          }
        </Card>
      )}

      {read.length > 0 && (
        <Card style={{ position: 'relative', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
              ПРОЧИТАННЫЕ ({read.length})
            </div>
          </div>
          {read.map((a: Alert) => <AlertRow key={a.id} alert={a} />)}
        </Card>
      )}

      {alerts.length === 0 && <EmptyState message="Уведомлений нет" />}
    </div>
  );
}
