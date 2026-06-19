import React, { useState } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3001';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await axios.post(`${API_URL}/api/login`, {
        username,
        password
      });

      onLogin(response.data.token, response.data.user);
    } catch (err) {
      setError('Usuário ou senha incorretos');
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      <div className="card" style={{ width: '400px' }}>
        <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>Wizard CashFlow</h2>
        <h3 style={{ marginBottom: '20px', textAlign: 'center', color: '#6b7280' }}>Login</h3>
        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            padding: '10px',
            borderRadius: '4px',
            marginBottom: '15px'
          }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Usuário</label>
            <input
              type="text"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="label">Senha</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="button button-primary" style={{ width: '100%' }}>
            Entrar
          </button>
        </form>
        <p style={{ marginTop: '20px', textAlign: 'center', color: '#6b7280', fontSize: '12px' }}>
          Para o primeiro acesso, coloque os dados de login enviados pelo suporte. Caso não tenha acesso, entre em contato com o mesmo.
        </p>
      </div>
    </div>
  );
}

export default Login;
