import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const cards = await prisma.creditCard.findMany({
      where: { userId: user.userId, isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, cards });
  } catch (error) {
    console.error('Erro ao buscar cartões:', error);
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const { name, bankName, brand, lastDigits, limit, closingDay, dueDay, color } = await request.json();

    if (!name || !bankName || !brand || !lastDigits || !limit || !closingDay || !dueDay) {
      return NextResponse.json({ success: false, error: 'Preencha todos os campos' }, { status: 400 });
    }

    const card = await prisma.creditCard.create({
      data: {
        userId: user.userId,
        name,
        bankName,
        brand,
        lastDigits: lastDigits.slice(-4), // Garante que guardamos apenas os últimos 4 dígitos
        limit: parseFloat(limit),
        closingDay: parseInt(closingDay),
        dueDay: parseInt(dueDay),
        color: color || undefined,
      }
    });

    return NextResponse.json({ success: true, card });
  } catch (error) {
    console.error('Erro ao criar cartão:', error);
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
  }
}
