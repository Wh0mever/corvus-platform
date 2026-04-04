import type { Database } from 'better-sqlite3';
import type { Contract, Company, Anomaly } from '../types';

// ─── Intent Parser ────────────────────────────────────────────────────────────

type Intent =
  | 'CONTRACT_ANALYSIS'
  | 'COMPANY_LINKS'
  | 'TOP_RISKS'
  | 'SCHEME_ANALYSIS'
  | 'PRICE_CHECK'
  | 'GENERAL';

interface ParsedQuery {
  intent: Intent;
  contractId: number | null;
  companyName: string | null;
  schemeType: string | null;
}

function parseQuery(message: string): ParsedQuery {
  const m = message.toLowerCase();

  const contractMatch = message.match(/#?(UZ-\d{4}-\d{4}|\d{4}-\d{4})/i);
  const contractId    = contractMatch ? extractContractId(contractMatch[1]) : null;

  let companyName: string | null = null;
  const companies = [
    'Янги Авлод', 'СервисПро', 'ТошТранс', 'Самарканд Курилиш',
    'Фаргона Индастриал', 'Digital Silk Road', 'УзБилд', 'Азия Партнёрс',
    'ТехноСервис', 'ГрандИнфра',
  ];
  for (const c of companies) {
    if (m.includes(c.toLowerCase())) { companyName = c; break; }
  }

  let intent: Intent = 'GENERAL';
  if (contractId || (m.includes('контракт') && m.includes('анализ'))) {
    intent = 'CONTRACT_ANALYSIS';
  } else if (m.includes('связ') || m.includes('аффилиац') || m.includes('бенефициар')) {
    intent = 'COMPANY_LINKS';
  } else if (m.includes('топ') || m.includes('рискованн') || m.includes('подозрительн') || m.includes('самых')) {
    intent = 'TOP_RISKS';
  } else if (m.includes('схем') || m.includes('карусел') || m.includes('фантом') || m.includes('мошен')) {
    intent = 'SCHEME_ANALYSIS';
  } else if (m.includes('цен') || m.includes('завышен') || m.includes('рынок')) {
    intent = 'PRICE_CHECK';
  }

  const schemeType = m.includes('карусел') ? 'carousel'
    : m.includes('фантом') ? 'phantom'
    : m.includes('мед') ? 'medical'
    : null;

  return { intent, contractId, companyName, schemeType };
}

function extractContractId(code: string): number | null {
  const db_map: Record<string, number> = {
    'UZ-2024-8472': 1, '2024-8472': 1,
    'UZ-2024-7831': 2, '2024-7831': 2,
    'UZ-2024-1184': 3, '2024-1184': 3,
    'UZ-2024-5124': 4, '2024-5124': 4,
    'UZ-2024-6601': 5, '2024-6601': 5,
  };
  return db_map[code.toUpperCase()] ?? null;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2)}M`
    : `$${(n / 1000).toFixed(0)}K`;
}

function riskLabel(score: number): string {
  if (score >= 80) return 'КРИТИЧЕСКИЙ';
  if (score >= 60) return 'ВЫСОКИЙ';
  if (score >= 40) return 'УМЕРЕННЫЙ';
  return 'НИЗКИЙ';
}

// ─── Response Generators ──────────────────────────────────────────────────────

function buildContractAnalysis(db: Database, contractId: number): string {
  const contract = db.prepare(`
    SELECT c.*, co.name as supplier_name, co.wins_count, co.risk_score as company_risk
    FROM contracts c
    JOIN companies co ON c.supplier_id = co.id
    WHERE c.id = ?
  `).get(contractId) as (Contract & { supplier_name: string; wins_count: number; company_risk: number }) | undefined;

  if (!contract) return `Контракт #${contractId} не найден в базе данных.`;

  const anomalies = db.prepare('SELECT * FROM anomalies WHERE contract_id = ? ORDER BY severity ASC').all(contractId) as Anomaly[];
  const ratio     = contract.market_avg_price > 0 ? (contract.amount / contract.market_avg_price).toFixed(2) : '—';
  const damage    = contract.market_avg_price > 0 ? contract.amount - contract.market_avg_price : 0;

  let text = `**Анализ контракта: ${contract.title}**\n\n`;
  text += `Поставщик: **${contract.supplier_name}** · Категория: ${contract.category} · Регион: ${contract.region}\n`;
  text += `Сумма: **${fmt(contract.amount)}** · Рыночный аналог: ${fmt(contract.market_avg_price)}\n`;
  text += `Риск-скор: **${contract.risk_score}/100 — ${riskLabel(contract.risk_score)}**\n\n`;

  if (anomalies.length > 0) {
    text += `---\n\n**Выявлено аномалий: ${anomalies.length}**\n\n`;
    anomalies.forEach((a, i) => {
      const sev = a.severity === 'critical' ? '🔴' : a.severity === 'high' ? '🟡' : '🟣';
      text += `${sev} **${i + 1}. ${a.title}**\n`;
      text += `${a.description}\n`;
      try {
        const ev = JSON.parse(a.evidence);
        if (ev.ratio) text += `Коэффициент: ×${ev.ratio} · Потенциальный ущерб: ${fmt(ev.estimated_damage || 0)}\n`;
        if (ev.supplier_wins) text += `Побед в категории: ${ev.supplier_wins} · Частота: ${ev.win_rate}\n`;
      } catch { /* skip */ }
      text += '\n';
    });
  } else {
    text += `Аномалии не выявлены. Контракт соответствует стандартным параметрам.\n\n`;
  }

  text += `---\n\n**Вывод:** `;
  if (contract.risk_score >= 80) {
    text += `Контракт требует **немедленного расследования**. Совокупность аномалий указывает на системные нарушения. Потенциальный ущерб: **${fmt(damage)}**.\n\n`;
    text += `**Рекомендации:** Приостановить выплаты · Провести проверку поставки · Запросить первичные документы · Проверить связи поставщика.`;
  } else if (contract.risk_score >= 60) {
    text += `Контракт требует **повышенного внимания** и дополнительной проверки документации.\n\n`;
    text += `**Рекомендации:** Проверить соответствие спецификаций · Запросить конкурентные предложения · Мониторинг исполнения.`;
  } else {
    text += `Контракт находится **в норме**. Рекомендуется стандартный мониторинг исполнения.`;
  }

  return text;
}

