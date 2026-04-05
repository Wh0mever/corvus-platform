import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard      from './pages/Dashboard';
import Contracts      from './pages/Contracts';
import ContractDetail from './pages/ContractDetail';
import Graph          from './pages/Graph';
import AIAnalyst      from './pages/AIAnalyst';
import Alerts         from './pages/Alerts';
import Intelligence   from './pages/Intelligence';
import Cases          from './pages/Cases';
import PrivacyPolicy  from './pages/PrivacyPolicy';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/"                element={<Dashboard />} />
        <Route path="/contracts"       element={<Contracts />} />
        <Route path="/contracts/:id"   element={<ContractDetail />} />
        <Route path="/graph"           element={<Graph />} />
        <Route path="/ai"              element={<AIAnalyst />} />
        <Route path="/alerts"          element={<Alerts />} />
        <Route path="/intelligence"    element={<Intelligence />} />
        <Route path="/cases"           element={<Cases />} />
        <Route path="/privacy"         element={<PrivacyPolicy />} />
        <Route path="*"                element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
