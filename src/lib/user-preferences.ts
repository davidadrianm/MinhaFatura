import { cache } from 'react';
import { prisma } from './prisma';
import { PREFERENCES_SELECT, toPreferences, type UserPreferences } from './preferences';

/** Preferências do usuário vindas do banco (uma consulta por requisição). */
export const getUserPreferences = cache(async (userId: string): Promise<UserPreferences> => {
  const row = await prisma.user.findUnique({ where: { id: userId }, select: PREFERENCES_SELECT });
  return toPreferences(row);
});
