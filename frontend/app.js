const API_URL = 'http://localhost:3001';
let token = localStorage.getItem('token');
let allStudents = [];
let allFees = [];
let allTransactions = [];

// Node.js file system support (Electron environment)
let fs, path, XLSX, ipcRenderer;
let backupDir= null;
let dbDir = null;

if (typeof require !== 'undefined') {
    try {
        fs = require('fs');
        path = require('path');
        XLSX = require('xlsx');
        ipcRenderer = require('electron').ipcRenderer;
    } catch (err) {
        console.warn('Node modules not available.');
    }
}
async function initializePaths() {
    if (!ipcRenderer) return;

    try {
        const paths = await ipcRenderer.invoke('get-paths');
        backupDir = paths.backups;
        dbDir = paths.prisma;

        console.log('Backup:', backupDir);
        console.log('Banco:', dbDir);
    } catch (err) {
        console.error('Erro ao obter caminhos:', err);
    }
}
// DOM Elements
const loginScreen = document.getElementById('login-screen');
const mainApp = document.getElementById('main-app');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');

// Navigation
const navbarLinks = document.querySelectorAll('.navbar-link[data-page]');
const logoutBtn = document.getElementById('logout');

// Pages
const pages = document.querySelectorAll('.page');

// Modals
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');

// Security Confirmation Modal
const confirmModal = document.getElementById('confirm-modal');
const confirmModalTitle = document.getElementById('confirm-modal-title');
const confirmModalText = document.getElementById('confirm-modal-text');
const confirmModalCancel = document.getElementById('confirm-modal-cancel');
const confirmModalClose = document.getElementById('confirm-modal-close');
const confirmModalOk = document.getElementById('confirm-modal-ok');

let currentConfirmCallback = null;

document.addEventListener('DOMContentLoaded', async() => {
    await initializePaths();
    if (token) {
        checkDefaultCredentials();
    } else {
        showLogin();
    }
    
    // Set up first access form submission
    const firstAccessForm = document.getElementById('first-access-form');
    if (firstAccessForm) {
        firstAccessForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const newUsername = document.getElementById('new-username').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmNewPassword = document.getElementById('confirm-new-password').value;
            const errorEl = document.getElementById('first-access-error');
            
            errorEl.textContent = '';
            
            if (newUsername.trim().toLowerCase() === 'admin') {
                errorEl.textContent = 'O nome de usuário não pode ser "admin".';
                return;
            }
            
            if (newPassword.length < 6) {
                errorEl.textContent = 'A nova senha deve ter pelo menos 6 caracteres.';
                return;
            }
            
            if (newPassword === 'admin123') {
                errorEl.textContent = 'A nova senha não pode ser "admin123".';
                return;
            }
            
            if (newPassword !== confirmNewPassword) {
                errorEl.textContent = 'As senhas digitadas não coincidem.';
                return;
            }
            
            try {
                const data = await apiCall('/api/user/change-credentials', {
                    method: 'PUT',
                    body: JSON.stringify({ newUsername, newPassword })
                });
                
                token = data.token;
                localStorage.setItem('token', token);
                
                showToast('Credenciais atualizadas com sucesso!', 'success');
                
                const firstAccessScreen = document.getElementById('first-access-screen');
                if (firstAccessScreen) {
                    firstAccessScreen.classList.add('hidden');
                }
                showMainApp();
            } catch (error) {
                console.error('Error changing credentials:', error);
                errorEl.textContent = 'Erro ao atualizar credenciais. Verifique se o nome de usuário já está em uso.';
                showToast('Falha ao atualizar credenciais', 'error');
            }
        });
    }
    
    // Set up search and sort listeners
    const studentSearch = document.getElementById('student-search');
    const studentSort = document.getElementById('student-sort');
    if (studentSearch) {
        studentSearch.addEventListener('input', renderStudents);
    }
    if (studentSort) {
        studentSort.addEventListener('change', renderStudents);
    }


    // Set up fee filters listeners
    const feeSearch = document.getElementById('fee-search');
    const feeStatusFilter = document.getElementById('fee-status-filter');
    const feeStartDate = document.getElementById('fee-start-date');
    const feeEndDate = document.getElementById('fee-end-date');
    if (feeSearch) feeSearch.addEventListener('input', renderFees);
    if (feeStatusFilter) feeStatusFilter.addEventListener('change', renderFees);
    if (feeStartDate) feeStartDate.addEventListener('change', renderFees);
    if (feeEndDate) feeEndDate.addEventListener('change', renderFees);

    // Set up cashflow filters listeners
    const cfTypeFilter = document.getElementById('cf-type-filter');
    const cfCategoryFilter = document.getElementById('cf-category-filter');
    const cfStartDate = document.getElementById('cf-start-date');
    const cfEndDate = document.getElementById('cf-end-date');
    if (cfTypeFilter) cfTypeFilter.addEventListener('change', renderCashFlow);
    if (cfCategoryFilter) cfCategoryFilter.addEventListener('change', renderCashFlow);
    if (cfStartDate) cfStartDate.addEventListener('change', renderCashFlow);
    if (cfEndDate) cfEndDate.addEventListener('change', renderCashFlow);

    // Set up confirm modal events
    if (confirmModalClose) {
        confirmModalClose.addEventListener('click', closeConfirmModal);
    }
    if (confirmModalCancel) {
        confirmModalCancel.addEventListener('click', closeConfirmModal);
    }
    if (confirmModalOk) {
        confirmModalOk.addEventListener('click', () => {
            if (currentConfirmCallback) {
                currentConfirmCallback();
            }
            closeConfirmModal();
        });
    }

    // Modal Close
    if (modalClose) {
        modalClose.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });

    // Close confirm modal when clicking outside
    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
            closeConfirmModal();
        }
    });
});

// Toast Notification Engine
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'info';
    if (type === 'success') icon = 'check-circle';
    else if (type === 'error') icon = 'x-circle';
    else if (type === 'warning') icon = 'alert-triangle';

    toast.innerHTML = `
        <span class="toast-icon"><i data-lucide="${icon}"></i></span>
        <span class="toast-message">${message}</span>
        <div class="toast-progress" style="animation-duration: 3500ms"></div>
    `;

    container.appendChild(toast);

    // Initialize Lucide icons for the new toast
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Trigger animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Auto remove
    const removeTimeout = setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3500);

    // Click to dismiss
    toast.addEventListener('click', () => {
        clearTimeout(removeTimeout);
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    });
}

// Custom Confirm Modal Engine
function showConfirmModal({ title, message, onConfirm }) {
    if (!confirmModal) return;
    
    confirmModalTitle.textContent = title || 'Confirmar Ação';
    confirmModalText.textContent = message || 'Deseja prosseguir com esta ação?';
    currentConfirmCallback = onConfirm;
    
    confirmModal.classList.remove('hidden');
}

function closeConfirmModal() {
    if (confirmModal) {
        confirmModal.classList.add('hidden');
    }
    currentConfirmCallback = null;
}

