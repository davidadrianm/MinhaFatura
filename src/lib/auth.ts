import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

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
  let token: string | undefined;

  if (req instanceof NextRequest) {
    token = req.cookies.get('session-token')?.value;
  } else {
    // Para Requests normais (ex: em routes)
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/session-token=([^;]+)/);
      if (match) token = match[1];
    }
  }

  if (!token) return null;
  return verifyToken(token);
}

/**
 * Utilitário para uso direto em Server Components (lendo cookies do Next.js).
 */
export async function getSessionUser() {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const token = cookieStore.get('session-token')?.value;
  if (!token) return null;
  return verifyToken(token);
}
