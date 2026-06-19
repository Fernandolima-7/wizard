import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3001';

function Students() {
  const [students, setStudents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  useEffect(() => {
    fetchStudents();
  }, []);

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
      if (editingStudent) {
        await axios.put(`${API_URL}/api/students/${editingStudent.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_URL}/api/students`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setShowModal(false);
      setEditingStudent(null);
      setFormData({ name: '', phone: '', email: '', address: '' });
      fetchStudents();
    } catch (error) {
      console.error('Erro ao salvar aluno:', error);
    }
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      phone: student.phone || '',
      email: student.email || '',
      address: student.address || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja deletar este aluno?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_URL}/api/students/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchStudents();
      } catch (error) {
        console.error('Erro ao deletar aluno:', error);
      }
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Alunos</h1>
        <button className="button button-primary" onClick={() => {
          setEditingStudent(null);
          setFormData({ name: '', phone: '', email: '', address: '' });
          setShowModal(true);
        }}>
          Novo Aluno
        </button>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Telefone</th>
              <th>Email</th>
              <th>Endereço</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td>{student.name}</td>
                <td>{student.phone || '-'}</td>
                <td>{student.email || '-'}</td>
                <td>{student.address || '-'}</td>
                <td>
                  <button className="button button-primary" onClick={() => handleEdit(student)} style={{ marginRight: '5px' }}>
                    Editar
                  </button>
                  <button className="button button-danger" onClick={() => handleDelete(student.id)}>
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
              <h3 className="modal-title">{editingStudent ? 'Editar Aluno' : 'Novo Aluno'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="label">Nome *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Telefone</label>
                <input
                  type="text"
                  className="input"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="label">Endereço</label>
                <input
                  type="text"
                  className="input"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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

export default Students;
