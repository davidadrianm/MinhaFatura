import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import CategoriesClient from '@/components/CategoriesClient';
import { redirect } from 'next/navigation';

export const revalidate = 0; // Evita cache em desenvolvimento

export default async function CategoriesPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/');
  }

  // Busca todas as categorias do usuário e inclui a contagem de transações associadas
  const categories = await prisma.category.findMany({
    where: { userId: user.userId },
    include: {
      _count: {
        select: { transactions: true }
      }
    },
    orderBy: { name: 'asc' }
  });

  return <CategoriesClient initialCategories={categories} />;
}
