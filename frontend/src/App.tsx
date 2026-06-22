import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import TransactionsPage from './pages/TransactionsPage'
import BudgetPage from './pages/BudgetPage'
import GoalsPage from './pages/GoalsPage'
import InvestmentsPage from './pages/InvestmentsPage'
import HistoryPage from './pages/HistoryPage'
import ReportsPage from './pages/ReportsPage'
import CategoriesPage from './pages/CategoriesPage'
import RecurringPage from './pages/RecurringPage'
import FaturaPage from './pages/FaturaPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-500 text-sm">Carregando...</span>
      </div>
    </div>
  )
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
              <Route index element={<DashboardPage />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="budget" element={<BudgetPage />} />
              <Route path="goals" element={<GoalsPage />} />
              <Route path="investments" element={<InvestmentsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="recurring" element={<RecurringPage />} />
              <Route path="fatura" element={<FaturaPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
