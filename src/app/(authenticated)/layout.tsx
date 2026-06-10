import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import TopNavBar from '@/components/TopNavBar';
import BottomNavBar from '@/components/BottomNavBar';
import { ensureRecurringTransactions } from '@/lib/invoice-utils';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect('/');
  }

  // Garante que as transações recorrentes tenham sempre 12 meses de faturamento futuro (roda em background)
  ensureRecurringTransactions(user.userId).catch(err => console.error("Erro ao garantir transações recorrentes:", err));

  return (
    <div className="flex h-screen overflow-hidden bg-background text-on-background font-sans">
      {/* Sidebar de Navegação (Desktop Only) */}
      <Sidebar userName={user.name} userEmail={user.email} />

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden ml-0 lg:ml-[280px]">
        {/* TopNavBar */}
        <TopNavBar userName={user.name} />

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
  );
}
