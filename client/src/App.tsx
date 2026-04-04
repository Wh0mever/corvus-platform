import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard      from './pages/Dashboard';
import Contracts      from './pages/Contracts';
import ContractDetail from './pages/ContractDetail';
import Graph          from './pages/Graph';
import AIAnalyst      from './pages/AIAnalyst';
import Alerts         from './pages/Alerts';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/"               element={<Dashboard />} />
        <Route path="/contracts"      element={<Contracts />} />
        <Route path="/contracts/:id"  element={<ContractDetail />} />
        <Route path="/graph"          element={<Graph />} />
        <Route path="/ai"             element={<AIAnalyst />} />
        <Route path="/alerts"         element={<Alerts />} />
        <Route path="*"               element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
