const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'finance_secret_change_in_production';

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Query helpers
const q = (sql, params) => pool.query(sql, params || []);
const getOne = async (sql, params) => (await pool.query(sql, params || [])).rows[0];
const getAll = async (sql, params) => (await pool.query(sql, params || [])).rows;

// Initialize schema
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income','expense','both')),
      color TEXT DEFAULT '#6366f1',
      icon TEXT DEFAULT 'tag',
      is_default INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('income','expense')),
      amount NUMERIC NOT NULL,
      description TEXT,
      category_id INTEGER REFERENCES categories(id),
      date TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      amount NUMERIC NOT NULL,
      month TEXT NOT NULL,
      UNIQUE(user_id, category_id, month)
    );

    CREATE TABLE IF NOT EXISTS goals (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      target_amount NUMERIC NOT NULL,
      current_amount NUMERIC DEFAULT 0,
      deadline TEXT,
      icon TEXT DEFAULT 'target',
      color TEXT DEFAULT '#6366f1',
      completed INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS investments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      invested_amount NUMERIC NOT NULL,
      current_value NUMERIC NOT NULL,
      purchase_date TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS recurring_transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('income','expense')),
      amount NUMERIC NOT NULL,
      description TEXT NOT NULL,
      category_id INTEGER REFERENCES categories(id),
      day_of_month INTEGER NOT NULL,
      active INTEGER DEFAULT 1,
      last_generated TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS debts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      creditor TEXT NOT NULL,
      description TEXT,
      total_amount NUMERIC NOT NULL,
      due_date TEXT,
      paid INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS debt_payments (
      id SERIAL PRIMARY KEY,
      debt_id INTEGER NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
      amount NUMERIC NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('✅ Banco de dados inicializado');
}

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

// Default categories for new users
async function createDefaultCategories(userId, client) {
  const defaults = [
    { name: 'Salário', type: 'income', color: '#22c55e', icon: 'briefcase' },
    { name: 'Freelance', type: 'income', color: '#10b981', icon: 'laptop' },
    { name: 'Rendimentos', type: 'income', color: '#059669', icon: 'trending-up' },
    { name: 'Outras Entradas', type: 'income', color: '#34d399', icon: 'plus-circle' },
    { name: 'Moradia', type: 'expense', color: '#f59e0b', icon: 'home' },
    { name: 'Água', type: 'expense', color: '#3b82f6', icon: 'droplets' },
    { name: 'Luz', type: 'expense', color: '#eab308', icon: 'zap' },
    { name: 'Internet', type: 'expense', color: '#8b5cf6', icon: 'wifi' },
    { name: 'Transporte', type: 'expense', color: '#f97316', icon: 'car' },
    { name: 'Alimentação', type: 'expense', color: '#ef4444', icon: 'utensils' },
    { name: 'Mercado', type: 'expense', color: '#ec4899', icon: 'shopping-cart' },
    { name: 'Academia', type: 'expense', color: '#14b8a6', icon: 'dumbbell' },
    { name: 'Saúde', type: 'expense', color: '#06b6d4', icon: 'heart' },
    { name: 'Estudos', type: 'expense', color: '#6366f1', icon: 'book' },
    { name: 'Lazer', type: 'expense', color: '#a855f7', icon: 'music' },
    { name: 'Investimentos', type: 'expense', color: '#0ea5e9', icon: 'trending-up' },
    { name: 'Cartão de Crédito', type: 'expense', color: '#64748b', icon: 'credit-card' },
    { name: 'Outros', type: 'expense', color: '#94a3b8', icon: 'tag' },
  ];
  for (const d of defaults) {
    await client.query(
      'INSERT INTO categories (user_id, name, type, color, icon, is_default) VALUES ($1,$2,$3,$4,$5,1)',
      [userId, d.name, d.type, d.color, d.icon]
    );
  }
}

