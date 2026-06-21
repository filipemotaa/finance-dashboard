import React, { useEffect, useState } from 'react'
import { Search, TrendingUp, TrendingDown, Filter } from 'lucide-react'
import api from '../lib/api'
import { fmt, fmtDate } from '../lib/utils'

interface Category { id: number; name: string }
interface Transaction { id: number; type: string; amount: number; description: string; date: string; category_name: string; category_color: string; notes: string }

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [catId, setCatId] = useState('')
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const PER_PAGE = 30

  const load = async () => {
    setLoading(true)
    try {
      const [t, c] = await Promise.all([
        api.get('/transactions', { params: { type: type || undefined, category_id: catId || undefined, search: search || undefined, limit: PER_PAGE, offset: page * PER_PAGE } }),
        api.get('/categories'),
      ])
      setTransactions(t.data); setCategories(c.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { setPage(0) }, [search, type, catId])
  useEffect(() => { load() }, [search, type, catId, page])

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input pl-9" type="text" placeholder="Pesquisar..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input w-auto" value={type} onChange={e => setType(e.target.value)}>
            <option value="">Todos os tipos</option>
            <option value="income">Receitas</option>
            <option value="expense">Despesas</option>
          </select>
          <select className="input w-auto" value={catId} onChange={e => setCatId(e.target.value)}>
            <option value="">Todas as categorias</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Filter className="w-4 h-4" /> Histórico Completo
          </h3>
          <span className="text-sm text-gray-500">{transactions.length} registros</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><div className="w-7 h-7 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Nenhuma transação encontrada</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {transactions.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${t.type === 'income' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                    {t.type === 'income' ? <TrendingUp className="w-3.5 h-3.5 text-green-600" /> : <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{t.description || '—'}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{fmtDate(t.date)}</span>
                      {t.category_name && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: (t.category_color || '#6366f1') + '20', color: t.category_color || '#6366f1' }}>
                          {t.category_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className={`font-semibold text-sm flex-shrink-0 ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                    {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center px-4 py-3 border-t border-gray-100 dark:border-gray-800">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn-secondary py-1.5 text-sm disabled:opacity-40">← Anterior</button>
              <span className="text-sm text-gray-500">Página {page + 1}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={transactions.length < PER_PAGE} className="btn-secondary py-1.5 text-sm disabled:opacity-40">Próxima →</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
