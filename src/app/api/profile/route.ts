import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, hashPassword, signToken, getSessionUser } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        theme: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuário não encontrado' }, { status: 404 });
    }

    const cardsCount = await prisma.creditCard.count({ where: { userId: session.userId } });
    const categoriesCount = await prisma.category.count({ where: { userId: session.userId } });
    const debtorsCount = await prisma.debtor.count({ where: { userId: session.userId } });
    const transactionsCount = await prisma.transaction.count({ where: { userId: session.userId } });

    return NextResponse.json({
      success: true,
      user,
      stats: {
        cards: cardsCount,
        categories: categoriesCount,
        debtors: debtorsCount,
        transactions: transactionsCount,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const { name, email, currentPassword, newPassword, theme } = await request.json();

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuário não encontrado' }, { status: 404 });
    }

    const updateData: { name?: string; email?: string; password?: string; theme?: string } = {};

    // 1. Atualização de dados pessoais
    if (name) updateData.name = name;
    if (email && email !== user.email) {
      // Validação do formato do e-mail no back-end
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return NextResponse.json(
          { success: false, error: 'Formato de e-mail inválido' },
          { status: 400 }
        );
      }

      // Verifica se o email já está em uso por outro usuário
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      if (existingUser) {
        return NextResponse.json(
          { success: false, error: 'Este e-mail já está em uso' },
          { status: 400 }
        );
      }
      updateData.email = email;
    }

    // 2. Preferência de tema
    if (theme) {
      if (!['light', 'dark', 'system'].includes(theme)) {
        return NextResponse.json(
          { success: false, error: 'Tema inválido' },
          { status: 400 }
        );
      }
      updateData.theme = theme;
    }

    let passwordUpdated = false;

    // 3. Alteração de senha
    if (currentPassword && newPassword) {
      // Validação de segurança para a nova senha no back-end
      if (newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: 'A nova senha deve ter no mínimo 6 caracteres' },
          { status: 400 }
        );
      }

      const specialCharRegex = /[^a-zA-Z0-9]/;
      if (!specialCharRegex.test(newPassword)) {
        return NextResponse.json(
          { success: false, error: 'A nova senha deve conter pelo menos um caractere especial' },
          { status: 400 }
        );
      }

      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();

      // Verifica se a senha atual está correta tentando autenticar novamente
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (verifyError) {
        return NextResponse.json(
          { success: false, error: 'Senha atual incorreta' },
          { status: 400 }
        );
      }

      // Atualiza para a nova senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        return NextResponse.json(
          { success: false, error: updateError.message },
          { status: 400 }
        );
      }

      passwordUpdated = true;
    } else if (newPassword || currentPassword) {
      return NextResponse.json(
        { success: false, error: 'Para alterar a senha, informe a senha atual e a nova senha' },
        { status: 400 }
      );
    }

    if (Object.keys(updateData).length === 0 && !passwordUpdated) {
      return NextResponse.json({ success: false, error: 'Nenhum dado enviado para atualização' }, { status: 400 });
    }

    let updatedUser = user;
    if (Object.keys(updateData).length > 0) {
      updatedUser = await prisma.user.update({
        where: { id: session.userId },
        data: updateData,
      });
    }

    const response = NextResponse.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        theme: updatedUser.theme,
        createdAt: updatedUser.createdAt,
      },
    });

    // Define o cookie de tema
    if (updatedUser.theme) {
      response.cookies.set('theme', updatedUser.theme, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365, // 1 ano
        path: '/',
      });
    }

    return response;
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const userId = session.userId;
    const { deleteTransactions, deleteDebtors, deleteCards, deleteAll } = await request.json();

    if (deleteAll) {
      // Zerar Tudo: apaga transações, faturas, devedores, cartões e categorias
      await prisma.transaction.deleteMany({ where: { userId } });
      await prisma.invoice.deleteMany({ where: { userId } });
      await prisma.debtor.deleteMany({ where: { userId } });
      await prisma.creditCard.deleteMany({ where: { userId } });
      await prisma.category.deleteMany({ where: { userId } });

      // Recria as categorias padrão
      const defaultCategories = [
        { name: 'Alimentação', color: '#ef4444' },
        { name: 'Assinaturas', color: '#3b82f6' },
        { name: 'Gastos Esporádicos', color: '#f97316' },
        { name: 'Lazer', color: '#ec4899' },
        { name: 'Moradia', color: '#8b5cf6' },
        { name: 'Telecomunicação', color: '#06b6d4' },
        { name: 'Transporte', color: '#10b981' },
        { name: 'Outros', color: '#71717a' },
      ];

      await prisma.category.createMany({
        data: defaultCategories.map((cat) => ({
          name: cat.name,
          color: cat.color,
          userId,
        })),
      });

      return NextResponse.json({ success: true, message: 'Conta resetada com sucesso!' });
    }

    // Seleção seletiva
    if (deleteCards) {
      // Deleta cartões (deleta transações e faturas vinculadas via cascade no SQLite/Prisma)
      await prisma.creditCard.deleteMany({ where: { userId } });
      // Limpa faturas remanescentes
      await prisma.invoice.deleteMany({ where: { userId } });
    } else if (deleteTransactions) {
      // Se não deletou cartões, mas quer deletar as transações:
      await prisma.transaction.deleteMany({ where: { userId } });
      await prisma.invoice.deleteMany({ where: { userId } });
    }

    if (deleteDebtors) {
      // Deleta devedores
      await prisma.debtor.deleteMany({ where: { userId } });
    }

    return NextResponse.json({ success: true, message: 'Dados apagados com sucesso!' });
  } catch (error) {
    console.error('Erro ao resetar conta:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor ao resetar conta' },
      { status: 500 }
    );
  }
}
