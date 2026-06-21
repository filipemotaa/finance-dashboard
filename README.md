# FinanceApp — Sistema Financeiro Pessoal

Dashboard financeiro completo com React + Node.js + SQLite.

---

## Pré-requisitos

- [Node.js 18+](https://nodejs.org/) instalado
- Terminal (CMD, PowerShell ou Terminal)

---

## Instalação e execução

### 1. Backend

```bash
cd finance-dashboard/backend
npm install
npm start
```

O servidor roda em **http://localhost:3001**

> Para desenvolvimento com auto-reload: `npm run dev`

---

### 2. Frontend (em outro terminal)

```bash
cd finance-dashboard/frontend
npm install
npm run dev
```

Acesse no navegador: **http://localhost:3000**

---

## Usando o sistema

1. Abra **http://localhost:3000**
2. Clique em **"Cadastre-se"** para criar sua conta
3. Após login, o sistema cria automaticamente 18 categorias padrão
4. Comece registrando suas receitas e despesas

---

## Funcionalidades

| Módulo | Descrição |
|--------|-----------|
| Dashboard | Cards resumo, gráficos, saúde financeira (0-100), insights automáticos |
| Transações | Receitas e despesas com categoria, data e observação |
| Histórico | Todas as movimentações com filtros e busca, paginado |
| Orçamento | Limites por categoria com alertas em 80%, 100% e 120% |
| Metas | Reservas com barra de progresso e prazo |
| Investimentos | Tesouro, CDB, Ações, ETFs, Cripto, etc. com rentabilidade |
| Relatórios | Gráficos de evolução + ranking de gastos + exportar CSV |
| Categorias | Gerenciar categorias de receita/despesa com cores |
| Recorrências | Lançamento automático de contas fixas (Netflix, internet...) |

---

## Modo escuro

Clique no ícone de lua/sol no topo direito para alternar.

---

## Estrutura do projeto

```
finance-dashboard/
├── backend/
│   ├── package.json
│   ├── server.js        ← API Express + SQLite (tudo em um arquivo)
│   └── finance.db       ← criado automaticamente ao iniciar
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    └── src/
        ├── App.tsx
        ├── contexts/     ← Auth + Theme
        ├── lib/          ← API client + utils
        └── pages/        ← 9 páginas
```

---

## Tecnologias

**Frontend:** React 18, TypeScript, Tailwind CSS, Recharts, React Router, Axios, Lucide Icons, Vite

**Backend:** Node.js, Express, better-sqlite3, bcryptjs, jsonwebtoken

**Banco:** SQLite (arquivo `finance.db` criado automaticamente)

---

## Solução de problemas

**Porta já em uso:**
```bash
# Mudar porta do backend (adicione antes do npm start)
PORT=3002 npm start
# E atualize o proxy em frontend/vite.config.ts
```

**Erro de permissão no npm install:**
```bash
# Windows — rode como Administrador ou use:
npm install --legacy-peer-deps
```

**Banco corrompido:**
```bash
# Apague o arquivo e reinicie o servidor (dados serão perdidos)
rm backend/finance.db
```
