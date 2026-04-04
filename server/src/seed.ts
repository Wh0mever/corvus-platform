import { getDb, isEmpty } from './db';
import { calculateRisk } from './risk/engine';

const COMPANIES = [
  { name: 'Янги Авлод Групп',     type: 'supplier', region: 'Ташкент',    inn: '302847561', address: 'ул. Амира Темура, 42',     registered_date: '2015-03-12', wins_count: 47, total_value: 14200000, risk_score: 87 },
  { name: 'СервисПро ООО',        type: 'supplier', region: 'Самарканд',  inn: '218374629', address: 'ул. Регистан, 17',          registered_date: '2018-07-22', wins_count: 31, total_value:  8700000, risk_score: 74 },
  { name: 'ТошТранс Ltd',         type: 'supplier', region: 'Ташкент',    inn: '419283746', address: 'ул. Амира Темура, 42',     registered_date: '2014-11-05', wins_count: 63, total_value: 22100000, risk_score: 91 },
  { name: 'Самарканд Курилиш',    type: 'supplier', region: 'Самарканд',  inn: '537291846', address: 'ул. Навои, 88',             registered_date: '2019-02-18', wins_count: 22, total_value:  5400000, risk_score: 45 },
  { name: 'Фаргона Индастриал',   type: 'supplier', region: 'Фергана',    inn: '624817392', address: 'Промзона-3, корпус 7',      registered_date: '2017-09-30', wins_count: 38, total_value: 11300000, risk_score: 62 },
  { name: 'Digital Silk Road',    type: 'supplier', region: 'Ташкент',    inn: '731829465', address: 'Технопарк UzTex, 12',       registered_date: '2020-04-14', wins_count: 15, total_value:  3200000, risk_score: 38 },
  { name: 'УзБилд Корпорация',    type: 'supplier', region: 'Бухара',     inn: '812947364', address: 'ул. Хайдар Али, 5',         registered_date: '2013-06-27', wins_count: 54, total_value: 18900000, risk_score: 83 },
  { name: 'Азия Партнёрс',        type: 'supplier', region: 'Навои',      inn: '926384712', address: 'ул. Горького, 31',          registered_date: '2016-12-08', wins_count: 28, total_value:  7100000, risk_score: 55 },
  { name: 'ТехноСервис',          type: 'supplier', region: 'Андижан',    inn: '038174926', address: 'ул. Бабура, 14',            registered_date: '2021-01-20', wins_count: 12, total_value:  2800000, risk_score: 29 },
  { name: 'ГрандИнфра ООО',       type: 'supplier', region: 'Ташкент',    inn: '149273864', address: 'ул. Юнусабад, 22Б',        registered_date: '2016-08-03', wins_count: 41, total_value: 13400000, risk_score: 78 },
];

const PEOPLE = [
  { name: 'А. Тошматов',  role: 'Директор',   risk_score: 76 },
  { name: 'Д. Юсупова',   role: 'Учредитель', risk_score: 82 },
  { name: 'Ж. Мирзаев',   role: 'Бенефициар', risk_score: 91 },
  { name: 'Н. Каримова',   role: 'Менеджер',   risk_score: 43 },
  { name: 'Б. Холматов',   role: 'Учредитель', risk_score: 67 },
];

