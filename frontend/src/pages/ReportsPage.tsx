import React, { useEffect, useState } from 'react'
import { BarChart3, Download, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import api from '../lib/api'
import { fmt, fmtMonth, currentMonth, pct } from '../lib/utils'

const COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#3b82f6','#a855f7','#f97316','#06b6d4','#ec4899','#14b8a6']

export default function ReportsPage() {
  const [month, setMonth] = useState(currentMonth())
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try { const r = await api.get('/transactions/summary', { params: { month } }); setSummary(r.data) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [month])

  const exportCSV = async () => {
    const r = await api.get('/transactions', { params: { month, limit: 9999 } })
    const rows = [['Data','Tipo','Descrição','Categoria','Valor']]
    r.data.forEach((t: any) => rows.push([t.date, t.type === 'income' ? 'Receita' : 'Despesa', t.description || '', t.category_name || '', t.amount]))
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `relatorio-${month}.csv`; a.click()
  }

  const trendData = summary?.trend.map((t: any) => ({ month: fmtMonth(t.month), Receita: t.income, Despesa: t.expense, Economia: Math.max(0, t.income - t.expense) })) || []
  const catData = summary?.byCategory.map((c: any, i: number) => ({ name: c.name || 'Sem categoria', value: c.total, color: c.color || COLORS[i % COLORS.length] })) || []
  const savings = summary ? summary.income - summary.expense : 0
  const savingRate = summary?.income > 0 ? pct(savings, summary.income) : 0

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex flex-wrap items-center gap-3">
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="input w-auto text-sm" />
        <button onClick={exportCSV} className="btn-secondary ml-auto"><Download className="w-4 h-4" /> Exportar CSV</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-7 h-7 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : summary && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-5 text-center">
              <TrendingUp className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <p className="text-xs text-gray-500 mb-1">Total Recebido</p>
              <p className="font-bold text-green-600">{fmt(summary.income)}</p>
            </div>
            <div className="card p-5 text-center">
              <TrendingDown className="w-6 h-6 text-red-500 mx-auto mb-2" />
              <p className="text-xs text-gray-500 mb-1">Total Gasto</p>
              <p className="font-bold text-red-500">{fmt(summary.expense)}</p>
            </div>
            <div className="card p-5 text-center">
              <PiggyBank className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
              <p className="text-xs text-gray-500 mb-1">Economia</p>
              <p className={`font-bold ${savings >= 0 ? 'text-indigo-600' : 'text-red-500'}`}>{fmt(savings)}</p>
            </div>
            <div className="card p-5 text-center">
              <BarChart3 className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <p className="text-xs text-gray-500 mb-1">Taxa de Poupança</p>
              <p className={`font-bold ${savingRate >= 20 ? 'text-green-600' : savingRate >= 10 ? 'text-yellow-600' : 'text-red-500'}`}>{savingRate}%</p>
            </div>
          </div>

          {/* Trend line */}
          {trendData.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Evolução Financeira (últimos 6 meses)</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-gray-800" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="Receita" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Despesa" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Economia" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Category breakdown */}
          {catData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="card p-5">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Gastos por Categoria</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={catData} cx="50%" cy="50%" outerRadius={85} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                      {catData.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="card p-5">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Ranking de Despesas</h3>
                <div className="space-y-3">
                  {catData.slice(0, 8).map((c: any, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700 dark:text-gray-300 truncate">{c.name}</span>
                          <span className="font-semibold text-gray-900 dark:text-gray-100 flex-shrink-0 ml-2">{fmt(c.value)}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct(c.value, catData[0]?.value || 1)}%`, background: c.color }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
