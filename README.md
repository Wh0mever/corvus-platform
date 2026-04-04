# CORVUS — Anti-Corruption Intelligence Platform

Full-stack procurement risk analysis system. React + TypeScript frontend, Node.js + Express backend, SQLite database.

## Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React 18, TypeScript, Vite          |
| Routing  | React Router v6                     |
| Data     | TanStack Query v5                   |
| Charts   | Recharts                            |
| Graph    | D3.js v7 (force simulation)         |
| Backend  | Node.js, Express, TypeScript (tsx)  |
| Database | SQLite via better-sqlite3           |

## Setup

```bash
# Install all dependencies (root + server + client)
npm run install:all

# Seed the database (optional — auto-seeds on first run)
cd server && npm run seed && cd ..

# Start dev servers (runs both concurrently)
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Project Structure

```
corvus-platform/
├── server/
│   └── src/
│       ├── index.ts          # Express entry point (port 3001)
│       ├── db.ts             # SQLite singleton
│       ├── seed.ts           # Seed script (20 contracts, 10 companies, 5 people)
│       ├── risk/
│       │   └── engine.ts     # 4-factor weighted risk calculator
│       ├── ai/
│       │   └── service.ts    # Intent-based AI analyst (no LLM required)
│       └── routes/
│           ├── contracts.ts  # GET /contracts, GET /contracts/:id, POST /contracts
│           ├── stats.ts      # GET /stats (KPIs, trends, distributions)
│           ├── graph.ts      # GET /graph (nodes + edges for D3)
│           ├── alerts.ts     # GET /alerts, PATCH /alerts/:id/read
│           └── ai.ts         # POST /ai/query, POST /ai/analyze/:id
└── client/
    └── src/
        ├── pages/
        │   ├── Dashboard.tsx      # KPI cards, charts, top risks
        │   ├── Contracts.tsx      # Filterable contract table
        │   ├── ContractDetail.tsx # Full contract view + AI analysis
        │   ├── Graph.tsx          # D3 force-directed relationship graph
        │   ├── AIAnalyst.tsx      # Chat interface
        │   └── Alerts.tsx         # Alert management
        ├── components/
        │   ├── layout/            # Header, Layout
        │   └── ui/                # Shared components
        ├── api/index.ts           # Axios API client
        ├── types.ts               # Shared TypeScript types
        └── styles/globals.css     # Design system
```

## API Endpoints

```
GET  /contracts             ?search=&risk_level=&page=&limit=&sort=
GET  /contracts/:id         Full detail with anomalies and risk breakdown
POST /contracts             Create contract (risk auto-calculated)
GET  /stats                 KPIs, monthly trends, risk distribution, top risks
GET  /graph                 ?risk_min=  — nodes and edges for graph view
GET  /alerts                All alerts sorted by severity
PATCH /alerts/:id/read      Mark alert as read
POST /ai/query              { message } → AI text response
POST /ai/analyze/:id        Contract-specific AI analysis
```

## Risk Engine

Four weighted factors → score 0–100:

| Factor               | Weight | Logic                                              |
|----------------------|--------|----------------------------------------------------|
| Price inflation      | 30%    | contract amount vs market average price            |
| Repeat winner        | 25%    | supplier win rate in same category                 |
| Affiliation          | 25%    | known person–company relationship in DB            |
| Competition          | 20%    | number of bidders (1 bidder = max risk)            |

---

Разработано в Узбекистане · [WHOMEVER](https://whomever.uz)
