import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Students from './components/Students';
import Fees from './components/Fees';
import Expenses from './components/Expenses';
import CashFlow from './components/CashFlow';
import Backup from './components/Backup';
import Navbar from './components/Navbar';
import axios from 'axios';

const API_URL = 'http://localhost:3001';

function AppContent() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      setUser({ username: 'admin' });
    }
  }, [token]);

  const handleLogin = (token, user) => {
    localStorage.setItem('token', token);
    setToken(token);
    setUser(user);
    navigate('/dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div>
      <Navbar user={user} onLogout={handleLogout} />
      <div className="container">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/students" element={<Students />} />
          <Route path="/fees" element={<Fees />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/cashflow" element={<CashFlow />} />
          <Route path="/backup" element={<Backup />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
