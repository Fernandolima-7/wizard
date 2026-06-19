# Wizard CashFlow - Sistema de Fluxo de Caixa

Sistema desktop de fluxo de caixa para escola de inglês Wizard, desenvolvido com Electron, HTML/CSS/JavaScript, Node.js, Express, Prisma e SQLite.

## Funcionalidades

- **Login Simples**: Autenticação com usuário administrador padrão
- **Cadastro de Alunos**: Gerenciamento completo de alunos
- **Mensalidades**: Cadastro e recebimento de mensalidades
- **Despesas**: Registro e gerenciamento de despesas por categoria
- **Fluxo de Caixa**: Visualização de todas as transações financeiras
- **Dashboard Financeiro**: Resumo com métricas principais
- **Relatorios**: geração de relatorios (Alunos, mensalidades,fluxo de caixa) e impressão
- **Backup Manual**: Backup do banco de dados SQLite

## Instalação

### Pré-requisitos

- Node.js (v16 ou superior)
- npm ou yarn

### Passos de Instalação

1. **Instalar dependências do projeto principal:**
   ```bash
   npm install
   ```

2. **Gerar cliente Prisma:**
   ```bash
   npx prisma generate
   ```

3. **Criar e inicializar o banco de dados:**
   ```bash
   npx prisma migrate dev --name init
   node server/init-db.js
   ```

## Execução

### Modo Desenvolvimento (Electron)

Para executar o aplicativo desktop:
```bash
npm start
```

O sistema iniciará automaticamente o servidor backend e abrirá a interface desktop.

## Credenciais Padrão

- **Usuário**: wizard
- **Senha**: wizard

## Estrutura do Projeto

```
wizard/
├── frontend/            # Frontend HTML/CSS/JavaScript
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── electron/            # Processo principal Electron
│   └── main.js
├── prisma/              # Schema e banco de dados
│   ├── schema.prisma
│   └── wizard.db
├── server/              # Backend Express
│   ├── index.js
│   ├── init-db.js
│   └── package.json
├── backups/             # Backups do banco de dados
└── package.json
```

## Backup e Restauração

### Realizar Backup

O backup pode ser realizado através da interface do sistema na aba "Backup" ou manualmente copiando o arquivo `prisma/wizard.db` para a pasta `backups`.

### Restaurar Backup

Para restaurar um backup:
1. Pare o sistema
2. Copie o arquivo de backup desejado da pasta `backups`
3. Substitua o arquivo `prisma/wizard.db` pelo backup
4. Reinicie o sistema

## Tecnologias Utilizadas

- **Electron**: Aplicação desktop
- **HTML/CSS/JavaScript**: Frontend
- **Node.js**: Runtime
- **Express**: Backend API
- **Prisma**: ORM
- **SQLite**: Banco de dados
- **JWT**: Autenticação
- **bcryptjs**: Hash de senhas
