# Gerenciador de Cartão de Crédito

App web para controlar cartões de crédito, faturas, compras parceladas, assinaturas e gastos divididos com outras pessoas.

## Funcionalidades

- **Cartões**: dia de fechamento e vencimento, limite e limite compartilhado entre cartões (cartão principal + adicionais).
- **Transações**: à vista, parceladas (inclusive compras já em andamento, ex.: "parcela 3 de 10") e recorrentes fixas (assinaturas), com período diário, semanal, quinzenal ou mensal.
- **Faturas**: geradas automaticamente pelo dia de fechamento do cartão; status aberta/fechada/atrasada/paga.
- **Devedores**: divisão de compras com outras pessoas e controle do que cada uma já pagou.
- **Dashboard**: gasto da fatura do mês, limite disponível, gastos por categoria e histórico de 6 meses.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Prisma 5 · PostgreSQL (Supabase) · Supabase Auth (e-mail/senha e Google) · Tailwind CSS 4

## Rodando localmente

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Crie o arquivo `.env` na raiz:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   DATABASE_URL=...   # conexão pelo pooler (pgbouncer)
   DIRECT_URL=...     # conexão direta, usada pelo prisma db push
   # Opcional: fuso usado para "hoje" no servidor (padrão: America/Cuiaba)
   APP_TIMEZONE=America/Cuiaba
   ```
3. Aplique o schema no banco:
   ```bash
   npx prisma db push
   ```
4. Suba o servidor:
   ```bash
   npm run dev
   ```
   Acesse http://localhost:3000.

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Gera o cliente Prisma e o build de produção |
| `npm run lint` | ESLint |
| `npm test` | Testes automatizados (Vitest) dos cálculos de fatura, parcelas, dinheiro e validação |
| `npm run recalc` | Simula a reconciliação de parcelas e faturas com a lógica atual (não grava nada) |
| `npm run recalc -- --apply` | Aplica a reconciliação (faturas pagas nunca são alteradas) |

## Estrutura

```
prisma/schema.prisma        Modelo de dados
scripts/                    Scripts de manutenção (recalc)
src/proxy.ts                Middleware: protege páginas e APIs que exigem login
src/app/(authenticated)/    Páginas logadas (dashboard, cartões, transações, faturas...)
src/app/api/                Route Handlers (REST)
src/lib/invoice-utils.ts    Regras de fatura: datas, parcelas, recorrência, limite usado
src/lib/money.ts            Arredondamento e divisão em centavos
src/lib/validation.ts       Validação de entrada e respostas de erro
src/lib/ownership.ts        Garante que cartão/categoria/devedor pertencem ao usuário
src/lib/user-record.ts      Sincroniza o usuário do Supabase Auth com a tabela User
```

## Regras de cálculo

- **Mês de referência** de uma fatura = mês em que o ciclo de compras começa (o mês anterior ao fechamento).
- Compras feitas **no dia do fechamento** vão para a fatura seguinte; a fatura conta como fechada a partir desse dia.
- Dias de fechamento/vencimento maiores que o mês (ex.: 31 em fevereiro) usam o último dia do mês.
- Parcelas são divididas em centavos; a sobra vai para as primeiras parcelas.
- Assinaturas mantêm sempre 6 meses de parcelas futuras; elas não contam no limite usado até chegarem ao mês atual.

## Segurança

- Todas as tabelas devem ter **RLS ativado** no Supabase (o app acessa o banco pelo Prisma, que não depende das policies).
- O acesso aos dados é sempre filtrado pelo usuário autenticado no servidor.
