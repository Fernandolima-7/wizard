import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function Navbar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/students', label: 'Alunos' },
    { path: '/fees', label: 'Mensalidades' },
    { path: '/expenses', label: 'Despesas' },
    { path: '/cashflow', label: 'Fluxo de Caixa' },
    { path: '/backup', label: 'Backup' }
  ];

  return (
    <nav className="navbar">
      <div className="navbar-brand">Wizard CashFlow</div>
      <div className="navbar-links">
        {menuItems.map((item) => (
          <span
            key={item.path}
            className={`navbar-link ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            {item.label}
          </span>
        ))}
        <span className="navbar-link" onClick={onLogout}>
          Sair
        </span>
      </div>
    </nav>
  );
}

export default Navbar;
