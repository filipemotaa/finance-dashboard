import React, { useEffect, useState } from 'react'
import { Plus, Trash2, X, Check, AlertTriangle, AlertCircle } from 'lucide-react'
import api from '../lib/api'
import { fmt, currentMonth, pct } from '../lib/utils'

interface Budget { id: number; category_id: number; category_name: string; color: string; amount: number; spent: number; month: string }
interface Category { id: number; name: string; type: string; color: string }

export default function BudgetPage() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [month, setMonth] = useState(currentMonth())
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ category_id: '', amount: '' })
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [b, c] = await Promise.all([api.get('/budgets', { params: { month } }), api.get('/categories')])
      setBudgets(b.data); setCategories(c.data.filter((c: Category) => c.type === 'expense'))
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [month])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.post('/budgets', { ...form, month })
    setForm({ category_id: '', amount: '' }); setShowForm(false); load()
  }

  const del = async (id: number) => {
    if (!confirm('Remover orçamento?')) return
    await api.delete(`/budgets/${id}`); load()
  }

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0)
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0)

  const getStatus = (spent: number, amount: number) => {
    const p = pct(spent, amount)
    if (p >= 120) return { label: 'Crítico', cls: 'badge-red', bar: 'bg-red-500' }
    if (p >= 100) return { label: 'Estourado', cls: 'badge-red', bar: 'bg-red-500' }
    if (p >= 80) return { label: `${p}% usado`, cls: 'badge-yellow', bar: 'bg-yellow-400' }
    return { label: `${p}% usado`, cls: 'badge-green', bar: 'bg-green-500' }
  }

  const usedCatIds = new Set(budgets.map(b => b.category_id))
  const availableCats = categories.filter(c => !usedCatIds.has(c.id))

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex flex-wrap items-center gap-3">
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="input w-auto text-sm" />
        <button onClick={() => setShowForm(true)} className="btn-primary ml-auto"><Plus className="w-4 h-4" /> Novo Orçamento</button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Total Orçado</p>
          <p className="text-lg font-bold text-indigo-600">{fmt(totalBudget)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Total Gasto</p>
          <p className="text-lg font-bold text-red-500">{fmt(totalSpent)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Disponível</p>
          <p className={`text-lg font-bold ${totalBudget - totalSpent >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmt(totalBudget - totalSpent)}</p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="card w-full max-w-sm p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">Definir Orçamento</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="label">Categoria de despesa</label>
                <select className="input" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} required>
                  <option value="">Selecionar...</option>
                  {availableCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Limite mensal (R$)</label>
                <input className="input" type="number" min="0.01" step="0.01" placeholder="Ex: 500,00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                <button type="submit" className="btn-primary flex-1 justify-center"><Check className="w-4 h-4" /> Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Budget list */}
      {loading ? (
        <div className="flex justify-center py-10"><div className="w-7 h-7 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : budgets.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Nenhum orçamento definido para este mês</p>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map(b => {
            const p = pct(b.spent, b.amount)
            const status = getStatus(b.spent, b.amount)
            return (
              <div key={b.id} className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: b.color || '#6366f1' }} />
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{b.category_name}</span>
                    {p >= 80 && <AlertTriangle className={`w-4 h-4 ${p >= 100 ? 'text-red-500' : 'text-yellow-500'}`} />}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={status.cls}>{status.label}</span>
                    <button onClick={() => del(b.id)} className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-2">
                  <div className={`h-full rounded-full transition-all duration-500 ${status.bar}`} style={{ width: `${Math.min(p, 100)}%` }} />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Gasto: <strong className="text-gray-800 dark:text-gray-200">{fmt(b.spent)}</strong></span>
                  <span>Limite: <strong className="text-gray-800 dark:text-gray-200">{fmt(b.amount)}</strong></span>
                  <span>Restante: <strong className={b.amount - b.spent >= 0 ? 'text-green-600' : 'text-red-500'}>{fmt(b.amount - b.spent)}</strong></span>
                </div>
                {p >= 80 && p < 100 && (
                  <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">⚠ Você já utilizou {p}% do orçamento de {b.category_name}.</p>
                )}
                {p >= 100 && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400">🚨 Você ultrapassou o limite de {b.category_name}. Considere reduzir gastos.</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
