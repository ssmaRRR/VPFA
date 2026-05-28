import React, { useEffect, useState } from 'react';
import { api } from '../api';
import Card from '../components/Card';
import TransactionRow from '../components/TransactionRow';
import CustomSelect from '../components/CustomSelect';
import { PlusCircle, Search, Filter, FileSpreadsheet, Upload, Trash2, Calendar } from 'lucide-react';

const CATEGORII = ["Mâncare", "Chirie", "Utilități", "Transport", "Divertisment", "Sănătate", "Investiții", "Altele"];

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Tab-uri active ('istoric' sau 'abonamente')
  const [activeTab, setActiveTab] = useState('istoric');

  // Stări management abonamente
  const [subscriptions, setSubscriptions] = useState([]);
  const [subName, setSubName] = useState('');
  const [subAmount, setSubAmount] = useState('');
  const [subCategory, setSubCategory] = useState('Utilități');
  const [subDay, setSubDay] = useState('1');

  // Filtre active
  const [tipFilter, setTipFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Formular tranzacție nouă
  const [suma, setSuma] = useState('');
  const [categorie, setCategorie] = useState('Mâncare');
  const [tip, setTip] = useState('cheltuiala');
  const [descriere, setDescriere] = useState('');
  const [data, setData] = useState('');

  // CSV file import state
  const [csvFile, setCsvFile] = useState(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await api.getTransactions({
        tip: tipFilter,
        categorie: catFilter,
        cautare: searchQuery
      });
      setTransactions(data);
    } catch (err) {
      setError('Eroare la preluarea tranzacțiilor.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const data = await api.getSubscriptions();
      setSubscriptions(data);
    } catch (err) {
      setError('Eroare la preluarea abonamentelor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'istoric') {
      fetchTransactions();
    } else {
      fetchSubscriptions();
    }
  }, [tipFilter, catFilter, activeTab]); // Reactiv la schimbarea filtrelor și tab-ului

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTransactions();
  };

  const handleAddSubscription = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!subName || !subName.trim()) {
      setError('Te rugăm să introduci un nume pentru abonament.');
      return;
    }
    if (!subAmount || parseFloat(subAmount) <= 0) {
      setError('Te rugăm să introduci o sumă validă mai mare decât 0.');
      return;
    }
    const day = parseInt(subDay);
    if (isNaN(day) || day < 1 || day > 31) {
      setError('Te rugăm să introduci o zi de plată validă (1-31).');
      return;
    }

    try {
      await api.createSubscription({
        nume: subName.trim(),
        suma: parseFloat(subAmount),
        categorie: subCategory,
        zi_plata: day
      });
      setSuccess('Abonament adăugat cu succes!');
      setSubName('');
      setSubAmount('');
      setSubDay('1');
      fetchSubscriptions();
    } catch (err) {
      setError(err.message || 'Eroare la crearea abonamentului.');
    }
  };

  const handleDeleteSubscription = async (id) => {
    if (window.confirm('Ești sigur că dorești să ștergi acest abonament?')) {
      setError('');
      setSuccess('');
      try {
        await api.deleteSubscription(id);
        setSuccess('Abonament șters.');
        fetchSubscriptions();
      } catch (err) {
        setError(err.message || 'Eroare la ștergerea abonamentului.');
      }
    }
  };


  const handleAddTransaction = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!suma || parseFloat(suma) <= 0) {
      setError('Te rugăm să introduci o sumă validă mai mare decât 0.');
      return;
    }

    try {
      let txDate = null;
      if (data) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        if (data === todayStr) {
          txDate = now.toISOString();
        } else {
          txDate = new Date(data + 'T12:00:00').toISOString();
        }
      } else {
        txDate = new Date().toISOString();
      }

      await api.createTransaction({
        suma: parseFloat(suma),
        categorie: tip === 'venit' ? 'Venit' : categorie,
        tip,
        descriere,
        data: txDate
      });

      setSuccess('Tranzacție salvată cu succes! Detecția anomaliilor a fost actualizată.');
      setSuma('');
      setDescriere('');
      setData('');
      fetchTransactions();
    } catch (err) {
      setError(err.message || 'Eroare la crearea tranzacției.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Ești sigur că dorești să ștergi această tranzacție?')) {
      try {
        await api.deleteTransaction(id);
        setSuccess('Tranzacție ștearsă.');
        fetchTransactions();
      } catch (err) {
        setError(err.message || 'Eroare la ștergerea tranzacției.');
      }
    }
  };

  const handleCSVImport = async (e) => {
    e.preventDefault();
    if (!csvFile) return;

    setError('');
    setSuccess('');
    try {
      const res = await api.importCSV(csvFile);
      setSuccess(res.message);
      setCsvFile(null);
      fetchTransactions();
    } catch (err) {
      setError(err.message || 'Eroare la importul CSV.');
    }
  };

  return (
    <div>
      {/* Header Tranzacții */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: '2.2rem', fontWeight: '800' }}>
            Jurnal Tranzacții
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Adaugă, filtrează și vizualizează istoricul veniturilor și cheltuielilor tale sau gestionează plățile recurente.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <button 
          onClick={() => setActiveTab('istoric')} 
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'istoric' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'istoric' ? 'var(--primary)' : 'var(--text-secondary)',
            padding: '8px 16px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'var(--transition-smooth)'
          }}
        >
          Istoric Tranzacții
        </button>
        <button 
          onClick={() => setActiveTab('abonamente')} 
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'abonamente' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'abonamente' ? 'var(--primary)' : 'var(--text-secondary)',
            padding: '8px 16px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'var(--transition-smooth)'
          }}
        >
          Abonamente & Plăți Recurente
        </button>
      </div>

      {/* Mesaje de stare */}
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

      {/* Tab: Istoric Tranzacții */}
      {activeTab === 'istoric' && (
        <div className="grid-1-2">
          
          {/* Formulare stânga: Adăugare manuală + Import CSV */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', height: '100%' }}>
            
            {/* Adăugare manuală */}
            <Card title="Adăugare Tranzacție">
              <form onSubmit={handleAddTransaction}>
                <div className="form-group">
                  <label className="form-label">Tip Tranzacție</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setTip('cheltuiala');
                        setCategorie('Mâncare');
                      }}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: tip === 'cheltuiala' ? 'rgba(235, 213, 199, 0.15)' : 'transparent',
                        borderColor: tip === 'cheltuiala' ? '#ebd5c7' : 'var(--border-color)',
                        color: tip === 'cheltuiala' ? '#fff' : 'var(--text-secondary)',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Cheltuială
                    </button>
                    <button
                      type="button"
                      onClick={() => setTip('venit')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: tip === 'venit' ? 'rgba(5, 196, 107, 0.15)' : 'transparent',
                        borderColor: tip === 'venit' ? 'var(--success)' : 'var(--border-color)',
                        color: tip === 'venit' ? '#fff' : 'var(--text-secondary)',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Venit
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Sumă (RON)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-field"
                    placeholder="0.00"
                    value={suma}
                    onChange={(e) => setSuma(e.target.value)}
                    required
                  />
                </div>

                {tip === 'cheltuiala' && (
                  <div className="form-group">
                    <label className="form-label">Categorie</label>
                    <CustomSelect
                      value={categorie}
                      onChange={(e) => setCategorie(e.target.value)}
                      options={CATEGORII.map(c => ({ value: c, label: c }))}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Descriere / Comerciant</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder={tip === 'venit' ? 'ex: Salariu lunar, Transfer primit, Cadou...' : 'ex: Cumpărături săptămânale Lidl'}
                    value={descriere}
                    onChange={(e) => setDescriere(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Dată Tranzacție (Opțional)</label>
                  <input
                    type="date"
                    className="input-field"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                  <PlusCircle size={18} />
                  Adaugă Tranzacție
                </button>
              </form>
            </Card>

            {/* Import CSV */}
            <Card title="Import Extras CSV">
              <form onSubmit={handleCSVImport}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '15px', lineHeight: '1.4' }}>
                  Încarcă un extras de cont în format CSV. Fișierul trebuie să conțină coloanele: <br />
                  <strong>data, suma, categorie, tip, descriere</strong>.
                </p>
                
                <div className="form-group" style={{ position: 'relative' }}>
                  <input 
                    type="file" 
                    accept=".csv" 
                    onChange={(e) => setCsvFile(e.target.files[0])} 
                    style={{ display: 'none' }}
                    id="csv-file-input"
                  />
                  <label 
                    htmlFor="csv-file-input" 
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '25px 15px',
                      border: '2px dashed var(--border-color)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: 'rgba(255, 255, 255, 0.01)',
                      transition: 'var(--transition-smooth)'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                    onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                  >
                    <Upload size={28} style={{ color: 'var(--text-secondary)', marginBottom: '8px' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>
                      {csvFile ? csvFile.name : "Alege fișierul extras.csv"}
                    </span>
                  </label>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-secondary" 
                  style={{ width: '100%' }}
                  disabled={!csvFile}
                >
                  <FileSpreadsheet size={16} />
                  Importă CSV-ul
                </button>
              </form>
            </Card>
          </div>

          {/* Listă tranzacții dreapta */}
          <div className="tx-card-wrapper">
            <Card className="tx-card-absolute">
              {/* Secțiune Filtre și Căutare */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px', flexShrink: 0 }}>
                <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flex: 1, gap: '10px', minWidth: '240px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Caută în descriere..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ paddingLeft: '40px' }}
                    />
                    <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  </div>
                  <button type="submit" className="btn btn-secondary">Caută</button>
                </form>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* Filtru Tip */}
                  <CustomSelect
                    value={tipFilter}
                    onChange={(e) => {
                      setTipFilter(e.target.value);
                      if (e.target.value === 'venit') {
                        setCatFilter('');
                      }
                    }}
                    options={[
                      { value: '', label: 'Toate Tipurile' },
                      { value: 'venit', label: 'Venituri' },
                      { value: 'cheltuiala', label: 'Cheltuieli' }
                    ]}
                    style={{ width: '150px' }}
                  />

                  {/* Filtru Categorie */}
                  {tipFilter !== 'venit' && (
                    <CustomSelect
                      value={catFilter}
                      onChange={(e) => setCatFilter(e.target.value)}
                      options={[
                        { value: '', label: 'Toate Categoriile' },
                        ...CATEGORII.map(c => ({ value: c, label: c }))
                      ]}
                      style={{ width: '170px' }}
                    />
                  )}
                </div>
              </div>

              {/* Listarea tranzacțiilor efective */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '15px', 
                flex: 1, 
                minHeight: 0,
                overflowY: 'auto', 
                paddingRight: '5px' 
              }}>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                    Se încarcă tranzacțiile...
                  </div>
                ) : transactions.length > 0 ? (
                  transactions.map(tx => (
                    <TransactionRow
                      key={tx.id}
                      transaction={tx}
                      onDelete={handleDelete}
                    />
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
                    Nu s-a găsit nicio tranzacție conform filtrelor selectate.
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab: Abonamente & Plăți Recurente */}
      {activeTab === 'abonamente' && (
        <div className="grid-1-2">
          {/* Adăugare Abonament stânga */}
          <Card title="Adăugare Abonament / Plată Recurentă">
            <form onSubmit={handleAddSubscription}>
              <div className="form-group">
                <label className="form-label">Nume Abonament / Serviciu</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="ex: Netflix, Abonament Sală, Întreținere"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Sumă Lunară (RON)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input-field"
                  placeholder="0.00"
                  value={subAmount}
                  onChange={(e) => setSubAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Categorie</label>
                <CustomSelect
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value)}
                  options={CATEGORII.map(c => ({ value: c, label: c }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Zi de Plată (1-31)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  className="input-field"
                  placeholder="Ziua din lună (ex: 5)"
                  value={subDay}
                  onChange={(e) => setSubDay(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                <PlusCircle size={18} />
                Salvează Abonament
              </button>
            </form>
          </Card>

          {/* Listă Abonamente Active dreapta */}
          <div className="tx-card-wrapper">
            <Card title="Abonamente Active & Plăți Programate" className="tx-card-absolute">
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                  Se încarcă abonamentele...
                </div>
              ) : subscriptions.length > 0 ? (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '15px',
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  paddingRight: '5px'
                }}>
                {subscriptions.map((sub) => (
                  <div 
                    key={sub.id} 
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      transition: 'var(--transition-smooth)'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--border-color-glow)'}
                    onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div style={{
                        background: 'rgba(197, 227, 132, 0.12)',
                        color: 'var(--primary)',
                        padding: '10px',
                        borderRadius: '10px'
                      }}>
                        <Calendar size={20} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                          {sub.nume}
                        </h4>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                          <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                            {sub.categorie}
                          </span>
                          <span>
                            Plată lunară în ziua {sub.zi_plata}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ebd5c7' }}>
                        -{sub.suma.toLocaleString('ro-RO')} RON
                      </span>
                      <button 
                        onClick={() => handleDeleteSubscription(sub.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'var(--transition-smooth)'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.color = 'var(--warning)'}
                        onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                        title="Șterge abonamentul"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-secondary)' }}>
                Nu ai niciun abonament înregistrat. Completează formularul din stânga pentru a adăuga unul.
              </div>
            )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
