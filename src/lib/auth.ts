import { cache } from 'react';
import type { User } from '@supabase/supabase-js';
import { ValidationError } from './validation';

export interface SessionUser {
  userId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

function toSessionUser(user: User): SessionUser {
  return {
    userId: user.id,
    email: user.email || '',
    name: user.user_metadata?.full_name || user.user_metadata?.name || 'Usuário',
    avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
  };
}

/**
 * Usuário autenticado (via cookies do Supabase), para Server Components e Route Handlers.
 * `cache` evita consultar o Supabase mais de uma vez por requisição.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user ? toSessionUser(user) : null;
  } catch {
    return null;
  }
});

/** Igual a getSessionUser, mas lança 401 (tratado por errorResponse) se não houver sessão. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ValidationError('Não autorizado', 401);
  return user;
}
