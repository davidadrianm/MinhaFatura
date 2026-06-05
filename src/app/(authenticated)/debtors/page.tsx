import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import DebtorsClient from '@/components/DebtorsClient';
import { redirect } from 'next/navigation';

export const revalidate = 0; // Evita cache em desenvolvimento

export default async function DebtorsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/');
  }

  // Busca todos os devedores do usuário logado, incluindo seus splits de parcelas
  const debtors = await prisma.debtor.findMany({
    where: { userId: user.userId },
    include: {
      installmentSplits: {
        include: {
          installment: {
            include: {
              transaction: {
                select: {
                  description: true,
                  purchaseDate: true,
                  installmentsCount: true
                }
              },
              card: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  // Mapeia os dados do Prisma para o formato esperado pelo DebtorsClient, calculando totais de forma limpa
  const mappedDebtors = debtors.map((debtor) => {
    const pendingAmount = debtor.installmentSplits
      .filter((split) => !split.paid)
      .reduce((sum, split) => sum + split.amount, 0);

    const totalAmount = debtor.installmentSplits
      .reduce((sum, split) => sum + split.amount, 0);

    const mappedInstallments = debtor.installmentSplits.map((split) => ({
      id: split.id, // ID do split para a rota de pagamento toggle
      installmentNumber: split.installment.installmentNumber,
      amount: split.installment.amount,
      dueMonth: split.installment.dueMonth,
      dueYear: split.installment.dueYear,
      status: split.installment.status,
      debtorAmount: split.amount,
      debtorPaid: split.paid,
      debtorPaidAt: split.paidAt ? split.paidAt.toISOString() : null,
      transaction: {
        description: split.installment.transaction.description,
        purchaseDate: split.installment.transaction.purchaseDate.toISOString().split('T')[0],
        installmentsCount: split.installment.transaction.installmentsCount
      },
      card: {
        name: split.installment.card.name
      }
    }));

    // Ordena as parcelas no JS de forma decrescente por vencimento
    mappedInstallments.sort((a, b) => {
      if (b.dueYear !== a.dueYear) return b.dueYear - a.dueYear;
      if (b.dueMonth !== a.dueMonth) return b.dueMonth - a.dueMonth;
      return a.installmentNumber - b.installmentNumber;
    });

    return {
      id: debtor.id,
      name: debtor.name,
      pendingAmount,
      totalAmount,
      installmentsCount: debtor.installmentSplits.length,
      installments: mappedInstallments
    };
  });

  return <DebtorsClient initialDebtors={mappedDebtors} />;
}
