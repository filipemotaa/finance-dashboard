import React, { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Check, TrendingUp, TrendingDown } from 'lucide-react'
import api from '../lib/api'
import { fmt } from '../lib/utils'

interface Investment { id: number; name: string; type: string; invested_amount: number; current_value: number; purchase_date: string; notes: string }
interface Totals { invested: number; current: number }

const TYPES = ['Tesouro Direto','CDB','Ações','ETFs','Fundos','Criptomoedas','LCI/LCA','Poupança','Outros']
const empty = { name: '', type: TYPES[0], invested_amount: '', current_value: '', purchase_date: '', notes: '' }

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [totals, setTotals] = useState<Totals>({ invested: 0, current: 0 })
  const [form, setForm] = useState<any>(empty)
  const [editing, setEditing] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)

  const load = async () => { const r = await api.get('/investments'); setInvestments(r.data.investments); setTotals(r.data.totals) }
  useEffect(() => { load() }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) await api.put(`/investments/${editing}`, form)
    else await api.post('/investments', form)
    setForm(empty); setEditing(null); setShowForm(false); load()
  }

  const del = async (id: number) => { if (!confirm('Excluir investimento?')) return; await api.delete(`/investments/${id}`); load() }
  const edit = (i: Investment) => { setForm({ name: i.name, type: i.type, invested_amount: String(i.invested_amount), current_value: String(i.current_value), purchase_date: i.purchase_date || '', notes: i.notes || '' }); setEditing(i.id); setShowForm(true) }

  const totalReturn = totals.current - totals.invested
  const returnPct = totals.invested > 0 ? ((totalReturn / totals.invested) * 100).toFixed(2) : '0.00'

  const typeColors: Record<string, string> = {
    'Tesouro Direto': '#10b981', 'CDB': '#3b82f6', 'Ações': '#f59e0b',
    'ETFs': '#6366f1', 'Fundos': '#a855f7', 'Criptomoedas': '#f97316',
    'LCI/LCA': '#06b6d4', 'Poupança': '#14b8a6', 'Outros': '#94a3b8'
  }

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex justify-end">
        <button onClick={() => { setForm(empty); setEditing(null); setShowForm(true) }} className="btn-primary">
          <Plus className="w-4 h-4" /> Novo Investimento
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Total Investido</p>
          <p className="text-lg font-bold text-indigo-600">{fmt(totals.invested)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Valor Atual</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{fmt(totals.current)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Rentabilidade</p>
          <p className={`text-lg font-bold flex items-center justify-center gap-1 ${totalReturn >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {totalReturn >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {returnPct}%
          </p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="card w-full max-w-md p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">{editing ? 'Editar Investimento' : 'Novo Investimento'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="label">Nome</label>
                <input className="input" type="text" placeholder="Ex: Tesouro IPCA+ 2026" value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Tipo</label>
                <select className="input" value={form.type} onChange={e => setForm((f: any) => ({ ...f, type: e.target.value }))}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Valor investido (R$)</label>
                  <input className="input" type="number" min="0.01" step="0.01" value={form.invested_amount} onChange={e => setForm((f: any) => ({ ...f, invested_amount: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Valor atual (R$)</label>
                  <input className="input" type="number" min="0" step="0.01" value={form.current_value} onChange={e => setForm((f: any) => ({ ...f, current_value: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Data de compra</label>
                <input className="input" type="date" value={form.purchase_date} onChange={e => setForm((f: any) => ({ ...f, purchase_date: e.target.value }))} />
              </div>
              <div>
                <label className="label">Observações</label>
                <input className="input" type="text" value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} />
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
      {investments.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Nenhum investimento cadastrado</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {investments.map(inv => {
              const ret = inv.current_value - inv.invested_amount
              const retPct = inv.invested_amount > 0 ? ((ret / inv.invested_amount) * 100).toFixed(2) : '0.00'
              const color = typeColors[inv.type] || '#6366f1'
              return (
                <div key={inv.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + '20' }}>
                    <TrendingUp className="w-5 h-5" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{inv.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{inv.type}{inv.purchase_date ? ` · desde ${inv.purchase_date}` : ''}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-gray-900 dark:text-white">{fmt(inv.current_value)}</p>
                    <p className={`text-xs font-medium ${ret >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {ret >= 0 ? '+' : ''}{fmt(ret)} ({retPct}%)
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => edit(inv)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => del(inv.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
