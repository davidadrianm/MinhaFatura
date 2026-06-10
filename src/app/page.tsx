'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Detecta erros vindos da rota de callback (OAuth)
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    if (err) {
      setError(err);
    }
  }, []);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
      }
    } catch (err) {
      setError('Erro ao iniciar o login com o Google.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Validação básica de e-mail (Login e Registro)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Por favor, insira um e-mail válido.');
      return;
    }

    // 2. Validação básica de senha no Registro
    if (!isLogin) {
      if (password.length < 6) {
        setError('A senha deve ter no mínimo 6 caracteres.');
        return;
      }
      const specialCharRegex = /[^a-zA-Z0-9]/;
      if (!specialCharRegex.test(password)) {
        setError('A senha deve conter pelo menos um caractere especial (ex: !, @, #, $, etc.).');
        return;
      }
    }

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
            MinhaFatura
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

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-outline-variant/30"></div>
          <span className="flex-shrink mx-4 text-label-sm text-on-surface-variant/60 font-medium">ou</span>
          <div className="flex-grow border-t border-outline-variant/30"></div>
        </div>

        {/* Google Login Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-2.5 px-4 bg-surface border border-outline-variant hover:bg-surface-container-low active:scale-95 disabled:opacity-50 text-on-surface rounded-lg text-label-md font-label-md transition-all shadow-sm flex items-center justify-center gap-sm cursor-pointer"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 8.79-4.53z" fill="#EA4335"/>
          </svg>
          <span>Continuar com o Google</span>
        </button>

        {/* Tab Toggle */}
        <div className="text-center pt-1">
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
