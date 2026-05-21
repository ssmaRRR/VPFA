import React, { useEffect, useState } from 'react';
import { api } from '../api';
import Card from '../components/Card';
import TransactionRow from '../components/TransactionRow';
import { PlusCircle, Search, Filter, FileSpreadsheet, Upload } from 'lucide-react';

const CATEGORII = ["Mâncare", "Chirie", "Utilități", "Transport", "Divertisment", "Sănătate", "Investiții", "Altele"];

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  useEffect(() => {
    fetchTransactions();
  }, [tipFilter, catFilter]); // Reactiv la schimbarea filtrelor mari

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTransactions();
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
      await api.createTransaction({
        suma: parseFloat(suma),
        categorie,
        tip,
        descriere,
        data: data ? new Date(data).toISOString() : null
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
            Adaugă, filtrează și vizualizează istoricul veniturilor și cheltuielilor tale.
          </p>
        </div>
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

      {/* Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '25px', alignItems: 'start' }}>
        
        {/* Formulare stânga: Adăugare manuală + Import CSV */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          
          {/* Adăugare manuală */}
          <Card title="Adăugare Tranzacție">
            <form onSubmit={handleAddTransaction}>
              <div className="form-group">
                <label className="form-label">Tip Tranzacție</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setTip('cheltuiala')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: tip === 'cheltuiala' ? 'rgba(108, 93, 211, 0.2)' : 'transparent',
                      borderColor: tip === 'cheltuiala' ? 'var(--primary)' : 'var(--border-color)',
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

              <div className="form-group">
                <label className="form-label">Categorie</label>
                <select
                  className="input-field"
                  value={categorie}
                  onChange={(e) => setCategorie(e.target.value)}
                >
                  {CATEGORII.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Descriere / Comerciant</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="ex: Cumpărături săptămânale Lidl"
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
        <div>
          <Card>
            {/* Secțiune Filtre și Căutare */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
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

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {/* Filtru Tip */}
                <select
                  className="input-field"
                  value={tipFilter}
                  onChange={(e) => setTipFilter(e.target.value)}
                  style={{ width: '130px', padding: '10px 12px' }}
                >
                  <option value="">Toate Tipurile</option>
                  <option value="venit">Venituri</option>
                  <option value="cheltuiala">Cheltuieli</option>
                </select>

                {/* Filtru Categorie */}
                <select
                  className="input-field"
                  value={catFilter}
                  onChange={(e) => setCatFilter(e.target.value)}
                  style={{ width: '150px', padding: '10px 12px' }}
                >
                  <option value="">Toate Categoriile</option>
                  {CATEGORII.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Listarea tranzacțiilor efective */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
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
    </div>
  );
}