// [supplier_id(1-based), title, amount, market_avg_price, category, region, bidder_count, status, description, date]
const RAW_CONTRACTS = [
  [1, 'Стройматериалы для объектов МВД',              4720000,  1475000, 'Строительство',   'Ташкент',    2, 'investigating', 'Поставка строительных материалов для ремонта административных зданий МВД.',           '2024-03-15'],
  [3, 'Медицинское оборудование (МРТ, КТ)',          12340000,  5000000, 'Медоборудование', 'Ташкент',    1, 'investigating', 'Закупка магнитно-резонансных томографов и КТ-сканеров для областных больниц.',           '2024-02-28'],
  [1, 'Охранные системы и видеонаблюдение',           3450000,  1100000, 'Строительство',   'Ташкент',    1, 'investigating', 'Установка систем видеонаблюдения на государственных объектах.',                         '2024-01-25'],
  [7, 'Реконструкция административных зданий',        7890000,  3500000, 'Строительство',   'Бухара',     2, 'suspended',     'Реконструкция зданий районных администраций Бухарской области.',                         '2024-04-10'],
  [3, 'Транспортные услуги для госорганов',            5670000,  2500000, 'Транспорт',       'Ташкент',    1, 'active',        'Обеспечение транспортными услугами министерств и ведомств.',                             '2024-02-14'],
  [10,'Дорожное строительство трасса М-39',           18450000, 12000000,'Строительство',   'Ташкент',    3, 'active',        'Строительство и реконструкция участка автодороги М-39 протяжённостью 42 км.',            '2024-01-17'],
  [7, 'Поставка цемента и арматуры',                   9230000,  4200000, 'Строительство',   'Бухара',     2, 'completed',     'Поставка строительных материалов для объектов государственного строительства.',         '2024-03-05'],
  [2, 'ИТ-инфраструктура для министерств',             3120000,  1500000, 'ИТ',              'Самарканд',  2, 'active',        'Поставка и настройка серверного оборудования, сетевой инфраструктуры.',                  '2024-05-02'],
  [5, 'Промышленное оборудование завода',              8760000,  6000000, 'Оборудование',    'Фергана',    3, 'active',        'Закупка промышленного оборудования для модернизации производства.',                     '2024-03-28'],
  [10,'Ирригационные системы Сырдарья',                6780000,  5000000, 'Ирригация',       'Ташкент',    3, 'active',        'Монтаж оросительных систем в Сырдарьинской области.',                                   '2024-07-15'],
  [8, 'Поставка продуктов питания в больницы',         1240000,   900000, 'Питание',         'Навои',      4, 'active',        'Поставка продуктов питания для пациентов областных медицинских учреждений.',             '2024-06-15'],
  [4, 'Благоустройство парков и скверов',              4100000,  3200000, 'Строительство',   'Самарканд',  4, 'active',        'Ландшафтное обустройство городских парков Самаркандской области.',                      '2024-05-30'],
  [8, 'Мебель и оргтехника для школ',                  2100000,  1800000, 'Офисные товары',  'Навои',      5, 'completed',     'Закупка школьной мебели и офисного оборудования.',                                      '2024-06-01'],
  [6, 'Разработка ПО для госпорталов',                 2890000,  2500000, 'ИТ',              'Ташкент',    6, 'active',        'Разработка и внедрение государственных информационных порталов.',                       '2024-04-22'],
  [9, 'Техническое обслуживание оборудования',          890000,   850000, 'Строительство',   'Андижан',    5, 'active',        'Плановое техническое обслуживание производственного оборудования.',                     '2024-07-08'],
  [1, 'Кровельные работы госучреждений',               6200000,  2000000, 'Строительство',   'Ташкент',    1, 'investigating', 'Ремонт кровли и фасадов государственных учреждений.',                                   '2024-08-01'],
  [3, 'Автопарк для министерства',                     4500000,  2200000, 'Транспорт',       'Ташкент',    2, 'active',        'Закупка автотранспортных средств для нужд министерства внутренних дел.',                '2024-07-20'],
  [7, 'Строительство спортивного комплекса',          11200000,  7000000, 'Строительство',   'Бухара',     2, 'active',        'Возведение многофункционального спортивного комплекса в Бухаре.',                       '2024-06-12'],
  [2, 'Сетевое оборудование Cisco',                    1800000,  1200000, 'ИТ',              'Самарканд',  3, 'completed',     'Поставка маршрутизаторов и коммутаторов Cisco для госучреждений.',                     '2024-05-18'],
  [5, 'Насосные станции для ирригации',                3400000,  2800000, 'Ирригация',       'Фергана',    5, 'active',        'Поставка и монтаж насосных станций для ирригационной системы.',                         '2024-09-05'],
];