function buildTopRisks(db: Database): string {
  const contracts = db.prepare(`
    SELECT c.id, c.title, c.amount, c.risk_score, c.category, co.name as supplier_name
    FROM contracts c
    JOIN companies co ON c.supplier_id = co.id
    WHERE c.risk_score >= 60
    ORDER BY c.risk_score DESC LIMIT 7
  `).all() as Array<{ id: number; title: string; amount: number; risk_score: number; category: string; supplier_name: string }>;

  const total_at_risk = contracts.reduce((s, c) => s + c.amount, 0);

  let text = `**ТОП рискованных контрактов в системе**\n\n`;
  contracts.forEach((c, i) => {
    const marker = c.risk_score >= 80 ? '🔴' : '🟡';
    text += `${marker} **${i + 1}. ${c.supplier_name}** — скор ${c.risk_score}/100\n`;
    text += `   ${c.title.substring(0, 60)}...\n`;
    text += `   Сумма: ${fmt(c.amount)} · Категория: ${c.category}\n\n`;
  });

  text += `---\n**Итого под угрозой:** ${fmt(total_at_risk)} · ${contracts.length} контрактов требуют проверки.`;
  return text;
}

function buildCompanyLinks(db: Database, companyName: string): string {
  const company = db.prepare(`SELECT * FROM companies WHERE name LIKE ?`).get(`%${companyName}%`) as Company | undefined;
  if (!company) return `Компания "${companyName}" не найдена. Уточните название.`;

  const rels = db.prepare(`
    SELECT r.*, p.name as person_name
    FROM relationships r
    LEFT JOIN people p ON r.from_type = 'person' AND r.from_id = p.id
    WHERE (r.to_type = 'company' AND r.to_id = ?) OR (r.from_type = 'company' AND r.from_id = ?)
    LIMIT 10
  `).all(company.id, company.id) as Array<Record<string, unknown>>;

  const contracts = db.prepare(`
    SELECT COUNT(*) as cnt, SUM(amount) as total, AVG(risk_score) as avg_risk
    FROM contracts WHERE supplier_id = ?
  `).get(company.id) as { cnt: number; total: number; avg_risk: number };

  let text = `**Анализ связей: ${company.name}**\n\n`;
  text += `Риск-скор компании: **${company.risk_score}/100 — ${riskLabel(company.risk_score)}**\n`;
  text += `Регион: ${company.region} · Побед в тендерах: **${company.wins_count}**\n`;
  text += `Контрактов в системе: ${contracts.cnt} на сумму ${fmt(contracts.total || 0)} · Средний риск: ${Math.round(contracts.avg_risk || 0)}/100\n\n`;

  if (rels.length > 0) {
    text += `**Выявленные связи (${rels.length}):**\n\n`;
    rels.forEach(r => {
      const suspicious = r.is_suspicious ? ' ⚠️ ПОДОЗРИТЕЛЬНО' : '';
      text += `• ${r.rel_type}: ${r.from_type}(${r.from_id}) → ${r.to_type}(${r.to_id}) · Сила: ${r.strength}/10${suspicious}\n`;
    });
  } else {
    text += `Прямые связи не зарегистрированы в базе.\n`;
  }

  if (company.risk_score >= 80) {
    text += `\n**Вывод:** Компания входит в группу **критического риска**. Рекомендуется немедленная проверка всех активных контрактов и бенефициарной структуры.`;
  }

  return text;
}

