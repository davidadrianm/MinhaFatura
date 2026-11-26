import { prisma } from './prisma';
import { ValidationError } from './validation';

/**
 * Confere que cartão, categoria e devedores pertencem ao usuário autenticado.
 * Sem isso, quem soubesse o ID do cartão de outra pessoa conseguia lançar
 * parcelas na fatura dela.
 *
 * `allowInactiveCardId`: permite um cartão arquivado (usado ao editar uma
 * transação antiga que já está nesse cartão).
 */
export async function assertOwnership(
  userId: string,
  {
    cardId,
    categoryId,
    debtorIds = [],
    allowInactiveCardId,
  }: { cardId: string; categoryId: string; debtorIds?: string[]; allowInactiveCardId?: string }
) {
  const [card, category, debtorsCount] = await Promise.all([
    prisma.creditCard.findFirst({ where: { id: cardId, userId } }),
    prisma.category.findFirst({ where: { id: categoryId, userId }, select: { id: true } }),
    debtorIds.length > 0
      ? prisma.debtor.count({ where: { id: { in: debtorIds }, userId } })
      : Promise.resolve(0),
  ]);

  if (!card || (!card.isActive && card.id !== allowInactiveCardId)) {
    throw new ValidationError('Cartão não encontrado', 404);
  }
  if (!category) {
    throw new ValidationError('Categoria não encontrada', 404);
  }
  if (debtorsCount !== debtorIds.length) {
    throw new ValidationError('Devedor não encontrado', 404);
  }

  return { card };
}
