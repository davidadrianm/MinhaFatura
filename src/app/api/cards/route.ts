import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { parseCardInput } from '@/lib/card-input';
import { errorResponse, ValidationError } from '@/lib/validation';

export async function GET() {
  try {
    const user = await requireUser();

    const cards = await prisma.creditCard.findMany({
      where: { userId: user.userId, isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, cards });
  } catch (error) {
    return errorResponse(error, 'Erro ao buscar cartões');
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();

    const input = parseCardInput(await request.json());
    let finalLimit = input.limit ?? 0;

    if (input.parentCardId) {
      const parentCard = await prisma.creditCard.findFirst({
        where: { id: input.parentCardId, userId: user.userId, isActive: true },
      });
      if (!parentCard) {
        throw new ValidationError('Cartão principal não encontrado');
      }
      // Não permite hierarquia em dois níveis (igual à edição).
      if (parentCard.parentCardId) {
        throw new ValidationError('O cartão principal selecionado já compartilha o limite de outro cartão');
      }
      finalLimit = parentCard.limit;
    }

    const card = await prisma.creditCard.create({
      data: {
        userId: user.userId,
        name: input.name,
        bankName: input.bankName,
        brand: input.brand,
        lastDigits: input.lastDigits,
        limit: finalLimit,
        closingDay: input.closingDay,
        dueDay: input.dueDay,
        color: input.color,
        parentCardId: input.parentCardId,
      }
    });

    return NextResponse.json({ success: true, card });
  } catch (error) {
    return errorResponse(error, 'Erro ao criar cartão');
  }
}
