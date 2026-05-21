import React, { useEffect, useState } from 'react';
import { api } from '../api';
import Card from '../components/Card';
import { PortfolioAllocationChart } from '../components/AnalyticsChart';
import { ShieldCheck, Info, RefreshCw, BarChart2, Coins, ArrowUpRight } from 'lucide-react';

export default function Investments({ onUserUpdate }) {
  const [investments, setInvestments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Câmpuri editare profil pentru clustering
  const [varsta, setVarsta] = useState('');
  const [venitLunar, setVenitLunar] = useState('');
  const [tolerantaRisc, setTolerantaRisc] = useState('Moderat');
  const [obiectivEconomii, setObiectivEconomii] = useState('');

  const fetchInvestments = async () => {
    try {
      setLoading(true);
      const data = await api.getInvestments();
      setInvestments(data);
      
      // Populăm valorile curente ale formularului
      const user = await api.getProfile();
      setVarsta(user.varsta.toString());
      setVenitLunar(user.venit_lunar.toString());
      setTolerantaRisc(user.toleranta_risc);
      setObiectivEconomii(user.obiectiv_economii.toString());
    } catch (err) {
      setError(err.message || 'Eroare la preluarea sugestiilor de investiții.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestments();
  }, []);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const updatedUser = await api.updateProfile({
        varsta: parseInt(varsta),
        venit_lunar: parseFloat(venitLunar),
        toleranta_risc: tolerantaRisc,
        obiectiv_economii: parseFloat(obiectivEconomii)
      });
      
      // Anunțăm componenta părinte despre actualizarea userului (pentru sidebar avatar)
      onUserUpdate(updatedUser);
      
      // Reîncărcăm analiza ML bazată pe noile date
      const data = await api.getInvestments();
      setInvestments(data);
      
      setSuccess('Profil actualizat! Modelul ML K-Means a re-evaluat încadrarea ta.');
    } catch (err) {
      setError(err.message || 'Eroare la actualizarea profilului.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !investments) {
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
      </div>
    );
  }

  return (
    <div>
      {/* Header Investiții */}
      <div style={{ marginBottom: '30px' }}>
        <h1 className="gradient-text" style={{ fontSize: '2.2rem', fontWeight: '800' }}>
          Sugestii Investiții
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Algoritmul de nesupervizat <strong>K-Means Clustering</strong> te încadrează într-un profil investițional pe baza vârstei, veniturilor, ratei de economisire și apetitului declarativ la risc.
        </p>
      </div>

      {/* Mesaje */}
      {error && (
        <div style={{ background: 'rgba(255, 94, 87, 0.15)', border: '1px solid var(--warning)', color: 'var(--warning)', padding: '12px 18px', borderRadius: '8px', marginBottom: '25px', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: 'rgba(5, 196, 107, 0.15)', border: '1px solid var(--success)', color: 'var(--success)', padding: '12px 18px', borderRadius: '8px', marginBottom: '25px', fontSize: '0.9rem' }}>
          {success}
        </div>
      )}

      {/* Grid Principal */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '25px', alignItems: 'start' }}>
        
        {/* Formular Parametri Stânga */}
        <Card title="Parametri Profil (Input Model)">
          <form onSubmit={handleProfileUpdate}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '15px', lineHeight: '1.4' }}>
              Modifică parametrii de intrare de mai jos pentru a schimba încadrarea ta financiară calculată de algoritmul K-Means.
            </p>

            <div className="form-group">
              <label className="form-label">Vârstă</label>
              <input
                type="number"
                className="input-field"
                value={varsta}
                onChange={(e) => setVarsta(e.target.value)}
                min="18"
                max="100"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Venit Lunar (RON)</label>
              <input
                type="number"
                className="input-field"
                value={venitLunar}
                onChange={(e) => setVenitLunar(e.target.value)}
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Țintă lunară economisire (RON)</label>
              <input
                type="number"
                className="input-field"
                value={obiectivEconomii}
                onChange={(e) => setObiectivEconomii(e.target.value)}
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Toleranță Risc Declarată</label>
              <select
                className="input-field"
                value={tolerantaRisc}
                onChange={(e) => setTolerantaRisc(e.target.value)}
              >
                <option value="Conservator">Conservator</option>
                <option value="Moderat">Moderat</option>
                <option value="Agresiv">Agresiv</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
              <RefreshCw size={16} style={{ marginRight: '6px' }} />
              Actualizează și Recalculează
            </button>
          </form>
        </Card>

        {/* Recomandare și Grafic Dreapta */}
        {investments && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            
            {/* Profil recomandat */}
            <Card title="Portofoliu Recomandat de Algoritmul K-Means" style={{ display: 'flex', flexDirection: 'column', background: 'rgba(26, 21, 52, 0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '15px' }}>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--secondary)' }} className="glow-text">
                  {investments.profil_nume}
                </h3>
                <span className="badge badge-income" style={{ display: 'inline-flex', gap: '4px', fontSize: '0.8rem', padding: '6px 12px' }}>
                  <ShieldCheck size={14} />
                  Cluster {investments.cluster}
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                {investments.descriere}
              </p>
            </Card>

            {/* Grafic de Distribuție active și Sume absolute */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '25px', alignItems: 'center' }}>
              {/* Grafic Pie */}
              <Card title="Alocare Active (%)">
                <PortfolioAllocationChart data={investments.alocare} />
              </Card>

              {/* Sume detaliate */}
              <Card title="Distribuție Sume (RON / Lună)">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {investments.alocare.map((item, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-color)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: index === 0 ? '#6c5dd3' : index === 1 ? '#00f2fe' : index === 2 ? '#ffa502' : index === 3 ? '#05c46b' : '#ff5e57'
                        }}></div>
                        <span style={{ fontSize: '0.88rem', fontWeight: '500' }}>{item.clasa_active}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ display: 'block', fontSize: '0.95rem' }}>{item.valoare_estimata.toFixed(2)} RON</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.procent}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Descriere detaliată sfaturi */}
            <Card title="Instrucțiuni de Implementare Portofoliu">
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ color: 'var(--secondary)', flexShrink: 0 }}><Coins size={24} /></div>
                <div style={{ fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                  {investments.recomandare_detaliata}
                </div>
              </div>
            </Card>

          </div>
        )}

      </div>
    </div>
  );
}
