import React, { useState, useEffect } from 'react';
import { api } from '../api';
import Card from '../components/Card';
import { Landmark, Check, AlertTriangle, RefreshCw, X, Shield, ShieldCheck } from 'lucide-react';

const BANKS = [
  { id: 'bt', name: 'Banca Transilvania', desc: 'Cea mai mare bancă din România. Conectează contul tău curent BT Pay.', color: '#ff9f43', logoChar: 'BT' },
  { id: 'bcr', name: 'BCR (Banca Comercială Română)', desc: 'Conectează contul tău BCR sincronizat prin platforma digitală George.', color: '#0082c8', logoChar: 'BCR' },
  { id: 'ing', name: 'ING Bank România', desc: 'Banca digitală portocalie. Sincronizează tranzacțiile tale Home\'Bank.', color: '#ff793f', logoChar: 'ING' },
  { id: 'brd', name: 'BRD Groupe Société Générale', desc: 'Sincronizează datele contului tău curent BRD Groupe Société Générale.', color: '#ff4d4d', logoChar: 'BRD' },
  { id: 'raiffeisen', name: 'Raiffeisen Bank', desc: 'Conectează contul tău curent prin portalul securizat Raiffeisen Smart Mobile.', color: '#ffd32a', logoChar: 'RB' },
  { id: 'cec', name: 'CEC Bank', desc: 'Banca tradițională a românilor. Sincronizează contul tău CEC Pay.', color: '#05c46b', logoChar: 'CEC' },
  { id: 'unicredit', name: 'UniCredit Bank', desc: 'Sincronizează contul tău curent prin aplicația UniCredit Mobile Banking.', color: '#eb3b5a', logoChar: 'UC' },
  { id: 'revolut', name: 'Revolut Business Sandbox', desc: 'Contul tău Revolut Sandbox. Testează fluxurile de sincronizare multi-monedă.', color: 'var(--primary)', logoChar: 'R' }
];

