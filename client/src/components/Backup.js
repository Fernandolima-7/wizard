import React, { useState } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3001';

function Backup() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleBackup = async () => {
    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/api/backup`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage(`Backup realizado com sucesso! Arquivo salvo em: ${response.data.path}`);
    } catch (error) {
      setMessage('Erro ao realizar backup. Tente novamente.');
      console.error('Erro ao fazer backup:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: '20px' }}>Backup do Banco de Dados</h1>

      <div className="card">
        <p style={{ marginBottom: '20px', color: '#6b7280' }}>
          Esta funcionalidade cria uma cópia de segurança do banco de dados SQLite.
          O backup será salvo na pasta 'backups' do projeto.
        </p>

        <button
          className="button button-primary"
          onClick={handleBackup}
          disabled={loading}
          style={{ fontSize: '16px', padding: '15px 30px' }}
        >
          {loading ? 'Realizando backup...' : 'Realizar Backup Agora'}
        </button>

        {message && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: message.includes('sucesso') ? '#dcfce7' : '#fee2e2',
            color: message.includes('sucesso') ? '#16a34a' : '#dc2626',
            borderRadius: '4px',
            border: `1px solid ${message.includes('sucesso') ? '#16a34a' : '#dc2626'}`
          }}>
            {message}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h3 style={{ marginBottom: '15px' }}>Informações sobre Backup</h3>
        <ul style={{ marginLeft: '20px', color: '#6b7280', lineHeight: '1.8' }}>
          <li>Os backups são salvos automaticamente com timestamp</li>
          <li>Formato do arquivo: wizard-backup-YYYY-MM-DDTHH-mm-ss-sssZ.db</li>
          <li>Recomenda-se fazer backup regularmente</li>
          <li>Para restaurar, copie o arquivo de backup para a pasta prisma e renomeie para wizard.db</li>
        </ul>
      </div>
    </div>
  );
}

export default Backup;
