import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import TransactionsClient from '@/components/TransactionsClient';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

export const revalidate = 0; // Evita cache em desenvolvimento

export default async function TransactionsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/');
  }

  // Busca os cartões do usuário para o formulário e filtro
  const cards = await prisma.creditCard.findMany({
    where: { userId: user.userId, isActive: true },
    select: {
      id: true,
      name: true,
      bankName: true,
      color: true
    },
    orderBy: { name: 'asc' }
  });

  // Busca as categorias do usuário para o formulário e filtro
  const categories = await prisma.category.findMany({
    where: { userId: user.userId },
    select: {
      id: true,
      name: true,
      color: true
    },
    orderBy: { name: 'asc' }
  });

  // Busca os devedores do usuário para o formulário
  const debtors = await prisma.debtor.findMany({
    where: { userId: user.userId },
    select: {
      id: true,
      name: true
    },
    orderBy: { name: 'asc' }
  });

  // Busca as transações com suas parcelas, cartões e categorias
  const transactions = await prisma.transaction.findMany({
    where: { userId: user.userId },
    include: {
      card: {
        select: {
          id: true,
          name: true,
          bankName: true,
          color: true
        }
      },
      category: {
        select: {
          id: true,
          name: true,
          color: true
        }
      },
      splits: {
        select: {
          id: true,
          amount: true,
          debtor: {
            select: {
              id: true,
              name: true
            }
          }
        }
      },
      installments: {
        select: {
          id: true,
          installmentNumber: true,
          amount: true,
          dueMonth: true,
          dueYear: true,
          status: true,
          splits: {
            select: {
              id: true,
              amount: true,
              paid: true,
              debtor: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: {
      purchaseDate: 'desc'
    }
  });

  // Faz o mapeamento de datas para strings ISO simples para passar aos componentes cliente de forma limpa
  const mappedTransactions = transactions.map((tx) => ({
    ...tx,
    purchaseDate: tx.purchaseDate.toISOString().split('T')[0],
  }));

  return (
    <Suspense fallback={null}>
      <TransactionsClient
        initialTransactions={mappedTransactions}
        cards={cards}
        categories={categories}
        debtors={debtors}
      />
    </Suspense>
  );
}
