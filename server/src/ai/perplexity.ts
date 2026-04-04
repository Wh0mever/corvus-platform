import type { Database } from 'better-sqlite3';

// ─── System Prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Ты CORVUS AI — аналитик по антикоррупционной разведке в сфере государственных закупок Узбекистана.
Ты анализируешь контракты из реальной базы данных, выявляешь аномалии, коррупционные схемы и подозрительные паттерны.
Отвечай исключительно на русском языке. Будь конкретным, ссылайся на реальные данные из базы.
Используй markdown: ## заголовки, **жирный текст**, \`код\`, маркированные списки.
Не придумывай данные — используй только то, что есть в предоставленном контексте базы данных.`;

// ─── DB Context Builder ───────────────────────────────────────────────────────
export function buildDbContext(db: Database): string {
  const stats = db.prepare(`
    SELECT COUNT(*) as total,
           ROUND(AVG(risk_score), 1) as avg_risk,
           SUM(CASE WHEN risk_score >= 80 THEN 1 ELSE 0 END) as critical,
           SUM(CASE WHEN risk_score >= 60 AND risk_score < 80 THEN 1 ELSE 0 END) as high,
           SUM(amount) as total_amount
    FROM contracts
  `).get() as { total: number; avg_risk: number; critical: number; high: number; total_amount: number };

  const contracts = db.prepare(`
    SELECT c.id, c.title, c.amount, c.risk_score, c.category, c.region,
           c.bidder_count, c.date, co.name as supplier
    FROM contracts c JOIN companies co ON c.supplier_id = co.id
    ORDER BY c.risk_score DESC LIMIT 15
  `).all() as Array<{ id: number; title: string; amount: number; risk_score: number; category: string; region: string; bidder_count: number; date: string; supplier: string }>;

  const companies = db.prepare(`
    SELECT name, risk_score, wins_count, region, inn
    FROM companies ORDER BY risk_score DESC LIMIT 10
  `).all() as Array<{ name: string; risk_score: number; wins_count: number; region: string; inn: string }>;

  const people = db.prepare(`
    SELECT name, role, risk_score FROM people ORDER BY risk_score DESC
  `).all() as Array<{ name: string; role: string; risk_score: number }>;

  const anomalies = db.prepare(`
    SELECT a.type, a.description, a.severity, c.title as contract, c.risk_score
    FROM anomalies a JOIN contracts c ON a.contract_id = c.id
    ORDER BY CASE a.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END
    LIMIT 12
  `).all() as Array<{ type: string; description: string; severity: string; contract: string; risk_score: number }>;

  const relationships = db.prepare(`
    SELECT r.rel_type, r.is_suspicious,
           CASE r.from_type WHEN 'company' THEN co.name WHEN 'person' THEN p.name ELSE 'Unknown' END as from_name,
           CASE r.to_type   WHEN 'company' THEN co2.name WHEN 'person' THEN p2.name ELSE 'Unknown' END as to_name
    FROM relationships r
    LEFT JOIN companies co  ON r.from_type = 'company' AND r.from_id = co.id
    LEFT JOIN people    p   ON r.from_type = 'person'  AND r.from_id = p.id
    LEFT JOIN companies co2 ON r.to_type   = 'company' AND r.to_id   = co2.id
    LEFT JOIN people    p2  ON r.to_type   = 'person'  AND r.to_id   = p2.id
    WHERE r.is_suspicious = 1
    LIMIT 10
  `).all() as Array<{ rel_type: string; is_suspicious: number; from_name: string; to_name: string }>;

  const fmt = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : String(n);

  return `
=== БАЗА ДАННЫХ CORVUS ===

### Общая статистика:
- Контрактов: ${stats.total} | Сумма: ${fmt(stats.total_amount)} сум
- Ср. риск: ${stats.avg_risk} | Критических: ${stats.critical} | Высоких: ${stats.high}

