import React from 'react'
import { useLocation } from 'react-router-dom'
import { Menu, Sun, Moon, LogOut, Bell } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'

const titles: Record<string, string> = {
  '/': 'Dashboard',
  '/transactions': 'Transações',
  '/history': 'Histórico',
  '/budget': 'Orçamento',
  '/goals': 'Metas',
  '/investments': 'Investimentos',
  '/reports': 'Relatórios',
  '/categories': 'Categorias',
  '/recurring': 'Recorrências',
}

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { dark, toggle } = useTheme()
  const { logout } = useAuth()
  const { pathname } = useLocation()

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center px-4 md:px-6 gap-4 flex-shrink-0">
      <button onClick={onMenuClick} className="lg:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
        <Menu className="w-5 h-5" />
      </button>
      <h1 className="font-bold text-lg text-gray-900 dark:text-white flex-1">{titles[pathname] || 'FinanceApp'}</h1>
      <div className="flex items-center gap-2">
        <button onClick={toggle} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors">
          {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <button onClick={logout} className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors" title="Sair">
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}
