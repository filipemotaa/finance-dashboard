import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { PiggyBank, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

type Mode = 'login' | 'register' | 'reset'

export default function LoginPage() {
  const { user, login, register, resetPassword } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (user) return <Navigate to="/" replace />

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSuccess('')
    setLoading(true)
    try {
      if (mode === 'login') await login(email, password)
      else if (mode === 'register') await register(name, email, password)
      else {
        await resetPassword(email, newPassword)
        setSuccess('Senha redefinida! Faça login.')
        setMode('login')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ocorreu um erro. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-center px-16 w-1/2 bg-gradient-to-br from-indigo-600 to-purple-700">
        <div className="max-w-md">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-8">
            <PiggyBank className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Controle financeiro de verdade</h1>
          <p className="text-indigo-200 text-lg leading-relaxed">Gerencie receitas, despesas, metas e investimentos em um único lugar. Tome decisões mais inteligentes com insights automáticos.</p>
          <div className="mt-10 grid grid-cols-2 gap-4">
            {['Dashboard intuitivo','Insights automáticos','Controle de metas','Modo escuro/claro'].map(f => (
              <div key={f} className="flex items-center gap-2 text-indigo-200 text-sm">
                <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <PiggyBank className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl">FinanceApp</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {mode === 'login' ? 'Bem-vindo de volta' : mode === 'register' ? 'Criar conta' : 'Redefinir senha'}
          </h2>
          <p className="text-gray-500 text-sm mb-7">
            {mode === 'login' ? 'Entre para acessar seu dashboard financeiro' :
             mode === 'register' ? 'Comece a controlar suas finanças hoje' :
             'Informe seu e-mail e defina uma nova senha'}
          </p>

          {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">{error}</div>}
          {success && <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-600 dark:text-green-400 text-sm">{success}</div>}

          <form onSubmit={handle} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="label">Nome completo</label>
                <input className="input" type="text" placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} required />
              </div>
            )}
            <div>
              <label className="label">E-mail</label>
              <input className="input" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            {mode !== 'reset' && (
              <div>
                <label className="label">Senha</label>
                <div className="relative">
                  <input className="input pr-10" type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
            {mode === 'reset' && (
              <div>
                <label className="label">Nova senha</label>
                <input className="input" type="password" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2">
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> :
                <>{mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar conta' : 'Redefinir senha'} <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="mt-6 text-sm text-center space-y-2">
            {mode === 'login' && <>
              <button onClick={() => setMode('reset')} className="text-indigo-600 hover:underline block w-full">Esqueci minha senha</button>
              <p className="text-gray-500">Não tem conta? <button onClick={() => setMode('register')} className="text-indigo-600 font-medium hover:underline">Cadastre-se</button></p>
            </>}
            {mode === 'register' && <p className="text-gray-500">Já tem conta? <button onClick={() => setMode('login')} className="text-indigo-600 font-medium hover:underline">Entrar</button></p>}
            {mode === 'reset' && <button onClick={() => setMode('login')} className="text-indigo-600 hover:underline">Voltar ao login</button>}
          </div>
        </div>
      </div>
    </div>
  )
}
