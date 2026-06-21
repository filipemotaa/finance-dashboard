import React, { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Check, Target, Trophy } from 'lucide-react'
import api from '../lib/api'
import { fmt, fmtDate, pct } from '../lib/utils'

interface Goal { id: number; name: string; target_amount: number; current_amount: number; deadline: string; icon: string; color: string; completed: number }

const empty = { name: '', target_amount: '', current_amount: '0', deadline: '', icon: 'target', color: '#6366f1', completed: false }
const ICONS = ['target','piggy-bank','car','home','laptop','plane','heart','book','star','gift']
const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#a855f7','#f97316','#06b6d4','#ec4899','#14b8a6']

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [form, setForm] = useState<any>(empty)
  const [editing, setEditing] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [addAmount, setAddAmount] = useState<{ id: number; value: string } | null>(null)

  const load = async () => { const r = await api.get('/goals'); setGoals(r.data) }
  useEffect(() => { load() }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const data = { ...form, target_amount: parseFloat(form.target_amount), current_amount: parseFloat(form.current_amount) || 0 }
    if (editing) await api.put(`/goals/${editing}`, data)
    else await api.post('/goals', data)
    setForm(empty); setEditing(null); setShowForm(false); load()
  }

  const del = async (id: number) => { if (!confirm('Excluir meta?')) return; await api.delete(`/goals/${id}`); load() }

  const edit = (g: Goal) => {
    setForm({ name: g.name, target_amount: String(g.target_amount), current_amount: String(g.current_amount), deadline: g.deadline || '', icon: g.icon || 'target', color: g.color || '#6366f1', completed: !!g.completed })
    setEditing(g.id); setShowForm(true)
  }

  const addToGoal = async (id: number) => {
    if (!addAmount || addAmount.id !== id) return
    const g = goals.find(g => g.id === id)!
    const newAmt = Math.min(g.current_amount + parseFloat(addAmount.value), g.target_amount)
    await api.put(`/goals/${id}`, { ...g, current_amount: newAmt, completed: newAmt >= g.target_amount ? 1 : 0 })
    setAddAmount(null); load()
  }

  const active = goals.filter(g => !g.completed)
  const completed = goals.filter(g => g.completed)

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex justify-end">
        <button onClick={() => { setForm(empty); setEditing(null); setShowForm(true) }} className="btn-primary">
          <Plus className="w-4 h-4" /> Nova Meta
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="card w-full max-w-md p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">{editing ? 'Editar Meta' : 'Nova Meta'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="label">Nome da meta</label>
                <input className="input" type="text" placeholder="Ex: Comprar notebook" value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Valor desejado (R$)</label>
                  <input className="input" type="number" min="0.01" step="0.01" value={form.target_amount} onChange={e => setForm((f: any) => ({ ...f, target_amount: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Valor atual (R$)</label>
                  <input className="input" type="number" min="0" step="0.01" value={form.current_amount} onChange={e => setForm((f: any) => ({ ...f, current_amount: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Prazo (opcional)</label>
                <input className="input" type="date" value={form.deadline} onChange={e => setForm((f: any) => ({ ...f, deadline: e.target.value }))} />
              </div>
              <div>
                <label className="label">Cor</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm((f: any) => ({ ...f, color: c }))}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'scale-110 border-gray-800 dark:border-white' : 'border-transparent'}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                <button type="submit" className="btn-primary flex-1 justify-center"><Check className="w-4 h-4" /> Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {goals.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma meta criada ainda</p>
          <p className="text-sm mt-1">Crie sua primeira meta financeira!</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">Em andamento ({active.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {active.map(g => {
                  const p = pct(g.current_amount, g.target_amount)
                  const daysLeft = g.deadline ? Math.ceil((new Date(g.deadline).getTime() - Date.now()) / 86400000) : null
                  return (
                    <div key={g.id} className="card p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: (g.color || '#6366f1') + '20' }}>
                            <Target className="w-5 h-5" style={{ color: g.color || '#6366f1' }} />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100">{g.name}</h4>
                            {g.deadline && <p className="text-xs text-gray-500">{daysLeft !== null && daysLeft > 0 ? `${daysLeft} dias restantes` : 'Prazo vencido'} · {fmtDate(g.deadline)}</p>}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => edit(g)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => del(g.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-gray-500">{fmt(g.current_amount)}</span>
                          <span className="font-semibold text-gray-800 dark:text-gray-200">{fmt(g.target_amount)}</span>
                        </div>
                        <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p}%`, background: g.color || '#6366f1' }} />
                        </div>
                        <p className="text-xs text-gray-500 mt-1 text-right">{p}% concluído</p>
                      </div>

                      {/* Add value */}
                      {addAmount?.id === g.id ? (
                        <div className="flex gap-2">
                          <input className="input text-sm" type="number" min="0.01" step="0.01" placeholder="Valor a adicionar" value={addAmount.value} onChange={e => setAddAmount({ id: g.id, value: e.target.value })} autoFocus />
                          <button onClick={() => addToGoal(g.id)} className="btn-primary py-2 px-3"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setAddAmount(null)} className="btn-secondary py-2 px-3"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <button onClick={() => setAddAmount({ id: g.id, value: '' })} className="btn-secondary w-full justify-center text-sm py-2" style={{ color: g.color || '#6366f1' }}>
                          + Adicionar valor
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">Concluídas ({completed.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completed.map(g => (
                  <div key={g.id} className="card p-5 opacity-80">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">{g.name}</h4>
                        <p className="text-sm text-green-600">{fmt(g.target_amount)} · Concluída!</p>
                      </div>
                      <button onClick={() => del(g.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
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