// ─── AUTH ────────────────────────────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Preencha todos os campos' });
  const client = await pool.connect();
  try {
    const existing = await getOne('SELECT id FROM users WHERE email = $1', [email]);
    if (existing) return res.status(400).json({ error: 'E-mail já cadastrado' });
    const hash = await bcrypt.hash(password, 10);
    await client.query('BEGIN');
    const result = await client.query(
      'INSERT INTO users (name, email, password) VALUES ($1,$2,$3) RETURNING id',
      [name, email, hash]
    );
    const userId = result.rows[0].id;
    await createDefaultCategories(userId, client);
    await client.query('COMMIT');
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: userId, name, email } });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Preencha todos os campos' });
  try {
    const user = await getOne('SELECT * FROM users WHERE email = $1', [email]);
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const user = await getOne('SELECT id, name, email, created_at FROM users WHERE id = $1', [req.userId]);
  res.json(user);
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;
  try {
    const user = await getOne('SELECT id FROM users WHERE email = $1', [email]);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    const hash = await bcrypt.hash(newPassword, 10);
    await q('UPDATE users SET password=$1 WHERE id=$2', [hash, user.id]);
    res.json({ message: 'Senha atualizada com sucesso' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── CATEGORIES ──────────────────────────────────────────────────────────────

app.get('/api/categories', authMiddleware, async (req, res) => {
  res.json(await getAll('SELECT * FROM categories WHERE user_id=$1 ORDER BY name', [req.userId]));
});

app.post('/api/categories', authMiddleware, async (req, res) => {
  const { name, type, color, icon } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'Nome e tipo são obrigatórios' });
  const r = await q('INSERT INTO categories (user_id,name,type,color,icon) VALUES ($1,$2,$3,$4,$5) RETURNING id', [req.userId, name, type, color || '#6366f1', icon || 'tag']);
  res.json({ id: r.rows[0].id, user_id: req.userId, name, type, color: color || '#6366f1', icon: icon || 'tag' });
});

app.put('/api/categories/:id', authMiddleware, async (req, res) => {
  const { name, type, color, icon } = req.body;
  await q('UPDATE categories SET name=$1,type=$2,color=$3,icon=$4 WHERE id=$5 AND user_id=$6', [name, type, color, icon, req.params.id, req.userId]);
  res.json({ success: true });
});

app.delete('/api/categories/:id', authMiddleware, async (req, res) => {
  await q('DELETE FROM categories WHERE id=$1 AND user_id=$2 AND is_default=0', [req.params.id, req.userId]);
  res.json({ success: true });
});

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────

app.get('/api/transactions', authMiddleware, async (req, res) => {
  const { month, type, category_id, search, limit = 100, offset = 0 } = req.query;
  let sql = `SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
             FROM transactions t LEFT JOIN categories c ON t.category_id=c.id WHERE t.user_id=$1`;
  const params = [req.userId];
  let i = 2;
  if (month) { sql += ` AND TO_CHAR(t.date::date,'YYYY-MM')=$${i++}`; params.push(month); }
  if (type) { sql += ` AND t.type=$${i++}`; params.push(type); }
  if (category_id) { sql += ` AND t.category_id=$${i++}`; params.push(category_id); }
  if (search) { sql += ` AND (t.description ILIKE $${i} OR t.notes ILIKE $${i+1})`; params.push(`%${search}%`, `%${search}%`); i += 2; }
  sql += ` ORDER BY t.date DESC, t.created_at DESC LIMIT $${i} OFFSET $${i+1}`;
  params.push(parseInt(limit), parseInt(offset));
  res.json(await getAll(sql, params));
});

app.post('/api/transactions', authMiddleware, async (req, res) => {
  const { type, amount, description, category_id, date, notes } = req.body;
  if (!type || !amount || !date) return res.status(400).json({ error: 'Tipo, valor e data são obrigatórios' });
  const r = await q('INSERT INTO transactions (user_id,type,amount,description,category_id,date,notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
    [req.userId, type, parseFloat(amount), description, category_id || null, date, notes || null]);
  const row = await getOne(`SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon FROM transactions t LEFT JOIN categories c ON t.category_id=c.id WHERE t.id=$1`, [r.rows[0].id]);
  res.json(row);
});

app.put('/api/transactions/:id', authMiddleware, async (req, res) => {
  const { type, amount, description, category_id, date, notes } = req.body;
  await q('UPDATE transactions SET type=$1,amount=$2,description=$3,category_id=$4,date=$5,notes=$6 WHERE id=$7 AND user_id=$8',
    [type, parseFloat(amount), description, category_id || null, date, notes || null, req.params.id, req.userId]);
  res.json({ success: true });
});

app.delete('/api/transactions/:id', authMiddleware, async (req, res) => {
  await q('DELETE FROM transactions WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
  res.json({ success: true });
});

app.get('/api/transactions/summary', authMiddleware, async (req, res) => {
  const m = req.query.month || new Date().toISOString().slice(0, 7);
  const income = await getOne(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id=$1 AND type='income' AND TO_CHAR(date::date,'YYYY-MM')=$2`, [req.userId, m]);
  const expense = await getOne(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id=$1 AND type='expense' AND TO_CHAR(date::date,'YYYY-MM')=$2`, [req.userId, m]);
  const byCategory = await getAll(`SELECT c.name,c.color,c.icon,SUM(t.amount) as total FROM transactions t LEFT JOIN categories c ON t.category_id=c.id WHERE t.user_id=$1 AND t.type='expense' AND TO_CHAR(t.date::date,'YYYY-MM')=$2 GROUP BY c.name,c.color,c.icon ORDER BY total DESC`, [req.userId, m]);
  const trend = await getAll(`SELECT TO_CHAR(date::date,'YYYY-MM') as month, SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income, SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense FROM transactions WHERE user_id=$1 AND date::date >= NOW() - INTERVAL '6 months' GROUP BY TO_CHAR(date::date,'YYYY-MM') ORDER BY month`, [req.userId]);
  res.json({
    income: parseFloat(income.total),
    expense: parseFloat(expense.total),
    balance: parseFloat(income.total) - parseFloat(expense.total),
    byCategory,
    trend
  });
});

// ─── BUDGETS ─────────────────────────────────────────────────────────────────

app.get('/api/budgets', authMiddleware, async (req, res) => {
  const m = req.query.month || new Date().toISOString().slice(0, 7);
  const budgets = await getAll(`SELECT b.*,c.name as category_name,c.color,c.icon,
    COALESCE((SELECT SUM(amount) FROM transactions WHERE user_id=b.user_id AND category_id=b.category_id AND TO_CHAR(date::date,'YYYY-MM')=b.month AND type='expense'),0) as spent
    FROM budgets b LEFT JOIN categories c ON b.category_id=c.id WHERE b.user_id=$1 AND b.month=$2`, [req.userId, m]);
  res.json(budgets);
});

app.post('/api/budgets', authMiddleware, async (req, res) => {
  const { category_id, amount, month } = req.body;
  if (!category_id || !amount || !month) return res.status(400).json({ error: 'Campos obrigatórios faltando' });
  await q('INSERT INTO budgets (user_id,category_id,amount,month) VALUES ($1,$2,$3,$4) ON CONFLICT (user_id,category_id,month) DO UPDATE SET amount=EXCLUDED.amount',
    [req.userId, category_id, parseFloat(amount), month]);
  res.json({ success: true });
});

app.delete('/api/budgets/:id', authMiddleware, async (req, res) => {
  await q('DELETE FROM budgets WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
  res.json({ success: true });
});

// ─── GOALS ───────────────────────────────────────────────────────────────────

app.get('/api/goals', authMiddleware, async (req, res) => {
  res.json(await getAll('SELECT * FROM goals WHERE user_id=$1 ORDER BY created_at DESC', [req.userId]));
});

app.post('/api/goals', authMiddleware, async (req, res) => {
  const { name, target_amount, current_amount, deadline, icon, color } = req.body;
  if (!name || !target_amount) return res.status(400).json({ error: 'Nome e valor são obrigatórios' });
  const r = await q('INSERT INTO goals (user_id,name,target_amount,current_amount,deadline,icon,color) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
    [req.userId, name, parseFloat(target_amount), parseFloat(current_amount) || 0, deadline || null, icon || 'target', color || '#6366f1']);
  res.json({ id: r.rows[0].id, ...req.body });
});

app.put('/api/goals/:id', authMiddleware, async (req, res) => {
  const { name, target_amount, current_amount, deadline, icon, color, completed } = req.body;
  await q('UPDATE goals SET name=$1,target_amount=$2,current_amount=$3,deadline=$4,icon=$5,color=$6,completed=$7 WHERE id=$8 AND user_id=$9',
    [name, parseFloat(target_amount), parseFloat(current_amount) || 0, deadline || null, icon || 'target', color || '#6366f1', completed ? 1 : 0, req.params.id, req.userId]);
  res.json({ success: true });
});

app.delete('/api/goals/:id', authMiddleware, async (req, res) => {
  await q('DELETE FROM goals WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
  res.json({ success: true });
});

// ─── INVESTMENTS ─────────────────────────────────────────────────────────────

app.get('/api/investments', authMiddleware, async (req, res) => {
  const investments = await getAll('SELECT * FROM investments WHERE user_id=$1 ORDER BY created_at DESC', [req.userId]);
  const totals = await getOne('SELECT COALESCE(SUM(invested_amount),0) as invested, COALESCE(SUM(current_value),0) as current FROM investments WHERE user_id=$1', [req.userId]);
  res.json({ investments, totals: { invested: parseFloat(totals.invested), current: parseFloat(totals.current) } });
});

app.post('/api/investments', authMiddleware, async (req, res) => {
  const { name, type, invested_amount, current_value, purchase_date, notes } = req.body;
  if (!name || !type || !invested_amount) return res.status(400).json({ error: 'Campos obrigatórios faltando' });
  const r = await q('INSERT INTO investments (user_id,name,type,invested_amount,current_value,purchase_date,notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
    [req.userId, name, type, parseFloat(invested_amount), parseFloat(current_value) || parseFloat(invested_amount), purchase_date || null, notes || null]);
  res.json({ id: r.rows[0].id, ...req.body });
});

app.put('/api/investments/:id', authMiddleware, async (req, res) => {
  const { name, type, invested_amount, current_value, purchase_date, notes } = req.body;
  await q('UPDATE investments SET name=$1,type=$2,invested_amount=$3,current_value=$4,purchase_date=$5,notes=$6 WHERE id=$7 AND user_id=$8',
    [name, type, parseFloat(invested_amount), parseFloat(current_value), purchase_date || null, notes || null, req.params.id, req.userId]);
  res.json({ success: true });
});

app.delete('/api/investments/:id', authMiddleware, async (req, res) => {
  await q('DELETE FROM investments WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
  res.json({ success: true });
});

// ─── RECURRING ───────────────────────────────────────────────────────────────

app.get('/api/recurring', authMiddleware, async (req, res) => {
  res.json(await getAll(`SELECT r.*,c.name as category_name,c.color,c.icon FROM recurring_transactions r LEFT JOIN categories c ON r.category_id=c.id WHERE r.user_id=$1 ORDER BY r.day_of_month`, [req.userId]));
});

app.post('/api/recurring', authMiddleware, async (req, res) => {
  const { type, amount, description, category_id, day_of_month } = req.body;
  const r = await q('INSERT INTO recurring_transactions (user_id,type,amount,description,category_id,day_of_month) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
    [req.userId, type, parseFloat(amount), description, category_id || null, day_of_month || 1]);
  res.json({ id: r.rows[0].id, ...req.body });
});

app.put('/api/recurring/:id', authMiddleware, async (req, res) => {
  const { type, amount, description, category_id, day_of_month, active } = req.body;
  await q('UPDATE recurring_transactions SET type=$1,amount=$2,description=$3,category_id=$4,day_of_month=$5,active=$6 WHERE id=$7 AND user_id=$8',
    [type, parseFloat(amount), description, category_id || null, day_of_month, active ? 1 : 0, req.params.id, req.userId]);
  res.json({ success: true });
});

app.delete('/api/recurring/:id', authMiddleware, async (req, res) => {
  await q('DELETE FROM recurring_transactions WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
  res.json({ success: true });
});

app.post('/api/recurring/generate', authMiddleware, async (req, res) => {
  const now = new Date();
  const month = now.toISOString().slice(0, 7);
  const active = await getAll('SELECT * FROM recurring_transactions WHERE user_id=$1 AND active=1', [req.userId]);
  let generated = 0;
  for (const r of active) {
    if (r.last_generated && r.last_generated.startsWith(month)) continue;
    const day = Math.min(r.day_of_month, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate());
    const date = `${month}-${String(day).padStart(2, '0')}`;
    await q('INSERT INTO transactions (user_id,type,amount,description,category_id,date,notes) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [req.userId, r.type, r.amount, r.description, r.category_id, date, 'Lançamento automático recorrente']);
    await q('UPDATE recurring_transactions SET last_generated=$1 WHERE id=$2', [month, r.id]);
    generated++;
  }
  res.json({ generated });
});

// ─── HEALTH SCORE ────────────────────────────────────────────────────────────

app.get('/api/dashboard/health', authMiddleware, async (req, res) => {
  const month = new Date().toISOString().slice(0, 7);
  const inc = await getOne(`SELECT COALESCE(SUM(amount),0) as v FROM transactions WHERE user_id=$1 AND type='income' AND TO_CHAR(date::date,'YYYY-MM')=$2`, [req.userId, month]);
  const exp = await getOne(`SELECT COALESCE(SUM(amount),0) as v FROM transactions WHERE user_id=$1 AND type='expense' AND TO_CHAR(date::date,'YYYY-MM')=$2`, [req.userId, month]);
  const invested = await getOne('SELECT COALESCE(SUM(current_value),0) as v FROM investments WHERE user_id=$1', [req.userId]);
  const goals = await getAll('SELECT * FROM goals WHERE user_id=$1', [req.userId]);
  const income = parseFloat(inc.v), expense = parseFloat(exp.v), invest = parseFloat(invested.v);
  const completedGoals = goals.filter(g => g.completed).length;
  const savingsRate = income > 0 ? (income - expense) / income : 0;
  const savingsScore = Math.min(30, savingsRate * 100);
  const budgets = await getAll(`SELECT b.amount, COALESCE(SUM(t.amount),0) as spent FROM budgets b LEFT JOIN transactions t ON t.category_id=b.category_id AND t.user_id=b.user_id AND TO_CHAR(t.date::date,'YYYY-MM')=b.month AND t.type='expense' WHERE b.user_id=$1 AND b.month=$2 GROUP BY b.id, b.amount`, [req.userId, month]);
  let expenseScore = 30;
  if (budgets.length > 0) {
    const overBudget = budgets.filter(b => parseFloat(b.spent) > parseFloat(b.amount)).length;
    expenseScore = Math.max(0, 30 - (overBudget / budgets.length) * 30);
  }
  const patrimonyScore = Math.min(25, (invest / Math.max(income * 12, 1)) * 100);
  const goalScore = goals.length > 0 ? (completedGoals / goals.length) * 15 : 0;
  const total = Math.round(savingsScore + expenseScore + patrimonyScore + goalScore);
  res.json({
    score: Math.min(100, total),
    breakdown: { savings: Math.round(savingsScore), expenseControl: Math.round(expenseScore), patrimony: Math.round(patrimonyScore), goals: Math.round(goalScore) },
    stats: { income, expense, invested: invest, savingsRate: savingsRate * 100 }
  });
});

// ─── INSIGHTS ────────────────────────────────────────────────────────────────

app.get('/api/insights', authMiddleware, async (req, res) => {
  const month = new Date().toISOString().slice(0, 7);
  const d = new Date(); d.setMonth(d.getMonth() - 1);
  const prevMonth = d.toISOString().slice(0, 7);
  const current = await getOne(`SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) as income, COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) as expense FROM transactions WHERE user_id=$1 AND TO_CHAR(date::date,'YYYY-MM')=$2`, [req.userId, month]);
  const prev = await getOne(`SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) as income, COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) as expense FROM transactions WHERE user_id=$1 AND TO_CHAR(date::date,'YYYY-MM')=$2`, [req.userId, prevMonth]);
  const topCurr = await getOne(`SELECT c.name, SUM(t.amount) as total FROM transactions t LEFT JOIN categories c ON t.category_id=c.id WHERE t.user_id=$1 AND t.type='expense' AND TO_CHAR(t.date::date,'YYYY-MM')=$2 GROUP BY c.name ORDER BY total DESC LIMIT 1`, [req.userId, month]);
  const topPrev = await getOne(`SELECT c.name, SUM(t.amount) as total FROM transactions t LEFT JOIN categories c ON t.category_id=c.id WHERE t.user_id=$1 AND t.type='expense' AND TO_CHAR(t.date::date,'YYYY-MM')=$2 GROUP BY c.name ORDER BY total DESC LIMIT 1`, [req.userId, prevMonth]);

  const income = parseFloat(current?.income || 0), expense = parseFloat(current?.expense || 0), prevExpense = parseFloat(prev?.expense || 0);
  const insights = [];

  if (prevExpense > 0 && expense > prevExpense) {
    const pct = ((expense - prevExpense) / prevExpense * 100).toFixed(0);
    insights.push({ type: 'warning', text: `Seus gastos aumentaram ${pct}% em relação ao mês anterior.` });
  }
  if (income > 0) {
    const savings = ((income - expense) / income * 100).toFixed(0);
    if (parseInt(savings) < 10) insights.push({ type: 'danger', text: `Sua taxa de economia está em apenas ${savings}%. O ideal é acima de 20%.` });
    else if (parseInt(savings) >= 30) insights.push({ type: 'success', text: `Parabéns! Você está economizando ${savings}% da sua renda este mês.` });
  }
  if (expense > income && income > 0) insights.push({ type: 'danger', text: 'Atenção: seus gastos estão superando suas receitas este mês.' });
  if (topCurr && topPrev && topCurr.name === topPrev.name && parseFloat(topCurr.total) > parseFloat(topPrev.total))
    insights.push({ type: 'info', text: `${topCurr.name} é sua maior despesa pelo segundo mês consecutivo.` });

  const budgets = await getAll(`SELECT b.amount, c.name, COALESCE(SUM(t.amount),0) as spent FROM budgets b LEFT JOIN categories c ON b.category_id=c.id LEFT JOIN transactions t ON t.category_id=b.category_id AND t.user_id=b.user_id AND TO_CHAR(t.date::date,'YYYY-MM')=b.month AND t.type='expense' WHERE b.user_id=$1 AND b.month=$2 GROUP BY b.id, b.amount, c.name`, [req.userId, month]);
  for (const b of budgets) {
    const pct = parseFloat(b.spent) / parseFloat(b.amount) * 100;
    if (pct >= 100) insights.push({ type: 'danger', text: `Você ultrapassou o orçamento de ${b.name} (${pct.toFixed(0)}% utilizado).` });
    else if (pct >= 80) insights.push({ type: 'warning', text: `Você já utilizou ${pct.toFixed(0)}% do orçamento de ${b.name}.` });
  }
  res.json(insights);
});


// ─── DEBTS ───────────────────────────────────────────────────────────────────

app.get('/api/debts', authMiddleware, async (req, res) => {
  const debts = await getAll(
    `SELECT d.*, COALESCE(SUM(p.amount), 0) as paid_amount
     FROM debts d
     LEFT JOIN debt_payments p ON p.debt_id = d.id
     WHERE d.user_id = $1
     GROUP BY d.id
     ORDER BY d.paid ASC, d.created_at DESC`,
    [req.userId]
  );
  res.json(debts);
});

app.post('/api/debts', authMiddleware, async (req, res) => {
  const { creditor, description, total_amount, due_date } = req.body;
  if (!creditor || !total_amount) return res.status(400).json({ error: 'Credor e valor são obrigatórios' });
  const row = await getOne(
    'INSERT INTO debts (user_id, creditor, description, total_amount, due_date) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [req.userId, creditor, description || null, total_amount, due_date || null]
  );
  res.json({ ...row, paid_amount: 0 });
});

app.put('/api/debts/:id', authMiddleware, async (req, res) => {
  const { creditor, description, total_amount, due_date, paid } = req.body;
  const row = await getOne(
    `UPDATE debts SET creditor=COALESCE($1,creditor), description=COALESCE($2,description),
     total_amount=COALESCE($3,total_amount), due_date=COALESCE($4,due_date), paid=COALESCE($5,paid)
     WHERE id=$6 AND user_id=$7 RETURNING *`,
    [creditor || null, description || null, total_amount || null, due_date || null, paid !== undefined ? paid : null, req.params.id, req.userId]
  );
  if (!row) return res.status(404).json({ error: 'Não encontrado' });
  res.json(row);
});

app.delete('/api/debts/:id', authMiddleware, async (req, res) => {
  await q('DELETE FROM debts WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
  res.json({ ok: true });
});

app.get('/api/debts/:id/payments', authMiddleware, async (req, res) => {
  const payments = await getAll(
    'SELECT * FROM debt_payments WHERE debt_id=$1 ORDER BY date DESC, created_at DESC',
    [req.params.id]
  );
  res.json(payments);
});

app.post('/api/debts/:id/payments', authMiddleware, async (req, res) => {
  const { amount, date, notes } = req.body;
  if (!amount || !date) return res.status(400).json({ error: 'Valor e data são obrigatórios' });
  // Verify debt belongs to user
  const debt = await getOne('SELECT * FROM debts WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
  if (!debt) return res.status(404).json({ error: 'Dívida não encontrada' });
  const payment = await getOne(
    'INSERT INTO debt_payments (debt_id, amount, date, notes) VALUES ($1,$2,$3,$4) RETURNING *',
    [req.params.id, amount, date, notes || null]
  );
  // Auto-mark as paid if paid_amount >= total_amount
  const totPaid = await getOne('SELECT COALESCE(SUM(amount),0) as total FROM debt_payments WHERE debt_id=$1', [req.params.id]);
  if (parseFloat(totPaid.total) >= parseFloat(debt.total_amount)) {
    await q('UPDATE debts SET paid=1 WHERE id=$1', [req.params.id]);
  }
  res.json(payment);
});

app.delete('/api/debts/payments/:paymentId', authMiddleware, async (req, res) => {
  // Verify ownership via debt
  const payment = await getOne(
    'SELECT p.* FROM debt_payments p JOIN debts d ON p.debt_id=d.id WHERE p.id=$1 AND d.user_id=$2',
    [req.params.paymentId, req.userId]
  );
  if (!payment) return res.status(404).json({ error: 'Não encontrado' });
  await q('UPDATE debts SET paid=0 WHERE id=$1', [payment.debt_id]);
  await q('DELETE FROM debt_payments WHERE id=$1', [req.params.paymentId]);
  res.json({ ok: true });
});

// Start server
initDB()
  .then(() => app.listen(PORT, () => console.log(`✅ Servidor rodando na porta ${PORT}`)))
  .catch(e => { console.error('Erro fatal ao inicializar banco:', e.message); process.exit(1); });
