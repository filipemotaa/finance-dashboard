import React, { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, X, Check } from 'lucide-react'
import api from '../lib/api'
import { fmt, fmtDate, currentMonth } from '../lib/utils'

interface Category { id: number; name: string; type: string; color: string }
interface Transaction { id: number; type: string; amount: number; description: string; category_id: number; date: string; notes: string; category_name: string; category_color: string }

const empty = { type: 'expense', amount: '', description: '', category_id: '', date: new Date().toISOString().slice(0, 10), notes: '' }

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState<any>(empty)
  const [editing, setEditing] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [month, setMonth] = useState(currentMonth())
  const [filterType, setFilterType] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [t, c] = await Promise.all([
        api.get('/transactions', { params: { month, type: filterType || undefined, limit: 200 } }),
        api.get('/categories'),
      ])
      setTransactions(t.data); setCategories(c.data)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [month, filterType])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const data = { ...form, amount: parseFloat(form.amount), category_id: form.category_id || null }
    if (editing) await api.put(`/transactions/${editing}`, data)
    else await api.post('/transactions', data)
    setForm(empty); setEditing(null); setShowForm(false); load()
  }

  const del = async (id: number) => {
    if (!confirm('Excluir esta transação?')) return
    await api.delete(`/transactions/${id}`)
    load()
  }

  const edit = (t: Transaction) => {
    setForm({ type: t.type, amount: String(t.amount), description: t.description || '', category_id: String(t.category_id || ''), date: t.date, notes: t.notes || '' })
    setEditing(t.id); setShowForm(true)
  }

  const filteredCats = categories.filter(c => c.type === form.type || c.type === 'both')
  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex flex-wrap items-center gap-3">
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="input w-auto text-sm" />
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input w-auto text-sm">
          <option value="">Todos os tipos</option>
          <option value="income">Receitas</option>
          <option value="expense">Despesas</option>
        </select>
        <div className="ml-auto">
          <button onClick={() => { setForm(empty); setEditing(null); setShowForm(true) }} className="btn-primary">
            <Plus className="w-4 h-4" /> Nova Transação
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Receitas</p>
          <p className="text-lg font-bold text-green-600">{fmt(income)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Despesas</p>
          <p className="text-lg font-bold text-red-500">{fmt(expense)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Saldo</p>
          <p className={`text-lg font-bold ${income - expense >= 0 ? 'text-indigo-600' : 'text-red-500'}`}>{fmt(income - expense)}</p>
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="card w-full max-w-md p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">{editing ? 'Editar Transação' : 'Nova Transação'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="label">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  {['income','expense'].map(t => (
                    <button key={t} type="button"
                      onClick={() => setForm((f: any) => ({ ...f, type: t, category_id: '' }))}
                      className={`py-2 rounded-xl text-sm font-semibold border-2 transition-all ${form.type === t ? (t === 'income' ? 'bg-green-50 border-green-500 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 border-red-500 text-red-700 dark:bg-red-900/20 dark:text-red-400') : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                      {t === 'income' ? '↑ Receita' : '↓ Despesa'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Valor (R$)</label>
                <input className="input" type="number" step="0.01" min="0.01" placeholder="0,00" value={form.amount} onChange={e => setForm((f: any) => ({ ...f, amount: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Descrição</label>
                <input className="input" type="text" placeholder="Ex: Almoço, Salário..." value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Categoria</label>
                <select className="input" value={form.category_id} onChange={e => setForm((f: any) => ({ ...f, category_id: e.target.value }))}>
                  <option value="">Sem categoria</option>
                  {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Data</label>
                <input className="input" type="date" value={form.date} onChange={e => setForm((f: any) => ({ ...f, date: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Observação (opcional)</label>
                <input className="input" type="text" placeholder="Detalhes adicionais..." value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                <button type="submit" className="btn-primary flex-1 justify-center"><Check className="w-4 h-4" /> Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-10"><div className="w-7 h-7 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <TrendingDown className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma transação encontrada</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {transactions.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${t.type === 'income' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                  {t.type === 'income' ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{t.description || '—'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500">{fmtDate(t.date)}</span>
                    {t.category_name && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: (t.category_color || '#6366f1') + '20', color: t.category_color || '#6366f1' }}>
                        {t.category_name}
                      </span>
                    )}
                  </div>
                </div>
                <p className={`font-bold text-sm flex-shrink-0 ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                  {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                </p>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => edit(t)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-indigo-600 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => del(t.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
