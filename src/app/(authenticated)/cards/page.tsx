import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import CardsClient from '@/components/CardsClient';
import { redirect } from 'next/navigation';
import { calculateUsedLimit } from '@/lib/invoice-utils';

export const revalidate = 0; // Evita cache em desenvolvimento

export default async function CardsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/');
  }

  // Busca os cartões ativos do usuário
  const cards = await prisma.creditCard.findMany({
    where: { userId: user.userId, isActive: true },
    orderBy: { createdAt: 'desc' }
  });

  // Calcula o limite utilizado real de cada cartão individualmente
  const cardsWithAdjustedInvoices = await Promise.all(
    cards.map(async (card) => {
      const usedLimit = await calculateUsedLimit(user.userId, card.id);
      return {
        ...card,
        invoices: [
          { totalAmount: usedLimit }
        ]
      };
    })
  );

  return <CardsClient initialCards={cardsWithAdjustedInvoices} />;
}