// Empty State HTML Helper
function getEmptyStateRowHTML(colspan, icon, title, desc) {
    return `
        <tr>
            <td colspan="${colspan}">
                <div class="empty-state">
                    <span class="empty-state-icon"><i data-lucide="${icon}"></i></span>
                    <h4 class="empty-state-title">${title}</h4>
                    <p class="empty-state-desc">${desc}</p>
                </div>
            </td>
        </tr>
    `;
}

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            token = data.token;
            localStorage.setItem('token', token);
            showToast('Login realizado com sucesso!', 'success');
            checkDefaultCredentials();
        } else {
            loginError.textContent = data.error || 'Usuário ou senha incorretos';
            showToast(data.error || 'Falha na autenticação', 'error');
        }
    } catch (error) {
        loginError.textContent = 'Erro ao fazer login';
        showToast('Erro de conexão com o servidor', 'error');
    }
});

// Logout
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    token = null;
    showToast('Sessão encerrada', 'info');
    showLogin();
});

// Navigation
navbarLinks.forEach(link => {
    link.addEventListener('click', () => {
        const page = link.dataset.page;
        navigateTo(page);
    });
});

function navigateTo(page) {
    navbarLinks.forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`[data-page="${page}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    pages.forEach(p => p.classList.remove('active'));
    const pageEl = document.getElementById(`${page}-page`);
    if (pageEl) {
        pageEl.classList.add('active');
    }

    // Load data for the page
    switch(page) {
        case 'dashboard': loadDashboard(); break;
        case 'students': loadStudents(); break;
        case 'fees': loadFees(); break;
        case 'expenses': loadExpenses(); break;
        case 'cashflow': loadCashFlow(); break;
        case 'backup': loadBackups(); break;
    }
}

function showLogin() {
    loginScreen.classList.remove('hidden');
    mainApp.classList.add('hidden');
    loginForm.reset();
    loginError.textContent = '';
}

function showMainApp() {
    loginScreen.classList.add('hidden');
    mainApp.classList.remove('hidden');
    navigateTo('dashboard');
}

async function checkDefaultCredentials() {
    try {
        const data = await apiCall('/api/user/check-default');
        const firstAccessScreen = document.getElementById('first-access-screen');
        if (data.isDefault) {
            loginScreen.classList.add('hidden');
            mainApp.classList.remove('hidden');
            if (firstAccessScreen) {
                firstAccessScreen.classList.remove('hidden');
                document.getElementById('first-access-form').reset();
                document.getElementById('first-access-error').textContent = '';
            }
        } else {
            if (firstAccessScreen) {
                firstAccessScreen.classList.add('hidden');
            }
            showMainApp();
        }
    } catch (error) {
        console.error('Error checking default credentials:', error);
        localStorage.removeItem('token');
        token = null;
        showLogin();
        showToast('Sessão expirada ou erro de autenticação', 'error');
    }
}

// API Helper
async function apiCall(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error (${response.status}): ${errorText}`);
    }

    return response.json();
}

// Dashboard
async function loadDashboard() {
    try {
        const [data, fees] = await Promise.all([
            apiCall('/api/dashboard'),
            apiCall('/api/fees')
        ]);
        
        const today = new Date();
        today.setHours(0,0,0,0);
        
        // Calcular dinamicamente as mensalidades em atraso
        const overdueFees = fees.filter(f => f.status === 'pending' && new Date(f.dueDate) < today);
        const overdueRevenue = overdueFees.reduce((sum, f) => sum + f.amount, 0);
        const overdueCount = overdueFees.length;
        
        // Calcular dinamicamente a receita pendente a vencer (excluindo as atrasadas)
        const pendingFees = fees.filter(f => f.status === 'pending' && new Date(f.dueDate) >= today);
        const pendingRevenue = pendingFees.reduce((sum, f) => sum + f.amount, 0);
        const pendingCount = pendingFees.length;
        
        document.getElementById('total-students').textContent = data.totalStudents;
        document.getElementById('total-revenue').textContent = `R$ ${data.totalRevenue.toFixed(2)}`;
        document.getElementById('total-expenses').textContent = `R$ ${data.totalExpenses.toFixed(2)}`;
        
        const balanceEl = document.getElementById('balance');
        balanceEl.textContent = `R$ ${data.balance.toFixed(2)}`;
        balanceEl.className = `dashboard-card-value ${data.balance >= 0 ? 'positive' : 'negative'}`;
        
        document.getElementById('paid-fees-count').textContent = data.paidFeesCount;
        document.getElementById('pending-fees-count').textContent = data.pendingFeesCount;
        
        // Métricas de atraso e pendências reais
        document.getElementById('overdue-revenue').textContent = `R$ ${overdueRevenue.toFixed(2)}`;
        document.getElementById('overdue-fees-count').textContent = `${overdueCount} mensalidades vencidas`;
        
        document.getElementById('pending-revenue').textContent = `R$ ${pendingRevenue.toFixed(2)}`;
        document.getElementById('pending-fees-count-text').textContent = `${pendingCount} parcelas a vencer`;
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Erro ao carregar dados do dashboard', 'error');
    }
}

// Students
document.getElementById('new-student-btn').addEventListener('click', () => {
    showStudentModal();
});

async function loadStudents() {
    try {
        const students = await apiCall('/api/students');
        allStudents = students;
        renderStudents();
    } catch (error) {
        console.error('Error loading students:', error);
        showToast('Erro ao buscar lista de alunos', 'error');
    }
}

