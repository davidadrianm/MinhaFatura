import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { cache } from 'react';

const JWT_SECRET = process.env.JWT_SECRET || 'gerenciador-cartao-secret-key-12345';

interface UserPayload {
  userId: string;
  email: string;
  name: string;
}

export function hashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function signToken(payload: UserPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): UserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Obtém o usuário autenticado a partir dos cookies da requisição.
 * Pode ser usado em API Routes ou Server Actions.
 */
export async function getAuthenticatedUser(
  req: NextRequest | Request
): Promise<UserPayload | null> {
  try {
    const { createServerClient } = await import('@supabase/ssr');
    
    // Extrai os cookies da requisição
    const cookieHeader = req.headers.get('cookie') || '';
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieHeader.split(';').map(c => c.trim()).filter(Boolean).map(c => {
              const parts = c.split('=');
              return { name: parts[0], value: parts[1] || '' };
            });
          },
          setAll() {
            // Leitura apenas nesta função utilitária
          }
        }
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return {
      userId: user.id,
      email: user.email || '',
      name: user.user_metadata?.full_name || user.user_metadata?.name || 'Usuário',
    };
  } catch (error) {
    return null;
  }
}

/**
 * Utilitário para uso direto em Server Components (lendo cookies do Next.js).
 */
export const getSessionUser = cache(async () => {
  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return {
      userId: user.id,
      email: user.email || '',
      name: user.user_metadata?.full_name || user.user_metadata?.name || 'Usuário',
    };
  } catch (error) {
    return null;
  }
});
