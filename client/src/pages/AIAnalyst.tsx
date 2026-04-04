import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { queryAI } from '../api';
import { AIText } from '../components/ui';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

const PROMPTS = [
  'Покажи топ-5 контрактов по риску',
  'Найди схемы коррупции в базе',
  'Кто чаще всего побеждает в тендерах?',
  'Проверь завышение цен в строительстве',
  'Кто связан с компанией Янги Авлод Групп?',
  'Какие аномалии выявлены в медицине?',
];

export default function AIAnalyst() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: '## Добро пожаловать в CORVUS AI\n\nЯ аналитическая система для выявления коррупционных рисков в государственных закупках.\n\nМогу проанализировать:\n- **Контракты** с высоким риском\n- **Связи** между компаниями и чиновниками\n- **Схемы** картельных сговоров\n- **Завышение цен** и аффилированность\n\nЗадайте вопрос или выберите подсказку ниже.',
    },
  ]);
  const [input, setInput] = useState('');
  const bottomRef         = useRef<HTMLDivElement>(null);

  const { mutate: ask, isPending } = useMutation({
    mutationFn: (message: string) => queryAI(message),
    onSuccess: (result, message) => {
      setMessages((prev) => [
        ...prev,
        { role: 'user',      text: message          },
        { role: 'assistant', text: result.response  },
      ]);
    },
    onError: (_err, message) => {
      setMessages((prev) => [
        ...prev,
        { role: 'user',      text: message },
        { role: 'assistant', text: '⚠ Ошибка соединения с сервером. Попробуйте позже.' },
      ]);
    },
  });

  const send = (text: string) => {
    if (!text.trim() || isPending) return;
    setInput('');
    ask(text);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPending]);

  return (
    <div className="page-inner" style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: 860, margin: '0 auto', width: '100%' }}>
      {/* Chat window */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 0 8px', minHeight: 0 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'assistant' && (
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(0,212,255,.12)', border: '1px solid rgba(0,212,255,.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, flexShrink: 0, marginRight: 10, marginTop: 2,
              }}>◈</div>
            )}
            <div style={{
              maxWidth: msg.role === 'user' ? '72%' : '86%',
              padding: msg.role === 'user' ? '8px 14px' : '12px 16px',
              borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '2px 12px 12px 12px',
              background: msg.role === 'user' ? 'rgba(0,212,255,.12)' : 'rgba(255,255,255,.03)',
              border: msg.role === 'user' ? '1px solid rgba(0,212,255,.25)' : '1px solid var(--border)',
            }}>
              {msg.role === 'user'
                ? <span style={{ color: 'var(--text-1)', lineHeight: 1.5, fontSize: 13 }}>{msg.text}</span>
                : <AIText text={msg.text} />
              }
            </div>
          </div>
        ))}

        {isPending && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 38 }}>
            <div className="thinking-dots"><span /><span /><span /></div>
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Анализирую данные...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '8px 0' }}>
        {PROMPTS.map((p) => (
          <button key={p} className="filter-tab" style={{ fontSize: 10.5 }}
            onClick={() => send(p)} disabled={isPending}>
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input
          className="search-box"
          style={{ flex: 1 }}
          placeholder="Введите вопрос об аномалиях, контрактах, связях..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send(input)}
          disabled={isPending}
        />
        <button className="btn-primary" onClick={() => send(input)}
          disabled={isPending || !input.trim()} style={{ padding: '9px 20px', fontSize: 12 }}>
          Отправить
        </button>
      </div>
    </div>
  );
}
