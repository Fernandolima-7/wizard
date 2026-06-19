import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3001';

function CashFlow() {
  const [cashFlow, setCashFlow] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCashFlow();
  }, []);

  const fetchCashFlow = async () => {
    try {
      const token = localStorage.getItem('token');
      const [feesResponse, expensesResponse] = await Promise.all([
        axios.get(`${API_URL}/api/fees`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/expenses`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const transactions = [
        ...feesResponse.data
          .filter(fee => fee.status === 'paid')
          .map(fee => ({
            id: fee.id,
            type: 'income',
            description: `Mensalidade - ${fee.student?.name || 'Aluno'}`,
            amount: fee.amount,
            date: fee.paidDate,
            category: 'Mensalidade'
          })),
        ...expensesResponse.data.map(expense => ({
          id: expense.id,
          type: 'expense',
          description: expense.description,
          amount: expense.amount,
          date: expense.date,
          category: expense.category
        }))
      ];

      transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

      setCashFlow(transactions);
    } catch (error) {
      console.error('Erro ao buscar fluxo de caixa:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalIncome = cashFlow
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = cashFlow
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div>
      <h1 style={{ marginBottom: '20px' }}>Fluxo de Caixa</h1>

      <div className="dashboard-cards" style={{ marginBottom: '30px' }}>
        <div className="dashboard-card">
          <div className="dashboard-card-title">Total de Receitas</div>
          <div className="dashboard-card-value positive">
            R$ {totalIncome.toFixed(2)}
          </div>
        </div>
        <div className="dashboard-card">
          <div className="dashboard-card-title">Total de Despesas</div>
          <div className="dashboard-card-value negative">
            R$ {totalExpense.toFixed(2)}
          </div>
        </div>
        <div className="dashboard-card">
          <div className="dashboard-card-title">Saldo</div>
          <div className={`dashboard-card-value ${balance >= 0 ? 'positive' : 'negative'}`}>
            R$ {balance.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Tipo</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {cashFlow.map((transaction) => (
              <tr key={transaction.id}>
                <td>{new Date(transaction.date).toLocaleDateString('pt-BR')}</td>
                <td>{transaction.description}</td>
                <td>{transaction.category}</td>
                <td>
                  <span className={transaction.type === 'income' ? 'status-paid' : 'status-pending'}>
                    {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                  </span>
                </td>
                <td className={transaction.type === 'income' ? 'status-paid' : 'status-pending'}>
                  {transaction.type === 'income' ? '+' : '-'} R$ {transaction.amount.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CashFlow;
