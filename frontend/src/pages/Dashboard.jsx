import React, { useEffect, useState } from 'react';
import { api } from '../api';
import Card from '../components/Card';
import TransactionRow from '../components/TransactionRow';
import { TrendChart, ExpensePieChart } from '../components/AnalyticsChart';
import { 
  TrendingUp, TrendingDown, Landmark, Percent, AlertOctagon, 
  RefreshCw, ShieldAlert, Sparkles, PlusCircle, Calendar 
} from 'lucide-react';

export default function Dashboard({ user, onAddTransactionNav }) {
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [upcomingSubs, setUpcomingSubs] = useState([]);
  const [showAnomalyModal, setShowAnomalyModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const getExpensesByCategory = () => {
    const expenses = allTransactions.filter(tx => tx.tip === 'cheltuiala');
    const categoriesMap = {};
    expenses.forEach(tx => {
      categoriesMap[tx.categorie] = (categoriesMap[tx.categorie] || 0) + tx.suma;
    });
    return Object.entries(categoriesMap).map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100
    }));
  };

  const getDaysRemaining = (ziPlata) => {
    const today = new Date();
    const day = today.getDate();
    let diff = ziPlata - day;
    if (diff < 0) {
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      diff = (lastDay - day) + ziPlata;
    }
    return diff;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const summaryData = await api.getDashboardSummary();
      const trendsData = await api.getMonthlyTrends();
      const txData = await api.getTransactions();
      const upcomingData = await api.getUpcomingSubscriptions();
      
      setSummary(summaryData);
      setTrends(trendsData);
      setAllTransactions(txData);
      setRecentTransactions(txData.slice(0, 6)); // Ultimele 6 tranzacții
      setUpcomingSubs(upcomingData);
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
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} />
            <span>{message.text}</span>
          </div>
          {message.type === 'success' && summary?.alerte_anomalii > 0 && message.text.includes('anomalii') && (
            <button 
              onClick={() => setShowAnomalyModal(true)}
              className="btn btn-secondary"
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Afișează Anomaliile
            </button>
          )}
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
              background: 'rgba(235, 213, 199, 0.12)',
              color: '#ebd5c7',
              padding: '12px',
              borderRadius: '12px'
            }}>
              <TrendingDown size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cheltuieli Totale</span>
              <h2 style={{ fontSize: '1.6rem', fontWeight: '700', color: '#ebd5c7' }}>
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
          <Card 
            className="summary-card" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '15px',
              border: summary.alerte_anomalii > 0 ? '1px solid rgba(255, 94, 87, 0.3)' : '1px solid var(--border-color)',
              background: summary.alerte_anomalii > 0 ? 'rgba(255, 94, 87, 0.05)' : 'var(--bg-card)',
              cursor: summary.alerte_anomalii > 0 ? 'pointer' : 'default'
            }}
            onClick={() => {
              if (summary.alerte_anomalii > 0) {
                setShowAnomalyModal(true);
              }
            }}
          >
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
              {summary.alerte_anomalii > 0 && (
                <span 
                  style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--warning)', 
                    textDecoration: 'underline', 
                    display: 'block',
                    marginTop: '2px'
                  }}
                >
                  Vezi detalii →
                </span>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Secțiune Grafice și Tranzacții Recente */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '25px',
        alignItems: 'stretch'
      }}>
        {/* Coloana Stângă: Grafice */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', height: '100%' }}>
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

          {/* Grafic Distribuție Cheltuieli pe Categorii & Plăți Recurente */}
          <Card title="Distribuția Cheltuielilor & Plăți Recurente" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="dashboard-combined-grid">
              {/* Partea Stângă: Donut Chart (2.2/3) */}
              <div>
                {allTransactions.filter(tx => tx.tip === 'cheltuiala').length > 0 ? (
                  <ExpensePieChart data={getExpensesByCategory()} height={250} />
                ) : (
                  <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Nu există cheltuieli înregistrate pentru a afișa distribuția pe categorii.
                  </div>
                )}
              </div>

              {/* Partea Dreaptă: Următoarele Plăți Recurente (1/3) */}
              <div className="dashboard-combined-list">
                <h4 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '15px', color: 'var(--text-primary)' }}>
                  Următoarele Plăți (7 Zile)
                </h4>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  maxHeight: '210px',
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  paddingRight: '5px'
                }}>
                  {upcomingSubs.length > 0 ? (
                    upcomingSubs.map((sub) => (
                      <div 
                        key={sub.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 12px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <div style={{
                            background: 'rgba(197, 227, 132, 0.1)',
                            color: 'var(--primary)',
                            padding: '6px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <Calendar size={14} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <h5 style={{ fontSize: '0.85rem', fontWeight: '600', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {sub.nume}
                            </h5>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                              Ziua {sub.zi_plata} (peste {getDaysRemaining(sub.zi_plata)} {getDaysRemaining(sub.zi_plata) === 1 ? 'zi' : 'zile'})
                            </span>
                          </div>
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#ebd5c7', flexShrink: 0, marginLeft: '5px' }}>
                          -{sub.suma} RON
                        </span>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      Nicio plată programată în următoarele 7 zile.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Coloana Dreaptă: Tranzacții Recente */}
        <div style={{ position: 'relative' }}>
          {/* Tranzacții Recente */}
          <Card title="Tranzacții Recente" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, minHeight: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
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
              </div>
              
              <button 
                className="btn btn-secondary" 
                onClick={onAddTransactionNav}
                style={{ width: '100%', marginTop: '20px' }}
              >
                <PlusCircle size={16} />
                Vezi toate / Adaugă manual
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* Modal Afișare Anomalii */}
      {showAnomalyModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(6, 5, 12, 0.75)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <Card 
            title="Anomalii de Cheltuieli Detectate (ML)" 
            style={{ 
              width: '100%', 
              maxWidth: '620px', 
              background: 'rgba(18, 16, 35, 0.95)',
              border: '1px solid rgba(255, 94, 87, 0.4)',
              boxShadow: '0 0 25px rgba(255, 94, 87, 0.25)',
              backdropFilter: 'blur(20px)',
              position: 'relative'
            }}
          >
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem', lineHeight: '1.4' }}>
              Următoarele tranzacții au fost identificate ca fiind atipice de modelul Machine Learning (Isolation Forest) pe baza sumelor sau a categoriei de consum.
            </p>
            
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px', 
              maxHeight: '380px', 
              overflowY: 'auto', 
              marginBottom: '20px', 
              paddingRight: '5px' 
            }}>
              {allTransactions.filter(tx => tx.este_anomala).length > 0 ? (
                allTransactions.filter(tx => tx.este_anomala).map((tx) => (
                  <TransactionRow 
                    key={tx.id} 
                    transaction={tx} 
                    onDelete={handleDeleteTx} 
                  />
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-secondary)' }}>
                  Nu mai există nicio anomalie detectată.
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowAnomalyModal(false)}
                style={{ padding: '8px 20px' }}
              >
                Închide
              </button>
            </div>
          </Card>
        </div>
      )}

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
