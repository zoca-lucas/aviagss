import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AircraftProvider } from './contexts/AircraftContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Aeronaves from './pages/Aeronaves';
import Logbook from './pages/Logbook';
import LancamentosVoo from './pages/LancamentosVoo';
import Manutencao from './pages/Manutencao';
import Financeiro from './pages/Financeiro';
import Patrimonio from './pages/Patrimonio';
import Documentos from './pages/Documentos';
import Agenda from './pages/Agenda';
import EstimativaVoo from './pages/EstimativaVoo';
import Relatorios from './pages/Relatorios';
import RelatoriosLancamentos from './pages/RelatoriosLancamentos';
import UsoPorSocio from './pages/UsoPorSocio';
import Usuarios from './pages/Usuarios';
import Configuracoes from './pages/Configuracoes';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AircraftProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/aeronaves" element={<Aeronaves />} />
              <Route path="/logbook" element={<Logbook />} />
              <Route path="/lancamentos" element={<LancamentosVoo />} />
              <Route path="/manutencao" element={<Manutencao />} />
              <Route path="/financeiro" element={<Financeiro />} />
              <Route path="/patrimonio" element={<Patrimonio />} />
              <Route path="/documentos" element={<Documentos />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/estimativa" element={<EstimativaVoo />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/relatorios-lancamentos" element={<RelatoriosLancamentos />} />
              <Route path="/uso-por-socio" element={<UsoPorSocio />} />
              <Route path="/usuarios" element={<Usuarios />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
            </Routes>
          </Layout>
        </AircraftProvider>
      </AuthProvider>
    </Router>
  );
}
