import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AIProvider } from './contexts/AIContext';
import Header from './components/Header';
import GlobalAIAssistant from './components/GlobalAIAssistant';
import Home from './pages/Home';
import Calibration from './pages/Calibration';
import SphereTest from './pages/SphereTest';
import JCCTest from './pages/JCCTest';
import Summary from './pages/Summary';

function App() {
  return (
    <Router>
      <AIProvider>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Header />
          <main style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/calibration" element={<Calibration />} />
              <Route path="/sphere" element={<SphereTest />} />
              <Route path="/jcc" element={<JCCTest />} />
              <Route path="/summary" element={<Summary />} />
            </Routes>
          </main>
          
          {/* Global AI Assistant - SDK-based conversation */}
          <GlobalAIAssistant />
        </div>
      </AIProvider>
    </Router>
  );
}

export default App;

