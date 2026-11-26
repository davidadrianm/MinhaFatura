import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { errorResponse } from '@/lib/validation';
import { DEFAULT_CATEGORIES } from '@/lib/user-record';

export async function GET() {
  try {
    const session = await requireUser();

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
      user: {
        ...user,
        avatarUrl: session.avatarUrl,
      },
      stats: {
        cards: cardsCount,
        categories: categoriesCount,
        debtors: debtorsCount,
        transactions: transactionsCount,
      },
    });
  } catch (error) {
    return errorResponse(error, 'Erro ao buscar perfil');
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireUser();

    const { name, email, currentPassword, newPassword, theme } = await request.json();

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuário não encontrado' }, { status: 404 });
    }

    const updateData: { name?: string; theme?: string } = {};
    const messages: string[] = [];

    // 1. Nome
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
        return NextResponse.json({ success: false, error: 'Nome inválido' }, { status: 400 });
      }
      if (name.trim() !== user.name) updateData.name = name.trim();
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

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const authEmail = (session.email || '').toLowerCase();
    const wantsEmailChange = !!normalizedEmail && normalizedEmail !== authEmail;

    if (wantsEmailChange) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail) || normalizedEmail.length > 254) {
        return NextResponse.json({ success: false, error: 'Formato de e-mail inválido' }, { status: 400 });
      }
      const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existingUser && existingUser.id !== session.userId) {
        return NextResponse.json({ success: false, error: 'Este e-mail já está em uso' }, { status: 400 });
      }
    }

    const wantsPasswordChange = !!(currentPassword || newPassword);
    if (wantsPasswordChange && !(currentPassword && newPassword)) {
      return NextResponse.json(
        { success: false, error: 'Para alterar a senha, informe a senha atual e a nova senha' },
        { status: 400 }
      );
    }

    if (Object.keys(updateData).length === 0 && !wantsEmailChange && !wantsPasswordChange) {
      return NextResponse.json({ success: false, error: 'Nenhum dado enviado para atualização' }, { status: 400 });
    }

    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();

    // 3. Alteração de senha (validada com o e-mail do Supabase Auth, que é o usado no login)
    if (wantsPasswordChange) {
      if (typeof newPassword !== 'string' || newPassword.length < 6 || newPassword.length > 128) {
        return NextResponse.json(
          { success: false, error: 'A nova senha deve ter entre 6 e 128 caracteres' },
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

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: session.email,
        password: String(currentPassword),
      });

      if (verifyError) {
        return NextResponse.json(
          { success: false, error: 'Senha atual incorreta' },
          { status: 400 }
        );
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        console.error('Erro ao alterar senha:', updateError);
        return NextResponse.json(
          { success: false, error: 'Não foi possível alterar a senha. Tente novamente.' },
          { status: 400 }
        );
      }
      messages.push('Senha alterada.');
    }

    // 4. Alteração de e-mail: feita no Supabase Auth (que controla o login).
    // O Supabase envia um link de confirmação; a tabela User é sincronizada
    // automaticamente quando a troca for confirmada (ensureUserRecord).
    if (wantsEmailChange) {
      const { error: emailError } = await supabase.auth.updateUser({ email: normalizedEmail });
      if (emailError) {
        console.error('Erro ao alterar e-mail:', emailError);
        return NextResponse.json(
          { success: false, error: 'Não foi possível alterar o e-mail. Tente novamente mais tarde.' },
          { status: 400 }
        );
      }
      messages.push(`Enviamos um link de confirmação para ${normalizedEmail}. O e-mail só muda depois da confirmação.`);
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
      message: messages.length > 0 ? `Perfil atualizado. ${messages.join(' ')}` : 'Perfil atualizado com sucesso',
      emailChangePending: wantsEmailChange,
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
    return errorResponse(error, 'Erro ao atualizar perfil');
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireUser();

    const userId = session.userId;
    const { deleteTransactions, deleteDebtors, deleteCards, deleteAll } = await request.json();

    if (deleteAll) {
      // Zerar Tudo: apaga transações, faturas, devedores, cartões e categorias e recria as categorias padrão
      await prisma.$transaction([
        prisma.transaction.deleteMany({ where: { userId } }),
        prisma.invoice.deleteMany({ where: { userId } }),
        prisma.debtor.deleteMany({ where: { userId } }),
        prisma.creditCard.deleteMany({ where: { userId } }),
        prisma.category.deleteMany({ where: { userId } }),
        prisma.category.createMany({
          data: DEFAULT_CATEGORIES.map((cat) => ({ ...cat, userId })),
        }),
      ]);

      return NextResponse.json({ success: true, message: 'Conta resetada com sucesso!' });
    }

    // Seleção seletiva
    const ops = [];
    if (deleteCards) {
      // Deleta cartões (transações e parcelas vão em cascata) e as faturas remanescentes
      ops.push(prisma.creditCard.deleteMany({ where: { userId } }));
      ops.push(prisma.invoice.deleteMany({ where: { userId } }));
    } else if (deleteTransactions) {
      ops.push(prisma.transaction.deleteMany({ where: { userId } }));
      ops.push(prisma.invoice.deleteMany({ where: { userId } }));
    }
    if (deleteDebtors) {
      ops.push(prisma.debtor.deleteMany({ where: { userId } }));
    }
    if (ops.length > 0) {
      await prisma.$transaction(ops);
    }

    return NextResponse.json({ success: true, message: 'Dados apagados com sucesso!' });
  } catch (error) {
    return errorResponse(error, 'Erro ao resetar conta');
  }
}