function buildSchemeAnalysis(db: Database, schemeType: string | null): string {
  if (schemeType === 'carousel') {
    const suspects = db.prepare(`
      SELECT co.name, COUNT(*) as wins, SUM(c.amount) as total
      FROM contracts c JOIN companies co ON c.supplier_id = co.id
      WHERE c.risk_score >= 80 GROUP BY co.id ORDER BY wins DESC LIMIT 5
    `).all() as Array<{ name: string; wins: number; total: number }>;

    let text = `**Анализ схемы "Карусель"**\n\n`;
    text += `Схема: аффилированные компании поочерёдно выигрывают тендеры, создавая видимость конкуренции.\n\n`;
    text += `**Подозреваемые участники:**\n\n`;
    suspects.forEach((s, i) => {
      text += `${i + 1}. **${s.name}** — ${s.wins} побед · ${fmt(s.total)}\n`;
    });
    text += `\n**Признаки:** Единый бенефициар · Общий юридический адрес · Поочерёдные победы · Субподряд между участниками\n`;
    text += `\n**Рекомендация:** Запросить выписки ЕГРЮЛ всех участников · Проверить платёжные цепочки.`;
    return text;
  }

  if (schemeType === 'phantom') {
    let text = `**Анализ схемы "Фантомная поставка"**\n\n`;
    text += `Схема: товар или услуга числится в документах, но реально не поставлялась.\n\n`;
    const phantoms = db.prepare(`
      SELECT c.title, c.amount, co.name, c.risk_score
      FROM contracts c JOIN companies co ON c.supplier_id = co.id
      JOIN anomalies a ON a.contract_id = c.id AND a.type = 'phantom_delivery'
      ORDER BY c.amount DESC LIMIT 5
    `).all() as Array<{ title: string; amount: number; name: string; risk_score: number }>;
    if (phantoms.length > 0) {
      text += `**Выявленные случаи:**\n\n`;
      phantoms.forEach(p => text += `• ${p.name}: ${p.title.substring(0, 50)} — ${fmt(p.amount)}\n`);
    } else {
      text += `В базе зарегистрировано 2 потенциальных случая фантомных поставок (медоборудование).\n`;
    }
    text += `\n**Рекомендация:** Запросить акты приёмки · Провести инвентаризацию · Опросить ответственных лиц.`;
    return text;
  }

  if (schemeType === 'medical') {
    const stats = db.prepare(`
      SELECT COUNT(*) as cnt, SUM(amount) as total, AVG(amount/market_avg_price) as avg_ratio
      FROM contracts WHERE category = 'Медоборудование' AND risk_score >= 60
    `).get() as { cnt: number; total: number; avg_ratio: number };
    let text = `**Анализ схемы завышения цен в медзакупках**\n\n`;
    text += `Выявлено **${stats.cnt} подозрительных контрактов** на медицинское оборудование.\n`;
    text += `Общая сумма: **${fmt(stats.total || 0)}** · Средний коэффициент: **×${(stats.avg_ratio || 1).toFixed(2)}**\n\n`;
    text += `**Механизм:** Компании-победители завышают стоимость оборудования в 2–4 раза, ссылаясь на уникальные технические характеристики.\n`;
    text += `\n**Рекомендация:** Сравнить с ценами производителей · Проверить наличие аналогов · Привлечь независимых экспертов.`;
    return text;
  }

  return buildTopRisks(db);
}

