import React, { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Target, DollarSign, AlertTriangle, CheckCircle, Info, AlertCircle, RefreshCw, CreditCard, Calculator } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts'
import api from '../lib/api'
import { fmt, fmtMonth, currentMonth } from '../lib/utils'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface Summary { income: number; expense: number; balance: number; byCategory: any[]; trend: any[] }
interface Health { score: number; breakdown: any; stats: any }
interface Insight { type: string; text: string }

const COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#3b82f6','#a855f7','#f97316','#06b6d4']

function ScoreRing({ score }: { score: number }) {
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'
  const r = 40; const c = 2 * Math.PI * r
  const dash = (score / 100) * c
  return (
    <div className="flex flex-col items-center">
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-gray-100 dark:text-gray-800" />
        <circle cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="10" strokeDasharray={`${dash} ${c}`} strokeLinecap="round" transform="rotate(-90 55 55)" style={{ transition: 'stroke-dasharray 1s ease' }} />
        <text x="55" y="51" textAnchor="middle" fontSize="22" fontWeight="700" fill={color}>{score}</text>
        <text x="55" y="66" textAnchor="middle" fontSize="10" fill="#94a3b8">/100</text>
      </svg>
      <p className="text-sm font-semibold" style={{ color }}>{score >= 70 ? 'Excelente' : score >= 40 ? 'Regular' : 'Atenção'}</p>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [health, setHealth] = useState<Health | null>(null)
  const [insights, setInsights] = useState<Insight[]>([])
  const [month, setMonth] = useState(currentMonth())
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [s, h, i] = await Promise.all([
        api.get('/transactions/summary', { params: { month } }),
        api.get('/dashboard/health'),
        api.get('/insights'),
      ])
      setSummary(s.data); setHealth(h.data); setInsights(i.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [month])

  const cards = summary ? [
    { label: 'Receita do Mês', value: summary.income, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
    { label: 'Despesas do Mês', value: summary.expense, icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
    { label: 'Saldo do Mês', value: summary.balance, icon: Wallet, color: summary.balance >= 0 ? 'text-indigo-600' : 'text-red-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
    { label: 'Economia', value: summary.income > 0 ? summary.balance : 0, icon: PiggyBank, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  ] : []

  const insightIcon: Record<string, React.ReactNode> = {
    success: <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />,
    danger: <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />,
    info: <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />,
  }
  const insightBg: Record<string, string> = {
    success: 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-900',
    danger: 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900',
  }

  const trendData = summary?.trend.map(t => ({
    month: fmtMonth(t.month),
    Receita: t.income,
    Despesa: t.expense,
  })) || []

  const catData = summary?.byCategory.slice(0, 6).map(c => ({
    name: c.name || 'Sem categoria',
    value: c.total,
    color: c.color || '#6366f1'
  })) || []

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Greeting + month */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Olá, {user?.name?.split(' ')[0]}! 👋</h2>
          <p className="text-gray-500 text-sm mt-0.5">Aqui está um resumo das suas finanças</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="input w-auto text-sm" />
          <button onClick={load} className="btn-secondary py-2"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
                  <div className={`p-2 rounded-lg ${bg}`}><Icon className={`w-4 h-4 ${color}`} /></div>
                </div>
                <p className={`text-xl font-bold ${color}`}>{fmt(value)}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            {/* Trend chart */}
            <div className="card p-5 xl:col-span-2">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Entradas × Saídas (últimos 6 meses)</h3>
              {trendData.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">Nenhum dado disponível</p> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={trendData} barSize={22}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-700" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Legend />
                    <Bar dataKey="Receita" fill="#10b981" radius={[4,4,0,0]} />
                    <Bar dataKey="Despesa" fill="#f43f5e" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Health score */}
            {health && (
              <div className="card p-5">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Saúde Financeira</h3>
                <div className="flex justify-center mb-4"><ScoreRing score={health.score} /></div>
                <div className="space-y-2">
                  {[
                    { label: 'Economia', value: health.breakdown.savings, max: 30 },
                    { label: 'Controle', value: health.breakdown.expenseControl, max: 30 },
                    { label: 'Patrimônio', value: health.breakdown.patrimony, max: 25 },
                    { label: 'Metas', value: health.breakdown.goals, max: 15 },
                  ].map(({ label, value, max }) => (
                    <div key={label} className="flex items-center gap-2 text-xs">
                      <span className="w-16 text-gray-500">{label}</span>
                      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(value/max)*100}%` }} />
                      </div>
                      <span className="w-8 text-right text-gray-600 dark:text-gray-400">{value}/{max}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {/* Category pie */}
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Gastos por Categoria</h3>
              {catData.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">Nenhum gasto registrado</p> : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={180}>
                    <PieChart>
                      <Pie data={catData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={2}>
                        {catData.map((entry, i) => <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmt(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {catData.map((c, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color || COLORS[i % COLORS.length] }} />
                          <span className="text-gray-600 dark:text-gray-400 truncate">{c.name}</span>
                        </div>
                        <span className="font-medium text-gray-800 dark:text-gray-200 flex-shrink-0">{fmt(c.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Insights */}
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Assistente Financeiro</h3>
              {insights.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Tudo sob controle! Continue assim.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {insights.map((ins, i) => (
                    <div key={i} className={`flex items-start gap-2.5 p-3 rounded-xl border text-sm ${insightBg[ins.type] || insightBg.info}`}>
                      {insightIcon[ins.type]}
                      <span className="text-gray-700 dark:text-gray-300">{ins.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          {/* Fatura widget */}
          {summary && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-500" />
                  Fatura do Mês
                </h3>
                <Link to="/fatura" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                  <Calculator className="w-3 h-3" />
                  Calculadora
                </Link>
              </div>
              <div className="flex items-end justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Total de despesas</p>
                  <p className="text-3xl font-bold text-red-500">{fmt(summary.expense)}</p>
                </div>
                {summary.income > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-gray-400 mb-1">Comprometido</p>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {Math.round((summary.expense / summary.income) * 100)}% da renda
                    </p>
                  </div>
                )}
              </div>
              {summary.income > 0 && (
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min((summary.expense / summary.income) * 100, 100)}%`,
                      background: summary.expense / summary.income > 0.8 ? '#ef4444' : summary.expense / summary.income > 0.6 ? '#f59e0b' : '#6366f1'
                    }}
                  />
                </div>
              )}
              {summary.income > 0 && (
                <div className="mt-3 flex justify-between text-xs text-gray-400">
                  <span>Disponivel: <span className="font-medium text-green-600">{fmt(Math.max(summary.income - summary.expense, 0))}</span></span>
                  <span>Renda: {fmt(summary.income)}</span>
                </div>
              )}
            </div>
          )}
          </div>
        </>
      )}
    </div>
  )
}
