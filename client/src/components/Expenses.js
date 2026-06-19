import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3001';

function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    date: ''
  });

  const categories = ['Aluguel', 'Salários', 'Material', 'Marketing', 'Outros'];

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/expenses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExpenses(response.data);
    } catch (error) {
      console.error('Erro ao buscar despesas:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (editingExpense) {
        await axios.put(`${API_URL}/api/expenses/${editingExpense.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_URL}/api/expenses`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setShowModal(false);
      setEditingExpense(null);
      setFormData({ description: '', amount: '', category: '', date: '' });
      fetchExpenses();
    } catch (error) {
      console.error('Erro ao salvar despesa:', error);
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      date: expense.date.split('T')[0]
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja deletar esta despesa?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_URL}/api/expenses/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchExpenses();
      } catch (error) {
        console.error('Erro ao deletar despesa:', error);
      }
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Despesas</h1>
        <button className="button button-primary" onClick={() => {
          setEditingExpense(null);
          setFormData({ description: '', amount: '', category: '', date: '' });
          setShowModal(true);
        }}>
          Nova Despesa
        </button>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Valor</th>
              <th>Categoria</th>
              <th>Data</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.id}>
                <td>{expense.description}</td>
                <td>R$ {expense.amount.toFixed(2)}</td>
                <td>{expense.category}</td>
                <td>{new Date(expense.date).toLocaleDateString('pt-BR')}</td>
                <td>
                  <button className="button button-primary" onClick={() => handleEdit(expense)} style={{ marginRight: '5px' }}>
                    Editar
                  </button>
                  <button className="button button-danger" onClick={() => handleDelete(expense.id)}>
                    Deletar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{editingExpense ? 'Editar Despesa' : 'Nova Despesa'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="label">Descrição *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Valor *</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Categoria *</label>
                <select
                  className="input"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                >
                  <option value="">Selecione uma categoria</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Data *</label>
                <input
                  type="date"
                  className="input"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="button button-primary" style={{ width: '100%' }}>
                Salvar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Expenses;
