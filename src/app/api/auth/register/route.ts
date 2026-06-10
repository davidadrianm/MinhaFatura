import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Preencha todos os campos obrigatórios' },
        { status: 400 }
      );
    }

    // Validação de formato de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { success: false, error: 'Formato de e-mail inválido' },
        { status: 400 }
      );
    }

    // Validação de segurança da senha
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'A senha deve ter no mínimo 6 caracteres' },
        { status: 400 }
      );
    }

    const specialCharRegex = /[^a-zA-Z0-9]/;
    if (!specialCharRegex.test(password)) {
      return NextResponse.json(
        { success: false, error: 'A senha deve conter pelo menos um caractere especial' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user?.id,
        email: data.user?.email,
        name: data.user?.user_metadata?.name || name,
      },
    });
  } catch (error: any) {
    console.error('Erro no registro:', error);
    return NextResponse.json(
      { success: false, error: 'Ocorreu um erro interno do servidor' },
      { status: 500 }
    );
  }
}
