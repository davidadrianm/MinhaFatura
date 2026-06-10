import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import InvoicesClient from '@/components/InvoicesClient';
import { redirect } from 'next/navigation';

export const revalidate = 0; // Evita cache em desenvolvimento

export default async function InvoicesPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/');
  }

  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-indexed (Jan = 1)
  const currentYear = now.getFullYear();

  // Busca todas as faturas e os cartões ativos em paralelo
  const [invoices, cards] = await Promise.all([
    prisma.invoice.findMany({
      where: { 
        userId: user.userId
      },
      include: {
        card: {
          select: {
            id: true,
            name: true,
            bankName: true,
            color: true
          }
        },
        installments: {
          include: {
            transaction: {
              select: {
                description: true,
                purchaseDate: true,
                category: {
                  select: {
                    name: true,
                    color: true
                  }
                }
              }
            },
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
      orderBy: [
        { referenceYear: 'asc' },
        { referenceMonth: 'asc' }
      ]
    }),
    prisma.creditCard.findMany({
      where: { userId: user.userId, isActive: true },
      select: {
        id: true,
        name: true,
        bankName: true,
        color: true
      },
      orderBy: { name: 'asc' }
    })
  ]);

  // Mapeia datas para strings ISO limpas para passar para o cliente
  const mappedInvoices = invoices.map((inv) => ({
    ...inv,
    closingDate: inv.closingDate.toISOString(),
    dueDate: inv.dueDate.toISOString(),
    paidAt: inv.paidAt ? inv.paidAt.toISOString() : null,
    installments: inv.installments.map((inst) => ({
      ...inst,
      transaction: {
        ...inst.transaction,
        purchaseDate: inst.transaction.purchaseDate.toISOString().split('T')[0]
      }
    }))
  }));

  return <InvoicesClient initialInvoices={mappedInvoices} cards={cards} />;
}
