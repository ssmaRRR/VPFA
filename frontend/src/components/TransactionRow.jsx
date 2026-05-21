import React from 'react';
import { Calendar, Trash2, AlertTriangle, FileSpreadsheet, RefreshCw, PlusCircle } from 'lucide-react';

export default function TransactionRow({ transaction, onDelete }) {
  const { id, suma, categorie, tip, descriere, data, sursa, este_anomala, anomalie_detalii } = transaction;

  // Formatare dată în limba română
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ro-RO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Iconiță pentru sursă
  const getSourceIcon = (src) => {
    switch (src) {
      case 'CSV':
        return <FileSpreadsheet size={13} style={{ marginRight: '4px' }} />;
      case 'Sincronizare Bancară':
        return <RefreshCw size={13} style={{ marginRight: '4px' }} />;
      default:
        return <PlusCircle size={13} style={{ marginRight: '4px' }} />;
    }
  };

  return (
    <div className={`transaction-row-container ${este_anomala ? 'row-anomaly' : ''}`}>
      <div className="transaction-main-info">
        <div className="tx-details">
          <div className="tx-desc-and-cat">
            <span className="tx-description">{descriere || `Tranzacție ${categorie}`}</span>
            <span className="tx-category">{categorie}</span>
          </div>
          <div className="tx-meta-info">
            <span className="tx-date">
              <Calendar size={13} style={{ marginRight: '4px' }} />
              {formatDate(data)}
            </span>
            <span className="tx-source" title={`Sursă: ${sursa}`}>
              {getSourceIcon(sursa)}
              {sursa}
            </span>
          </div>
        </div>

        <div className="tx-amount-and-actions">
          <span className={`tx-amount ${tip === 'venit' ? 'amount-income' : 'amount-expense'}`}>
            {tip === 'venit' ? '+' : '-'} {suma.toFixed(2)} RON
          </span>
          
          <button 
            className="btn-delete-tx" 
            onClick={() => onDelete(id)} 
            title="Șterge tranzacția"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {este_anomala && (
        <div className="anomaly-alert-banner">
          <AlertTriangle size={15} />
          <span><strong>Alertă ML (Anomalie):</strong> {anomalie_detalii}</span>
        </div>
      )}
    </div>
  );
}
