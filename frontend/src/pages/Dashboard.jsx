import React, { useEffect, useState } from 'react';
import { api } from '../api';
import Card from '../components/Card';
import TransactionRow from '../components/TransactionRow';
import { TrendChart } from '../components/AnalyticsChart';
import { 
  TrendingUp, TrendingDown, Landmark, Percent, AlertOctagon, 
  RefreshCw, ShieldAlert, Sparkles, PlusCircle 
} from 'lucide-react';

export default function Dashboard({ user, onAddTransactionNav }) {
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const summaryData = await api.getDashboardSummary();
      const trendsData = await api.getMonthlyTrends();
      const txData = await api.getTransactions();
      
      setSummary(summaryData);
      setTrends(trendsData);
      setRecentTransactions(txData.slice(0, 5)); // Ultimele 5 tranzacții
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Eroare la preluarea datelor financiare.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSyncMock = async () => {
    setActionLoading(true);
    setMessage({ text: '', type: '' });
    try {
      const res = await api.syncMockData();
      setMessage({ text: res.message, type: 'success' });
      await fetchData();
    } catch (err) {
      setMessage({ text: err.message || 'Sincronizarea a eșuat.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerAnomaly = async () => {
    setActionLoading(true);
    setMessage({ text: '', type: '' });
    try {
      const res = await api.triggerAnomalyDetection();
      setMessage({ text: res.message, type: 'success' });
      await fetchData();
    } catch (err) {
      setMessage({ text: err.message || 'Eroare la rularea analizei ML.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTx = async (id) => {
    if (window.confirm('Ești sigur că vrei să ștergi această tranzacție?')) {
      try {
        await api.deleteTransaction(id);
        setMessage({ text: 'Tranzacție ștearsă.', type: 'success' });
        await fetchData();
      } catch (err) {
        setMessage({ text: err.message || 'Ștergerea a eșuat.', type: 'error' });
      }
    }
  };

  if (loading && !summary) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
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

  return (
    <div>
      {/* Header Panou Control */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap',
        gap: '15px',
        marginBottom: '30px'
      }}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: '2.2rem', fontWeight: '800' }}>
            Panou Principal
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Bun venit, <strong style={{ color: 'var(--text-primary)' }}>{user.nume}</strong>! Aici este starea finanțelor tale.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={handleSyncMock} 
            disabled={actionLoading}
            title="Sincronizează date bancare mock pentru demo"
          >
            <RefreshCw size={16} className={actionLoading ? 'anim-spin' : ''} />
            Simulează Sincronizare
          </button>
          
          <button 
            className="btn btn-primary" 
            onClick={handleTriggerAnomaly} 
            disabled={actionLoading}
            title="Analizează tranzacțiile pentru anomalii folosind Isolation Forest"
          >
            <ShieldAlert size={16} />
            Rulează Model ML Anomalii
          </button>
        </div>
      </div>

      {/* Mesaje Utilizator */}
      {message.text && (
        <div style={{
          background: message.type === 'success' ? 'rgba(5, 196, 107, 0.15)' : 'rgba(255, 94, 87, 0.15)',
          border: `1px solid ${message.type === 'success' ? 'var(--success)' : 'var(--warning)'}`,
          color: message.type === 'success' ? 'var(--success)' : 'var(--warning)',
          padding: '12px 18px',
          borderRadius: '8px',
          marginBottom: '25px',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Sparkles size={16} />
          {message.text}
        </div>
      )}

      {/* Grid Indicatori Cheie */}
      {summary && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
          marginBottom: '30px'
        }}>
          {/* Card Sold Curent */}
          <Card className="summary-card" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{
              background: 'rgba(0, 242, 254, 0.12)',
              color: 'var(--secondary)',
              padding: '12px',
              borderRadius: '12px'
            }}>
              <Landmark size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Sold Curent</span>
              <h2 style={{ fontSize: '1.6rem', fontWeight: '700' }} className="glow-text">
                {summary.sold_curent.toLocaleString('ro-RO')} RON
              </h2>
            </div>
          </Card>

          {/* Card Venituri */}
          <Card className="summary-card" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{
              background: 'rgba(5, 196, 107, 0.12)',
              color: 'var(--success)',
              padding: '12px',
              borderRadius: '12px'
            }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Venituri Totale</span>
              <h2 style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--success)' }}>
                +{summary.venituri_totale.toLocaleString('ro-RO')} RON
              </h2>
            </div>
          </Card>

          {/* Card Cheltuieli */}
          <Card className="summary-card" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{
              background: 'rgba(108, 93, 211, 0.12)',
              color: '#bdc5ff',
              padding: '12px',
              borderRadius: '12px'
            }}>
              <TrendingDown size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cheltuieli Totale</span>
              <h2 style={{ fontSize: '1.6rem', fontWeight: '700', color: '#bdc5ff' }}>
                -{summary.cheltuieli_totale.toLocaleString('ro-RO')} RON
              </h2>
            </div>
          </Card>

          {/* Card Rata Economisire */}
          <Card className="summary-card" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{
              background: 'rgba(255, 165, 2, 0.12)',
              color: 'var(--amber)',
              padding: '12px',
              borderRadius: '12px'
            }}>
              <Percent size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Rată Economisire</span>
              <h2 style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--amber)' }}>
                {summary.rata_economisire}%
              </h2>
            </div>
          </Card>

          {/* Card Alerte Anomalii (ML) */}
          <Card className="summary-card" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '15px',
            border: summary.alerte_anomalii > 0 ? '1px solid rgba(255, 94, 87, 0.3)' : '1px solid var(--border-color)',
            background: summary.alerte_anomalii > 0 ? 'rgba(255, 94, 87, 0.05)' : 'var(--bg-card)'
          }}>
            <div style={{
              background: summary.alerte_anomalii > 0 ? 'rgba(255, 94, 87, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              color: summary.alerte_anomalii > 0 ? 'var(--warning)' : 'var(--text-muted)',
              padding: '12px',
              borderRadius: '12px',
              animation: summary.alerte_anomalii > 0 ? 'pulse 2s infinite' : 'none'
            }}>
              <AlertOctagon size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Alerte Anomalii (ML)</span>
              <h2 style={{ fontSize: '1.6rem', fontWeight: '700', color: summary.alerte_anomalii > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>
                {summary.alerte_anomalii}
              </h2>
            </div>
          </Card>
        </div>
      )}

      {/* Secțiune Grafice și Tranzacții Recente */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '25px',
        alignItems: 'start'
      }}>
        {/* Grafic Evoluție */}
        <Card title="Evoluție Venituri vs Cheltuieli">
          {trends.length > 0 ? (
            <TrendChart data={trends} />
          ) : (
            <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-secondary)' }}>
              Apasă pe butonul "Simulează Sincronizare" pentru a vizualiza graficul evoluției tale financiare.
            </div>
          )}
        </Card>

        {/* Tranzacții Recente */}
        <Card title="Tranzacții Recente">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {recentTransactions.length > 0 ? (
              recentTransactions.map((tx) => (
                <TransactionRow 
                  key={tx.id} 
                  transaction={tx} 
                  onDelete={handleDeleteTx} 
                />
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                Nu există nicio tranzacție salvată.
              </div>
            )}
            
            <button 
              className="btn btn-secondary" 
              onClick={onAddTransactionNav}
              style={{ width: '100%', marginTop: '10px' }}
            >
              <PlusCircle size={16} />
              Vezi toate / Adaugă manual
            </button>
          </div>
        </Card>
      </div>

      <style>{`
        .anim-spin {
          animation: spin 1.2s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