// [from_type, from_id(1-based), to_type, to_id(1-based), rel_type, strength, is_suspicious]
const RAW_RELS = [
  ['person', 3, 'company', 1, 'owns',         9, 1],
  ['person', 3, 'company', 3, 'owns',         9, 1],
  ['person', 3, 'company', 7, 'affiliated',   7, 1],
  ['company',1, 'company', 3, 'subcontractor',8, 1],
  ['person', 2, 'company', 2, 'directs',      8, 1],
  ['person', 2, 'company', 5, 'owns',         7, 1],
  ['person', 1, 'company', 4, 'directs',      5, 0],
  ['person', 1, 'company',10, 'affiliated',   6, 1],
  ['person', 5, 'company', 8, 'owns',         7, 0],
  ['company',2, 'company', 8, 'affiliated',   5, 1],
  ['person', 4, 'company', 6, 'directs',      4, 0],
  ['company',1, 'company', 7, 'affiliated',   6, 1],
  ['company',3, 'company', 1, 'affiliated',   8, 1],
  ['person', 3, 'company',10, 'affiliated',   5, 1],
  ['company',7, 'company', 4, 'subcontractor',4, 0],
  ['company',5, 'company', 9, 'affiliated',   3, 0],
];

// [contract_id(1-based), type, title, description, severity, evidence_json]
const EXTRA_ANOMALIES: [number, string, string, string, string, string][] = [
  [2, 'phantom_delivery',
    'Признаки фантомной поставки',
    'МРТ-аппараты на $8.4M числятся в документах, но не зарегистрированы в реестре медицинского оборудования.',
    'critical',
    JSON.stringify({ contract_amount: 12340000, registered_equipment: 0, unregistered: 12340000 })],
  [5, 'fast_award',
    'Контракт присуждён за 3 дня',
    'Срок от объявления тендера до подписания контракта составил 3 рабочих дня при норме 30 дней.',
    'high',
    JSON.stringify({ announcement_date: '2024-02-11', award_date: '2024-02-14', days_elapsed: 3, standard: 30 })],
  [8, 'spec_manipulation',
    'Технические требования составлены под конкретного поставщика',
    'Спецификации содержат нестандартные требования, соответствующие только одному производителю на рынке.',
    'high',
    JSON.stringify({ unique_requirements: 3, market_suppliers: 1 })],
];

const RAW_ALERTS: [string, string, string, string, string, number, number | null][] = [
  ['scheme_detected',   'Обнаружена схема «Карусель»',           '3 аффилированные компании поочерёдно выигрывают тендеры (Янги Авлод / ТошТранс / УзБилд). Общий бенефициар — Ж. Мирзаев. Сумма: $22.1M.', 'critical', 'company', 1, 1],
  ['price_inflation',   'Завышение цен в 3.2× — контракт #1',   'Стоимость стройматериалов превышает рыночную цену в 3.2 раза. Ущерб: ~$3.24M.',                                                            'critical', 'contract',1, 1],
  ['phantom_delivery',  'Фантомная поставка медоборудования',    'МРТ-аппараты на $8.4M числятся в документах, но отсутствуют в реестре медучреждений.',                                                      'critical', 'contract',2, 2],
  ['monopoly',          'ТошТранс — 63 тендера за год',          'Компания выиграла 63 из 71 тендера на транспортные услуги. Вероятность случайности: <0.01%.',                                               'high',     'company', 3, 5],
  ['affiliation',       'Аффилированность участников тендера #4','Три участника зарегистрированы по одному адресу и имеют общего учредителя.',                                                                'high',     'contract',4, 4],
  ['no_license',        'Квалификация не соответствует контракту','СервисПро ООО не имеет лицензии на ИТ-деятельность, но победила в тендере на IT-инфраструктуру.',                                          'medium',   'contract',8, 8],
  ['price_growth',      'Резкий рост цен на цемент (+187%)',     'Закупочная цена цемента выросла на 187% за квартал без обоснования. Рынок за тот же период: +12%.',                                         'medium',   'company', 7, 7],
];

