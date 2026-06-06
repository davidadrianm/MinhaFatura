'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface Stats {
  cards: number;
  categories: number;
  debtors: number;
  transactions: number;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'security' | 'reset'>('info');

  // Form states for profile info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoError, setInfoError] = useState('');
  const [infoSuccess, setInfoSuccess] = useState('');

  // Form states for password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  // States for account resetting
  const [deleteTransactions, setDeleteTransactions] = useState(false);
  const [deleteDebtors, setDeleteDebtors] = useState(false);
  const [deleteCards, setDeleteCards] = useState(false);
  const [deleteAll, setDeleteAll] = useState(false);
  const [confirmWord, setConfirmWord] = useState('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const router = useRouter();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile');
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setStats(data.stats);
        setName(data.user.name);
        setEmail(data.user.email);
      } else {
        console.error('Erro ao buscar perfil:', data.error);
      }
    } catch (err) {
      console.error('Erro de conexão ao buscar perfil:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfoLoading(true);
    setInfoError('');
    setInfoSuccess('');

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setInfoError(data.error || 'Erro ao atualizar dados pessoais.');
      } else {
        setInfoSuccess('Dados pessoais atualizados com sucesso!');
        setUser(data.user);
        router.refresh(); // Refresh layout to show new initials/name in NavBars
      }
    } catch (err) {
      setInfoError('Erro de conexão com o servidor.');
    } finally {
      setInfoLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassLoading(true);
    setPassError('');
    setPassSuccess('');

    if (newPassword !== confirmPassword) {
      setPassError('A nova senha e a confirmação de senha não coincidem.');
      setPassLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setPassError(data.error || 'Erro ao alterar a senha.');
      } else {
        setPassSuccess('Senha atualizada com sucesso!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setPassError('Erro de conexão com o servidor.');
    } finally {
      setPassLoading(false);
    }
  };

  const handleResetData = async () => {
    if (confirmWord !== 'ZERAR') {
      setResetError('Por favor, digite a palavra ZERAR para confirmar.');
      return;
    }

    setResetLoading(true);
    setResetError('');
    setResetSuccess('');

    try {
      const res = await fetch('/api/profile', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deleteTransactions,
          deleteDebtors,
          deleteCards,
          deleteAll,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setResetError(data.error || 'Erro ao deletar dados da conta.');
      } else {
        setResetSuccess(data.message || 'Dados excluídos com sucesso!');
        setIsResetModalOpen(false);
        setConfirmWord('');
        setDeleteTransactions(false);
        setDeleteDebtors(false);
        setDeleteCards(false);
        setDeleteAll(false);
        
        // Atualiza os dados exibidos no perfil
        await fetchProfile();
        router.refresh();
      }
    } catch (err) {
      setResetError('Erro de conexão ao tentar apagar dados.');
    } finally {
      setResetLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-md animate-pulse">
        <span className="material-symbols-outlined text-[48px] animate-spin text-secondary">progress_activity</span>
        <p className="text-body-md font-body-md text-on-surface-variant font-medium">Carregando perfil...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-error-container text-on-error-container p-lg rounded-xl border border-error/15 text-center flex flex-col items-center gap-sm max-w-md mx-auto">
        <span className="material-symbols-outlined text-[36px]">error</span>
        <h3 className="text-headline-sm font-bold">Erro ao Carregar Perfil</h3>
        <p className="text-body-md">Não foi possível carregar as informações do usuário logado.</p>
        <button onClick={fetchProfile} className="mt-2 px-md py-sm bg-error text-on-error rounded-lg font-bold hover:opacity-90">Tentar Novamente</button>
      </div>
    );
  }

  const userInitials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'US';

  const memberSince = new Date(user.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-md items-start">
      
      {/* Coluna da Esquerda: Resumo do Usuário */}
      <section className="col-span-1 bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-lg space-y-lg shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        
        {/* Foto / Iniciais & Info Principal */}
        <div className="flex flex-col items-center text-center space-y-sm pb-lg border-b border-outline-variant/20">
          <div className="w-24 h-24 rounded-full bg-secondary-fixed/50 border-2 border-secondary/20 flex items-center justify-center font-bold text-headline-lg text-secondary select-none shadow-md">
            {userInitials}
          </div>
          <div>
            <h3 className="text-headline-sm font-bold text-on-surface">{user.name}</h3>
            <p className="text-body-md text-on-surface-variant font-medium">{user.email}</p>
          </div>
          <span className="inline-flex items-center gap-xs px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-[10px] font-bold select-none border border-outline-variant/20 mt-1">
            <span className="material-symbols-outlined text-[14px]">calendar_today</span>
            Membro desde {memberSince}
          </span>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="space-y-sm">
          <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider select-none">Resumo da Conta</h4>
          
          <div className="grid grid-cols-2 gap-sm">
            {/* Cartões */}
            <div className="p-md bg-surface-container-low/60 border border-outline-variant/25 rounded-xl hover:scale-[1.02] hover:bg-surface-container-low transition-all duration-200">
              <span className="material-symbols-outlined text-[20px] text-primary mb-1">credit_card</span>
              <span className="block text-headline-sm font-bold text-on-surface">{stats?.cards || 0}</span>
              <span className="block text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Cartões</span>
            </div>

            {/* Categorias */}
            <div className="p-md bg-surface-container-low/60 border border-outline-variant/25 rounded-xl hover:scale-[1.02] hover:bg-surface-container-low transition-all duration-200">
              <span className="material-symbols-outlined text-[20px] text-secondary mb-1">category</span>
              <span className="block text-headline-sm font-bold text-on-surface">{stats?.categories || 0}</span>
              <span className="block text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Categorias</span>
            </div>

            {/* Devedores */}
            <div className="p-md bg-surface-container-low/60 border border-outline-variant/25 rounded-xl hover:scale-[1.02] hover:bg-surface-container-low transition-all duration-200">
              <span className="material-symbols-outlined text-[20px] text-tertiary-container mb-1">group</span>
              <span className="block text-headline-sm font-bold text-on-surface">{stats?.debtors || 0}</span>
              <span className="block text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Devedores</span>
            </div>

            {/* Transações */}
            <div className="p-md bg-surface-container-low/60 border border-outline-variant/25 rounded-xl hover:scale-[1.02] hover:bg-surface-container-low transition-all duration-200">
              <span className="material-symbols-outlined text-[20px] text-on-surface-variant mb-1">receipt_long</span>
              <span className="block text-headline-sm font-bold text-on-surface">{stats?.transactions || 0}</span>
              <span className="block text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Compras</span>
            </div>
          </div>
        </div>

      </section>

      {/* Coluna da Direita: Formulários de Configuração */}
      <section className="col-span-1 lg:col-span-2 bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
        
        {/* Navegação de Abas */}
        <div className="flex border-b border-outline-variant/20 bg-surface-container-low">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-md px-lg text-label-md font-label-md text-center border-b-2 font-bold cursor-pointer transition-all flex items-center justify-center gap-xs select-none ${
              activeTab === 'info'
                ? 'border-secondary text-secondary bg-surface-container-lowest'
                : 'border-transparent text-on-surface-variant opacity-75 hover:bg-surface-container-high/40'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">person</span>
            Dados Pessoais
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 py-md px-lg text-label-md font-label-md text-center border-b-2 font-bold cursor-pointer transition-all flex items-center justify-center gap-xs select-none ${
              activeTab === 'security'
                ? 'border-secondary text-secondary bg-surface-container-lowest'
                : 'border-transparent text-on-surface-variant opacity-75 hover:bg-surface-container-high/40'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">shield</span>
            Segurança & Senha
          </button>
          <button
            onClick={() => setActiveTab('reset')}
            className={`flex-1 py-md px-lg text-label-md font-label-md text-center border-b-2 font-bold cursor-pointer transition-all flex items-center justify-center gap-xs select-none ${
              activeTab === 'reset'
                ? 'border-error text-error bg-surface-container-lowest'
                : 'border-transparent text-on-surface-variant opacity-75 hover:bg-surface-container-high/40'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">delete_forever</span>
            Zerar Conta
          </button>
        </div>

        {/* Área de Formulários */}
        <div className="p-lg">
          
          {/* Aba 1: Dados Pessoais */}
          {activeTab === 'info' && (
            <form onSubmit={handleUpdateInfo} className="space-y-md">
              <div className="space-y-1">
                <h3 className="text-headline-sm font-bold text-on-surface">Dados Pessoais</h3>
                <p className="text-label-md text-on-surface-variant">Mantenha seu nome e e-mail de acesso atualizados.</p>
              </div>

              {infoError && (
                <div className="bg-error-container text-on-error-container text-xs px-4 py-3 rounded-lg border border-error/10 flex items-center gap-xs animate-fade-in">
                  <span className="material-symbols-outlined text-base">error</span>
                  <span>{infoError}</span>
                </div>
              )}

              {infoSuccess && (
                <div className="bg-tertiary-container/30 text-on-tertiary-container text-xs px-4 py-3 rounded-lg border border-tertiary-container flex items-center gap-xs animate-fade-in">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  <span>{infoSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-md pt-sm">
                <div className="space-y-xs">
                  <label className="block text-label-sm font-label-sm text-on-surface-variant">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-surface border border-outline-variant text-body-md font-body-md text-on-surface rounded-lg py-sm px-md focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary shadow-sm transition-all"
                  />
                </div>

                <div className="space-y-xs">
                  <label className="block text-label-sm font-label-sm text-on-surface-variant">Endereço de E-mail</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface border border-outline-variant text-body-md font-body-md text-on-surface rounded-lg py-sm px-md focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary shadow-sm transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-md border-t border-outline-variant/10">
                <button
                  type="submit"
                  disabled={infoLoading}
                  className="px-lg py-sm bg-secondary text-on-secondary font-label-md text-label-md rounded-lg hover:opacity-90 active:scale-95 transition-all shadow-sm flex items-center gap-xs cursor-pointer"
                >
                  {infoLoading ? (
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">save</span>
                      <span>Salvar Alterações</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Aba 2: Segurança & Senha */}
          {activeTab === 'security' && (
            <form onSubmit={handleUpdatePassword} className="space-y-md">
              <div className="space-y-1">
                <h3 className="text-headline-sm font-bold text-on-surface">Alterar Senha</h3>
                <p className="text-label-md text-on-surface-variant">Por segurança, use uma senha forte que não use em outros locais.</p>
              </div>

              {passError && (
                <div className="bg-error-container text-on-error-container text-xs px-4 py-3 rounded-lg border border-error/10 flex items-center gap-xs animate-fade-in">
                  <span className="material-symbols-outlined text-base">error</span>
                  <span>{passError}</span>
                </div>
              )}

              {passSuccess && (
                <div className="bg-tertiary-container/30 text-on-tertiary-container text-xs px-4 py-3 rounded-lg border border-tertiary-container flex items-center gap-xs animate-fade-in">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  <span>{passSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-md pt-sm">
                <div className="space-y-xs">
                  <label className="block text-label-sm font-label-sm text-on-surface-variant">Senha Atual</label>
                  <input
                    type="password"
                    required
                    placeholder="Sua senha atual"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-surface border border-outline-variant text-body-md font-body-md text-on-surface rounded-lg py-sm px-md focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary shadow-sm transition-all"
                  />
                </div>

                <div className="space-y-xs">
                  <label className="block text-label-sm font-label-sm text-on-surface-variant">Nova Senha</label>
                  <input
                    type="password"
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-surface border border-outline-variant text-body-md font-body-md text-on-surface rounded-lg py-sm px-md focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary shadow-sm transition-all"
                  />
                </div>

                <div className="space-y-xs">
                  <label className="block text-label-sm font-label-sm text-on-surface-variant">Confirmar Nova Senha</label>
                  <input
                    type="password"
                    required
                    placeholder="Confirme a nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-surface border border-outline-variant text-body-md font-body-md text-on-surface rounded-lg py-sm px-md focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary shadow-sm transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-md border-t border-outline-variant/10">
                <button
                  type="submit"
                  disabled={passLoading}
                  className="px-lg py-sm bg-secondary text-on-secondary font-label-md text-label-md rounded-lg hover:opacity-90 active:scale-95 transition-all shadow-sm flex items-center gap-xs cursor-pointer"
                >
                  {passLoading ? (
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                      <span>Atualizar Senha</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Aba 3: Zerar Conta */}
          {activeTab === 'reset' && (
            <div className="space-y-md animate-fade-in">
              <div className="space-y-1">
                <h3 className="text-headline-sm font-bold text-error flex items-center gap-xs select-none">
                  <span className="material-symbols-outlined text-error">warning</span>
                  Zerar Dados da Conta
                </h3>
                <p className="text-label-md text-on-surface-variant">Escolha quais informações você deseja excluir de forma permanente do sistema.</p>
              </div>

              {resetSuccess && (
                <div className="bg-tertiary-container/30 text-on-tertiary-container text-xs px-4 py-3 rounded-lg border border-tertiary-container flex items-center gap-xs animate-fade-in">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  <span>{resetSuccess}</span>
                </div>
              )}

              {resetError && (
                <div className="bg-error-container text-on-error-container text-xs px-4 py-3 rounded-lg border border-error/10 flex items-center gap-xs animate-fade-in">
                  <span className="material-symbols-outlined text-base">error</span>
                  <span>{resetError}</span>
                </div>
              )}

              {/* Warning Banner */}
              <div className="p-md bg-error-container/10 border border-error/20 text-on-error-container rounded-xl flex items-start gap-sm select-none">
                <span className="material-symbols-outlined text-error text-[24px] shrink-0 mt-0.5">report</span>
                <div className="text-body-sm">
                  <p className="font-bold text-error">Esta é uma ação destrutiva irreversível!</p>
                  <p className="mt-xs text-on-surface-variant">Ao confirmar, os dados selecionados serão apagados permanentemente da sua conta. Histórico de faturas, parcelas, limites de cartões e devedores compartilhados serão perdidos de forma definitiva.</p>
                </div>
              </div>

              {/* Checkbox Options styled as Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md pt-sm">
                
                {/* Opção: Zerar Tudo */}
                <label className={`p-md border rounded-xl flex items-start gap-sm cursor-pointer select-none transition-all ${
                  deleteAll 
                    ? 'border-error bg-error-container/5 shadow-sm' 
                    : 'border-outline-variant/35 hover:bg-surface-container-low/40'
                }`}>
                  <input
                    type="checkbox"
                    checked={deleteAll}
                    onChange={(e) => {
                      setDeleteAll(e.target.checked);
                      if (e.target.checked) {
                        setDeleteTransactions(true);
                        setDeleteDebtors(true);
                        setDeleteCards(true);
                      } else {
                        setDeleteTransactions(false);
                        setDeleteDebtors(false);
                        setDeleteCards(false);
                      }
                    }}
                    className="mt-1 h-4.5 w-4.5 accent-error shrink-0 cursor-pointer"
                  />
                  <div>
                    <span className="block text-label-md font-bold text-on-surface">Zerar Tudo (Limpar Conta Completa)</span>
                    <span className="block text-label-sm text-on-surface-variant mt-xs">Apaga todos os cartões, transações, devedores e faturas. Restaura as categorias padrão.</span>
                  </div>
                </label>

                {/* Opção: Deletar Cartões */}
                <label className={`p-md border rounded-xl flex items-start gap-sm cursor-pointer select-none transition-all ${
                  deleteCards 
                    ? 'border-error/60 bg-error-container/5 shadow-sm' 
                    : 'border-outline-variant/35 hover:bg-surface-container-low/40'
                } ${deleteAll ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <input
                    type="checkbox"
                    disabled={deleteAll}
                    checked={deleteCards}
                    onChange={(e) => {
                      setDeleteCards(e.target.checked);
                      if (e.target.checked) {
                        setDeleteTransactions(true);
                      }
                    }}
                    className="mt-1 h-4.5 w-4.5 accent-error shrink-0 cursor-pointer"
                  />
                  <div>
                    <span className="block text-label-md font-bold text-on-surface">Deletar Cartões de Crédito</span>
                    <span className="block text-label-sm text-on-surface-variant mt-xs">Remove todos os cartões. <strong>Nota:</strong> Isso também excluirá automaticamente todas as compras associadas a eles.</span>
                  </div>
                </label>

                {/* Opção: Deletar Transações */}
                <label className={`p-md border rounded-xl flex items-start gap-sm cursor-pointer select-none transition-all ${
                  deleteTransactions 
                    ? 'border-error/60 bg-error-container/5 shadow-sm' 
                    : 'border-outline-variant/35 hover:bg-surface-container-low/40'
                } ${deleteAll || deleteCards ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <input
                    type="checkbox"
                    disabled={deleteAll || deleteCards}
                    checked={deleteTransactions}
                    onChange={(e) => setDeleteTransactions(e.target.checked)}
                    className="mt-1 h-4.5 w-4.5 accent-error shrink-0 cursor-pointer"
                  />
                  <div>
                    <span className="block text-label-md font-bold text-on-surface">Deletar Transações e Faturas</span>
                    <span className="block text-label-sm text-on-surface-variant mt-xs">Apaga todas as compras registradas, faturas e parcelas. Cartões e devedores serão mantidos.</span>
                  </div>
                </label>

                {/* Opção: Deletar Devedores */}
                <label className={`p-md border rounded-xl flex items-start gap-sm cursor-pointer select-none transition-all ${
                  deleteDebtors 
                    ? 'border-error/60 bg-error-container/5 shadow-sm' 
                    : 'border-outline-variant/35 hover:bg-surface-container-low/40'
                } ${deleteAll ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <input
                    type="checkbox"
                    disabled={deleteAll}
                    checked={deleteDebtors}
                    onChange={(e) => setDeleteDebtors(e.target.checked)}
                    className="mt-1 h-4.5 w-4.5 accent-error shrink-0 cursor-pointer"
                  />
                  <div>
                    <span className="block text-label-md font-bold text-on-surface">Deletar Gastos Compartilhados (Devedores)</span>
                    <span className="block text-label-sm text-on-surface-variant mt-xs">Remove todas as pessoas para divisão de gastos e limpa seus saldos de reembolso.</span>
                  </div>
                </label>

              </div>

              <div className="flex justify-end pt-md border-t border-outline-variant/10">
                <button
                  type="button"
                  disabled={!deleteTransactions && !deleteDebtors && !deleteCards && !deleteAll}
                  onClick={() => {
                    setResetError('');
                    setIsResetModalOpen(true);
                  }}
                  className="px-lg py-sm bg-error text-on-error disabled:opacity-30 font-label-md text-label-md rounded-lg hover:opacity-90 active:scale-95 transition-all shadow-sm flex items-center gap-xs cursor-pointer select-none font-bold"
                >
                  <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                  <span>Excluir Dados Selecionados</span>
                </button>
              </div>
            </div>
          )}

        </div>

      </section>

      {/* Modal de confirmação extra de segurança para Zerar Dados */}
      {isResetModalOpen && (
        <div className="fixed inset-0 bg-primary/45 backdrop-blur-sm z-[110] flex items-center justify-center p-md animate-fade-in select-none">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-2xl w-full max-w-[480px] p-lg space-y-md">
            
            <h3 className="text-headline-sm font-bold text-error flex items-center gap-xs whitespace-normal">
              <span className="material-symbols-outlined text-error">report_problem</span>
              Confirme a Exclusão
            </h3>
            
            <div className="space-y-sm text-body-sm text-on-surface-variant whitespace-normal">
              <p>Você selecionou excluir permanentemente:</p>
              <ul className="list-disc pl-md space-y-xs font-bold text-on-surface">
                {deleteAll && <li>Tudo (limpar conta completa e categorias padrão)</li>}
                {!deleteAll && deleteCards && <li>Todos os Cartões de Crédito (e compras vinculadas)</li>}
                {!deleteAll && !deleteCards && deleteTransactions && <li>Todas as Transações e Faturas</li>}
                {!deleteAll && deleteDebtors && <li>Todos os Devedores (gastos compartilhados)</li>}
              </ul>
              <p className="text-error font-bold mt-md">Esta ação é irreversível. Para confirmar a exclusão permanente dos dados, digite a palavra <strong className="underline select-all">ZERAR</strong> no campo abaixo:</p>
            </div>

            <div className="space-y-xs pt-xs">
              <input
                type="text"
                required
                placeholder="Digite ZERAR"
                value={confirmWord}
                onChange={(e) => setConfirmWord(e.target.value)}
                className="w-full bg-surface border border-outline-variant text-body-md font-body-md text-on-surface rounded-lg py-sm px-md focus:outline-none focus:ring-2 focus:ring-error focus:border-error shadow-sm text-center font-bold tracking-widest"
              />
            </div>

            <div className="flex justify-end gap-md pt-sm border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => {
                  setIsResetModalOpen(false);
                  setConfirmWord('');
                }}
                className="px-md py-base hover:bg-surface-container-low rounded-lg text-xs font-bold text-on-surface-variant cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={confirmWord !== 'ZERAR' || resetLoading}
                onClick={handleResetData}
                className="px-md py-base bg-error text-on-error disabled:opacity-40 rounded-lg text-xs font-bold transition-all flex items-center gap-xs cursor-pointer shadow-sm"
              >
                {resetLoading ? (
                  <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                    <span>Zerar de Vez</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
