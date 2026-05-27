import React, { useState } from 'react';
import { api } from '../api';
import Card from '../components/Card';
import CustomSelect from '../components/CustomSelect';
import { Wallet, LogIn, UserPlus } from 'lucide-react';

export default function LoginRegister({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Câmpuri formular
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nume, setNume] = useState('');
  const [varsta, setVarsta] = useState('30');
  const [venitLunar, setVenitLunar] = useState('5000');
  const [tolerantaRisc, setTolerantaRisc] = useState('Moderat');
  const [obiectivEconomii, setObiectivEconomii] = useState('1000');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Conectare
        await api.login(email, password);
        const profile = await api.getProfile();
        onAuthSuccess(profile);
      } else {
        // Înregistrare
        if (!nume || !email || !password) {
          throw new Error('Numele, e-mailul și parola sunt obligatorii.');
        }
        await api.register(
          nume, email, password, varsta, venitLunar, tolerantaRisc, obiectivEconomii
        );
        // Conectare automată după înregistrare
        await api.login(email, password);
        const profile = await api.getProfile();
        onAuthSuccess(profile);
      }
    } catch (err) {
      setError(err.message || 'A apărut o eroare.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <Card className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
            color: '#fff',
            marginBottom: '15px',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <Wallet size={32} />
          </div>
          <h1 className="gradient-title" style={{ fontSize: '2rem', fontWeight: '800' }}>VPFA</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '5px' }}>
            Asistent Virtual de Finanțe Personale
          </p>
        </div>

        <div style={{
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '4px',
          marginBottom: '25px'
        }}>
          <button
            onClick={() => { setIsLogin(true); setError(''); }}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '6px',
              background: isLogin ? 'var(--primary)' : 'transparent',
              color: '#fff',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'var(--transition-smooth)'
            }}
          >
            Conectare
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(''); }}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '6px',
              background: !isLogin ? 'var(--primary)' : 'transparent',
              color: '#fff',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'var(--transition-smooth)'
            }}
          >
            Înregistrare
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(255, 94, 87, 0.15)',
            border: '1px solid var(--warning)',
            color: 'var(--warning)',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '20px',
            fontSize: '0.88rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Nume Complet</label>
              <input
                type="text"
                className="input-field"
                placeholder="Numele tău"
                value={nume}
                onChange={(e) => setNume(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Adresă E-mail</label>
            <input
              type="email"
              className="input-field"
              placeholder="nume@student.ro"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Parolă</label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {!isLogin && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
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
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label className="form-label">Toleranță Risc</label>
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
                <div className="form-group">
                  <label className="form-label">Țintă Economii / Lună</label>
                  <input
                    type="number"
                    className="input-field"
                    value={obiectivEconomii}
                    onChange={(e) => setObiectivEconomii(e.target.value)}
                    min="0"
                    required
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '10px' }}
            disabled={loading}
          >
            {loading ? 'Se procesează...' : isLogin ? (
              <>
                <LogIn size={18} />
                Conectează-te
              </>
            ) : (
              <>
                <UserPlus size={18} />
                Creează cont
              </>
            )}
          </button>
        </form>
      </Card>
    </div>
  );
}