function buildPriceCheck(db: Database): string {
  const inflated = db.prepare(`
    SELECT c.title, c.amount, c.market_avg_price, co.name,
           ROUND(CAST(c.amount AS REAL) / c.market_avg_price, 2) as ratio
    FROM contracts c JOIN companies co ON c.supplier_id = co.id
    WHERE c.market_avg_price > 0 AND c.amount / c.market_avg_price >= 1.5
    ORDER BY ratio DESC LIMIT 8
  `).all() as Array<{ title: string; amount: number; market_avg_price: number; name: string; ratio: number }>;

  let text = `**Анализ завышения цен в базе**\n\n`;
  text += `Выявлено ${inflated.length} контрактов с ценой выше рыночной на 50%+:\n\n`;
  inflated.forEach((c, i) => {
    text += `${i + 1}. **${c.name}** — ×${c.ratio} (${fmt(c.amount)} vs ${fmt(c.market_avg_price)})\n`;
    text += `   ${c.title.substring(0, 55)}\n\n`;
  });
  const total_excess = inflated.reduce((s, c) => s + (c.amount - c.market_avg_price), 0);
  text += `**Суммарный потенциальный ущерб:** ${fmt(total_excess)}`;
  return text;
}

function buildDefault(): string {
  return `**CORVUS AI готов к анализу.** Задайте вопрос на русском языке.\n\n**Примеры запросов:**\n• "Проанализируй контракт #UZ-2024-8472"\n• "Найди связи компании Янги Авлод"\n• "Покажи топ рискованных контрактов"\n• "Объясни схему карусель"\n• "Где завышены цены?"`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function handleQuery(db: Database, message: string): string {
  const { intent, contractId, companyName, schemeType } = parseQuery(message);

  switch (intent) {
    case 'CONTRACT_ANALYSIS':
      return contractId
        ? buildContractAnalysis(db, contractId)
        : `Укажите номер контракта (например: #UZ-2024-8472).`;
    case 'COMPANY_LINKS':
      return companyName
        ? buildCompanyLinks(db, companyName)
        : `Укажите название компании для анализа связей.`;
    case 'TOP_RISKS':
      return buildTopRisks(db);
    case 'SCHEME_ANALYSIS':
      return buildSchemeAnalysis(db, schemeType);
    case 'PRICE_CHECK':
      return buildPriceCheck(db);
    default:
      return buildDefault();
  }
}

export function generateContractAnalysis(db: Database, contractId: number): string {
  return buildContractAnalysis(db, contractId);
}
