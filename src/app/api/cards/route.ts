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

    const { name, bankName, brand, lastDigits, limit, closingDay, dueDay, color, parentCardId } = await request.json();

    if (!name || !bankName || !brand || !lastDigits || !closingDay || !dueDay) {
      return NextResponse.json({ success: false, error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }

    let validatedParentCardId: string | null = null;
    let finalLimit = limit ? parseFloat(limit) : 0;

    if (parentCardId) {
      const parentCard = await prisma.creditCard.findFirst({
        where: { id: parentCardId, userId: user.userId, isActive: true },
      });
      if (!parentCard) {
        return NextResponse.json({ success: false, error: 'Cartão principal não encontrado' }, { status: 400 });
      }
      validatedParentCardId = parentCardId;
      finalLimit = parentCard.limit;
    } else if (limit === undefined || limit === null) {
      return NextResponse.json({ success: false, error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }

    const card = await prisma.creditCard.create({
      data: {
        userId: user.userId,
        name,
        bankName,
        brand,
        lastDigits: lastDigits.slice(-4), // Garante que guardamos apenas os últimos 4 dígitos
        limit: finalLimit,
        closingDay: parseInt(closingDay),
        dueDay: parseInt(dueDay),
        color: color || undefined,
        parentCardId: validatedParentCardId,
      }
    });

    return NextResponse.json({ success: true, card });
  } catch (error) {
    console.error('Erro ao criar cartão:', error);
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
  }
}
