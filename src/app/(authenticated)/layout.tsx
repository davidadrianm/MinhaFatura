import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import TopNavBar from '@/components/TopNavBar';
import BottomNavBar from '@/components/BottomNavBar';
import { ensureRecurringTransactions } from '@/lib/invoice-utils';
import { DialogProvider } from '@/components/DialogProvider';
import { ensureUserRecord } from '@/lib/user-record';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect('/');
  }

  // Garante a linha em User (contas antigas do Google não tinham) e mantém o e-mail sincronizado.
  await ensureUserRecord({ id: user.userId, email: user.email, user_metadata: { name: user.name } });

  // Garante 6 meses de parcelas futuras nas recorrências fixas (limitado a 1x por hora por usuário).
  try {
    await ensureRecurringTransactions(user.userId);
  } catch (err) {
    console.error('Erro ao garantir transações recorrentes:', err);
  }

  return (
    <DialogProvider>
      <div className="flex h-screen overflow-hidden bg-background text-on-background font-sans">
        {/* Sidebar de Navegação (Desktop Only) */}
        <Sidebar userName={user.name} userEmail={user.email} userAvatar={user.avatarUrl} />

        {/* Conteúdo Principal */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden ml-0 lg:ml-[280px]">
          {/* TopNavBar */}
          <TopNavBar userName={user.name} userAvatar={user.avatarUrl} />

          {/* Scrollable Canvas */}
          <main className="flex-1 overflow-y-auto p-grid-margin pb-28 lg:pb-grid-margin bg-background">
            <div className="max-w-[1600px] mx-auto w-full animate-fade-in">
              {children}
            </div>
          </main>

          {/* BottomNavBar (Mobile Only) */}
          <BottomNavBar />
        </div>
      </div>
    </DialogProvider>
  );
}
