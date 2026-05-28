import React, { useState, useEffect } from 'react';
import { api } from './api';
import Sidebar from './components/Sidebar';
import LoginRegister from './pages/LoginRegister';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import FinancialHealth from './pages/FinancialHealth';
import Investments from './pages/Investments';
import { Menu, Wallet } from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = api.getToken();
      if (token) {
        try {
          const profile = await api.getProfile();
          setUser(profile);
        } catch (err) {
          console.error("Autentificare automată eșuată:", err);
          api.setToken(''); // Șterge token-ul invalid
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const handleLogout = () => {
    api.setToken('');
    setUser(null);
    setCurrentPage('dashboard');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-main)' }}>
        <div className="spinner" style={{
          border: '4px solid rgba(108, 93, 211, 0.1)',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          borderLeftColor: 'var(--primary)',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Dacă utilizatorul nu este conectat, afișăm interfața de logare/înregistrare
  if (!user) {
    return <LoginRegister onAuthSuccess={(profile) => setUser(profile)} />;
  }

  // Layout-ul principal al aplicației când utilizatorul este conectat
  return (
    <div className="app-layout">
      {/* Mobile Top Header */}
      <div className="mobile-header">
        <div className="mobile-logo">
          <Wallet className="logo-icon" size={24} />
          <h2>VPFA</h2>
        </div>
        <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar Backdrop Overlay */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        onLogout={handleLogout} 
        user={user} 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="main-content">
        {currentPage === 'dashboard' && (
          <Dashboard 
            user={user} 
            onAddTransactionNav={() => setCurrentPage('transactions')} 
          />
        )}
        {currentPage === 'transactions' && <Transactions />}
        {currentPage === 'health' && <FinancialHealth />}
        {currentPage === 'investments' && (
          <Investments onUserUpdate={(updatedUser) => setUser(updatedUser)} />
        )}
      </main>
    </div>
  );
}

export default App;
