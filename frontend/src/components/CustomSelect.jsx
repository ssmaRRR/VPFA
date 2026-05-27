import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CustomSelect({ value, onChange, options, placeholder, className = '', style = {} }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (val) => {
    onChange({ target: { value: val } });
    setIsOpen(false);
  };

  return (
    <div 
      ref={dropdownRef} 
      className={`custom-select-container ${className}`} 
      style={{ position: 'relative', width: '100%', ...style }}
    >
      <div 
        className="custom-select-trigger"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: isOpen ? '1px solid var(--primary)' : '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          color: value ? 'var(--text-primary)' : 'var(--text-muted)',
          cursor: 'pointer',
          fontSize: '0.95rem',
          transition: 'var(--transition-smooth)',
          boxShadow: isOpen ? '0 0 10px rgba(197, 227, 132, 0.15)' : 'none',
          userSelect: 'none'
        }}
      >
        <span>{selectedOption ? selectedOption.label : (placeholder || 'Alege...')}</span>
        <ChevronDown 
          size={16} 
          style={{ 
            color: 'var(--text-secondary)',
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'var(--transition-smooth)',
            flexShrink: 0,
            marginLeft: '8px'
          }} 
        />
      </div>

      {isOpen && (
        <ul 
          className="custom-select-options"
          style={{
            position: 'absolute',
            top: 'calc(100% + 5px)',
            left: 0,
            width: '100%',
            background: '#150f0c', // Solid background matching theme (espresso)
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 9999,
            maxHeight: '200px',
            overflowY: 'auto',
            listStyle: 'none',
            padding: '5px 0',
            margin: 0
          }}
        >
          {options.map((opt) => (
            <li 
              key={opt.value}
              className={`custom-select-option ${value === opt.value ? 'selected' : ''}`}
              onClick={() => handleSelect(opt.value)}
              style={{
                padding: '10px 16px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                color: value === opt.value ? 'var(--primary)' : 'var(--text-primary)',
                background: value === opt.value ? 'rgba(197, 227, 132, 0.08)' : 'transparent',
                transition: 'var(--transition-smooth)'
              }}
              onMouseEnter={(e) => {
                if (value !== opt.value) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                }
              }}
              onMouseLeave={(e) => {
                if (value !== opt.value) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