export function seed(): void {
  const db = getDb();

  if (!isEmpty()) {
    console.log('✓ Database already seeded, skipping.');
    return;
  }

  console.log('🌱 Seeding database...');

  const insertCompany = db.prepare(
    `INSERT INTO companies (name, type, region, inn, address, registered_date, wins_count, total_value, risk_score)
     VALUES (@name, @type, @region, @inn, @address, @registered_date, @wins_count, @total_value, @risk_score)`
  );
  const insertPerson = db.prepare(
    `INSERT INTO people (name, role, risk_score) VALUES (@name, @role, @risk_score)`
  );
  const insertContract = db.prepare(
    `INSERT INTO contracts (title, supplier_id, amount, market_avg_price, category, region, bidder_count, risk_score, risk_flags, status, description, date)
     VALUES (@title, @supplier_id, @amount, @market_avg_price, @category, @region, @bidder_count, @risk_score, @risk_flags, @status, @description, @date)`
  );
  const insertRel = db.prepare(
    `INSERT INTO relationships (from_type, from_id, to_type, to_id, rel_type, strength, is_suspicious)
     VALUES (@from_type, @from_id, @to_type, @to_id, @rel_type, @strength, @is_suspicious)`
  );
  const insertAnomaly = db.prepare(
    `INSERT INTO anomalies (contract_id, type, title, description, severity, evidence)
     VALUES (@contract_id, @type, @title, @description, @severity, @evidence)`
  );
  const insertAlert = db.prepare(
    `INSERT INTO alerts (type, title, message, severity, entity_type, entity_id, contract_id)
     VALUES (@type, @title, @message, @severity, @entity_type, @entity_id, @contract_id)`
  );

  const doSeed = db.transaction(() => {
    COMPANIES.forEach(c => insertCompany.run(c));
    PEOPLE.forEach(p => insertPerson.run(p));

    // Insert contracts and compute risk
    RAW_CONTRACTS.forEach(([sid, title, amount, market, category, region, bidders, status, desc, date]) => {
      const company = db.prepare('SELECT wins_count FROM companies WHERE id = ?').get(Number(sid)) as { wins_count: number } | undefined;
      const total_cat = db.prepare('SELECT COUNT(*) as cnt FROM contracts WHERE category = ?').get(String(category)) as { cnt: number };

      const rels = db.prepare(
        `SELECT COUNT(*) as cnt FROM relationships
         WHERE (from_type='company' AND from_id=? AND is_suspicious=1)
            OR (to_type='company' AND to_id=? AND is_suspicious=1)`
      ).get(Number(sid), Number(sid)) as { cnt: number };

      const result = calculateRisk({
        amount: Number(amount),
        market_avg_price: Number(market),
        bidder_count: Number(bidders),
        supplier_wins: company?.wins_count ?? 0,
        total_category_contracts: Math.max(total_cat.cnt + 1, 5),
        has_affiliation: rels.cnt > 0,
      });

      const contractId = (insertContract.run({
        title: String(title),
        supplier_id: Number(sid),
        amount: Number(amount),
        market_avg_price: Number(market),
        category: String(category),
        region: String(region),
        bidder_count: Number(bidders),
        risk_score: result.score,
        risk_flags: JSON.stringify(result.anomalies.map(a => a.title)),
        status: String(status),
        description: String(desc),
        date: String(date),
      }) as { lastInsertRowid: bigint }).lastInsertRowid;

      result.anomalies.forEach(a => {
        insertAnomaly.run({
          contract_id: contractId,
          type: a.type,
          title: a.title,
          description: a.description,
          severity: a.severity,
          evidence: a.evidence,
        });
      });
    });

    RAW_RELS.forEach(([ft, fi, tt, ti, rt, s, isSusp]) => {
      insertRel.run({ from_type: ft, from_id: fi, to_type: tt, to_id: ti, rel_type: rt, strength: s, is_suspicious: isSusp });
    });

    EXTRA_ANOMALIES.forEach(([cid, type, title, desc, sev, evidence]) => {
      insertAnomaly.run({ contract_id: cid, type, title, description: desc, severity: sev, evidence });
    });

    RAW_ALERTS.forEach(([type, title, msg, sev, et, eid, cid]) => {
      insertAlert.run({ type, title, message: msg, severity: sev, entity_type: et, entity_id: eid, contract_id: cid });
    });
  });

  doSeed();
  console.log('✓ Seed complete: 10 companies, 5 people, 20 contracts, relations, anomalies, alerts.');
}

// Run standalone: tsx src/seed.ts
if (require.main === module) {
  seed();
}
