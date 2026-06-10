import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Controle de Cartão de Crédito - MinhaFatura",
  description: "Gerenciamento inteligente e premium de cartões, faturas, compras e parcelas.",
};

import { cookies } from "next/headers";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const theme = cookieStore.get('theme')?.value || 'system';
  const isDark = theme === 'dark';

  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} h-full antialiased ${isDark ? 'dark' : ''}`}
      suppressHydrationWarning
    >
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            const theme = document.cookie.split('; ').find(row => row.startsWith('theme='))?.split('=')[1] || 'system';
            if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          } catch (_) {}
        ` }} />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-background text-on-background">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
