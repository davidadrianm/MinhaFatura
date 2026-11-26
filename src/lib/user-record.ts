import { isUniqueViolation } from './prisma-errors';
import { prisma } from './prisma';

export const DEFAULT_CATEGORIES = [
  { name: 'Alimentação', color: '#ef4444' },
  { name: 'Assinaturas', color: '#3b82f6' },
  { name: 'Gastos Esporádicos', color: '#f97316' },
  { name: 'Lazer', color: '#ec4899' },
  { name: 'Moradia', color: '#8b5cf6' },
  { name: 'Telecomunicação', color: '#06b6d4' },
  { name: 'Transporte', color: '#10b981' },
  { name: 'Outros', color: '#71717a' },
];

interface AuthUserLike {
  id: string;
  email?: string | null;
  user_metadata?: { full_name?: unknown; name?: unknown } | null;
}

// Evita uma consulta por navegação: guarda quais usuários (id + e-mail) já foram conferidos.
const verified = new Set<string>();

/**
 * Garante que o usuário do Supabase Auth tenha a linha correspondente em `User`
 * (o login com Google não criava) e mantém o e-mail sincronizado com o Auth.
 * Na criação, também cria as categorias padrão.
 */
export async function ensureUserRecord(authUser: AuthUserLike): Promise<void> {
  const email = (authUser.email || '').trim().toLowerCase();
  const key = `${authUser.id}:${email}`;
  if (verified.has(key)) return;

  const name =
    authUser.user_metadata?.full_name || authUser.user_metadata?.name || email.split('@')[0] || 'Usuário';

  try {
    const existing = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { id: true, email: true },
    });

    if (!existing) {
      await prisma.$transaction([
        prisma.user.create({
          data: { id: authUser.id, email, name: String(name).slice(0, 100) },
        }),
        prisma.category.createMany({
          data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId: authUser.id })),
        }),
      ]);
    } else if (email && existing.email !== email) {
      await prisma.user.update({ where: { id: authUser.id }, data: { email } });
    }

    verified.add(key);
  } catch (error) {
    // P2002: corrida entre duas requisições criando o mesmo usuário — já existe, segue.
    if (isUniqueViolation(error)) {
      verified.add(key);
      return;
    }
    console.error('Erro ao sincronizar registro do usuário:', error);
  }
}