function renderStudents() {
    const tbody = document.getElementById('students-table');
    if (!tbody) return;
    
    if (allStudents.length === 0) {
        tbody.innerHTML = getEmptyStateRowHTML(6, 'users', 'Nenhum aluno cadastrado', 'Adicione novos alunos para iniciar o gerenciamento escolar.');
        return;
    }
    
    const searchInput = document.getElementById('student-search');
    const sortSelect = document.getElementById('student-sort');
    
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const sortBy = sortSelect ? sortSelect.value : 'name-asc';
    
    // 1. Filtragem
    let filtered = allStudents.filter(student => {
        const idStr = String(student.id);
        const name = (student.name || '').toLowerCase();
        const phone = (student.phone || '').toLowerCase();
        const email = (student.email || '').toLowerCase();
        const address = (student.address || '').toLowerCase();
        const cpf = (student.cpf || '').toLowerCase();
        
        return idStr.includes(query) || 
               name.includes(query) || 
               phone.includes(query) || 
               email.includes(query) || 
               address.includes(query) || 
               cpf.includes(query);
    });
    
    // 2. Ordenação
    filtered.sort((a, b) => {
        if (sortBy === 'name-asc') {
            return a.name.localeCompare(b.name, 'pt-BR');
        } else if (sortBy === 'name-desc') {
            return b.name.localeCompare(a.name, 'pt-BR');
        } else if (sortBy === 'id-asc') {
            return a.id - b.id;
        } else if (sortBy === 'id-desc') {
            return b.id - a.id;
        }
        return 0;
    });
    
    if (filtered.length === 0) {
        tbody.innerHTML = getEmptyStateRowHTML(6, 'users', 'Nenhum aluno encontrado', 'Tente ajustar sua busca ou adicione novos alunos.');
        return;
    }
    
    tbody.innerHTML = filtered.map(student => `
        <tr>
            <td style="font-weight: 600; color: var(--gray-900);">${student.name}</td>
            <td>${student.phone || '-'}</td>
            <td>${student.cpf || '-'}</td>
            <td>${student.email || '-'}</td>
            <td>${student.address || '-'}</td>
            <td>
                <div class="table-actions">
                    <button class="button button-secondary" onclick="editStudent(${student.id})">Editar</button>
                    <button class="button button-danger" onclick="deleteStudent(${student.id})">Inativar</button>
                </div>
            </td>
        </tr>
    `).join('');

    // Initialize Lucide icons for the table content
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function showStudentModal(student = null) {
    modalTitle.textContent = student ? 'Editar Aluno' : 'Novo Aluno';
    modalBody.innerHTML = `
        <form id="student-form">
            <div class="form-group">
                <label class="label">Nome Completo *</label>
                <input type="text" class="input" name="name" value="${student?.name || ''}" placeholder="Nome do aluno" required>
            </div>
            <div class="form-group">
                <label class="label">Telefone de Contato</label>
                <input type="text" class="input" name="phone" value="${student?.phone || ''}" placeholder="(00) 00000-0000">
            </div>
            <div class="form-group">
                <label class="label">CPF</label>
                <input type="text" class="input" name="cpf" id="student-cpf" value="${student?.cpf || ''}" placeholder="000.000.000-00" maxlength="14">
            </div>
            <div class="form-group">
                <label class="label">E-mail</label>
                <input type="email" class="input" name="email" value="${student?.email || ''}" placeholder="aluno@email.com">
            </div>
            <div class="form-group">
                <label class="label">Endereço Residencial</label>
                <input type="text" class="input" name="address" value="${student?.address || ''}" placeholder="Rua, número, bairro">
            </div>
            <button type="submit" class="button button-primary" style="width: 100%; margin-top: 10px;"><i data-lucide="save"></i> Salvar Informações</button>
        </form>
    `;
    modal.classList.remove('hidden');

    // Initialize Lucide icons for the modal content
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    const cpfInput = document.getElementById('student-cpf');
    if (cpfInput) {
        cpfInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            
            if (value.length > 9) {
                value = value.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,2})$/, '$1.$2.$3-$4');
            } else if (value.length > 6) {
                value = value.replace(/^(\d{3})(\d{3})(\d{1,3})$/, '$1.$2.$3');
            } else if (value.length > 3) {
                value = value.replace(/^(\d{3})(\d{1,3})$/, '$1.$2');
            }
            e.target.value = value;
        });
    }

    document.getElementById('student-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        try {
            if (student) {
                await apiCall(`/api/students/${student.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(data)
                });
                showToast('Cadastro de aluno atualizado!', 'success');
            } else {
                await apiCall('/api/students', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
                showToast('Aluno cadastrado com sucesso!', 'success');
            }
            modal.classList.add('hidden');
            loadStudents();
        } catch (error) {
            showToast('Erro ao salvar cadastro do aluno', 'error');
        }
    });
}

window.editStudent = async (id) => {
    try {
        const students = await apiCall('/api/students');
        const student = students.find(s => s.id === id);
        showStudentModal(student);
    } catch (error) {
        console.error('Error loading student:', error);
        showToast('Erro ao buscar dados do aluno', 'error');
    }
};

window.deleteStudent = async (id) => {
    showConfirmModal({
        title: 'Inativar Aluno',
        message: 'Tem certeza que deseja inativar este aluno? O registro e suas movimentações serão mantidos no sistema.',
        onConfirm: async () => {
            try {
                await apiCall(`/api/students/${id}`, { method: 'DELETE' });
                showToast('Aluno inativado com sucesso!', 'success');
                loadStudents();
            } catch (error) {
                showToast('Erro ao inativar aluno', 'error');
            }
        }
    });
};

// Fees
document.getElementById('new-fee-btn').addEventListener('click', () => {
    showFeeModal();
});

async function loadFees() {
    try {
        const fees = await apiCall('/api/fees');
        allFees = fees;
        renderFees();
    } catch (error) {
        console.error('Error loading fees:', error);
        showToast('Erro ao carregar mensalidades', 'error');
    }
}

function renderFees() {
    const tbody = document.getElementById('fees-table');
    if (!tbody) return;

    if (allFees.length === 0) {
        tbody.innerHTML = getEmptyStateRowHTML(6, 'receipt', 'Nenhuma mensalidade encontrada', 'Gere cobranças para acompanhar os recebimentos de alunos.');
        return;
    }

    const searchInput = document.getElementById('fee-search');
    const statusFilter = document.getElementById('fee-status-filter');
    const startDateInput = document.getElementById('fee-start-date');
    const endDateInput = document.getElementById('fee-end-date');

    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const statusVal = statusFilter ? statusFilter.value : 'all';
    
    // Parse filter dates
    let startDate = startDateInput && startDateInput.value ? new Date(startDateInput.value + 'T00:00:00') : null;
    let endDate = endDateInput && endDateInput.value ? new Date(endDateInput.value + 'T23:59:59') : null;

    const today = new Date();
    today.setHours(0,0,0,0);

    let filtered = allFees.filter(fee => {
        // 1. Search Query
        const studentName = (fee.student?.name || '').toLowerCase();
        const feeId = String(fee.id);
        const matchQuery = studentName.includes(query) || feeId.includes(query);
        if (!matchQuery) return false;

        // 2. Status Filter
        const isOverdue = fee.status === 'pending' && new Date(fee.dueDate) < today;
        if (statusVal === 'paid' && fee.status !== 'paid') return false;
        if (statusVal === 'pending' && (fee.status !== 'pending' || isOverdue)) return false;
        if (statusVal === 'overdue' && !isOverdue) return false;

        // 3. Date Range Filter
        const dueDate = new Date(fee.dueDate);
        if (startDate && dueDate < startDate) return false;
        if (endDate && dueDate > endDate) return false;

        return true;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = getEmptyStateRowHTML(6, 'receipt', 'Nenhuma mensalidade encontrada', 'Tente ajustar os filtros ou busca.');
        return;
    }

    tbody.innerHTML = filtered.map(fee => {
        const isOverdue = fee.status === 'pending' && new Date(fee.dueDate) < today;
        const statusClass = fee.status === 'paid' ? 'status-paid' : (isOverdue ? 'status-overdue' : 'status-pending');
        const statusText = fee.status === 'paid' ? 'Paga' : (isOverdue ? 'Atrasada' : 'Pendente');

        return `
            <tr>
                <td style="font-weight: 600; color: var(--gray-900);">${fee.student?.name || '-'}</td>
                <td style="font-weight: 700; color: var(--gray-800);">R$ ${fee.amount.toFixed(2)}</td>
                <td>${new Date(fee.dueDate).toLocaleDateString('pt-BR')}</td>
                <td>${fee.paidDate ? new Date(fee.paidDate).toLocaleDateString('pt-BR') : '-'}</td>
                <td>
                    <span class="${statusClass}">
                        ${statusText}
                    </span>
                </td>
                <td>
                    <div class="table-actions">
                        ${fee.status === 'pending' ? `<button class="button button-success" onclick="payFee(${fee.id})">Pagar</button>` : ''}
                        <button class="button button-danger" onclick="deleteFee(${fee.id})">Deletar</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Initialize Lucide icons for the table content
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

async function showFeeModal() {
    try {
        const students = await apiCall('/api/students');
        modalTitle.textContent = 'Nova Mensalidade';
        modalBody.innerHTML = `
            <form id="fee-form">
                <div class="form-group">
                    <label class="label">Selecionar Aluno *</label>
                    <select class="input" name="studentId" required>
                        <option value="">Selecione um aluno da lista</option>
                        ${students.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="label">Valor Cobrado *</label>
                    <input type="number" step="0.01" class="input" name="amount" placeholder="0.00" required>
                </div>
                <div class="form-group">
                    <label class="label">Data de Vencimento *</label>
                    <input type="date" class="input" name="dueDate" required>
                </div>
                <button type="submit" class="button button-primary" style="width: 100%; margin-top: 10px;"><i data-lucide="save"></i> Gerar Mensalidade</button>
            </form>
        `;
        modal.classList.remove('hidden');

        // Initialize Lucide icons for the modal content
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        document.getElementById('fee-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);

            try {
                await apiCall('/api/fees', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
                showToast('Mensalidade gerada com sucesso!', 'success');
                modal.classList.add('hidden');
                loadFees();
            } catch (error) {
                showToast('Erro ao criar cobrança de mensalidade', 'error');
            }
        });
    } catch (error) {
        console.error('Error loading students for fee:', error);
        showToast('Erro ao carregar lista de alunos', 'error');
    }
}

window.payFee = async (id) => {
    try {
        await apiCall(`/api/fees/${id}/pay`, { method: 'PUT' });
        showToast('Pagamento registrado!', 'success');
        loadFees();
    } catch (error) {
        showToast('Erro ao processar pagamento', 'error');
    }
};

window.deleteFee = async (id) => {
    showConfirmModal({
        title: 'Excluir Mensalidade',
        message: 'Tem certeza que deseja excluir permanentemente esta mensalidade?',
        onConfirm: async () => {
            try {
                await apiCall(`/api/fees/${id}`, { method: 'DELETE' });
                showToast('Mensalidade excluída com sucesso!', 'success');
                loadFees();
            } catch (error) {
                showToast('Erro ao excluir mensalidade', 'error');
            }
        }
    });
};

// Expenses
document.getElementById('new-expense-btn').addEventListener('click', () => {
    showExpenseModal();
});

async function loadExpenses() {
    try {
        const expenses = await apiCall('/api/expenses');
        const tbody = document.getElementById('expenses-table');
        
        if (expenses.length === 0) {
            tbody.innerHTML = getEmptyStateRowHTML(5, 'trending-down', 'Nenhuma despesa registrada', 'Lançe despesas para acompanhar os custos operacionais da escola.');
            return;
        }

        tbody.innerHTML = expenses.map(expense => `
            <tr>
                <td style="font-weight: 600; color: var(--gray-900);">${expense.description}</td>
                <td style="font-weight: 700; color: var(--red-dark);">R$ ${expense.amount.toFixed(2)}</td>
                <td>${expense.category}</td>
                <td>${new Date(expense.date).toLocaleDateString('pt-BR')}</td>
                <td>
                    <div class="table-actions">
                        <button class="button button-secondary" onclick="editExpense(${expense.id})">Editar</button>
                        <button class="button button-danger" onclick="deleteExpense(${expense.id})">Deletar</button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Initialize Lucide icons for the table content
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } catch (error) {
        console.error('Error loading expenses:', error);
        showToast('Erro ao buscar lista de despesas', 'error');
    }
}

const categories = ['Aluguel', 'Salários', 'Material', 'Marketing', 'Outros'];

function showExpenseModal(expense = null) {
    modalTitle.textContent = expense ? 'Editar Despesa' : 'Nova Despesa';
    modalBody.innerHTML = `
        <form id="expense-form">
            <div class="form-group">
                <label class="label">Descrição da Despesa *</label>
                <input type="text" class="input" name="description" value="${expense?.description || ''}" placeholder="Ex: Conta de Luz, Compra de livros" required>
            </div>
            <div class="form-group">
                <label class="label">Valor Pago *</label>
                <input type="number" step="0.01" class="input" name="amount" value="${expense?.amount || ''}" placeholder="0.00" required>
            </div>
            <div class="form-group">
                <label class="label">Categoria *</label>
                <select class="input" name="category" required>
                    <option value="">Selecione uma categoria</option>
                    ${categories.map(c => `<option value="${c}" ${expense?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label class="label">Data de Pagamento *</label>
                <input type="date" class="input" name="date" value="${expense?.date?.split('T')[0] || ''}" required>
            </div>
            <button type="submit" class="button button-primary" style="width: 100%; margin-top: 10px;"><i data-lucide="save"></i> Registrar Despesa</button>
        </form>
    `;
    modal.classList.remove('hidden');

    // Initialize Lucide icons for the modal content
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    document.getElementById('expense-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        try {
            if (expense) {
                await apiCall(`/api/expenses/${expense.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(data)
                });
                showToast('Registro de despesa atualizado!', 'success');
            } else {
                await apiCall('/api/expenses', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
                showToast('Despesa registrada com sucesso!', 'success');
            }
            modal.classList.add('hidden');
            loadExpenses();
        } catch (error) {
            showToast('Erro ao salvar despesa', 'error');
        }
    });
}

window.editExpense = async (id) => {
    try {
        const expenses = await apiCall('/api/expenses');
        const expense = expenses.find(e => e.id === id);
        showExpenseModal(expense);
    } catch (error) {
        console.error('Error loading expense:', error);
        showToast('Erro ao buscar dados da despesa', 'error');
    }
};

window.deleteExpense = async (id) => {
    showConfirmModal({
        title: 'Excluir Despesa',
        message: 'Tem certeza que deseja excluir permanentemente este registro de despesa?',
        onConfirm: async () => {
            try {
                await apiCall(`/api/expenses/${id}`, { method: 'DELETE' });
                showToast('Despesa excluída com sucesso!', 'success');
                loadExpenses();
            } catch (error) {
                showToast('Erro ao excluir despesa', 'error');
            }
        }
    });
};

// Cash Flow
async function loadCashFlow() {
    try {
        const [fees, expenses] = await Promise.all([
            apiCall('/api/fees'),
            apiCall('/api/expenses')
        ]);

        const transactions = [
            ...fees.filter(f => f.status === 'paid').map(fee => ({
                id: fee.id,
                type: 'income',
                description: `Mensalidade - ${fee.student?.name || 'Aluno'}`,
                amount: fee.amount,
                date: fee.paidDate,
                category: 'Mensalidade'
            })),
            ...expenses.map(expense => ({
                id: expense.id,
                type: 'expense',
                description: expense.description,
                amount: expense.amount,
                date: expense.date,
                category: expense.category
            }))
        ];

        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        allTransactions = transactions;
        renderCashFlow();
    } catch (error) {
        console.error('Error loading cash flow:', error);
        showToast('Erro ao carregar fluxo de caixa', 'error');
    }
}

function renderCashFlow() {
    const tbody = document.getElementById('cashflow-table');
    if (!tbody) return;

    if (allTransactions.length === 0) {
        tbody.innerHTML = getEmptyStateRowHTML(5, 'scale', 'Nenhuma movimentação encontrada', 'As movimentações do caixa aparecerão assim que houver pagamentos ou despesas registradas.');
        return;
    }

    const typeFilter = document.getElementById('cf-type-filter');
    const categoryFilter = document.getElementById('cf-category-filter');
    const startDateInput = document.getElementById('cf-start-date');
    const endDateInput = document.getElementById('cf-end-date');

    const typeVal = typeFilter ? typeFilter.value : 'all';
    const categoryVal = categoryFilter ? categoryFilter.value : 'all';

    // Parse filter dates
    let startDate = startDateInput && startDateInput.value ? new Date(startDateInput.value + 'T00:00:00') : null;
    let endDate = endDateInput && endDateInput.value ? new Date(endDateInput.value + 'T23:59:59') : null;

    let filtered = allTransactions.filter(t => {
        // 1. Type Filter
        if (typeVal !== 'all' && t.type !== typeVal) return false;

        // 2. Category Filter
        if (categoryVal !== 'all' && t.category !== categoryVal) return false;

        // 3. Date Range Filter
        const transactionDate = new Date(t.date);
        if (startDate && transactionDate < startDate) return false;
        if (endDate && transactionDate > endDate) return false;

        return true;
    });

    // Recalcular resumos superiores com base nos dados filtrados
    const totalIncome = filtered.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = filtered.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpense;

    document.getElementById('cf-total-income').textContent = `R$ ${totalIncome.toFixed(2)}`;
    document.getElementById('cf-total-expense').textContent = `R$ ${totalExpense.toFixed(2)}`;
    
    const balanceEl = document.getElementById('cf-balance');
    balanceEl.textContent = `R$ ${balance.toFixed(2)}`;
    balanceEl.className = `dashboard-card-value ${balance >= 0 ? 'positive' : 'negative'}`;

    if (filtered.length === 0) {
        tbody.innerHTML = getEmptyStateRowHTML(5, 'scale', 'Nenhuma movimentação encontrada', 'Tente ajustar os filtros do período ou tipo.');
        return;
    }

    tbody.innerHTML = filtered.map(t => {
        const statusClass = t.type === 'income' ? 'status-paid' : 'status-overdue';
        const statusText = t.type === 'income' ? 'Receita' : 'Despesa';
        const valuePrefix = t.type === 'income' ? '+' : '-';
        
        return `
            <tr>
                <td>${new Date(t.date).toLocaleDateString('pt-BR')}</td>
                <td style="font-weight: 600; color: var(--gray-900);">${t.description}</td>
                <td>${t.category}</td>
                <td>
                    <span class="${statusClass}">
                        ${statusText}
                    </span>
                </td>
                <td class="${statusClass}" style="font-weight: 700;">
                    ${valuePrefix} R$ ${t.amount.toFixed(2)}
                </td>
            </tr>
        `;
    }).join('');

    // Initialize Lucide icons for the table content
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Backup logic & lists
document.getElementById('backup-btn').addEventListener('click', async () => {
    const btn = document.getElementById('backup-btn');
    
    btn.textContent = 'Realizando backup...';
    btn.disabled = true;

    try {
        const response = await apiCall('/api/backup', { method: 'POST' });
        showToast('Backup realizado com sucesso!', 'success');
        loadBackups();
    } catch (error) {
        showToast('Erro ao realizar backup. Tente novamente.', 'error');
    } finally {
        btn.textContent = '💾 Realizar Backup Agora';
        btn.disabled = false;
    }
});

// Load backups files inside backups directory (Electron integration)
async function loadBackups() {
    const backupsListCard =
        document.getElementById('backups-list-card');

    const tbody =
        document.getElementById('backups-table-body');

    const openBtn =
        document.getElementById('open-backups-folder-btn');

    if (!fs || !path) {
        backupsListCard?.classList.add('hidden');
        return;
    }

    backupsListCard?.classList.remove('hidden');

    try {

        if (!backupDir) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align:center">
                        Carregando caminhos...
                    </td>
                </tr>
            `;
            return;
        }

        console.log('Pasta Backup:', backupDir);
        console.log('Existe?', fs.existsSync(backupDir));
        
        // Setup folder open button
       if (openBtn && !openBtn.dataset.listenerSet) {
    openBtn.dataset.listenerSet = 'true';

    openBtn.addEventListener('click', () => {
        const { shell } = require('electron');

        if (backupDir && fs.existsSync(backupDir)) {
            shell.openPath(backupDir);
        } else {
            showToast(
                'Pasta de backups não encontrada.',
                'warning'
            );
        }
    });
}
        if (!fs.existsSync(backupDir)) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align:center; color:var(--gray-400); padding:20px 16px;">
                        Nenhum backup criado ainda.
                    </td>
                </tr>
            `;
            return;
        }
        
        const files = fs.readdirSync(backupDir);
        console.log('Existe?', fs.existsSync(backupDir));
        const dbFiles = files.filter(f => f.startsWith('wizard-backup-') && f.endsWith('.db'));
        
        if (dbFiles.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align:center; color:var(--gray-400); padding:20px 16px;">
                        Nenhum backup encontrado na pasta backups/.
                    </td>
                </tr>
            `;
            return;
        }
        
        const backupList = dbFiles.map(file => {
            const filePath = path.join(backupDir, file);
            const stats = fs.statSync(filePath);
            return {
                name: file,
                path: filePath,
                createdAt: stats.birthtime,
                size: stats.size
            };
        });
        
        // Sort by creation date descending
        backupList.sort((a, b) => b.createdAt - a.createdAt);
        
        tbody.innerHTML = backupList.map(b => {
            const sizeKB = (b.size / 1024).toFixed(1);
            const dateStr = new Date(b.createdAt).toLocaleString('pt-BR');
            return `
                <tr>
                    <td style="font-family: monospace; font-size: 13px; color: var(--gray-700);">${b.name}</td>
                    <td>${dateStr}</td>
                    <td>${sizeKB} KB</td>
                    <td style="text-align:right">
                        <button class="button button-success" onclick="restoreBackup('${b.name.replace(/'/g, "\\'")}')">Restaurar</button>
                    </td>
                </tr>
            `;
        }).join('');

        // Initialize Lucide icons for the table content
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } catch (error) {
        console.error('Error loading backups:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center; color:var(--red-dark); padding:20px 16px;">
                    Erro ao ler pasta de backups locais.
                </td>
            </tr>
        `;
    }
}

// Restore Backup Action
/*window.restoreBackup = (filename) => {
    showConfirmModal({
        title: 'Restaurar Banco de Dados',
        message:
            `Tem certeza de que deseja restaurar o backup "${filename}"? Todos os dados atuais serão substituídos.`,

        onConfirm: () => {
            try {

                if (!backupDir || !dbDir) {
                    showToast(
                        'Caminhos não inicializados.',
                        'error'
                    );
                    return;
                }
                    showToast(
                    'Feche o sistema para concluir a restauração.',
                    'success'
                    );

                    setTimeout(() => {
                    ipcRenderer.send('restore-backup');
                    }, 1000);
                    
                const sourcePath =
                    path.join(backupDir, filename);

                const destPath =
                    path.join(dbDir, 'wizard.db');

                fs.copyFileSync(
                    sourcePath,
                    destPath
                );

                showToast(
                    'Banco restaurado com sucesso!',
                    'success'
                );

                setTimeout(() => {
                    alert(
                        'Restauração concluída. O sistema será fechado.'
                    );

                    window.close();
                }, 1000);

            } catch (error) {
                console.error(error);

                showToast(
                    'Erro ao restaurar backup.',
                    'error'
                );
            }
        }
    });
};*/

window.restoreBackup = (filename) => {
    showConfirmModal({
        title: 'Restaurar Banco de Dados',
        message: `Tem certeza de que deseja restaurar o backup "${filename}"? Todos os dados atuais serão substituídos.`,

        onConfirm: () => {
            try {
                if (!backupDir || !dbDir) {
                    showToast('Caminhos não inicializados.', 'error');
                    return;
                }

                const sourcePath = path.join(backupDir, filename);

                // manda para o main process fazer a restauração
                ipcRenderer.send('restore-backup', {
                    sourcePath,
                    dbDir
                });

                showToast(
                    'Processo de restauração iniciado. Feche o sistema para concluir.',
                    'success'
                );

            } catch (error) {
                console.error(error);
                showToast('Erro ao iniciar restauração.', 'error');
            }
        }
    });
};
// ==========================================
// EXPORT/IMPORT EXCEL FUNCTIONALITY
// ==========================================

// Helper function to generate filename with date
function generateExcelFilename(prefix) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${prefix}_${year}_${month}_${day}.xlsx`;
}

// Export Students to Excel
document.getElementById('export-students-btn').addEventListener('click', async () => {
    try {
        // Check if XLSX is available
        if (!XLSX) {
            console.error('XLSX library not available');
            showToast('Biblioteca XLSX não disponível. Verifique se está instalada.', 'error');
            return;
        }

        const students = await apiCall('/api/students');

        if (students.length === 0) {
            showToast('Não há alunos para exportar', 'warning');
            return;
        }

        // Prepare data for Excel
        const excelData = students.map(student => ({
            'ID': student.id,
            'Nome': student.name,
            'CPF': student.cpf || '',
            'Telefone': student.phone || '',
            'Email': student.email || '',
            'Endereço': student.address || '',
            'Data de Cadastro': new Date(student.createdAt).toLocaleDateString('pt-BR')
        }));

        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Alunos');

        // Generate default filename
        const defaultFilename = generateExcelFilename('alunos');

        // Show save dialog
        let filePath;
        if (ipcRenderer) {
            const result = await ipcRenderer.invoke('show-save-dialog', {
                defaultPath: defaultFilename,
                filters: [
                    { name: 'Excel Files', extensions: ['xlsx'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });
            if (result.canceled || !result.filePath) {
                return;
            }
            filePath = result.filePath;
        } else {
            // Fallback to default location if not in Electron
            filePath = defaultFilename;
        }

        // Write file
        XLSX.writeFile(wb, filePath);

        showToast('Exportação de alunos concluída!', 'success');
    } catch (error) {
        console.error('Error exporting students:', error);
        showToast('Erro ao exportar alunos: ' + error.message, 'error');
    }
});

// Export Fees to Excel
document.getElementById('export-fees-btn').addEventListener('click', async () => {
    try {
        // Check if XLSX is available
        if (!XLSX) {
            console.error('XLSX library not available');
            showToast('Biblioteca XLSX não disponível. Verifique se está instalada.', 'error');
            return;
        }

        const fees = await apiCall('/api/fees');

        if (fees.length === 0) {
            showToast('Não há mensalidades para exportar', 'warning');
            return;
        }

        // Prepare data for Excel
        const excelData = fees.map(fee => ({
            'ID': fee.id,
            'Aluno': fee.student?.name || '-',
            'Valor': fee.amount,
            'Data de Vencimento': new Date(fee.dueDate).toLocaleDateString('pt-BR'),
            'Data de Pagamento': fee.paidDate ? new Date(fee.paidDate).toLocaleDateString('pt-BR') : '-',
            'Status': fee.status === 'paid' ? 'Paga' : (fee.status === 'pending' ? 'Pendente' : fee.status)
        }));

        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Mensalidades');

        // Generate default filename
        const defaultFilename = generateExcelFilename('mensalidades');

        // Show save dialog
        let filePath;
        if (ipcRenderer) {
            const result = await ipcRenderer.invoke('show-save-dialog', {
                defaultPath: defaultFilename,
                filters: [
                    { name: 'Excel Files', extensions: ['xlsx'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });
            if (result.canceled || !result.filePath) {
                return;
            }
            filePath = result.filePath;
        } else {
            // Fallback to default location if not in Electron
            filePath = defaultFilename;
        }

        // Write file
        XLSX.writeFile(wb, filePath);

        showToast('Exportação de mensalidades concluída!', 'success');
    } catch (error) {
        console.error('Error exporting fees:', error);
        showToast('Erro ao exportar mensalidades: ' + error.message, 'error');
    }
});

// Export Expenses to Excel
document.getElementById('export-expenses-btn').addEventListener('click', async () => {
    try {
        // Check if XLSX is available
        if (!XLSX) {
            console.error('XLSX library not available');
            showToast('Biblioteca XLSX não disponível. Verifique se está instalada.', 'error');
            return;
        }

        const expenses = await apiCall('/api/expenses');

        if (expenses.length === 0) {
            showToast('Não há despesas para exportar', 'warning');
            return;
        }

        // Prepare data for Excel
        const excelData = expenses.map(expense => ({
            'ID': expense.id,
            'Descrição': expense.description,
            'Valor': expense.amount,
            'Categoria': expense.category,
            'Data': new Date(expense.date).toLocaleDateString('pt-BR')
        }));

        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Despesas');

        // Generate default filename
        const defaultFilename = generateExcelFilename('despesas');

        // Show save dialog
        let filePath;
        if (ipcRenderer) {
            const result = await ipcRenderer.invoke('show-save-dialog', {
                defaultPath: defaultFilename,
                filters: [
                    { name: 'Excel Files', extensions: ['xlsx'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });
            if (result.canceled || !result.filePath) {
                return;
            }
            filePath = result.filePath;
        } else {
            // Fallback to default location if not in Electron
            filePath = defaultFilename;
        }

        // Write file
        XLSX.writeFile(wb, filePath);

        showToast('Exportação de despesas concluída!', 'success');
    } catch (error) {
        console.error('Error exporting expenses:', error);
        showToast('Erro ao exportar despesas: ' + error.message, 'error');
    }
});

// Import Students from Excel
let pendingImportData = [];

document.getElementById('import-students-btn').addEventListener('click', () => {
    const fileInput = document.getElementById('import-file-input');
    fileInput.click();
});

document.getElementById('import-file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check if XLSX is available
    if (!XLSX) {
        console.error('XLSX library not available');
        showToast('Biblioteca XLSX não disponível. Verifique se está instalada.', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // Read first sheet
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
                showToast('A planilha está vazia', 'warning');
                return;
            }

            // Validate columns
            const firstRow = jsonData[0];
            const requiredColumns = ['Nome', 'CPF', 'Telefone', 'Email', 'Endereco'];
            const missingColumns = requiredColumns.filter(col => !(col in firstRow));

            if (missingColumns.length > 0) {
                showToast(`Colunas obrigatórias faltando: ${missingColumns.join(', ')}`, 'error');
                return;
            }

            // Get existing students for duplicate check
            const existingStudents = await apiCall('/api/students');
            const existingCpfs = new Set(existingStudents.map(s => s.cpf).filter(c => c));
            const existingEmails = new Set(existingStudents.map(s => s.email).filter(e => e));

            // Process data and detect duplicates
            let validRecords = [];
            let duplicateRecords = [];
            let errorRecords = [];

            jsonData.forEach((row, index) => {
                const record = {
                    Nome: row['Nome'] || '',
                    CPF: row['CPF'] || '',
                    Telefone: row['Telefone'] || '',
                    Email: row['Email'] || '',
                    Endereco: row['Endereco'] || ''
                };

                // Check for required fields
                if (!record.Nome) {
                    errorRecords.push({ index: index + 2, reason: 'Nome obrigatório' });
                    return;
                }

                // Check for duplicates
                const cpfDuplicate = record.CPF && existingCpfs.has(record.CPF);
                const emailDuplicate = record.Email && existingEmails.has(record.Email);

                if (cpfDuplicate || emailDuplicate) {
                    duplicateRecords.push({
                        ...record,
                        index: index + 2,
                        reason: cpfDuplicate ? 'CPF já cadastrado' : 'E-mail já cadastrado'
                    });
                } else {
                    validRecords.push(record);
                }
            });

            // Store pending data
            pendingImportData = validRecords;

            // Show preview modal
            showImportPreviewModal({
                total: jsonData.length,
                valid: validRecords.length,
                duplicates: duplicateRecords.length,
                errors: errorRecords.length,
                validRecords,
                duplicateRecords,
                errorRecords
            });

        } catch (error) {
            console.error('Error reading Excel file:', error);
            showToast('Erro ao ler arquivo Excel: ' + error.message, 'error');
        }
    };

    reader.readAsArrayBuffer(file);

    // Reset file input
    e.target.value = '';
});

function showImportPreviewModal(stats) {
    const modal = document.getElementById('import-preview-modal');
    const summaryDiv = document.getElementById('import-preview-summary');
    const tbody = document.getElementById('import-preview-tbody');
    
    // Update summary
    summaryDiv.innerHTML = `
        <strong>Resumo da Importação:</strong><br>
        <i data-lucide="bar-chart-2"></i> Total de registros: ${stats.total}<br>
        <i data-lucide="check-circle"></i> Registros válidos: ${stats.valid}<br>
        <i data-lucide="alert-triangle"></i> Duplicados (serão ignorados): ${stats.duplicates}<br>
        <i data-lucide="x-circle"></i> Linhas com erro: ${stats.errors}
    `;
    
    // Show preview of valid records
    tbody.innerHTML = stats.validRecords.slice(0, 10).map(record => `
        <tr>
            <td><i data-lucide="check-circle"></i></td>
            <td>${record.Nome}</td>
            <td>${record.Telefone || '-'}</td>
            <td>${record.CPF || '-'}</td>
            <td>${record.Email || '-'}</td>
            <td>${record.Endereco || '-'}</td>
        </tr>
    `).join('');

    if (stats.validRecords.length > 10) {
        tbody.innerHTML += `
            <tr>
                <td colspan="6" style="text-align: center; color: var(--gray-500); font-style: italic;">
                    ... e mais ${stats.validRecords.length - 10} registros
                </td>
            </tr>
        `;
    }

    // Initialize Lucide icons for the modal content
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    modal.classList.remove('hidden');
}

// Import Preview Modal - Cancel
document.getElementById('import-preview-cancel').addEventListener('click', () => {
    const modal = document.getElementById('import-preview-modal');
    modal.classList.add('hidden');
    pendingImportData = [];
});

// Import Preview Modal - Confirm
document.getElementById('import-preview-confirm').addEventListener('click', async () => {
    const modal = document.getElementById('import-preview-modal');

    if (pendingImportData.length === 0) {
        modal.classList.add('hidden');
        showToast('Nenhum registro válido para importar', 'warning');
        return;
    }

    let imported = 0;
    let ignored = 0;
    let errors = 0;
    let firstError = null;

    for (const record of pendingImportData) {
        try {
            const studentData = {
                name: String(record.Nome || ''),
                cpf: record.CPF ? String(record.CPF) : null,
                phone: record.Telefone ? String(record.Telefone) : null,
                email: record.Email ? String(record.Email) : null,
                address: record.Endereco ? String(record.Endereco) : null
            };

            const response = await apiCall('/api/students', {
                method: 'POST',
                body: JSON.stringify(studentData)
            });
            imported++;
        } catch (error) {
            console.error('Error importing student:', error);
            if (!firstError) {
                firstError = error.message || 'Erro desconhecido';
            }
            errors++;
        }
    }

    modal.classList.add('hidden');
    pendingImportData = [];

    // Reload students list
    loadStudents();

    // Show result toast with error details
    if (errors > 0) {
        showToast(
            `Importação concluída com erros. ✔ ${imported} importados, ❌ ${errors} com erro. Primeiro erro: ${firstError}`,
            'error'
        );
    } else {
        showToast(
            `Importação concluída. ✔ ${imported} alunos importados, ⚠️ ${ignored} ignorados`,
            'success'
        );
    }
});

// Import Preview Modal - Close
document.getElementById('import-preview-close').addEventListener('click', () => {
    const modal = document.getElementById('import-preview-modal');
    modal.classList.add('hidden');
    pendingImportData = [];
});

// ==========================================
// REPORTS FUNCTIONALITY
// ==========================================

// Generate Report
document.getElementById('generate-report-btn').addEventListener('click', async () => {
    try {
        const reportType = document.getElementById('report-type').value;
        const startDate = document.getElementById('report-start-date').value;
        const endDate = document.getElementById('report-end-date').value;
        const status = document.getElementById('report-status').value;

        let reportData = [];
        let reportTitle = '';
        let reportHeaders = [];

        switch (reportType) {
            case 'students':
                const students = await apiCall('/api/students');
                reportData = students;
                reportTitle = 'Relatório de Alunos';
                reportHeaders = ['ID', 'Nome', 'CPF', 'Telefone', 'Email', 'Endereço', 'Data de Cadastro'];
                break;
            case 'fees':
                const fees = await apiCall('/api/fees');
                let filteredFees = fees;

                // Filter by status
                if (status !== 'all') {
                    filteredFees = filteredFees.filter(fee => fee.status === status);
                }

                // Filter by date range
                if (startDate) {
                    filteredFees = filteredFees.filter(fee => new Date(fee.dueDate) >= new Date(startDate));
                }
                if (endDate) {
                    filteredFees = filteredFees.filter(fee => new Date(fee.dueDate) <= new Date(endDate));
                }

                reportData = filteredFees;
                reportTitle = 'Relatório de Mensalidades';
                reportHeaders = ['ID', 'Aluno', 'Valor', 'Data de Vencimento', 'Data de Pagamento', 'Status'];
                break;
            case 'cashflow':
                const allFees = await apiCall('/api/fees');
                const expenses = await apiCall('/api/expenses');

                let transactions = [];

                // Add fees as income (only paid fees)
                allFees.filter(fee => fee.status === 'paid').forEach(fee => {
                    transactions.push({
                        type: 'income',
                        description: `Mensalidade - ${fee.student?.name || 'Aluno'}`,
                        amount: fee.amount,
                        date: fee.paidDate || fee.dueDate,
                        category: 'Mensalidade'
                    });
                });

                // Add expenses
                expenses.forEach(expense => {
                    transactions.push({
                        type: 'expense',
                        description: expense.description,
                        amount: expense.amount,
                        date: expense.date,
                        category: expense.category
                    });
                });

                // Filter by date range
                if (startDate) {
                    transactions = transactions.filter(t => new Date(t.date) >= new Date(startDate));
                }
                if (endDate) {
                    transactions = transactions.filter(t => new Date(t.date) <= new Date(endDate));
                }

                // Sort by date
                transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

                reportData = transactions;
                reportTitle = 'Relatório de Fluxo de Caixa';
                reportHeaders = ['Tipo', 'Descrição', 'Valor', 'Data', 'Categoria'];
                break;
        }

        renderReport(reportTitle, reportHeaders, reportData, reportType);
        showToast('Relatório gerado com sucesso!', 'success');
    } catch (error) {
        console.error('Error generating report:', error);
        showToast('Erro ao gerar relatório: ' + error.message, 'error');
    }
});

// Render Report
function renderReport(title, headers, data, type) {
    const reportContent = document.getElementById('report-content');

    let html = `
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="margin: 0; color: var(--wizard-red);">${title}</h2>
            <p style="margin: 5px 0 0 0; color: var(--gray-500); font-size: 14px;">
                Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
            </p>
        </div>
    `;

    if (data.length === 0) {
        html += `
            <div style="text-align: center; padding: 40px; color: var(--gray-400);">
                <p>Nenhum registro encontrado para os filtros selecionados.</p>
            </div>
        `;
    } else {
        html += `
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <thead>
                    <tr style="background: var(--wizard-red-bg);">
                        ${headers.map(h => `<th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--wizard-red); color: var(--wizard-red-dark);">${h}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${data.map(row => {
                        let cells = '';
                        switch (type) {
                            case 'students':
                                cells = `
                                    <td style="padding: 10px; border-bottom: 1px solid var(--gray-200);">${row.id}</td>
                                    <td style="padding: 10px; border-bottom: 1px solid var(--gray-200);">${row.name}</td>
                                    <td style="padding: 10px; border-bottom: 1px solid var(--gray-200);">${row.cpf || '-'}</td>
                                    <td style="padding: 10px; border-bottom: 1px solid var(--gray-200);">${row.phone || '-'}</td>
                                    <td style="padding: 10px; border-bottom: 1px solid var(--gray-200);">${row.email || '-'}</td>
                                    <td style="padding: 10px; border-bottom: 1px solid var(--gray-200);">${row.address || '-'}</td>
                                    <td style="padding: 10px; border-bottom: 1px solid var(--gray-200);">${new Date(row.createdAt).toLocaleDateString('pt-BR')}</td>
                                `;
                                break;
                            case 'fees':
                                cells = `
                                    <td style="padding: 10px; border-bottom: 1px solid var(--gray-200);">${row.id}</td>
                                    <td style="padding: 10px; border-bottom: 1px solid var(--gray-200);">${row.student?.name || '-'}</td>
                                    <td style="padding: 10px; border-bottom: 1px solid var(--gray-200);">R$ ${row.amount.toFixed(2)}</td>
                                    <td style="padding: 10px; border-bottom: 1px solid var(--gray-200);">${new Date(row.dueDate).toLocaleDateString('pt-BR')}</td>
                                    <td style="padding: 10px; border-bottom: 1px solid var(--gray-200);">${row.paidDate ? new Date(row.paidDate).toLocaleDateString('pt-BR') : '-'}</td>
                                    <td style="padding: 10px; border-bottom: 1px solid var(--gray-200);">${row.status === 'paid' ? 'Paga' : (row.status === 'pending' ? 'Pendente' : row.status)}</td>
                                `;
                                break;
                            case 'cashflow':
                                const typeLabel = row.type === 'income' ? 'Entrada' : 'Saída';
                                const typeColor = row.type === 'income' ? 'var(--green)' : 'var(--red)';
                                cells = `
                                    <td style="padding: 10px; border-bottom: 1px solid var(--gray-200); color: ${typeColor}; font-weight: bold;">${typeLabel}</td>
                                    <td style="padding: 10px; border-bottom: 1px solid var(--gray-200);">${row.description}</td>
                                    <td style="padding: 10px; border-bottom: 1px solid var(--gray-200); color: ${typeColor}; font-weight: bold;">R$ ${row.amount.toFixed(2)}</td>
                                    <td style="padding: 10px; border-bottom: 1px solid var(--gray-200);">${new Date(row.date).toLocaleDateString('pt-BR')}</td>
                                    <td style="padding: 10px; border-bottom: 1px solid var(--gray-200);">${row.category}</td>
                                `;
                                break;
                        }
                        return `<tr>${cells}</tr>`;
                    }).join('')}
                </tbody>
            </table>
        `;

        // Add summary for cashflow
        if (type === 'cashflow') {
            const totalIncome = data.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
            const totalExpense = data.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
            const balance = totalIncome - totalExpense;

            html += `
                <div style="margin-top: 30px; padding: 20px; background: var(--gray-50); border-radius: 8px; border-left: 4px solid var(--wizard-red);">
                    <h3 style="margin: 0 0 15px 0; color: var(--wizard-red-dark);">Resumo Financeiro</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                        <div>
                            <p style="margin: 0; color: var(--gray-500); font-size: 12px;">Total de Entradas</p>
                            <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: var(--green);">R$ ${totalIncome.toFixed(2)}</p>
                        </div>
                        <div>
                            <p style="margin: 0; color: var(--gray-500); font-size: 12px;">Total de Saídas</p>
                            <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: var(--red);">R$ ${totalExpense.toFixed(2)}</p>
                        </div>
                        <div>
                            <p style="margin: 0; color: var(--gray-500); font-size: 12px;">Saldo Líquido</p>
                            <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: ${balance >= 0 ? 'var(--green)' : 'var(--red)'};">R$ ${balance.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            `;
        }

        // Add total count
        html += `
            <div style="margin-top: 20px; padding: 10px; background: var(--gray-50); border-radius: 4px; text-align: center; color: var(--gray-500); font-size: 12px;">
                Total de registros: ${data.length}
            </div>
        `;
    }

    reportContent.innerHTML = html;

    // Initialize Lucide icons for the report content
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Print Report
document.getElementById('print-report-btn').addEventListener('click', () => {
    window.print();
});
