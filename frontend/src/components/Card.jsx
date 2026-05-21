import React from 'react';

export default function Card({ children, className = '', title, ...props }) {
  return (
    <div className={`glass-card ${className}`} {...props}>
      {title && (
        <h3 style={{ 
          marginBottom: '16px', 
          fontSize: '1.15rem', 
          borderBottom: '1px solid var(--border-color)', 
          paddingBottom: '10px',
          fontWeight: '600',
          letterSpacing: '-0.01em'
        }}>
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
