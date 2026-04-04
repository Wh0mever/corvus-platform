import type { RiskParams, RiskResult, RiskBreakdown, Anomaly } from '../types';

const WEIGHTS = {
  price:       0.30,
  repeat:      0.25,
  affiliation: 0.25,
  competition: 0.20,
};

function scorePrice(amount: number, market: number): number {
  if (market <= 0) return 0;
  const ratio = amount / market;
  if (ratio >= 3.5) return 1.0;
  if (ratio >= 2.5) return 0.85;
  if (ratio >= 2.0) return 0.70;
  if (ratio >= 1.5) return 0.45;
  if (ratio >= 1.2) return 0.20;
  return 0;
}

function scoreRepeat(wins: number, total: number): number {
  if (total <= 0) return 0;
  const rate = wins / total;
  if (wins >= 40) return 1.0;
  if (wins >= 20) return 0.80;
  if (wins >= 10) return 0.60;
  if (rate >= 0.7 && wins >= 5) return 0.75;
  if (rate >= 0.5) return 0.45;
  if (rate >= 0.3) return 0.20;
  return 0;
}

function scoreCompetition(bidders: number): number {
  if (bidders <= 1) return 1.0;
  if (bidders === 2) return 0.65;
  if (bidders === 3) return 0.30;
  if (bidders <= 5) return 0.10;
  return 0;
}

type AnomalyInput = Omit<Anomaly, 'id' | 'contract_id' | 'detected_at'>;

export function calculateRisk(params: RiskParams): RiskResult {
  const priceRaw       = scorePrice(params.amount, params.market_avg_price);
  const repeatRaw      = scoreRepeat(params.supplier_wins, params.total_category_contracts);
  const affiliationRaw = params.has_affiliation ? 1.0 : 0;
  const competitionRaw = scoreCompetition(params.bidder_count);

  const breakdown: RiskBreakdown = {
    price_score:       Math.round(priceRaw * 100),
    repeat_score:      Math.round(repeatRaw * 100),
    affiliation_score: Math.round(affiliationRaw * 100),
    competition_score: Math.round(competitionRaw * 100),
    total: 0,
  };

  const weighted =
    priceRaw       * WEIGHTS.price +
    repeatRaw      * WEIGHTS.repeat +
    affiliationRaw * WEIGHTS.affiliation +
    competitionRaw * WEIGHTS.competition;

  breakdown.total = Math.min(100, Math.round(weighted * 100));

  const anomalies: AnomalyInput[] = [];
  const ratio = params.market_avg_price > 0 ? params.amount / params.market_avg_price : 1;

  if (priceRaw >= 0.70) {
    anomalies.push({
      type: 'price_inflation',
      title: `Завышение цены в ${ratio.toFixed(1)}× относительно рынка`,
      description: `Сумма контракта превышает рыночный аналог в ${ratio.toFixed(2)} раза. Расчётный ущерб: $${Math.round((params.amount - params.market_avg_price) / 1000)}K.`,
      severity: ratio >= 3 ? 'critical' : 'high',
      evidence: JSON.stringify({
        contract_amount: params.amount,
        market_price: params.market_avg_price,
        ratio: ratio.toFixed(2),
        estimated_damage: params.amount - params.market_avg_price,
      }),
    });
  } else if (priceRaw >= 0.20) {
    anomalies.push({
      type: 'price_inflation',
      title: `Превышение рыночной цены на ${Math.round((ratio - 1) * 100)}%`,
      description: `Цена выше рыночного аналога на ${Math.round((ratio - 1) * 100)}%.`,
      severity: 'medium',
      evidence: JSON.stringify({
        contract_amount: params.amount,
        market_price: params.market_avg_price,
        ratio: ratio.toFixed(2),
      }),
    });
  }

  if (repeatRaw >= 0.60) {
    anomalies.push({
      type: 'repeat_winner',
      title: `Монопольная победа: ${params.supplier_wins} тендеров`,
      description: `Поставщик выиграл ${params.supplier_wins} из ${params.total_category_contracts} тендеров в категории — концентрация ${Math.round((params.supplier_wins / Math.max(params.total_category_contracts, 1)) * 100)}%.`,
      severity: params.supplier_wins >= 40 ? 'critical' : 'high',
      evidence: JSON.stringify({
        supplier_wins: params.supplier_wins,
        total_in_category: params.total_category_contracts,
        win_rate: `${Math.round((params.supplier_wins / Math.max(params.total_category_contracts, 1)) * 100)}%`,
      }),
    });
  }

  if (affiliationRaw > 0) {
    anomalies.push({
      type: 'affiliation',
      title: 'Аффилированность участников тендера',
      description: 'Обнаружены прямые или косвенные связи между участниками тендера через общих бенефициаров или директоров.',
      severity: 'high',
      evidence: JSON.stringify({ affiliation_detected: true }),
    });
  }

  if (competitionRaw >= 0.65) {
    anomalies.push({
      type: 'no_competition',
      title: params.bidder_count <= 1 ? 'Единственный участник' : 'Критически низкая конкуренция',
      description: params.bidder_count <= 1
        ? 'Тендер принял только одного участника — реальная конкуренция отсутствует.'
        : `Только ${params.bidder_count} участника при стандарте 5+. Признаки подставных участников.`,
      severity: params.bidder_count <= 1 ? 'critical' : 'high',
      evidence: JSON.stringify({ bidder_count: params.bidder_count }),
    });
  }

  return { score: breakdown.total, breakdown, anomalies };
}
