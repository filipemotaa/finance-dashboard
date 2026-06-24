import React, { useState, useEffect, useCallback } from 'react'
import { Users, Plus, Trash2, ChevronDown, ChevronUp, CheckCircle, Circle, Calendar, DollarSign, X } from 'lucide-react'
import api from '../lib/api'

interface Debt {
  id: number
  creditor: string
  description: string | null
  total_amount: number
  paid_amount: number
  due_date: string | null
  paid: number
}

interface Payment {
  id: number
  debt_id: number
  amount: number
  date: string
  notes: string | null
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const today = () => new Date().toISOString().slice(0, 10)

export default function DividasPage() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [payments, setPayments] = useState<Record<number, Payment[]>>({})

  // New debt form
  const [newDebt, setNewDebt] = useState({ creditor: '', description: '', total_amount: '', due_date: '' })

  // New payment form per debt
  const [payForm, setPayForm] = useState<Record<number, { amount: string; date: string; notes: string }>>({})

  const loadDebts = useCallback(async () => {
    try {
      const { data } = await api.get('/debts')
      setDebts(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDebts() }, [loadDebts])

  const loadPayments = async (debtId: number) => {
    if (payments[debtId]) return
    const { data } = await api.get(`/debts/${debtId}/payments`)
    setPayments(prev => ({ ...prev, [debtId]: data }))
  }

  const toggleExpand = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
      loadPayments(id)
    }
  }

