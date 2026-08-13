import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import TransactionsClient from '@/components/TransactionsClient';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import TransactionsSkeleton from '@/components/skeletons/TransactionsSkeleton';

export const revalidate = 0; // Evita cache em desenvolvimento

export default async function TransactionsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/');
  }

  return (
    <Suspense fallback={<TransactionsSkeleton />}>
      <TransactionsDataWrapper userId={user.userId} />
    </Suspense>
  );
}

async function TransactionsDataWrapper({ userId }: { userId: string }) {
  const user = { userId };

  // Busca os cartões, categorias, devedores e transações em paralelo para reduzir latência
  const [cards, categories, debtors, transactions] = await Promise.all([
    prisma.creditCard.findMany({
      where: { userId: user.userId, isActive: true },
      select: {
        id: true,
        name: true,
        bankName: true,
        color: true
      },
      orderBy: { name: 'asc' }
    }),
    prisma.category.findMany({
      where: { userId: user.userId },
      select: {
        id: true,
        name: true,
        color: true
      },
      orderBy: { name: 'asc' }
    }),
    prisma.debtor.findMany({
      where: { userId: user.userId },
      select: {
        id: true,
        name: true
      },
      orderBy: { name: 'asc' }
    }),
    prisma.transaction.findMany({
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
    })
  ]);

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
