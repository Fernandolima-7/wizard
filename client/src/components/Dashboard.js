import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3001';

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(response.data);
    } catch (error) {
      console.error('Erro ao buscar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div>
      <h1 style={{ marginBottom: '20px' }}>Dashboard Financeiro</h1>
      <div className="dashboard-cards">
        <div className="dashboard-card">
          <div className="dashboard-card-title">Total de Alunos</div>
          <div className="dashboard-card-value">{data?.totalStudents || 0}</div>
        </div>
        <div className="dashboard-card">
          <div className="dashboard-card-title">Receita Total</div>
          <div className="dashboard-card-value positive">
            R$ {data?.totalRevenue?.toFixed(2) || '0.00'}
          </div>
        </div>
        <div className="dashboard-card">
          <div className="dashboard-card-title">Receita Pendente</div>
          <div className="dashboard-card-value">
            R$ {data?.pendingRevenue?.toFixed(2) || '0.00'}
          </div>
        </div>
        <div className="dashboard-card">
          <div className="dashboard-card-title">Total de Despesas</div>
          <div className="dashboard-card-value negative">
            R$ {data?.totalExpenses?.toFixed(2) || '0.00'}
          </div>
        </div>
        <div className="dashboard-card">
          <div className="dashboard-card-title">Saldo</div>
          <div className={`dashboard-card-value ${data?.balance >= 0 ? 'positive' : 'negative'}`}>
            R$ {data?.balance?.toFixed(2) || '0.00'}
          </div>
        </div>
        <div className="dashboard-card">
          <div className="dashboard-card-title">Mensalidades Pagas</div>
          <div className="dashboard-card-value">{data?.paidFeesCount || 0}</div>
        </div>
        <div className="dashboard-card">
          <div className="dashboard-card-title">Mensalidades Pendentes</div>
          <div className="dashboard-card-value">{data?.pendingFeesCount || 0}</div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
