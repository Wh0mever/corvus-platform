export interface Company {
  id: number;
  name: string;
  type: string;
  region: string;
  inn: string;
  address: string;
  registered_date: string;
  wins_count: number;
  total_value: number;
  risk_score: number;
}

export interface Contract {
  id: number;
  title: string;
  supplier_id: number;
  supplier_name: string;
  amount: number;
  market_avg_price: number;
  category: string;
  region: string;
  date: string;
  bidder_count: number;
  risk_score: number;
  risk_flags: string;
  status: 'active' | 'completed' | 'suspended' | 'investigating';
  description: string;
  created_at: string;
}

export interface Anomaly {
  id: number;
  contract_id: number;
  type: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  evidence: string;
  detected_at: string;
}

export interface RiskBreakdown {
  price_score: number;
  repeat_score: number;
  affiliation_score: number;
  competition_score: number;
  total: number;
}

export interface ContractDetail extends Contract {
  company: Company;
  anomalies: Anomaly[];
  ai_analysis: string;
  risk_breakdown: RiskBreakdown;
}

export interface Alert {
  id: number;
  type: string;
  title: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  entity_type: string;
  entity_id: number;
  contract_id: number | null;
  created_at: string;
  is_read: boolean;
}

export interface GraphNode {
  id: string;
  type: 'company' | 'person' | 'contract';
  name: string;
  risk: number;
  meta: Record<string, string | number | boolean>;
  // D3 simulation fields (added at runtime)
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
}

export interface GraphEdge {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
  strength: number;
  is_suspicious: boolean;
}

export interface DashboardStats {
  total_contracts: number;
  suspicious_count: number;
  suspicious_percent: number;
  total_at_risk: number;
  avg_risk_score: number;
  unread_alerts: number;
  risk_distribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  monthly_trend: Array<{
    month: string;
    total: number;
    suspicious: number;
    amount: number;
  }>;
  top_risks: Array<{
    id: string;
    name: string;
    type: string;
    risk: number;
    detail: string;
  }>;
}

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

export function getRiskColor(score: number): string {
  if (score >= 80) return 'var(--red)';
  if (score >= 60) return 'var(--amber)';
  if (score >= 40) return 'var(--purple)';
  return 'var(--green)';
}

export function getRiskLabel(score: number): string {
  if (score >= 80) return 'Критический';
  if (score >= 60) return 'Высокий';
  if (score >= 40) return 'Умеренный';
  return 'Низкий';
}

export function formatAmount(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}
