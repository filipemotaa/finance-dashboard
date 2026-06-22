import React, { useState, useEffect } from 'react'
import { Plus, X, CreditCard, RefreshCw, Save, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { fmt } from '../lib/utils'

interface Item {
  id: string
  description: string
  value: number
}
interface Category { id: number; name: string; type: string; color: string }

const STORAGE_KEY = 'fatura_calc_items'

export default function FaturaPage() {
  const [items, setItems] = useState<Item[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
  })
  const [desc, setDesc] = useState('')
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [showSavePanel, setShowSavePanel] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  useEffect(() => {
    api.get('/categories').then(r => {
      const cats = r.data.filter((c: Category) => c.type === 'expense' || c.type === 'both')
      setCategories(cats)
      const card = cats.find((c: Category) => c.name.toLowerCase().includes('cart'))
      if (card) setSelectedCategory(String(card.id))
      else if (cats.length > 0) setSelectedCategory(String(cats[0].id))
    }).catch(() => {})
  }, [])

  const total = items.reduce((s, i) => s + i.value, 0)

  const add = () => {
    if (!desc.trim()) { setError('Informe a descricao'); return }
    const v = parseFloat(value.replace(',', '.'))
    if (isNaN(v) || v <= 0) { setError('Valor invalido'); return }
    setItems(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, description: desc.trim(), value: v }])
    setDesc(''); setValue(''); setError('')
  }

  const remove = (id: string) => setItems(prev => prev.filter(i => i.id !== id))

  const clear = () => {
    if (!confirm('Limpar todos os itens?')) return
    setItems([])
  }

  const saveAll = async () => {
    if (items.length === 0) return
    setSaving(true)
    try {
      await Promise.all(
        items.map(item =>
          api.post('/transactions', {
            type: 'expense',
            amount: item.value,
            description: item.description,
            category_id: selectedCategory ? parseInt(selectedCategory) : null,
            date,
            notes: 'Importado da Calculadora de Fatura',
          })
        )
      )
      setSaved(true)
      setItems([])
      setShowSavePanel(false)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-indigo-600" />
            Calculadora de Fatura
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Adicione os gastos e acompanhe o total da sua fatura
          </p>
        </div>
        {saved && (
          <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium px-3 py-1.5 rounded-full">
            Salvo com sucesso!
          </div>
        )}
      </div>

      <div className="rounded-2xl p-6 bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30">
        <p className="text-sm font-medium opacity-75">Total da fatura</p>
        <p className="text-5xl font-bold mt-1 tracking-tight">{fmt(total)}</p>
        <p className="text-sm opacity-60 mt-2">
          {items.length === 0
            ? 'Nenhum item adicionado ainda'
            : `${items.length} ${items.length === 1 ? 'item' : 'itens'} na fatura`}
        </p>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Adicionar item</h3>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            placeholder="Descricao (ex: iFood, Uber, Mercado...)"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            className="input flex-1"
            autoFocus
          />
          <input
            type="text"
            placeholder="Valor (ex: 49,90)"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            className="input sm:w-36"
            inputMode="decimal"
          />
          <button onClick={add} className="btn-primary flex items-center gap-2 justify-center whitespace-nowrap">
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        </div>
        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
      </div>

      {items.length > 0 ? (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Itens ({items.length})
            </h3>
            <button
              onClick={clear}
              className="text-xs text-red-400 hover:text-red-500 flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Limpar tudo
            </button>
          </div>

          <div className="space-y-2">
            {items.map((item, i) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 group hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-gray-400 w-5 text-right flex-shrink-0 font-mono">{i + 1}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{item.description}</span>
                </div>
                <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{fmt(item.value)}</span>
                  <button
                    onClick={() => remove(item.id)}
                    className="text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Total</span>
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{fmt(total)}</span>
          </div>

          <div className="mt-4">
            {!showSavePanel ? (
              <button
                onClick={() => setShowSavePanel(true)}
                className="w-full btn-secondary flex items-center justify-center gap-2 py-2.5"
              >
                <Save className="w-4 h-4" />
                Salvar como transacoes
              </button>
            ) : (
              <div className="border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-4 bg-indigo-50/50 dark:bg-indigo-900/10 space-y-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Salvar {items.length} {items.length === 1 ? 'item' : 'itens'} como despesas
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Categoria</label>
                    <select
                      value={selectedCategory}
                      onChange={e => setSelectedCategory(e.target.value)}
                      className="input text-sm w-full"
                    >
                      <option value="">Sem categoria</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Data</label>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="input text-sm w-full"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowSavePanel(false)} className="btn-secondary flex-1 py-2 text-sm">
                    Cancelar
                  </button>
                  <button
                    onClick={saveAll}
                    disabled={saving}
                    className="btn-primary flex-1 py-2 text-sm flex items-center justify-center gap-2"
                  >
                    {saving
                      ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Save className="w-4 h-4" />}
                    {saving ? 'Salvando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card p-10 text-center">
          <CreditCard className="w-14 h-14 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Nenhum item adicionado ainda</p>
          <p className="text-gray-400 dark:text-gray-600 text-xs mt-1">Digite a descricao e o valor acima para comecar</p>
        </div>
      )}

      <Link
        to="/transactions"
        className="flex items-center justify-between p-4 card hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors group"
      >
        <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          Ver todas as transacoes registradas
        </span>
        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
      </Link>
    </div>
  )
}
