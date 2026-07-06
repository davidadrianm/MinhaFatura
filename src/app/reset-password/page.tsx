'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setHasSession(true);
        } else {
          setError('Link de redefinição expirou ou é inválido. Por favor, solicite a recuperação de senha novamente.');
        }
      } catch {
        setError('Erro ao verificar sessão.');
      } finally {
        setCheckingSession(false);
      }
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    const specialCharRegex = /[^a-zA-Z0-9]/;
    if (!specialCharRegex.test(password)) {
      setError('A senha deve conter pelo menos um caractere especial (ex: !, @, #, $, etc.).');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setError(error.message);
      } else {
        setSuccessMessage('Senha atualizada com sucesso! Redirecionando para o login...');
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 3000);
      }
    } catch {
      setError('Erro ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4">
        <span className="material-symbols-outlined animate-spin text-secondary text-4xl">progress_activity</span>
        <p className="text-body-md text-on-surface-variant font-medium">Verificando link de acesso...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md relative z-10 bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-8 space-y-6 shadow-[0_4px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_30px_rgba(113,42,226,0.04)] transition-shadow animate-fade-in">
      {/* Header Logo */}
      <div className="flex flex-col items-center text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-secondary-fixed/50 border border-secondary-fixed-dim flex items-center justify-center text-secondary">
          <span className="material-symbols-outlined text-[28px] font-bold">lock_reset</span>
        </div>
        <h1 className="text-3xl font-black text-primary tracking-tight">
          Nova Senha
        </h1>
        <p className="text-label-sm font-label-sm text-on-surface-variant max-w-[280px]">
          {hasSession 
            ? 'Defina sua nova senha de acesso abaixo'
            : 'Link de redefinição inválido'}
        </p>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div className="bg-tertiary-container text-on-tertiary-container text-xs px-4 py-3 rounded-lg text-center font-medium border border-tertiary/10 animate-fade-in">
          {successMessage}
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-error-container text-on-error-container text-xs px-4 py-3 rounded-lg text-center font-medium border border-error/10">
          {error}
        </div>
      )}

      {hasSession ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-label-sm font-label-sm text-on-surface-variant block">Nova Senha</label>
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

          <div className="space-y-1">
            <label className="text-label-sm font-label-sm text-on-surface-variant block">Confirmar Nova Senha</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/75 text-xl">lock</span>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                <span>Atualizar Senha</span>
                <span className="material-symbols-outlined text-[18px]">check</span>
              </>
            )}
          </button>
        </form>
      ) : (
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-label-sm font-label-sm text-secondary hover:underline transition-colors cursor-pointer"
          >
            Voltar para o Login
          </button>
        </div>
      )}

      {/* Security Info */}
      <div className="pt-4 border-t border-outline-variant/30 flex justify-center items-center gap-xs text-[10px] text-on-surface-variant opacity-60">
        <span className="material-symbols-outlined text-sm">shield</span>
        <span>Sistema protegido por criptografia de ponta a ponta</span>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen relative flex items-center justify-center bg-background px-4 overflow-hidden">
      {/* Background Decorative blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary-fixed-dim/10 rounded-full blur-[100px] pointer-events-none" />

      <Suspense fallback={
        <div className="flex flex-col items-center justify-center space-y-4 relative z-10 bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-8 shadow-[0_4px_30px_rgba(0,0,0,0.03)] w-full max-w-md">
          <span className="material-symbols-outlined animate-spin text-secondary text-4xl">progress_activity</span>
          <p className="text-body-md text-on-surface-variant font-medium">Carregando...</p>
        </div>
      }>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
