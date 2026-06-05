import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // Limpa o cookie deletando-o ou expirando-o imediatamente
  response.cookies.set('session-token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });

  return response;
}
