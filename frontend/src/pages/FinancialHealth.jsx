import React, { useEffect, useState } from 'react';
import { api } from '../api';
import Card from '../components/Card';
import { ForecastChart } from '../components/AnalyticsChart';
import { LineChart, Hourglass, ShieldCheck, AlertCircle, Sparkles, TrendingUp, Info } from 'lucide-react';

export default function FinancialHealth({ onNavigateToTransactions }) {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchForecast = async () => {
    try {
      setLoading(true);
      const data = await api.getForecast();
      setForecast(data);
    } catch (err) {
      setError(err.message || 'Eroare la calcularea prognozei financiare.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, []);

  if (loading) {
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

  const isDataInsufficient = forecast ? (forecast.mesaj_sanatate.includes("Nu există suficiente tranzacții") || forecast.istoric.length === 0) : true;

  return (
    <div>
      {/* Header Prognoze */}
      <div style={{ marginBottom: '30px' }}>
        <h1 className="gradient-text" style={{ fontSize: '2.2rem', fontWeight: '800' }}>
          Sănătate Predictivă
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Modelele de Machine Learning analizează istoricul tău de tranzacții și prezic evoluția soldului pe următoarele 90 de zile.
        </p>
      </div>

      {error && (
        <div style={{ background: 'rgba(255, 94, 87, 0.15)', border: '1px solid var(--warning)', color: 'var(--warning)', padding: '12px 18px', borderRadius: '8px', marginBottom: '25px', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {forecast && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          
          {/* Raport diagnoză ML */}
          <Card 
            title="Diagnoza Inteligentă a Soldului"
            style={{
              borderLeft: isDataInsufficient
                ? '4px solid var(--text-muted)'
                : (forecast.runway_luni ? '4px solid var(--warning)' : '4px solid var(--success)')
            }}
          >
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{
                background: isDataInsufficient
                  ? 'rgba(142, 134, 128, 0.12)'
                  : (forecast.runway_luni ? 'rgba(255, 111, 105, 0.12)' : 'rgba(92, 219, 149, 0.12)'),
                color: isDataInsufficient
                  ? 'var(--text-muted)'
                  : (forecast.runway_luni ? 'var(--warning)' : 'var(--success)'),
                border: `1px solid ${
                  isDataInsufficient
                    ? 'rgba(142, 134, 128, 0.25)'
                    : (forecast.runway_luni ? 'rgba(255, 111, 105, 0.25)' : 'rgba(92, 219, 149, 0.25)')
                }`,
                padding: '15px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {isDataInsufficient ? <Info size={32} /> : (forecast.runway_luni ? <AlertCircle size={32} /> : <ShieldCheck size={32} />)}
              </div>
              <div style={{ flex: 1, minWidth: '260px' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', color: 'var(--text-primary)' }}>
                  {isDataInsufficient
                    ? 'Analiză în Așteptare (Date Insuficiente)'
                    : (forecast.runway_luni ? 'Tendință de Scădere a Soldului' : 'Stare Financiară Pozitivă')}
                </h3>
                <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: isDataInsufficient ? '0px' : '12px' }}>
                  {forecast.mesaj_sanatate}
                </p>
                {!isDataInsufficient && (
                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    <span 
                      className={`badge ${forecast.runway_luni ? 'badge-anomaly' : 'badge-income'}`} 
                      style={{ display: 'inline-flex', gap: '4px', fontSize: '0.8rem', padding: '6px 12px', textTransform: 'none' }}
                    >
                      <Hourglass size={14} />
                      Rezervă Financiară (Runway): &nbsp;<strong>{forecast.runway_luni ? `${forecast.runway_luni} luni` : 'Nelimitat (Economisire Constantă)'}</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Grafic de Prognoză */}
          <div className="grid-3-2">
            
            {/* Grafic propriu-zis */}
            <Card title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Model Predictiv: Evoluția Soldului pe 90 de Zile</span>
                <div className="tooltip-container" style={{ color: 'var(--text-muted)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', fontWeight: 'normal' }}>
                  <Info size={14} />
                  <span className="tooltip-text" style={{ textTransform: 'none', letterSpacing: 'normal', fontWeight: '400', fontSize: '0.85rem', lineHeight: '1.4' }}>
                    Utilizăm un model de Regresie Liniară antrenat pe istoricul tranzacțiilor tale zilnice pentru a proiecta tendința soldului tău pe următoarele 3 luni.
                  </span>
                </div>
              </div>
            } style={{ position: 'relative' }}>
              <div style={{ filter: isDataInsufficient ? 'blur(5px)' : 'none', pointerEvents: isDataInsufficient ? 'none' : 'auto' }}>
                <ForecastChart 
                  historicalData={forecast.istoric} 
                  forecastData={forecast.predictie} 
                />
              </div>
              {isDataInsufficient && (
                <div style={{
                  position: 'absolute',
                  top: '55px', left: '15px', right: '15px', bottom: '15px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: 'rgba(14, 9, 7, 0.45)',
                  backdropFilter: 'blur(3px)',
                  zIndex: 10,
                  borderRadius: 'var(--radius-sm)',
                  padding: '20px',
                  textAlign: 'center'
                }}>
                  <p style={{ color: 'var(--text-primary)', fontWeight: '600', marginBottom: '15px', fontSize: '0.92rem' }}>
                    Adaugă tranzacții pentru a debloca predicția soldului
                  </p>
                  <button 
                    className="btn btn-primary"
                    onClick={onNavigateToTransactions}
                    style={{ color: '#000000', fontWeight: '700', padding: '10px 20px', fontSize: '0.85rem' }}
                  >
                    Adaugă tranzacții
                  </button>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '15px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <Info size={14} />
                <span>Linia întreruptă portocalie reprezintă valorile estimate calculate prin modelul de regresie liniară antrenat pe tranzacțiile tale.</span>
              </div>
            </Card>

            {/* Recomandări și sfaturi personalizate */}
            <Card title="Plan de Optimizare Recomandat de AI" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1 }}>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ color: 'var(--secondary)', marginTop: '2px' }}><Sparkles size={18} /></div>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '4px' }}>Fondul de Urgență</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      {forecast.runway_luni 
                        ? <>Prioritatea ta numărul 1 este să stabilizezi soldul. Oprește transferurile către investiții speculative până când ai strâns echivalentul a <strong>3 luni de cheltuieli</strong>.</>
                        : <>Felicitări pentru economisire! Direcționează surplusul lunar de fonduri într-un cont separat de rezervă, acoperind <strong>3-6 luni de cheltuieli fixe</strong>.</>}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ color: 'var(--secondary)', marginTop: '2px' }}><TrendingUp size={18} /></div>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '4px' }}>Regula de Aur 50/30/20</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      Încearcă să îți structurezi veniturile astfel: <strong>50% pentru Necesități</strong> (chirie, facturi, mâncare de bază), <strong>30% pentru Dorințe</strong> (ieșiri, hobby-uri) și <strong>minim 20% pentru Economii și Investiții</strong>.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ color: 'var(--secondary)', marginTop: '2px' }}><LineChart size={18} /></div>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '4px' }}>Automatizarea Economiilor</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      Setează o <strong>plată recurentă automată în ziua de salariu</strong> care să transfere automat ținta ta de economii direct din contul curent în contul de economii sau investiții. Astfel, eviți impulsul de a cheltui banii rămași.
                    </p>
                  </div>
                </div>

              </div>
            </Card>

          </div>

        </div>
      )}
    </div>
  );
}
