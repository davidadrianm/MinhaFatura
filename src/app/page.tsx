'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin ? { email, password } : { name, email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Ocorreu um erro. Tente novamente.');
        setLoading(false);
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-background px-4 overflow-hidden">
      {/* Background Decorative blobs styled to be extremely subtle for the clean light theme */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary-fixed-dim/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10 bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-8 space-y-6 shadow-[0_4px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_30px_rgba(113,42,226,0.04)] transition-shadow">
        
        {/* Header Logo */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-secondary-fixed/50 border border-secondary-fixed-dim flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined text-[28px] font-bold">account_balance</span>
          </div>
          <h1 className="text-3xl font-black text-primary tracking-tight">
            FinVault
          </h1>
          <p className="text-label-sm font-label-sm text-on-surface-variant max-w-[280px]">
            {isLogin 
              ? 'Gerencie seus cartões, compras e faturas em um cofre digital seguro' 
              : 'Cadastre-se para começar a controlar seus gastos de forma inteligente'}
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-error-container text-on-error-container text-xs px-4 py-3 rounded-lg text-center font-medium border border-error/10">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-label-sm font-label-sm text-on-surface-variant block">Nome</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/75 text-xl">person</span>
                <input
                  type="text"
                  required
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-surface border border-outline-variant rounded-lg text-body-md text-on-surface placeholder-on-surface-variant/40 outline-none transition-all focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-label-sm font-label-sm text-on-surface-variant block">E-mail</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/75 text-xl">mail</span>
              <input
                type="email"
                required
                placeholder="exemplo@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-surface border border-outline-variant rounded-lg text-body-md text-on-surface placeholder-on-surface-variant/40 outline-none transition-all focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-label-sm font-label-sm text-on-surface-variant block">Senha</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/75 text-xl">lock</span>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-surface border border-outline-variant rounded-lg text-body-md text-on-surface placeholder-on-surface-variant/40 outline-none transition-all focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-secondary text-on-secondary disabled:opacity-50 rounded-lg text-label-md font-label-md hover:opacity-90 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-xs cursor-pointer mt-6"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
            ) : (
              <>
                <span>{isLogin ? 'Entrar na Conta' : 'Criar minha Conta'}</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        {/* Tab Toggle */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-label-sm font-label-sm text-secondary hover:underline transition-colors cursor-pointer"
          >
            {isLogin 
              ? 'Ainda não tem uma conta? Cadastre-se' 
              : 'Já possui uma conta? Faça o Login'}
          </button>
        </div>

        {/* Security Info */}
        <div className="pt-4 border-t border-outline-variant/30 flex justify-center items-center gap-xs text-[10px] text-on-surface-variant opacity-60">
          <span className="material-symbols-outlined text-sm">shield</span>
          <span>Sistema protegido por criptografia de ponta a ponta</span>
        </div>
      </div>
    </div>
  );
}