  const addDebt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDebt.creditor || !newDebt.total_amount) return
    const { data } = await api.post('/debts', {
      creditor: newDebt.creditor,
      description: newDebt.description || null,
      total_amount: parseFloat(newDebt.total_amount),
      due_date: newDebt.due_date || null,
    })
    setDebts(prev => [data, ...prev])
    setNewDebt({ creditor: '', description: '', total_amount: '', due_date: '' })
    setShowAdd(false)
  }

  const deleteDebt = async (id: number) => {
    if (!confirm('Excluir esta dívida e todos os pagamentos?')) return
    await api.delete(`/debts/${id}`)
    setDebts(prev => prev.filter(d => d.id !== id))
    setPayments(prev => { const p = { ...prev }; delete p[id]; return p })
  }

  const addPayment = async (debtId: number) => {
    const form = payForm[debtId]
    if (!form?.amount || !form?.date) return
    const { data } = await api.post(`/debts/${debtId}/payments`, {
      amount: parseFloat(form.amount),
      date: form.date,
      notes: form.notes || null,
    })
    setPayments(prev => ({ ...prev, [debtId]: [data, ...(prev[debtId] || [])] }))
    setPayForm(prev => ({ ...prev, [debtId]: { amount: '', date: today(), notes: '' } }))
    // Refresh debt to update paid_amount / paid status
    const { data: updated } = await api.get('/debts')
    setDebts(updated)
  }

  const deletePayment = async (debtId: number, paymentId: number) => {
    await api.delete(`/debts/payments/${paymentId}`)
    setPayments(prev => ({ ...prev, [debtId]: (prev[debtId] || []).filter(p => p.id !== paymentId) }))
    const { data: updated } = await api.get('/debts')
    setDebts(updated)
  }

  const togglePaid = async (debt: Debt) => {
    const { data } = await api.put(`/debts/${debt.id}`, { paid: debt.paid ? 0 : 1 })
    setDebts(prev => prev.map(d => d.id === debt.id ? { ...d, paid: data.paid } : d))
  }

  const active = debts.filter(d => !d.paid)
  const settled = debts.filter(d => d.paid)
  const totalOwed = active.reduce((s, d) => s + (parseFloat(String(d.total_amount)) - parseFloat(String(d.paid_amount || 0))), 0)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-500" /> Dívidas
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Controle o que você deve e seus pagamentos</p>
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Nova Dívida
        </button>
      </div>

      {/* Total card */}
      {active.length > 0 && (
        <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl p-5 text-white shadow-lg">
          <p className="text-rose-100 text-sm font-medium">Total em Aberto</p>
          <p className="text-4xl font-bold mt-1">{fmt(totalOwed)}</p>
          <p className="text-rose-200 text-xs mt-1">{active.length} dívida{active.length > 1 ? 's' : ''} ativa{active.length > 1 ? 's' : ''}</p>
        </div>
      )}

      {/* Add debt form */}
      {showAdd && (
        <form onSubmit={addDebt} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">Nova Dívida</h3>
            <button type="button" onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Para quem você deve *</label>
              <input
                value={newDebt.creditor}
                onChange={e => setNewDebt(p => ({ ...p, creditor: e.target.value }))}
                placeholder="Nome da pessoa ou empresa"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Descrição</label>
              <input
                value={newDebt.description}
                onChange={e => setNewDebt(p => ({ ...p, description: e.target.value }))}
                placeholder="Ex: empréstimo para carro"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Valor Total *</label>
              <input
                type="number" step="0.01" min="0"
                value={newDebt.total_amount}
                onChange={e => setNewDebt(p => ({ ...p, total_amount: e.target.value }))}
                placeholder="0,00"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Vencimento</label>
              <input
                type="date"
                value={newDebt.due_date}
                onChange={e => setNewDebt(p => ({ ...p, due_date: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-colors">
            Adicionar Dívida
          </button>
        </form>
      )}

      {/* Active debts */}
      {active.length === 0 && !showAdd && (
        <div className="text-center py-12 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma dívida em aberto</p>
          <p className="text-sm mt-1">Clique em "Nova Dívida" para adicionar</p>
        </div>
      )}

      {active.map(debt => <DebtCard key={debt.id} debt={debt} expanded={expandedId === debt.id}
        onToggle={() => toggleExpand(debt.id)} onDelete={() => deleteDebt(debt.id)}
        onTogglePaid={() => togglePaid(debt)}
        payments={payments[debt.id] || []}
        payForm={payForm[debt.id] || { amount: '', date: today(), notes: '' }}
        onPayFormChange={v => setPayForm(prev => ({ ...prev, [debt.id]: v }))}
        onAddPayment={() => addPayment(debt.id)}
        onDeletePayment={pid => deletePayment(debt.id, pid)}
      />)}

      {/* Settled debts */}
      {settled.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Quitadas ({settled.length})</p>
          {settled.map(debt => <DebtCard key={debt.id} debt={debt} expanded={expandedId === debt.id}
            onToggle={() => toggleExpand(debt.id)} onDelete={() => deleteDebt(debt.id)}
            onTogglePaid={() => togglePaid(debt)}
            payments={payments[debt.id] || []}
            payForm={payForm[debt.id] || { amount: '', date: today(), notes: '' }}
            onPayFormChange={v => setPayForm(prev => ({ ...prev, [debt.id]: v }))}
            onAddPayment={() => addPayment(debt.id)}
            onDeletePayment={pid => deletePayment(debt.id, pid)}
          />)}
        </div>
      )}
    </div>
  )
}

function DebtCard({ debt, expanded, onToggle, onDelete, onTogglePaid, payments, payForm, onPayFormChange, onAddPayment, onDeletePayment }: {
  debt: Debt
  expanded: boolean
  onToggle: () => void
  onDelete: () => void
  onTogglePaid: () => void
  payments: Payment[]
  payForm: { amount: string; date: string; notes: string }
  onPayFormChange: (v: { amount: string; date: string; notes: string }) => void
  onAddPayment: () => void
  onDeletePayment: (id: number) => void
}) {
  const total = parseFloat(String(debt.total_amount))
  const paid = parseFloat(String(debt.paid_amount || 0))
  const remaining = Math.max(total - paid, 0)
  const pct = total > 0 ? Math.min((paid / total) * 100, 100) : 0
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border mb-3 transition-all ${debt.paid ? 'border-green-100 dark:border-green-900/30 opacity-70' : 'border-gray-100 dark:border-gray-700'}`}>
      {/* Card header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <button onClick={onTogglePaid} className="mt-0.5 flex-shrink-0">
            {debt.paid
              ? <CheckCircle className="w-5 h-5 text-green-500" />
              : <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600" />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className={`font-semibold text-gray-900 dark:text-white ${debt.paid ? 'line-through text-gray-400' : ''}`}>{debt.creditor}</p>
              <div className="flex items-center gap-1">
                <button onClick={onToggle} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                  {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {debt.description && <p className="text-xs text-gray-500 mt-0.5">{debt.description}</p>}
            {debt.due_date && (
              <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                <Calendar className="w-3 h-3" /> Vence em {new Date(debt.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
              </p>
            )}

            {/* Amounts */}
            <div className="flex items-center gap-4 mt-2">
              <div>
                <p className="text-xs text-gray-400">Total</p>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{fmt(total)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Pago</p>
                <p className="text-sm font-semibold text-green-600">{fmt(paid)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Falta</p>
                <p className={`text-sm font-semibold ${remaining > 0 ? 'text-rose-500' : 'text-green-500'}`}>{fmt(remaining)}</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-400' : 'bg-rose-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{pct.toFixed(0)}% pago</p>
          </div>
        </div>
      </div>

      {/* Expanded: payments */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-4 pb-4 pt-3 space-y-3">
          {/* Add payment form */}
          {!debt.paid && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Registrar Pagamento
              </p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number" step="0.01" min="0" placeholder="Valor"
                  value={payForm.amount}
                  onChange={e => onPayFormChange({ ...payForm, amount: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="date"
                  value={payForm.date}
                  onChange={e => onPayFormChange({ ...payForm, date: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  placeholder="Observação (opcional)"
                  value={payForm.notes}
                  onChange={e => onPayFormChange({ ...payForm, notes: e.target.value })}
                  className="col-span-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={onAddPayment}
                disabled={!payForm.amount || !payForm.date}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Confirmar Pagamento
              </button>
            </div>
          )}

          {/* Payment history */}
          {payments.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Histórico</p>
              <div className="space-y-1.5">
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-700/40 group">
                    <div>
                      <p className="text-sm font-medium text-green-600">+ {parseFloat(String(p.amount)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      <p className="text-xs text-gray-400">{new Date(p.date + 'T12:00:00').toLocaleDateString('pt-BR')}{p.notes ? ` · ${p.notes}` : ''}</p>
                    </div>
                    <button
                      onClick={() => onDeletePayment(p.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-rose-500 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {payments.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-2">Nenhum pagamento registrado ainda</p>
          )}
        </div>
      )}
    </div>
  )
}
