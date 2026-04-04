import axios from 'axios';
import type { Contract, ContractDetail, DashboardStats, Alert, GraphNode, GraphEdge } from '../types';

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

client.interceptors.response.use(
  res => res,
  err => {
    const msg = err.response?.data?.error || err.message || 'Network error';
    return Promise.reject(new Error(msg));
  }
);

// ─── Contracts ────────────────────────────────────────────────────────────────
export interface ContractFilters {
  search?: string;
  risk?: 'all' | 'critical' | 'high' | 'medium' | 'low';
  page?: number;
  limit?: number;
  sort?: string;
  dir?: 'asc' | 'desc';
}

export interface ContractListResponse {
  data: Contract[];
  total: number;
  page: number;
  pages: number;
}

export async function getContracts(filters: ContractFilters = {}): Promise<ContractListResponse> {
  const res = await client.get('/contracts', { params: filters });
  return res.data;
}

export async function getContract(id: number): Promise<ContractDetail> {
  const res = await client.get(`/contracts/${id}`);
  return res.data.data;
}

export async function createContract(data: Partial<Contract>): Promise<Contract> {
  const res = await client.post('/contracts', data);
  return res.data.data;
}

// ─── Stats ────────────────────────────────────────────────────────────────────
export async function getStats(): Promise<DashboardStats> {
  const res = await client.get('/stats');
  return res.data;
}

export async function getTopRisk(): Promise<{ data: Contract[] }> {
  const res = await client.get('/stats/top-risk');
  return res.data;
}

// ─── Alerts ───────────────────────────────────────────────────────────────────
export interface AlertFilters {
  severity?: string;
  read?: boolean;
}

export interface AlertListResponse {
  data: Alert[];
  total: number;
  unread: number;
}

export async function getAlerts(filters: AlertFilters = {}): Promise<AlertListResponse> {
  const res = await client.get('/alerts', { params: filters });
  return res.data;
}

export async function markAlertRead(id: number): Promise<void> {
  await client.patch(`/alerts/${id}`);
}

export async function markAllAlertsRead(): Promise<void> {
  await client.patch('/alerts/read-all');
}

// ─── Graph ────────────────────────────────────────────────────────────────────
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export async function getGraph(riskMin = 0): Promise<GraphData> {
  const res = await client.get('/graph', { params: { risk_min: riskMin } });
  return res.data;
}

// ─── AI ───────────────────────────────────────────────────────────────────────
export async function queryAI(message: string): Promise<{ response: string }> {
  const res = await client.post('/ai/query', { message });
  return res.data;
}

export async function analyzeContract(contractId: number): Promise<{ analysis: string }> {
  const res = await client.post(`/ai/analyze/${contractId}`);
  return res.data;
}
