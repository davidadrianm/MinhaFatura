import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import CardsClient from '@/components/CardsClient';
import { redirect } from 'next/navigation';

export const revalidate = 0; // Evita cache em desenvolvimento

export default async function CardsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/');
  }

  // Busca os cartões do usuário com faturas não pagas para calcular o limite utilizado
  const cards = await prisma.creditCard.findMany({
    where: { userId: user.userId, isActive: true },
    include: {
      invoices: {
        where: {
          status: { in: ['open', 'closed', 'overdue'] }
        },
        select: {
          totalAmount: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return <CardsClient initialCards={cards} />;
}