export default function Connections() {
  const [connectedBankIds, setConnectedBankIds] = useState(() => {
    try {
      const saved = localStorage.getItem('connected_bank_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [message, setMessage] = useState({ text: '', type: '' });
  const [actionLoading, setActionLoading] = useState(false);

  // Stări pentru asistentul de sincronizare (Wizard)
  const [showWizard, setShowWizard] = useState(false);
  const [selectedBank, setSelectedBank] = useState(null);
  const [wizardStep, setWizardStep] = useState(1); // 1-5
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [wizardError, setWizardError] = useState('');
  const [wizardLogs, setWizardLogs] = useState([]);
  const [syncResultStats, setSyncResultStats] = useState({ count: 0, anomalies: 0 });

  // Sincronizăm starea cu localStorage
  useEffect(() => {
    localStorage.setItem('connected_bank_ids', JSON.stringify(connectedBankIds));
  }, [connectedBankIds]);

  // Simulare efect de conexiune în curs (Pasul 4 din Wizard)
  useEffect(() => {
    if (wizardStep === 4 && showWizard && selectedBank) {
      setWizardLogs([`Efectuare Handshake OAuth cu serverul ${selectedBank.name} Sandbox...`]);
      
      const t1 = setTimeout(() => {
        setWizardLogs(prev => [...prev, `Autorizare reușită! Descărcare date cont bancar...`]);
      }, 1000);

      const t2 = setTimeout(() => {
        setWizardLogs(prev => [...prev, `Import tranzacții personalizate în baza de date locală...`]);
      }, 2000);

      const t3 = setTimeout(() => {
        setWizardLogs(prev => [...prev, `Analiză tranzacții prin motorul inteligent ML (Isolation Forest)...`]);
      }, 3000);

      const t4 = setTimeout(async () => {
        try {
          const res = await api.syncBankSandbox(selectedBank.id, clientId, clientSecret, otpCode);
          setSyncResultStats({
            count: res.count,
            anomalies: res.anomalies_detected
          });
          
          // Adăugăm banca la cele conectate dacă nu există
          if (!connectedBankIds.includes(selectedBank.id)) {
            setConnectedBankIds(prev => [...prev, selectedBank.id]);
          }
          
          setWizardStep(5);
        } catch (err) {
          setWizardError(err.message || 'Eroare la sincronizarea Sandbox.');
          setWizardStep(3); // Revine la pasul OTP pentru a arăta eroarea
        }
      }, 4000);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
      };
    }
  }, [wizardStep, showWizard, selectedBank]);

  const handleLaunchConnect = (bank) => {
    setSelectedBank(bank);
    setWizardStep(1);
    setClientId('');
    setClientSecret('');
    setOtpCode('');
    setWizardError('');
    setWizardLogs([]);
    setShowWizard(true);
  };

  const handleDisconnect = async (bankId, bankName) => {
    if (window.confirm(`Ești sigur că vrei să deconectezi contul ${bankName}? Toate tranzacțiile sincronizate din această sursă vor fi șterse din baza de date.`)) {
      setActionLoading(true);
      setMessage({ text: '', type: '' });
      try {
        const res = await api.disconnectBankSandbox(bankId);
        setConnectedBankIds(prev => prev.filter(id => id !== bankId));
        setMessage({ text: res.message, type: 'success' });
      } catch (err) {
        setMessage({ text: err.message || 'Deconectarea a eșuat.', type: 'error' });
      } finally {
        setActionLoading(false);
      }
    }
  };

  return (
    <div>
      {/* Header Pagina */}
      <div style={{ marginBottom: '30px' }}>
        <h1 className="gradient-text" style={{ fontSize: '2.2rem', fontWeight: '800' }}>
          Conectare Bănci (Open Banking)
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '6px', fontSize: '0.95rem', maxWidth: '650px' }}>
          Sincronizează conturile tale bancare prin interfețe Open Banking în mod testare Sandbox. Alege o bancă pentru a testa descărcarea de tranzacții și analiza ML.
        </p>
      </div>

      {/* Mesaj de feedback */}
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
          <span>{message.text}</span>
        </div>
      )}

      {/* Grid Banci */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        {BANKS.map(bank => {
          const isConnected = connectedBankIds.includes(bank.id);
          return (
            <Card 
              key={bank.id} 
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: isConnected ? '1px solid rgba(92, 219, 149, 0.3)' : '1px solid var(--border-color)',
                background: isConnected ? 'rgba(92, 219, 149, 0.02)' : 'var(--bg-card)',
                transition: 'var(--transition-smooth)',
                position: 'relative'
              }}
            >
              {/* Header Card */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                  <div style={{
                    width: '45px',
                    height: '45px',
                    borderRadius: '10px',
                    background: isConnected ? 'rgba(92, 219, 149, 0.15)' : 'rgba(255,255,255,0.03)',
                    color: isConnected ? 'var(--success)' : bank.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: bank.logoChar.length > 2 ? '0.75rem' : '1.05rem',
                    border: `1px solid ${isConnected ? 'var(--success)' : 'rgba(255,255,255,0.1)'}`
                  }}>
                    {bank.logoChar}
                  </div>

                  {isConnected ? (
                    <span style={{
                      fontSize: '0.75rem',
                      background: 'rgba(92, 219, 149, 0.12)',
                      color: 'var(--success)',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontWeight: '600',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Check size={12} /> Conectat
                    </span>
                  ) : (
                    <span style={{
                      fontSize: '0.75rem',
                      background: 'rgba(255,255,255,0.04)',
                      color: 'var(--text-muted)',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontWeight: '550'
                    }}>
                      Neconectat
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
                  {bank.name}
                </h3>
                
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '20px' }}>
                  {bank.desc}
                </p>
              </div>

              {/* Actiuni Card */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                {isConnected ? (
                  <>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => handleLaunchConnect(bank)} 
                      disabled={actionLoading}
                      style={{ flex: 1, padding: '8px 12px', fontSize: '0.82rem' }}
                    >
                      <RefreshCw size={14} style={{ marginRight: '6px' }} />
                      Re-sincronizează
                    </button>
                    <button 
                      className="btn btn-danger" 
                      onClick={() => handleDisconnect(bank.id, bank.name)}
                      disabled={actionLoading}
                      style={{ padding: '8px 12px', fontSize: '0.82rem' }}
                      title="Deconectează contul"
                    >
                      Deconectează
                    </button>
                  </>
                ) : (
                  <button 
                    className="btn btn-primary" 
                    onClick={() => handleLaunchConnect(bank)}
                    disabled={actionLoading}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '0.82rem' }}
                  >
                    Conectează Contul
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modal Asistent (Wizard) de Conectare */}
      {showWizard && selectedBank && (
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
            title={
              wizardStep === 1 
                ? `Conectare ${selectedBank.name}`
                : wizardStep === 3 
                  ? `Autorizare ${selectedBank.name}` 
                  : wizardStep === 4 
                    ? "Conexiune API în Curs" 
                    : "Sincronizare API Bancar"
            }
            style={{ 
              width: '100%', 
              maxWidth: '540px', 
              background: 'rgba(21, 15, 12, 0.95)',
              border: wizardStep === 3 ? `1px solid ${selectedBank.color}` : '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-lg)',
              backdropFilter: 'blur(20px)',
              position: 'relative'
            }}
          >
            {/* Indicator Pași */}
            {wizardStep < 5 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '25px',
                padding: '0 10px',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '10%',
                  right: '10%',
                  height: '2px',
                  background: 'rgba(255,255,255,0.06)',
                  zIndex: 0,
                  transform: 'translateY(-50%)'
                }}>
                  <div style={{
                    width: `${((wizardStep - 1) / 3) * 100}%`,
                    height: '100%',
                    background: selectedBank.color,
                    transition: 'width 0.3s ease'
                  }}></div>
                </div>
                {[1, 2, 3, 4].map(step => (
                  <div 
                    key={step} 
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: wizardStep >= step ? selectedBank.color : 'rgba(255, 255, 255, 0.05)',
                      color: wizardStep >= step ? '#0e0907' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      border: wizardStep >= step ? `2px solid ${selectedBank.color}` : '2px solid rgba(255,255,255,0.1)',
                      zIndex: 1,
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {step}
                  </div>
                ))}
              </div>
            )}

            {/* Conținut Pași */}
            {wizardStep === 1 && (
              <div>
                <div style={{ textAlign: 'center', padding: '15px 0' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    background: 'rgba(255,255,255,0.03)',
                    color: selectedBank.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    border: `1px solid ${selectedBank.color}`,
                    margin: '0 auto 15px auto',
                    boxShadow: `0 0 15px ${selectedBank.color}15`
                  }}>
                    {selectedBank.logoChar}
                  </div>

                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '20px' }}>
                    Te pregătești să conectezi contul tău de la <strong>{selectedBank.name}</strong> prin intermediul sistemului Open Banking Sandbox.
                  </p>

                  <div style={{
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'left',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-start',
                    marginBottom: '25px'
                  }}>
                    <Shield size={16} style={{ flexShrink: 0, color: selectedBank.color, marginTop: '2px' }} />
                    <span>
                      Conexiunea se face prin protocol securizat API Sandbox. Datele reale ale contului tău nu sunt accesate sau stocate, sistemul generând un extras bancar fictiv de test.
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button className="btn btn-secondary" onClick={() => setShowWizard(false)}>Închide</button>
                  <button className="btn btn-primary" onClick={() => setWizardStep(2)}>Inițiază</button>
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>
                  Te rugăm să introduci codurile tale de identificare API Developer generate pentru sandbox:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Client ID / Identificator Client</label>
                    <input 
                      type="text" 
                      placeholder="ex: BT_DEV_8273619"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Client Secret / Cheie Privată PEM</label>
                    <textarea 
                      placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;MIIEowIBAAKCAQEA0a...&#10;-----END RSA PRIVATE KEY-----"
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                      rows={4}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.8rem',
                        fontFamily: 'monospace',
                        resize: 'none'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                  <button className="btn btn-secondary" onClick={() => setWizardStep(1)}>Înapoi</button>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => {
                      setWizardError('');
                      setWizardStep(3);
                    }}
                    disabled={!clientId || !clientSecret}
                  >
                    Validează
                  </button>
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div>
                {/* simulated oauth portal layout */}
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${selectedBank.color}33`,
                  borderRadius: '12px',
                  padding: '15px',
                  marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      background: selectedBank.color,
                      color: '#0e0907',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '0.75rem'
                    }}>{selectedBank.logoChar}</div>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Portal Autorizare Open Banking</strong>
                  </div>
                  
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0 0 10px 0', lineHeight: '1.4' }}>
                    Sistemul solicită consimțământul tău pentru accesarea conturilor deschise la <strong>{selectedBank.name}</strong>:
                  </p>
                  
                  <ul style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', margin: 0, paddingLeft: '18px', lineHeight: '1.6' }}>
                    <li>Sold curent și conturi curente (RON/EUR)</li>
                    <li>Istoric complet tranzacții (90 de zile)</li>
                  </ul>
                </div>

                <div style={{ marginBottom: '25px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Cod de Securitate OTP (SMS / Token)
                  </label>
                  <input 
                    type="text" 
                    placeholder="Introdu codul de test OTP"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      textAlign: 'center',
                      letterSpacing: '3px',
                      fontWeight: 'bold'
                    }}
                  />
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    * În mod Sandbox, folosește codul universal de test: <strong>123456</strong>
                  </span>
                </div>

                {wizardError && (
                  <div style={{
                    background: 'rgba(255, 94, 87, 0.1)',
                    border: '1px solid var(--warning)',
                    color: 'var(--warning)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    marginBottom: '20px'
                  }}>
                    {wizardError}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                  <button className="btn btn-secondary" onClick={() => setWizardStep(2)}>Înapoi</button>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => {
                      if (otpCode !== '123456') {
                        setWizardError('Cod OTP incorect în Sandbox. Introdu codul 123456.');
                      } else {
                        setWizardError('');
                        setWizardStep(4);
                      }
                    }}
                    disabled={!otpCode}
                  >
                    Autorizează Conexiunea
                  </button>
                </div>
              </div>
            )}

            {wizardStep === 4 && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div className="spinner" style={{
                  border: `4px solid ${selectedBank.color}15`,
                  width: '45px',
                  height: '45px',
                  borderRadius: '50%',
                  borderLeftColor: selectedBank.color,
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 25px auto'
                }}></div>

                <div style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '15px',
                  textAlign: 'left',
                  maxHeight: '150px',
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)'
                }}>
                  {wizardLogs.map((log, index) => (
                    <div key={index} style={{ marginBottom: '6px', color: index === wizardLogs.length - 1 ? selectedBank.color : 'var(--text-muted)' }}>
                      &gt; {log}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {wizardStep === 5 && (
              <div style={{ textAlign: 'center', padding: '15px 0' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(92, 219, 149, 0.15)',
                  color: 'var(--success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  margin: '0 auto 20px auto'
                }}>
                  ✓
                </div>

                <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '10px', color: 'var(--text-primary)' }}>
                  Sincronizare Finalizată!
                </h3>
                
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.5', marginBottom: '25px', padding: '0 20px' }}>
                  Contul tău de la <strong>{selectedBank.name}</strong> a fost conectat și tranzacțiile sale au fost descărcate.
                </p>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '15px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '15px',
                  marginBottom: '25px',
                  textAlign: 'left'
                }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tranzacții Sincronizate</span>
                    <strong style={{ display: 'block', fontSize: '1.2rem', color: 'var(--text-primary)', marginTop: '4px' }}>
                      {syncResultStats.count}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Alerte Anomalii (ML)</span>
                    <strong style={{ display: 'block', fontSize: '1.2rem', color: 'var(--warning)', marginTop: '4px' }}>
                      {syncResultStats.anomalies}
                    </strong>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => {
                      setShowWizard(false);
                    }}
                    style={{ padding: '8px 30px' }}
                  >
                    Închide Asistent
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
