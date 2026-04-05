/**
 * CORVUS Intelligence Service
 * Powered by Perplexity sonar-pro — real web search across:
 *   orginfo.uz · court.gov.uz · xarid.uzex.uz · open news sources
 */

const INVESTIGATOR_SYSTEM = `Ты CORVUS AI — специализированный антикоррупционный аналитик Узбекистана.
Твоя задача — собрать максимум реальных данных о компании из открытых источников.

Используй эти источники при поиске:
• orginfo.uz — реестр юридических лиц (учредители, директор, уставный капитал, дата регистрации)
• xarid.uzex.uz — электронные государственные закупки (тендеры, победы, суммы)
• etender.uzex.uz — конкурсные торги
• court.gov.uz — судебные решения, иски, долги
• minjust.uz — регистрация юрлиц
• soliq.uz — налоговые данные
• opendata.gov.uz — открытые данные госорганов
• Новостные источники Узбекистана (gazeta.uz, kun.uz, daryo.uz, norma.uz)

Правила:
• Отвечай ТОЛЬКО на русском языке
• Используй ## для разделов, **жирный** для важных данных
• Всегда указывай источник данных (из какого сайта)
• Если данные не найдены — так и пиши "данных не найдено"
• НЕ ПРИДУМЫВАЙ данные которых нет
• Выставляй риск-скор в конце (0-100) с конкретным обоснованием`;

const TENDER_MONITOR_SYSTEM = `Ты CORVUS AI — аналитик тендеров государственных закупок Узбекистана.
Ищи информацию на xarid.uzex.uz, etender.uzex.uz, и opendata.gov.uz.
Отвечай на русском, структурируй данные в таблицы.`;

async function perplexityRequest(
  systemPrompt: string,
  userPrompt: string,
  model: 'sonar' | 'sonar-pro' = 'sonar-pro',
  maxTokens = 2500,
): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new Error('PERPLEXITY_API_KEY not configured');

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
      max_tokens:  maxTokens,
      temperature: 0.1,
      search_recency_filter: 'month',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Perplexity ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices[0]?.message?.content ?? '(нет ответа)';
}

// ─── Deep Company Investigation ───────────────────────────────────────────────
export async function deepInvestigateCompany(name: string, inn?: string): Promise<string> {
  const identifier = inn ? `ИНН ${inn}, название «${name}»` : `«${name}»`;

  const prompt = `Проведи ПОЛНОЕ антикоррупционное расследование компании Узбекистана: ${identifier}

Собери и структурируй данные по разделам:

## 1. Регистрационные данные (orginfo.uz / minjust.uz)
- Полное официальное название
- ИНН / ОГРН
- Дата регистрации и последнего обновления
- Юридический адрес
- Вид деятельности (ОКВЭД)
- Уставный капитал
- Директор / руководитель
- Учредители (ФИО, доли)

## 2. Государственные тендеры (xarid.uzex.uz / etender.uzex.uz)
- Количество выигранных тендеров за последние 3 года
- Общая сумма государственных контрактов
- Крупнейшие контракты (название, сумма, заказчик)
- Категории закупок

## 3. Судебные дела (court.gov.uz)
- Количество судебных дел (истец / ответчик)
- Крупные решения против компании
- Долги, взыскания, банкротство

## 4. Налоговый статус (soliq.uz)
- Наличие налоговых задолженностей
- Статус плательщика НДС

## 5. Публичные скандалы и новости
- Упоминания в СМИ (gazeta.uz, kun.uz, daryo.uz)
- Коррупционные расследования, проверки
- Нарушения законодательства

## 6. Связанные лица и структуры
- Другие компании с теми же учредителями
- Аффилированные структуры
- Связи с государственными чиновниками

## 7. Итоговая оценка коррупционного риска
- Риск-скор: [0-100]
- Ключевые красные флаги
- Рекомендуемые действия для следствия`;

  return perplexityRequest(INVESTIGATOR_SYSTEM, prompt, 'sonar-pro', 3000);
}

// ─── Tender Intelligence ──────────────────────────────────────────────────────
export async function investigateTenderSector(category: string, region?: string): Promise<string> {
  const scope = region ? `в регионе "${region}"` : 'по всему Узбекистану';

  const prompt = `Проанализируй тендерный рынок "${category}" ${scope} за последние 6 месяцев.

Найди на xarid.uzex.uz и etender.uzex.uz:
1. Крупнейшие тендеры в этой категории (топ-10 по сумме)
2. Компании-монополисты (выигрывают более 30% тендеров)
3. Признаки картельного сговора (одинаковые цены, поочерёдные победы)
4. Подозрительно низкая конкуренция (1-2 участника в крупных тендерах)
5. Завышение цен относительно рыночных (приведи примеры)

Сделай вывод: есть ли признаки системной коррупции в этом секторе?`;

  return perplexityRequest(TENDER_MONITOR_SYSTEM, prompt, 'sonar-pro', 2000);
}

// ─── Official Check ───────────────────────────────────────────────────────────
export async function investigateOfficial(name: string, position?: string): Promise<string> {
  const role = position ? `, должность: ${position}` : '';

  const prompt = `Проведи проверку государственного чиновника Узбекистана: ${name}${role}

Найди:
1. **Декларация об имуществе** — недвижимость, автомобили, счета (если есть в открытом доступе)
2. **Аффилированные компании** — компании где он/она является учредителем или директором
3. **Родственники в бизнесе** — компании супруга/супруги, детей, братьев-сестёр
4. **Конфликт интересов** — компании получившие госконтракты, связанные с ним/ней
5. **Судебные дела и проверки** — уголовные дела, проверки прокуратуры
6. **Публикации в СМИ** — скандалы, обвинения, расследования

Источники: el.uz, gazeta.uz, kun.uz, court.gov.uz, opendata.gov.uz, parliament.gov.uz

Итог: уровень риска конфликта интересов [0-100]`;

  return perplexityRequest(INVESTIGATOR_SYSTEM, prompt, 'sonar-pro', 2500);
}

// ─── Price Benchmark ──────────────────────────────────────────────────────────
export async function benchmarkPrice(item: string, amount: number, unit?: string): Promise<string> {
  const unitStr = unit ? ` (${unit})` : '';
  const fmt = new Intl.NumberFormat('ru-RU').format(amount);

  const prompt = `Проверь рыночную цену для государственной закупки в Узбекистане:

Товар/услуга: «${item}»${unitStr}
Заявленная сумма контракта: ${fmt} сум

1. Найди актуальную рыночную цену на аналогичные товары/услуги в Узбекистане
2. Сравни с ценами на xarid.uzex.uz для аналогичных закупок за последние 12 месяцев
3. Рассчитай процент отклонения от рыночной цены
4. Оцени: завышена ли цена? На сколько процентов?
5. Приведи примеры аналогичных честных закупок для сравнения

Вывод: является ли данная цена признаком коррупции?`;

  return perplexityRequest(INVESTIGATOR_SYSTEM, prompt, 'sonar', 1500);
}
