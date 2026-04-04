export interface Company {
  id: number;
  name: string;
  type: 'supplier' | 'state' | 'ngo';
  region: string;
  inn: string;
  address: string;
  registered_date: string;
  director_id: number | null;
  wins_count: number;
  total_value: number;
  risk_score: number;
}

export interface Person {
  id: number;
  name: string;
  role: string;
  risk_score: number;
}

export interface Contract {
  id: number;
  title: string;
  supplier_id: number;
  supplier_name?: string;
  amount: number;
  market_avg_price: number;
  category: string;
  region: string;
  date: string;
  bidder_count: number;
  risk_score: number;
  risk_flags: string; // JSON string
  status: 'active' | 'completed' | 'suspended' | 'investigating';
  description: string;
  created_at: string;
}

export interface ContractDetail extends Contract {
  company: Company;
  anomalies: Anomaly[];
  ai_analysis: string;
  risk_breakdown: RiskBreakdown;
}

export interface RiskBreakdown {
  price_score: number;
  repeat_score: number;
  affiliation_score: number;
  competition_score: number;
  total: number;
}

export interface Anomaly {
  id: number;
  contract_id: number;
  type: 'price_inflation' | 'repeat_winner' | 'affiliation' | 'phantom_delivery' | 'no_competition' | 'spec_manipulation' | 'fast_award';
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  evidence: string; // JSON string
  detected_at: string;
}

export interface Alert {
  id: number;
  type: string;
  title: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  entity_type: 'contract' | 'company' | 'person';
  entity_id: number;
  contract_id: number | null;
  created_at: string;
  is_read: boolean;
}

export interface Relationship {
  id: number;
  from_type: 'company' | 'person' | 'contract';
  from_id: number;
  to_type: 'company' | 'person' | 'contract';
  to_id: number;
  rel_type: 'owns' | 'directs' | 'affiliated' | 'subcontractor' | 'won' | 'participates';
  strength: number;
  is_suspicious: boolean;
}

export interface GraphNode {
  id: string;
  type: 'company' | 'person' | 'contract';
  name: string;
  risk: number;
  meta: Record<string, string | number | boolean>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
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

export interface RiskParams {
  amount: number;
  market_avg_price: number;
  bidder_count: number;
  supplier_wins: number;
  total_category_contracts: number;
  has_affiliation: boolean;
}

export interface RiskResult {
  score: number;
  breakdown: RiskBreakdown;
  anomalies: Omit<Anomaly, 'id' | 'contract_id' | 'detected_at'>[];
}
