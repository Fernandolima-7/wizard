import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3001';

function Fees() {
  const [fees, setFees] = useState([]);
  const [students, setStudents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    studentId: '',
    amount: '',
    dueDate: ''
  });

  useEffect(() => {
    fetchFees();
    fetchStudents();
  }, []);

  const fetchFees = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/fees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFees(response.data);
    } catch (error) {
      console.error('Erro ao buscar mensalidades:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data);
    } catch (error) {
      console.error('Erro ao buscar alunos:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/fees`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowModal(false);
      setFormData({ studentId: '', amount: '', dueDate: '' });
      fetchFees();
    } catch (error) {
      console.error('Erro ao criar mensalidade:', error);
    }
  };

  const handlePay = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/fees/${id}/pay`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchFees();
    } catch (error) {
      console.error('Erro ao pagar mensalidade:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja deletar esta mensalidade?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_URL}/api/fees/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchFees();
      } catch (error) {
        console.error('Erro ao deletar mensalidade:', error);
      }
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Mensalidades</h1>
        <button className="button button-primary" onClick={() => setShowModal(true)}>
          Nova Mensalidade
        </button>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Aluno</th>
              <th>Valor</th>
              <th>Data de Vencimento</th>
              <th>Data de Pagamento</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {fees.map((fee) => (
              <tr key={fee.id}>
                <td>{fee.student?.name || '-'}</td>
                <td>R$ {fee.amount.toFixed(2)}</td>
                <td>{new Date(fee.dueDate).toLocaleDateString('pt-BR')}</td>
                <td>{fee.paidDate ? new Date(fee.paidDate).toLocaleDateString('pt-BR') : '-'}</td>
                <td>
                  <span className={fee.status === 'paid' ? 'status-paid' : 'status-pending'}>
                    {fee.status === 'paid' ? 'Paga' : 'Pendente'}
                  </span>
                </td>
                <td>
                  {fee.status === 'pending' && (
                    <button className="button button-success" onClick={() => handlePay(fee.id)} style={{ marginRight: '5px' }}>
                      Pagar
                    </button>
                  )}
                  <button className="button button-danger" onClick={() => handleDelete(fee.id)}>
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
              <h3 className="modal-title">Nova Mensalidade</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="label">Aluno *</label>
                <select
                  className="input"
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  required
                >
                  <option value="">Selecione um aluno</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>{student.name}</option>
                  ))}
                </select>
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
                <label className="label">Data de Vencimento *</label>
                <input
                  type="date"
                  className="input"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
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

export default Fees;
