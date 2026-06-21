import React, { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Check, Tag } from 'lucide-react'
import api from '../lib/api'

interface Category { id: number; name: string; type: string; color: string; is_default: number }
const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#a855f7','#f97316','#06b6d4','#ec4899','#14b8a6','#22c55e','#64748b']
const empty = { name: '', type: 'expense', color: '#6366f1' }

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState<any>(empty)
  const [editing, setEditing] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)

  const load = async () => { const r = await api.get('/categories'); setCategories(r.data) }
  useEffect(() => { load() }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) await api.put(`/categories/${editing}`, form)
    else await api.post('/categories', form)
    setForm(empty); setEditing(null); setShowForm(false); load()
  }

  const del = async (id: number) => { if (!confirm('Excluir categoria?')) return; await api.delete(`/categories/${id}`); load() }
  const edit = (c: Category) => { setForm({ name: c.name, type: c.type, color: c.color || '#6366f1' }); setEditing(c.id); setShowForm(true) }

  const income = categories.filter(c => c.type === 'income')
  const expense = categories.filter(c => c.type === 'expense')

  const CatGroup = ({ title, cats }: { title: string; cats: Category[] }) => (
    <div>
      <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">{title} ({cats.length})</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cats.map(c => (
          <div key={c.id} className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: (c.color || '#6366f1') + '25' }}>
              <Tag className="w-4 h-4" style={{ color: c.color || '#6366f1' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{c.name}</p>
              {c.is_default === 1 && <span className="text-xs text-gray-400">Padrão</span>}
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => edit(c)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"><Pencil className="w-3.5 h-3.5" /></button>
              {c.is_default === 0 && <button onClick={() => del(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex justify-end">
        <button onClick={() => { setForm(empty); setEditing(null); setShowForm(true) }} className="btn-primary"><Plus className="w-4 h-4" /> Nova Categoria</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="card w-full max-w-sm p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">{editing ? 'Editar Categoria' : 'Nova Categoria'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="label">Nome</label>
                <input className="input" type="text" placeholder="Nome da categoria" value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Tipo</label>
                <select className="input" value={form.type} onChange={e => setForm((f: any) => ({ ...f, type: e.target.value }))}>
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                  <option value="both">Ambos</option>
                </select>
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

      <CatGroup title="Receitas" cats={income} />
      <CatGroup title="Despesas" cats={expense} />
    </div>
  )
}
