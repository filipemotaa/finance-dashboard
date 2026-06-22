import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, PiggyBank, Target, TrendingUp, History, BarChart3, Tag, RefreshCw, X, Wallet, Calculator } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transações' },
  { to: '/history', icon: History, label: 'Histórico' },
  { to: '/budget', icon: Wallet, label: 'Orçamento' },
  { to: '/goals', icon: Target, label: 'Metas' },
  { to: '/investments', icon: TrendingUp, label: 'Investimentos' },
  { to: '/reports', icon: BarChart3, label: 'Relatórios' },
  { to: '/categories', icon: Tag, label: 'Categorias' },
  { to: '/recurring', icon: RefreshCw, label: 'Recorrências' },
  { to: '/fatura', icon: Calculator, label: 'Calculadora Fatura' },
]

export default function Sidebar({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800">
      {/* Logo */}
      <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <PiggyBank className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-gray-900 dark:text-white">FinanceApp</span>
        </div>
        <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {nav.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end} onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${isActive
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
              }`
            }>
            <Icon className="w-4.5 h-4.5 flex-shrink-0" style={{ width: 18, height: 18 }} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
