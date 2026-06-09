import React from 'react';
import { Calendar, Trash2, AlertTriangle, FileSpreadsheet, Landmark, User } from 'lucide-react';

export default function TransactionRow({ transaction, onDelete, onResolveAnomaly }) {
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
        return <FileSpreadsheet size={13} style={{ marginRight: '4px' }} title="Import CSV" />;
      case 'Sincronizare Bancară':
        return <Landmark size={13} style={{ marginRight: '4px' }} title="Sincronizare Bancară" />;
      default:
        return <User size={13} style={{ marginRight: '4px' }} title="Adăugată manual" />;
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
          <div className="tx-meta-info" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="tx-date" style={{ display: 'flex', alignItems: 'center' }}>
              <Calendar size={13} style={{ marginRight: '4px' }} />
              {formatDate(data)}
            </span>
            <span className="tx-source-icon-only" title={`Sursă: ${sursa}`} style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--text-muted)' }}>
              {getSourceIcon(sursa)}
            </span>
          </div>
        </div>

        <div className="tx-amount-and-actions">
          {este_anomala && (
            <span 
              title={`Alertă ML (Anomalie): ${anomalie_detalii}`}
              style={{
                color: 'var(--warning)',
                fontSize: '1.05rem',
                marginRight: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                cursor: 'help',
                animation: 'pulse 2s infinite'
              }}
            >
              ❗️
            </span>
          )}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={15} style={{ flexShrink: 0 }} />
            <span><strong>Alertă ML (Anomalie):</strong> {anomalie_detalii}</span>
          </div>
          {onResolveAnomaly && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px', marginLeft: '23px' }}>
              <button 
                type="button"
                className="btn-anomaly-action btn-anomaly-confirm"
                onClick={() => onResolveAnomaly(id, 'confirm')}
              >
                Confirmă
              </button>
              <button 
                type="button"
                className="btn-anomaly-action btn-anomaly-report"
                onClick={() => onResolveAnomaly(id, 'report')}
              >
                Raportează
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
