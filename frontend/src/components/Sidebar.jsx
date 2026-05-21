import React from 'react';
import { LayoutDashboard, ArrowRightLeft, LineChart, PieChart, LogOut, Wallet } from 'lucide-react';

export default function Sidebar({ currentPage, setCurrentPage, onLogout, user }) {
  const menuItems = [
    { id: 'dashboard', label: 'Panou Control', icon: LayoutDashboard },
    { id: 'transactions', label: 'Tranzacții', icon: ArrowRightLeft },
    { id: 'health', label: 'Sănătate Predictivă', icon: LineChart },
    { id: 'investments', label: 'Sugestii Investiții', icon: PieChart },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Wallet className="logo-icon" />
        <div>
          <h2>VPFA</h2>
          <span>Asistent Financiar</span>
        </div>
      </div>

      <nav className="sidebar-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`menu-item ${currentPage === item.id ? 'active' : ''}`}
            >
              <Icon size={20} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        {user && (
          <div className="user-profile-summary">
            <div className="avatar">
              {user.nume.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <h4>{user.nume}</h4>
              <span title={user.email}>{user.email}</span>
            </div>
          </div>
        )}
        <button className="btn-logout" onClick={onLogout}>
          <LogOut size={18} />
          Deconectare
        </button>
      </div>
    </aside>
  );
}
