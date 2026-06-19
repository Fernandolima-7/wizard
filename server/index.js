const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = express();
const prisma = new PrismaClient();
const PORT = 3001;
const JWT_SECRET = 'wizard-secret-key-2024';
const path = require('path');

const DB_PATH =
  process.env.DATABASE_URL?.replace('file:', '') ||
  path.join(__dirname, '../prisma/wizard.db');

app.use(cors());
app.use(express.json());

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// Verificar se é o admin padrão com credenciais padrão
app.get('/api/user/check-default', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    const isDefaultUsername = user.username === 'admin';
    const isDefaultPassword = await bcrypt.compare('admin123', user.password);
    
    res.json({ isDefault: isDefaultUsername && isDefaultPassword });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar credenciais' });
  }
});

// Alterar credenciais obrigatórias
app.put('/api/user/change-credentials', authenticateToken, async (req, res) => {
  try {
    const { newUsername, newPassword } = req.body;
    
    if (!newUsername || !newPassword) {
      return res.status(400).json({ error: 'Nome de usuário e senha são obrigatórios' });
    }
    
    const cleanUsername = newUsername.trim();
    if (cleanUsername.toLowerCase() === 'admin') {
      return res.status(400).json({ error: 'O nome de usuário não pode ser "admin"' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }
    
    if (newPassword === 'admin123') {
      return res.status(400).json({ error: 'A nova senha não pode ser "admin123"' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        username: cleanUsername,
        password: hashedPassword
      }
    });
    
    const token = jwt.sign({ id: updatedUser.id, username: updatedUser.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ 
      message: 'Credenciais atualizadas com sucesso',
      token,
      user: { id: updatedUser.id, username: updatedUser.username }
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Este nome de usuário já está sendo utilizado' });
    }
    res.status(500).json({ error: 'Erro ao atualizar credenciais' });
  }
});

// Alunos
app.get('/api/students', authenticateToken, async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      include: { fees: true },
      orderBy: { name: 'asc' }
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar alunos' });
  }
});

app.post('/api/students', authenticateToken, async (req, res) => {
  try {
    const { name, phone, cpf, email, address } = req.body;
    console.log('Creating student with data:', { name, phone, cpf, email, address });
    const student = await prisma.student.create({
      data: { name, phone, cpf, email, address }
    });
    console.log('Student created successfully:', student);
    res.json(student);
  } catch (error) {
    console.error('Error creating student:', error);
    console.error('Error details:', error.message);
    console.error('Error code:', error.code);
    res.status(500).json({ error: `Erro ao criar aluno: ${error.message}` });
  }
});

app.put('/api/students/:id', authenticateToken, async (req, res) => {
  try {
    const { name, phone, cpf, email, address } = req.body;
    const student = await prisma.student.update({
      where: { id: parseInt(req.params.id) },
      data: { name, phone, cpf, email, address }
    });
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar aluno' });
  }
});

app.delete('/api/students/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.student.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Aluno deletado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar aluno' });
  }
});

// Mensalidades
app.get('/api/fees', authenticateToken, async (req, res) => {
  try {
    const fees = await prisma.fee.findMany({
      include: { student: true },
      orderBy: { dueDate: 'desc' }
    });
    res.json(fees);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar mensalidades' });
  }
});

app.post('/api/fees', authenticateToken, async (req, res) => {
  try {
    const { studentId, amount, dueDate } = req.body;
    const fee = await prisma.fee.create({
      data: {
        studentId: parseInt(studentId),
        amount: parseFloat(amount),
        dueDate: new Date(dueDate),
        status: 'pending'
      }
    });
    res.json(fee);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar mensalidade' });
  }
});

app.put('/api/fees/:id/pay', authenticateToken, async (req, res) => {
  try {
    const fee = await prisma.fee.update({
      where: { id: parseInt(req.params.id) },
      data: {
        status: 'paid',
        paidDate: new Date()
      }
    });
    res.json(fee);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao pagar mensalidade' });
  }
});

app.delete('/api/fees/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.fee.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Mensalidade deletada' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar mensalidade' });
  }
});

// Despesas
app.get('/api/expenses', authenticateToken, async (req, res) => {
  try {
    const expenses = await prisma.expense.findMany({
      orderBy: { date: 'desc' }
    });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar despesas' });
  }
});

app.post('/api/expenses', authenticateToken, async (req, res) => {
  try {
    const { description, amount, category, date } = req.body;
    const expense = await prisma.expense.create({
      data: {
        description,
        amount: parseFloat(amount),
        category,
        date: new Date(date)
      }
    });
    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar despesa' });
  }
});

app.put('/api/expenses/:id', authenticateToken, async (req, res) => {
  try {
    const { description, amount, category, date } = req.body;
    const expense = await prisma.expense.update({
      where: { id: parseInt(req.params.id) },
      data: {
        description,
        amount: parseFloat(amount),
        category,
        date: new Date(date)
      }
    });
    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar despesa' });
  }
});

app.delete('/api/expenses/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.expense.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Despesa deletada' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar despesa' });
  }
});

// Dashboard
app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    const totalStudents = await prisma.student.count();
    
    const paidFees = await prisma.fee.findMany({ where: { status: 'paid' } });
    const pendingFees = await prisma.fee.findMany({ where: { status: 'pending' } });
    
    const totalRevenue = paidFees.reduce((sum, fee) => sum + fee.amount, 0);
    const pendingRevenue = pendingFees.reduce((sum, fee) => sum + fee.amount, 0);
    
    const expenses = await prisma.expense.findMany();
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    const balance = totalRevenue - totalExpenses;
    
    res.json({
      totalStudents,
      totalRevenue,
      pendingRevenue,
      totalExpenses,
      balance,
      paidFeesCount: paidFees.length,
      pendingFeesCount: pendingFees.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar dashboard' });
  }
});

// Backup do banco
app.post('/api/backup', authenticateToken, async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');

    const dbPath = DB_PATH.replace('file:', '');

    const backupDir = path.join(
      process.env.APPDATA,
      'wizard-cashflow',
      'backups'
    );

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-');

    const backupPath = path.join(
      backupDir,
      `wizard-backup-${timestamp}.db`
    );

    // Logs de diagnóstico
    console.log('DB_PATH:', dbPath);
    console.log('BACKUP_DIR:', backupDir);
    console.log('BACKUP_FILE:', backupPath);

    // Verifica se o banco existe
    if (!fs.existsSync(dbPath)) {
      throw new Error(`Banco não encontrado: ${dbPath}`);
    }

    fs.copyFileSync(dbPath, backupPath);

    res.json({
      message: 'Backup realizado com sucesso',
      path: backupPath
    });

  } catch (error) {
    console.error('ERRO BACKUP:', error);

    res.status(500).json({
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
