import React, { useEffect, useState } from 'react';
import { api } from '../api';
import Card from '../components/Card';
import { PortfolioAllocationChart } from '../components/AnalyticsChart';
import CustomSelect from '../components/CustomSelect';
import { ShieldCheck, Info, RefreshCw, BarChart2, Coins, ArrowUpRight } from 'lucide-react';

export default function Investments({ onUserUpdate }) {
  const [investments, setInvestments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hoveredIndex, setHoveredIndex] = useState(-1);

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

  const handleResetForm = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      const user = await api.getProfile();
      setVarsta(user.varsta.toString());
      setVenitLunar(user.venit_lunar.toString());
      setTolerantaRisc(user.toleranta_risc);
      setObiectivEconomii(user.obiectiv_economii.toString());
      setSuccess('Parametrii au fost reîncărcați din profil.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Eroare la reîncărcarea parametrilor.');
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
      <div className="grid-1-2">
        
        {/* Formular Parametri Stânga */}
        <Card title="Parametri Profil (Input Model)">
          <form onSubmit={handleProfileUpdate}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '15px', lineHeight: '1.4' }}>
              Modifică parametrii de intrare de mai jos pentru a schimba încadrarea ta financiară calculată de algoritmul K-Means.
            </p>

            <div className="form-group" style={{ marginBottom: '25px' }}>
              <label className="form-label" style={{ marginBottom: '4px' }}>Vârstă</label>
              <input
                type="number"
                className="input-field"
                value={varsta}
                onChange={(e) => setVarsta(e.target.value)}
                min="18"
                max="100"
                required
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>18 ani</span>
                <input
                  type="range"
                  min="18"
                  max="80"
                  step="1"
                  value={varsta || 30}
                  onChange={(e) => setVarsta(e.target.value)}
                  style={{
                    flex: 1,
                    margin: '0 10px',
                    accentColor: 'var(--primary)',
                    cursor: 'pointer'
                  }}
                />
                <span>80 ani</span>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '25px' }}>
              <label className="form-label" style={{ marginBottom: '4px' }}>Venit Lunar (RON)</label>
              <input
                type="number"
                className="input-field"
                value={venitLunar}
                onChange={(e) => setVenitLunar(e.target.value)}
                min="0"
                required
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>0 RON</span>
                <input
                  type="range"
                  min="0"
                  max="30000"
                  step="500"
                  value={venitLunar || 0}
                  onChange={(e) => setVenitLunar(e.target.value)}
                  style={{
                    flex: 1,
                    margin: '0 10px',
                    accentColor: 'var(--primary)',
                    cursor: 'pointer'
                  }}
                />
                <span>30.000+ RON</span>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '25px' }}>
              <label className="form-label" style={{ marginBottom: '4px' }}>Țintă lunară economisire (RON)</label>
              <input
                type="number"
                className="input-field"
                value={obiectivEconomii}
                onChange={(e) => setObiectivEconomii(e.target.value)}
                min="0"
                required
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>0 RON</span>
                <input
                  type="range"
                  min="0"
                  max={Math.max(10000, parseFloat(venitLunar) || 10000)}
                  step="100"
                  value={obiectivEconomii || 0}
                  onChange={(e) => setObiectivEconomii(e.target.value)}
                  style={{
                    flex: 1,
                    margin: '0 10px',
                    accentColor: 'var(--primary)',
                    cursor: 'pointer'
                  }}
                />
                <span>{Math.round(Math.max(10000, parseFloat(venitLunar) || 10000)).toLocaleString('ro-RO')} RON</span>
              </div>
              {(parseFloat(venitLunar) || 0) > 0 && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px', fontStyle: 'italic' }}>
                  Reprezintă <strong style={{ color: 'var(--primary)' }}>{Math.round(((parseFloat(obiectivEconomii) || 0) / (parseFloat(venitLunar) || 1)) * 100)}%</strong> din venitul tău lunar.
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '25px' }}>
              <label className="form-label" style={{ marginBottom: '4px' }}>Toleranță Risc Declarată</label>
              <CustomSelect
                value={tolerantaRisc}
                onChange={(e) => setTolerantaRisc(e.target.value)}
                options={[
                  { value: 'Conservator', label: 'Conservator' },
                  { value: 'Moderat', label: 'Moderat' },
                  { value: 'Agresiv', label: 'Agresiv' }
                ]}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '5px', color: '#000000', fontWeight: '700' }}>
              <RefreshCw size={16} style={{ marginRight: '6px' }} />
              Actualizează și Recalculează
            </button>

            <button 
              type="button" 
              onClick={handleResetForm}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
                fontWeight: '500',
                marginTop: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = 'var(--text-primary)'}
              onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
            >
              Resetare parametri
            </button>

            {/* Card Sfat Financiar */}
            <div style={{
              marginTop: '25px',
              padding: '16px',
              borderRadius: '12px',
              background: 'rgba(197, 227, 132, 0.04)',
              borderLeft: '4px solid var(--primary)',
              borderTop: '1px solid rgba(197, 227, 132, 0.08)',
              borderRight: '1px solid rgba(197, 227, 132, 0.08)',
              borderBottom: '1px solid rgba(197, 227, 132, 0.08)',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start'
            }}>
              <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>💡</span>
              <div style={{ fontSize: '0.82rem', lineHeight: '1.45', color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '3px' }}>Sfat de educație financiară:</strong>
                Experții recomandă direcționarea a cel puțin 15-20% din venit către investiții și economii (Regula 50/30/20).
              </div>
            </div>
          </form>
        </Card>

        {/* Recomandare și Grafic Dreapta */}
        {investments && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            
            {/* Profil recomandat */}
            <Card title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Portofoliul tău recomandat (generat de Inteligența Artificială)</span>
                <div className="tooltip-container" style={{ color: 'var(--text-muted)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', fontWeight: 'normal' }}>
                  <Info size={14} />
                  <span className="tooltip-text" style={{ textTransform: 'none', letterSpacing: 'normal', fontWeight: '400', fontSize: '0.85rem', lineHeight: '1.4' }}>
                    Folosim algoritmul de învățare nesupervizată K-Means Clustering pentru a te grupa într-un profil investițional în funcție de vârstă, venituri, rata de economisire și apetitul declarativ la risc.
                  </span>
                </div>
              </div>
            } style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '15px' }}>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--secondary)' }} className="glow-text">
                  {investments.profil_nume}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge badge-income" style={{ display: 'inline-flex', gap: '4px', fontSize: '0.8rem', padding: '6px 12px' }}>
                    <ShieldCheck size={14} />
                    Cluster {investments.cluster}
                  </span>
                  <div className="tooltip-container" style={{ color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <Info size={16} />
                    <span className="tooltip-text">
                      {investments.cluster === 0 && "Cluster 0 grupează utilizatorii cu o vârstă mai ridicată, venituri moderate, o rată mai mică de economisire sau o aversiune declarată la risc, prioritizând protejarea capitalului."}
                      {investments.cluster === 1 && "Cluster 1 grupează utilizatorii activi, cu venituri stabile și o rată de economisire echilibrată, care acceptă o volatilitate medie pentru a obține o creștere treptată a capitalului."}
                      {investments.cluster === 2 && "Cluster 2 grupează utilizatorii tineri, cu un orizont mare de timp, venituri ridicate sau o rată mare de economisire, dispuși să își asume riscuri mari pentru randamente maxime pe termen lung."}
                    </span>
                  </div>
                </div>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                {investments.descriere}
              </p>
            </Card>

            {/* Grafic de Distribuție active și Sume absolute */}
            <div className="grid-1-1-2">
              {/* Grafic Pie */}
              <Card title="Alocare Active (%)" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <PortfolioAllocationChart data={investments.alocare} activeIndex={hoveredIndex} setActiveIndex={setHoveredIndex} />
              </Card>

              {/* Sume detaliate */}
              <Card title="Distribuție Sume (RON / Lună)" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1, justifyContent: 'center' }}>
                  {investments.alocare.map((item, index) => (
                    <div 
                      key={index} 
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(-1)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        borderRadius: '8px',
                        background: hoveredIndex === index ? 'rgba(197, 227, 132, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                        border: hoveredIndex === index ? '1px solid rgba(197, 227, 132, 0.4)' : '1px solid var(--border-color)',
                        transform: hoveredIndex === index ? 'scale(1.015)' : 'scale(1)',
                        boxShadow: hoveredIndex === index ? '0 4px 12px rgba(0,0,0,0.2)' : 'none',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: index === 0 ? '#c5e384' : index === 1 ? '#a8e6cf' : index === 2 ? '#ebd5c7' : index === 3 ? '#ffb347' : '#8e8680'
                        }}></div>
                        <span style={{ fontSize: '0.88rem', fontWeight: '500', color: hoveredIndex === index ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{item.clasa_active}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--text-primary)' }}>{item.valoare_estimata.toFixed(2)} RON</strong>
                        <span style={{ fontSize: '0.75rem', color: hoveredIndex === index ? 'var(--primary)' : 'var(--text-muted)' }}>{item.procent}%</span>
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
                <div style={{ fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-primary)', width: '100%' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {investments.recomandare_detaliata.split('\n').map((line, idx) => {
                      if (line.trim().startsWith('•')) {
                        return (
                          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', paddingLeft: '8px' }}>
                            <div style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: 'var(--primary)',
                              marginTop: '8px',
                              flexShrink: 0
                            }} />
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                              {line.trim().substring(2)}
                            </span>
                          </div>
                        );
                      }
                      return (
                        <p key={idx} style={{ fontSize: '0.92rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                          {line}
                        </p>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>

          </div>
        )}

      </div>
    </div>
  );
}
