import axios from 'axios';
import type { Contract, ContractDetail, DashboardStats, Alert, GraphNode, GraphEdge, Case, CaseDetail, OrgInfoResult, LiveTender } from '../types';

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
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

// ─── Alerts ───────────────────────────────────────────────────────────────────
export interface AlertListResponse {
  data: Alert[];
  total: number;
  unread: number;
}

export async function getAlerts(): Promise<AlertListResponse> {
  const res = await client.get('/alerts');
  return res.data;
}

export async function markAlertRead(id: number): Promise<void> {
  await client.patch(`/alerts/${id}`);
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
export async function queryAI(message: string): Promise<{ response: string; engine?: string }> {
  const res = await client.post('/ai/query', { message });
  return res.data;
}

export async function analyzeContract(contractId: number): Promise<{ analysis: string; engine?: string }> {
  const res = await client.post(`/ai/analyze/${contractId}`);
  return res.data;
}

// ─── Investigation Cases ──────────────────────────────────────────────────────
export async function getCases(): Promise<{ data: Case[] }> {
  const res = await client.get('/cases');
  return res.data;
}

export async function getCase(id: number): Promise<{ data: CaseDetail }> {
  const res = await client.get(`/cases/${id}`);
  return res.data;
}

export async function createCase(data: Partial<Case>): Promise<{ data: Case }> {
  const res = await client.post('/cases', data);
  return res.data;
}

export async function updateCase(id: number, data: Partial<Case>): Promise<void> {
  await client.patch(`/cases/${id}`, data);
}

export async function deleteCase(id: number): Promise<void> {
  await client.delete(`/cases/${id}`);
}

export async function addCaseEntity(caseId: number, entity: { entity_type: string; entity_id?: number; entity_name: string; note?: string }): Promise<void> {
  await client.post(`/cases/${caseId}/entities`, entity);
}

export async function removeCaseEntity(caseId: number, entityId: number): Promise<void> {
  await client.delete(`/cases/${caseId}/entities/${entityId}`);
}

export async function addCaseNote(caseId: number, content: string, author?: string): Promise<void> {
  await client.post(`/cases/${caseId}/notes`, { content, author });
}

// ─── Intelligence ─────────────────────────────────────────────────────────────
export async function lookupCompany(params: { q?: string; inn?: string }): Promise<{ data: OrgInfoResult | null; db_company: object | null }> {
  const res = await client.get('/intelligence/company', { params });
  return res.data;
}

export async function addCompanyToDb(data: { inn?: string; name: string; region?: string; risk_score?: number }): Promise<void> {
  await client.post('/intelligence/company/add', data);
}

export async function getLiveTenders(): Promise<{ data: LiveTender[]; source: string }> {
  const res = await client.get('/intelligence/tenders');
  return res.data;
}

export async function importContracts(contracts: object[]): Promise<{ imported: number; errors: string[] }> {
  const res = await client.post('/intelligence/import', { contracts });
  return res.data;
}

export async function crosscheckCompany(params: { inn?: string; name?: string }): Promise<{ data: object | null }> {
  const res = await client.get('/intelligence/crosscheck', { params });
  return res.data;
}

// ─── Perplexity Deep Research ─────────────────────────────────────────────────
export async function researchCompany(name: string, inn?: string): Promise<{ analysis: string; engine: string }> {
  const res = await client.post('/intelligence/research/company', { name, inn });
  return res.data;
}

export async function researchTenderSector(category: string, region?: string): Promise<{ analysis: string; engine: string }> {
  const res = await client.post('/intelligence/research/tender', { category, region });
  return res.data;
}

export async function researchOfficial(name: string, position?: string): Promise<{ analysis: string; engine: string }> {
  const res = await client.post('/intelligence/research/official', { name, position });
  return res.data;
}

export async function benchmarkContractPrice(item: string, amount: number, unit?: string): Promise<{ analysis: string; engine: string }> {
  const res = await client.post('/intelligence/research/price', { item, amount, unit });
  return res.data;
}
