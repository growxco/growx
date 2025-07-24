import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Breadcrumbs from './components/Breadcrumbs';

// Pages
import HomePage from './pages/HomePage';
import ContactPage from './pages/ContactPage';
import SupplyXPage from './pages/SupplyXPage';
import SPIPage from './pages/SPIPage';
import SPPPage from './pages/SPPPage';
import GrowXAppPage from './pages/GrowXAppPage';
import ProductsPage from './pages/ProductsPage';
import EstacaoMeteorologicaPage from './pages/EstacaoMeteorologicaPage';
import ModuloSemFioPage from './pages/ModuloSemFioPage';
import EstufaAutomatizadaPage from './pages/EstufaAutomatizadaPage';
import HistoryPage from './pages/HistoryPage';
import ExecutivePage from './pages/ExecutivePage';
import PhilosophyPage from './pages/PhilosophyPage';
import ObrigadoPage from './pages/ObrigadoPage';
import './App.css';

// Componente para scroll automático ao topo
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="min-h-screen bg-background">
        <Header />
        <main>
          <Breadcrumbs />
          <Routes>
            {/* Páginas Principais */}
            <Route path="/" element={<HomePage />} />
            <Route path="/contato" element={<ContactPage />} />
            <Route path="/obrigado" element={<ObrigadoPage />} />
           
            {/* Soluções */}
            <Route path="/solucoes/supply-x" element={<SupplyXPage />} />
            <Route path="/solucoes/spi" element={<SPIPage />} />
            <Route path="/solucoes/spp" element={<SPPPage />} />
            <Route path="/solucoes/growx-app" element={<GrowXAppPage />} />
            
            {/* Produtos */}
            <Route path="/produtos" element={<ProductsPage />} />
            <Route path="/produtos/estacao-meteorologica" element={<EstacaoMeteorologicaPage />} />
            <Route path="/produtos/modulo-sem-fio" element={<ModuloSemFioPage />} />
            <Route path="/produtos/estufa-automatizada" element={<EstufaAutomatizadaPage />} />
            
            {/* Sobre Nós */}
            <Route path="/sobre/historia" element={<HistoryPage />} />
            <Route path="/sobre/executivo" element={<ExecutivePage />} />
            <Route path="/sobre/filosofia" element={<PhilosophyPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;

