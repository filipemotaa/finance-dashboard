import React, { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Check, RefreshCw, Play } from 'lucide-react'
import api from '../lib/api'
import { fmt } from '../lib/utils'

interface Recurring { id: number; type: string; amount: number; description: string; category_id: number; category_name: string; color: string; day_of_month: number; active: number; last_generated: string }
interface Category { id: number; name: string; type: string }

const empty = { type: 'expense', amount: '', description: '', category_id: '', day_of_month: '1', active: true }

export default function RecurringPage() {
  const [items, setItems] = useState<Recurring[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState<any>(empty)
  const [editing, setEditing] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genMsg, setGenMsg] = useState('')

  const load = async () => {
    const [r, c] = await Promise.all([api.get('/recurring'), api.get('/categories')])
    setItems(r.data); setCategories(c.data)
  }
  useEffect(() => { load() }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) await api.put(`/recurring/${editing}`, form)
    else await api.post('/recurring', form)
    setForm(empty); setEditing(null); setShowForm(false); load()
  }

  const del = async (id: number) => { if (!confirm('Excluir recorrência?')) return; await api.delete(`/recurring/${id}`); load() }
  const edit = (r: Recurring) => {
    setForm({ type: r.type, amount: String(r.amount), description: r.description, category_id: String(r.category_id || ''), day_of_month: String(r.day_of_month), active: !!r.active })
    setEditing(r.id); setShowForm(true)
  }

  const generate = async () => {
    setGenerating(true)
    try {
      const r = await api.post('/recurring/generate')
      setGenMsg(`${r.data.generated} transação(ões) gerada(s) para este mês!`)
      setTimeout(() => setGenMsg(''), 4000)
      load()
    } finally { setGenerating(false) }
  }

  const filteredCats = categories.filter(c => c.type === form.type || c.type === 'both')
  const active = items.filter(i => i.active)
  const inactive = items.filter(i => !i.active)

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex flex-wrap items-center gap-3">
        <div className="ml-auto flex gap-2">
          <button onClick={generate} disabled={generating} className="btn-secondary">
            {generating ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> : <Play className="w-4 h-4" />}
            Gerar Mês Atual
          </button>
          <button onClick={() => { setForm(empty); setEditing(null); setShowForm(true) }} className="btn-primary">
            <Plus className="w-4 h-4" /> Nova Recorrência
          </button>
        </div>
      </div>

      {genMsg && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-600 dark:text-green-400 text-sm">
          ✅ {genMsg}
        </div>
      )}

      <div className="card p-4 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-900">
        <div className="flex items-start gap-3">
          <RefreshCw className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-indigo-700 dark:text-indigo-300">
            <strong>Como funciona:</strong> Cadastre contas fixas (Netflix, internet, academia...) e clique em "Gerar Mês Atual" para criar automaticamente as transações do mês. Cada item só é gerado uma vez por mês.
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="card w-full max-w-md p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">{editing ? 'Editar Recorrência' : 'Nova Recorrência'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="label">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  {['income','expense'].map(t => (
                    <button key={t} type="button" onClick={() => setForm((f: any) => ({ ...f, type: t, category_id: '' }))}
                      className={`py-2 rounded-xl text-sm font-semibold border-2 transition-all ${form.type === t ? (t === 'income' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-red-50 border-red-500 text-red-700') : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                      {t === 'income' ? '↑ Receita' : '↓ Despesa'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Descrição</label>
                <input className="input" type="text" placeholder="Ex: Netflix, Aluguel..." value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Valor (R$)</label>
                  <input className="input" type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm((f: any) => ({ ...f, amount: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Dia do mês</label>
                  <input className="input" type="number" min="1" max="31" value={form.day_of_month} onChange={e => setForm((f: any) => ({ ...f, day_of_month: e.target.value }))} required />
                </div>
              </div>
              <div>
                <label className="label">Categoria</label>
                <select className="input" value={form.category_id} onChange={e => setForm((f: any) => ({ ...f, category_id: e.target.value }))}>
                  <option value="">Sem categoria</option>
                  {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="active" checked={form.active} onChange={e => setForm((f: any) => ({ ...f, active: e.target.checked }))} className="w-4 h-4 text-indigo-600 rounded" />
                <label htmlFor="active" className="text-sm text-gray-700 dark:text-gray-300">Ativo</label>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                <button type="submit" className="btn-primary flex-1 justify-center"><Check className="w-4 h-4" /> Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          <RefreshCw className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Nenhuma recorrência cadastrada</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">Ativas ({active.length})</h3>
              <div className="card divide-y divide-gray-50 dark:divide-gray-800 overflow-hidden">
                {active.map(r => (
                  <div key={r.id} className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${r.type === 'income' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-red-100 dark:bg-red-900/30 text-red-500'}`}>
                      <RefreshCw className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{r.description}</p>
                      <p className="text-xs text-gray-500">Dia {r.day_of_month} de cada mês{r.category_name ? ` · ${r.category_name}` : ''}</p>
                    </div>
                    <p className={`font-bold flex-shrink-0 ${r.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>{fmt(r.amount)}</p>
                    <div className="flex gap-1">
                      <button onClick={() => edit(r)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => del(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {inactive.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-500 mb-3">Inativas ({inactive.length})</h3>
              <div className="card divide-y divide-gray-50 dark:divide-gray-800 overflow-hidden opacity-60">
                {inactive.map(r => (
                  <div key={r.id} className="flex items-center gap-3 p-4">
                    <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <RefreshCw className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-600 dark:text-gray-400 line-through">{r.description}</p>
                      <p className="text-xs text-gray-400">Dia {r.day_of_month} de cada mês</p>
                    </div>
                    <p className="text-gray-400 font-semibold">{fmt(r.amount)}</p>
                    <div className="flex gap-1">
                      <button onClick={() => edit(r)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => del(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
