import React, { useEffect, useState } from 'react';
import { api } from '../api';
import Card from '../components/Card';
import TransactionRow from '../components/TransactionRow';
import { TrendChart, ExpensePieChart, PIE_COLORS } from '../components/AnalyticsChart';
import CustomSelect from '../components/CustomSelect';
import { 
  TrendingUp, TrendingDown, Landmark, Percent, AlertOctagon, 
  RefreshCw, ShieldAlert, Sparkles, PlusCircle, Calendar, Trash2,
  Check, X
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

  // Stări noi pentru optimizările UI/UX
  const [hoveredCategoryIndex, setHoveredCategoryIndex] = useState(-1);
  const [activeTimeframe, setActiveTimeframe] = useState('3L');
  const [perioadaSelectata, setPerioadaSelectata] = useState('luna_curenta');

  // Stări pentru sincronizarea multi-bancă
  const [showSyncAllModal, setShowSyncAllModal] = useState(false);
  const [syncAllBanksList, setSyncAllBanksList] = useState([]);
  const [syncAllStatus, setSyncAllStatus] = useState({});
  const [syncAllSummary, setSyncAllSummary] = useState({ count: 0, anomalies: 0 });
  const [syncAllLoading, setSyncAllLoading] = useState(false);

  // Filtrare tranzacții pe baza perioadei selectate (luna curentă, ultimele 30/90 de zile)
  const getFilteredTransactions = () => {
    const today = new Date();
    // Pentru a include corect și tranzacțiile din ziua curentă, setăm sfârșitul zilei
    today.setHours(23, 59, 59, 999);

    return allTransactions.filter(tx => {
      const txDate = new Date(tx.data);
      if (perioadaSelectata === 'luna_curenta') {
        return txDate.getFullYear() === today.getFullYear() && txDate.getMonth() === today.getMonth();
      } else if (perioadaSelectata === 'ultimele_30') {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);
        return txDate >= thirtyDaysAgo && txDate <= today;
      } else if (perioadaSelectata === 'ultimele_90') {
        const ninetyDaysAgo = new Date(today);
        ninetyDaysAgo.setDate(today.getDate() - 90);
        ninetyDaysAgo.setHours(0, 0, 0, 0);
        return txDate >= ninetyDaysAgo && txDate <= today;
      }
      return true;
    });
  };

  // Recalculare dinamică a rezumatului financiar pe baza tranzacțiilor filtrate
  const getDerivedSummary = () => {
    const txs = getFilteredTransactions();
    const venituri = txs.filter(t => t.tip === 'venit').reduce((sum, t) => sum + t.suma, 0);
    const cheltuieli = txs.filter(t => t.tip === 'cheltuiala').reduce((sum, t) => sum + t.suma, 0);
    const sold = venituri - cheltuieli;
    let rata_eco = 0;
    if (venituri > 0) {
      rata_eco = ((venituri - cheltuieli) / venituri) * 100;
    }
    const alerte = txs.filter(t => t.este_anomala && t.tip === 'cheltuiala').length;
    
    return {
      venituri_totale: Math.round(venituri * 100) / 100,
      cheltuieli_totale: Math.round(cheltuieli * 100) / 100,
      sold_curent: Math.round(sold * 100) / 100,
      rata_economisire: Math.round(rata_eco * 10) / 10,
      alerte_anomalii: alerte
    };
  };

  const derivedSummary = summary ? getDerivedSummary() : null;

  // Obținerea celor mai recente tranzacții din perioada selectată
  const getRecentFilteredTransactions = () => {
    return getFilteredTransactions().slice(0, 6);
  };

  const getExpensesByCategory = () => {
    const expenses = getFilteredTransactions().filter(tx => tx.tip === 'cheltuiala');
    const categoriesMap = {};
    expenses.forEach(tx => {
      categoriesMap[tx.categorie] = (categoriesMap[tx.categorie] || 0) + tx.suma;
    });
    return Object.entries(categoriesMap)
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 100) / 100
      }))
      .sort((a, b) => b.value - a.value);
  };

  const getTrendDataForTimeframe = (timeframe) => {
    if (!allTransactions || allTransactions.length === 0) {
      return trends;
    }

    const today = new Date();
    let startDate = new Date();
    let intervalDays = 1;
    let formatLabel = (date) => date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
    let pointsCount = 7;

    if (timeframe === '1S') {
      startDate.setDate(today.getDate() - 6);
      pointsCount = 7;
      intervalDays = 1;
      formatLabel = (date) => date.toLocaleDateString('ro-RO', { weekday: 'short', day: 'numeric' });
    } else if (timeframe === '1L') {
      startDate.setDate(today.getDate() - 29);
      pointsCount = 30;
      intervalDays = 1;
      formatLabel = (date) => date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
    } else if (timeframe === '3L') {
      startDate.setDate(today.getDate() - 89);
      pointsCount = 12; // 12 săptămâni
      intervalDays = 7;
      formatLabel = (date) => date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
    } else if (timeframe === '1A') {
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        months.push({
          dateKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          label: d.toLocaleDateString('ro-RO', { month: 'short', year: 'numeric' }),
          venituri: 0,
          cheltuieli: 0
        });
      }
      
      allTransactions.forEach(tx => {
        const txDate = new Date(tx.data);
        const txKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
        const monthPoint = months.find(m => m.dateKey === txKey);
        if (monthPoint) {
          if (tx.tip === 'venit') {
            monthPoint.venituri += tx.suma;
          } else {
            monthPoint.cheltuieli += tx.suma;
          }
        }
      });
      
      return months.map(m => ({
        luna: m.label,
        venituri: Math.round(m.venituri * 100) / 100,
        cheltuieli: Math.round(m.cheltuieli * 100) / 100
      }));
    } else {
      return trends;
    }

    const dataPoints = [];
    let current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < pointsCount; i++) {
      const nextDate = new Date(current);
      nextDate.setDate(current.getDate() + intervalDays);
      
      dataPoints.push({
        start: new Date(current),
        end: nextDate,
        label: formatLabel(current),
        venituri: 0,
        cheltuieli: 0
      });
      
      current = nextDate;
    }

    allTransactions.forEach(tx => {
      const txDate = new Date(tx.data);
      for (let point of dataPoints) {
        if (txDate >= point.start && txDate < point.end) {
          if (tx.tip === 'venit') {
            point.venituri += tx.suma;
          } else {
            point.cheltuieli += tx.suma;
          }
          break;
        }
      }
    });

    return dataPoints.map(p => ({
      luna: p.label,
      venituri: Math.round(p.venituri * 100) / 100,
      cheltuieli: Math.round(p.cheltuieli * 100) / 100
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

  const handleSyncAllBanks = async () => {
    let connectedIds = [];
    try {
      const saved = localStorage.getItem('connected_bank_ids');
      connectedIds = saved ? JSON.parse(saved) : [];
    } catch (e) {
      connectedIds = [];
    }

    if (connectedIds.length === 0) {
      setMessage({
        text: 'Nu ai niciun cont bancar conectat. Mergi la pagina "Conectare Bănci" din meniul lateral pentru a asocia un cont.',
        type: 'error'
      });
      return;
    }

    const bankMap = {
      bt: { name: 'Banca Transilvania', color: '#ff9f43' },
      bcr: { name: 'BCR', color: '#0082c8' },
      ing: { name: 'ING Bank', color: '#ff793f' },
      brd: { name: 'BRD', color: '#ff4d4d' },
      raiffeisen: { name: 'Raiffeisen Bank', color: '#ffd32a' },
      cec: { name: 'CEC Bank', color: '#05c46b' },
      unicredit: { name: 'UniCredit Bank', color: '#eb3b5a' },
      revolut: { name: 'Revolut Business Sandbox', color: 'var(--primary)' }
    };

    const listToSync = connectedIds.map(id => ({
      id,
      name: bankMap[id]?.name || id,
      color: bankMap[id]?.color || 'var(--primary)'
    }));

    setSyncAllBanksList(listToSync);
    
    const initialStatus = {};
    listToSync.forEach(b => {
      initialStatus[b.id] = 'pending';
    });
    setSyncAllStatus(initialStatus);
    setSyncAllSummary({ count: 0, anomalies: 0 });
    setShowSyncAllModal(true);
    setSyncAllLoading(true);
    setActionLoading(true);

    let totalCount = 0;
    let totalAnomalies = 0;

    for (const bank of listToSync) {
      setSyncAllStatus(prev => ({ ...prev, [bank.id]: 'syncing' }));
      try {
        const res = await api.syncBankSandbox(bank.id, "demo_client", "demo_secret", "123456");
        totalCount += res.count || 0;
        totalAnomalies += res.anomalies_detected || 0;
        setSyncAllStatus(prev => ({ ...prev, [bank.id]: 'completed' }));
      } catch (err) {
        console.error(`Eroare sincronizare ${bank.name}:`, err);
        setSyncAllStatus(prev => ({ ...prev, [bank.id]: 'failed' }));
      }
    }

    setSyncAllSummary({ count: totalCount, anomalies: totalAnomalies });
    setSyncAllLoading(false);
    setActionLoading(false);
    
    await fetchData();
  };

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

  const handleResetData = async () => {
    if (window.confirm('Ești sigur că vrei să resetezi toate datele? Această acțiune va șterge permanent toate tranzacțiile și abonamentele tale.')) {
      setActionLoading(true);
      setMessage({ text: '', type: '' });
      try {
        const res = await api.resetData();
        localStorage.removeItem('connected_bank_ids');
        setMessage({ text: res.message, type: 'success' });
        await fetchData();
      } catch (err) {
        setMessage({ text: err.message || 'Resetarea datelor a eșuat.', type: 'error' });
      } finally {
        setActionLoading(false);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', marginTop: '6px' }}>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
              Bun venit, <strong style={{ color: 'var(--text-primary)' }}>{user.nume}</strong>! Aici este starea finanțelor tale.
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', width: '220px', flexShrink: 0 }}>
              <CustomSelect
                value={perioadaSelectata}
                onChange={(e) => setPerioadaSelectata(e.target.value)}
                options={[
                  { value: 'luna_curenta', label: 'Luna curentă (Iunie 2026)' },
                  { value: 'ultimele_30', label: 'Ultimele 30 de zile' },
                  { value: 'ultimele_90', label: 'Ultimele 90 de zile' }
                ]}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-secondary" 
            onClick={handleSyncAllBanks} 
            disabled={actionLoading}
            title="Sincronizează tranzacțiile de la toate băncile conectate"
          >
            <RefreshCw size={16} className={actionLoading && showSyncAllModal ? "anim-spin" : ""} />
            Sincronizează cu banca
          </button>
          
          <button 
            className="btn btn-primary" 
            onClick={handleTriggerAnomaly} 
            disabled={actionLoading}
            title="Analizează tranzacțiile pentru anomalii folosind Isolation Forest"
          >
            <ShieldAlert size={16} />
            Caută anomalii
          </button>

          <button 
            className="btn btn-danger" 
            onClick={handleResetData} 
            disabled={actionLoading}
            title="Șterge toate tranzacțiile și datele salvate"
          >
            <Trash2 size={16} />
            Resetare Date
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
          {message.type === 'success' && derivedSummary?.alerte_anomalii > 0 && message.text.includes('anomalii') && (
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
      {derivedSummary && (
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
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Balanță Lunară</span>
              <h2 style={{ fontSize: '1.6rem', fontWeight: '700' }} className="glow-text">
                {derivedSummary.sold_curent.toLocaleString('ro-RO')} RON
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
                +{derivedSummary.venituri_totale.toLocaleString('ro-RO')} RON
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
                -{derivedSummary.cheltuieli_totale.toLocaleString('ro-RO')} RON
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
                {derivedSummary.rata_economisire}%
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
              border: derivedSummary.alerte_anomalii > 0 ? '1px solid rgba(255, 94, 87, 0.3)' : '1px solid var(--border-color)',
              background: derivedSummary.alerte_anomalii > 0 ? 'rgba(255, 94, 87, 0.05)' : 'var(--bg-card)',
              cursor: derivedSummary.alerte_anomalii > 0 ? 'pointer' : 'default'
            }}
            onClick={() => {
              if (derivedSummary.alerte_anomalii > 0) {
                setShowAnomalyModal(true);
              }
            }}
          >
            <div style={{
              background: derivedSummary.alerte_anomalii > 0 ? 'rgba(255, 94, 87, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              color: derivedSummary.alerte_anomalii > 0 ? 'var(--warning)' : 'var(--text-muted)',
              padding: '12px',
              borderRadius: '12px',
              animation: derivedSummary.alerte_anomalii > 0 ? 'pulse 2s infinite' : 'none'
            }}>
              <AlertOctagon size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Alerte Anomalii (ML)</span>
              <h2 style={{ fontSize: '1.6rem', fontWeight: '700', color: derivedSummary.alerte_anomalii > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>
                {derivedSummary.alerte_anomalii}
              </h2>
              {derivedSummary.alerte_anomalii > 0 && (
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
      <div className="grid-2-1">
        {/* Coloana Stângă: Grafice */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', height: '100%' }}>
          {/* Grafic Evoluție */}
          <Card title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', width: '100%' }}>
              <span>Evoluție Venituri vs Cheltuieli</span>
              <div style={{ display: 'flex', gap: '5px' }}>
                {['1S', '1L', '3L', '1A'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setActiveTimeframe(p)}
                    style={{
                      background: activeTimeframe === p ? 'var(--primary)' : 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      color: activeTimeframe === p ? '#0e0907' : 'var(--text-secondary)',
                      padding: '4px 10px',
                      fontSize: '0.78rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'var(--transition-smooth)'
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          }>
            {allTransactions.length > 0 ? (
              <TrendChart data={getTrendDataForTimeframe(activeTimeframe)} />
            ) : (
              <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-secondary)' }}>
                Apasă pe butonul "Sincronizează cu banca" pentru a vizualiza graficul evoluției tale financiare.
              </div>
            )}
          </Card>

          {/* Grafic Distribuție Cheltuieli pe Categorii & Plăți Recurente */}
          <Card title="Distribuția Cheltuielilor & Plăți Recurente" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="dashboard-combined-grid">
              {/* Partea Stângă: Donut Chart + Legendă Interactivă (2.2/3) */}
              <div>
                {getFilteredTransactions().filter(tx => tx.tip === 'cheltuiala').length > 0 ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '30px',
                    flexWrap: 'wrap',
                    justifyContent: 'center'
                  }}>
                    <div style={{ flex: '1 1 200px', maxWidth: '240px' }}>
                      <ExpensePieChart 
                        data={getExpensesByCategory()} 
                        height={250} 
                        activeIndex={hoveredCategoryIndex}
                        setActiveIndex={setHoveredCategoryIndex}
                      />
                    </div>
                    
                    {/* Legendă tabelară verticală interactivă */}
                    <div style={{ 
                      flex: '1.2 1 240px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '10px',
                      maxHeight: '250px',
                      overflowY: 'auto',
                      padding: '6px 8px 6px 6px'
                    }}>
                      {getExpensesByCategory().map((item, index) => {
                        const totalSum = getExpensesByCategory().reduce((sum, i) => sum + i.value, 0);
                        const percent = totalSum > 0 ? ((item.value / totalSum) * 100).toFixed(1) : 0;
                        const isHovered = hoveredCategoryIndex === index;
                        
                        return (
                          <div 
                            key={index}
                            onMouseEnter={() => setHoveredCategoryIndex(index)}
                            onMouseLeave={() => setHoveredCategoryIndex(-1)}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              background: isHovered ? 'rgba(197, 227, 132, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                              border: isHovered ? '1px solid rgba(197, 227, 132, 0.4)' : '1px solid var(--border-color)',
                              transform: isHovered ? 'scale(1.015)' : 'scale(1)',
                              boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.2)' : 'none',
                              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                              <div style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                flexShrink: 0,
                                background: PIE_COLORS[index % PIE_COLORS.length]
                              }}></div>
                              <span style={{ 
                                fontSize: '0.85rem', 
                                fontWeight: '550', 
                                color: isHovered ? 'var(--text-primary)' : 'var(--text-secondary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {item.name}
                              </span>
                            </div>
                            
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <strong style={{ display: 'block', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                                {item.value.toLocaleString('ro-RO')} RON
                              </strong>
                              <span style={{ fontSize: '0.72rem', color: isHovered ? 'var(--primary)' : 'var(--text-muted)' }}>
                                {percent}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
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
        <div className="dashboard-tx-card-wrapper">
          {/* Tranzacții Recente */}
          <Card title="Tranzacții Recente" className="dashboard-tx-card">
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, minHeight: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
                {getRecentFilteredTransactions().length > 0 ? (
                  getRecentFilteredTransactions().map((tx) => (
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
              {getFilteredTransactions().filter(tx => tx.este_anomala).length > 0 ? (
                getFilteredTransactions().filter(tx => tx.este_anomala).map((tx) => (
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

      {/* Modal Sincronizare Multi-Bancă */}
      {showSyncAllModal && (
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
            title="Sincronizare Multi-Bancă"
            style={{ 
              width: '100%', 
              maxWidth: '540px', 
              background: 'rgba(21, 15, 12, 0.95)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-lg)',
              backdropFilter: 'blur(20px)',
              position: 'relative'
            }}
          >
            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '15px' }}>
                Se sincronizează tranzacțiile pentru toate conturile conectate în mod Open Banking:
              </p>
 
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '25px' }}>
                {syncAllBanksList.map(bank => {
                  const status = syncAllStatus[bank.id];
                  return (
                    <div 
                      key={bank.id}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: bank.color
                        }}></div>
                        <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                          {bank.name}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
                        {status === 'pending' && (
                          <span style={{ color: 'var(--text-muted)' }}>În așteptare</span>
                        )}
                        {status === 'syncing' && (
                          <>
                            <div className="spinner" style={{
                              border: '2px solid rgba(255,255,255,0.1)',
                              width: '14px',
                              height: '14px',
                              borderRadius: '50%',
                              borderLeftColor: bank.color,
                              animation: 'spin 1s linear infinite'
                            }}></div>
                            <span style={{ color: bank.color }}>Sincronizare...</span>
                          </>
                        )}
                        {status === 'completed' && (
                          <span style={{ color: 'var(--success)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Check size={14} /> Finalizat
                          </span>
                        )}
                        {status === 'failed' && (
                          <span style={{ color: 'var(--warning)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <X size={14} /> Eșuat
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
 
              {!syncAllLoading && (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    background: 'rgba(92, 219, 149, 0.12)',
                    color: 'var(--success)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.8rem',
                    margin: '0 auto 15px auto'
                  }}>
                    ✓
                  </div>
                  
                  <h4 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '1.1rem', fontWeight: '700' }}>
                    Sincronizare Finalizată!
                  </h4>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '15px',
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '20px',
                    textAlign: 'left',
                    marginTop: '15px'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Tranzacții Noi</span>
                      <strong style={{ display: 'block', fontSize: '1.1rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                        {syncAllSummary.count}
                      </strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Anomalii (ML)</span>
                      <strong style={{ display: 'block', fontSize: '1.1rem', color: 'var(--warning)', marginTop: '2px' }}>
                        {syncAllSummary.anomalies}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
 
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-primary" 
                onClick={() => setShowSyncAllModal(false)}
                disabled={syncAllLoading}
                style={{ padding: '8px 24px', fontSize: '0.88rem' }}
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