### Топ-15 контрактов по риску:
${contracts.map(c => `- [ID:${c.id}] [Риск:${c.risk_score}] "${c.title}" | Поставщик: ${c.supplier} | Сумма: ${fmt(c.amount)} | ${c.category} | ${c.region} | Участников: ${c.bidder_count}`).join('\n')}

### Компании (по убыванию риска):
${companies.map(c => `- ${c.name} | риск:${c.risk_score} | побед:${c.wins_count} | ${c.region}`).join('\n')}

### Лица под наблюдением:
${people.map(p => `- ${p.name} (${p.role}) | риск:${p.risk_score}`).join('\n')}

### Выявленные аномалии:
${anomalies.map(a => `- [${a.severity.toUpperCase()}] ${a.type}: ${a.description} → контракт "${a.contract}" (риск:${a.risk_score})`).join('\n')}

### Подозрительные связи:
${relationships.map(r => `- ${r.from_name} —[${r.rel_type}]→ ${r.to_name}`).join('\n') || '(нет данных)'}
`;
}

// ─── Contract Context Builder ─────────────────────────────────────────────────
export function buildContractContext(db: Database, contractId: number): string {
  const contract = db.prepare(`
    SELECT c.*, co.name as supplier_name, co.risk_score as supplier_risk,
           co.wins_count, co.region as supplier_region, co.inn
    FROM contracts c JOIN companies co ON c.supplier_id = co.id
    WHERE c.id = ?
  `).get(contractId) as Record<string, unknown> | undefined;

  if (!contract) return 'Контракт не найден.';

  const anomalies = db.prepare(`
    SELECT type, title, description, severity FROM anomalies WHERE contract_id = ?
  `).all(contractId) as Array<{ type: string; title: string; description: string; severity: string }>;

  const fmt = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : `${n.toLocaleString()}`;
  const amount = contract.amount as number;
  const market = contract.market_avg_price as number;

  return `
=== КОНТРАКТ ДЛЯ АНАЛИЗА ===
Название: ${contract.title}
ID: ${contract.id} | Статус: ${contract.status} | Дата: ${contract.date}
Категория: ${contract.category} | Регион: ${contract.region}

Сумма контракта: ${fmt(amount)} сум
Рыночная цена: ${fmt(market)} сум
Превышение: ${market > 0 ? ((amount / market - 1) * 100).toFixed(1) : 'н/д'}%
Участников тендера: ${contract.bidder_count}
Риск-скор: ${contract.risk_score}/100

Поставщик: ${contract.supplier_name} (ИНН: ${contract.inn})
Риск поставщика: ${contract.supplier_risk} | Побед в тендерах: ${contract.wins_count} | ${contract.supplier_region}

Описание: ${contract.description || 'не указано'}

Аномалии (${anomalies.length}):
${anomalies.length ? anomalies.map(a => `- [${a.severity.toUpperCase()}] ${a.title}: ${a.description}`).join('\n') : 'не выявлено'}
`;
}

// ─── Perplexity API Call ──────────────────────────────────────────────────────
async function callPerplexity(systemContent: string, userMessage: string): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new Error('PERPLEXITY_API_KEY not set');

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user',   content: userMessage   },
      ],
      max_tokens: 1800,
      temperature: 0.15,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Perplexity error ${response.status}: ${text}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0]?.message?.content ?? 'Нет ответа от AI.';
}

// ─── Public API ───────────────────────────────────────────────────────────────
export async function queryWithContext(db: Database, message: string): Promise<string> {
  const dbContext = buildDbContext(db);
  const systemContent = SYSTEM_PROMPT + '\n\n' + dbContext;
  return callPerplexity(systemContent, message);
}

export async function analyzeContractWithAI(db: Database, contractId: number): Promise<string> {
  const contractContext = buildContractContext(db, contractId);
  const systemContent = SYSTEM_PROMPT + '\n\n' + contractContext;
  return callPerplexity(
    systemContent,
    'Проведи детальный антикоррупционный анализ этого контракта. Оцени риски, выяви схемы, дай заключение и рекомендации.',
  );
}
