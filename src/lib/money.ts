/**
 * Utilitários de dinheiro.
 *
 * Os valores continuam armazenados como Float no banco, mas toda escrita e toda
 * soma passa por aqui e é arredondada para centavos, evitando o acúmulo de erros
 * de ponto flutuante (ex.: 0.1 + 0.2 = 0.30000000000000004).
 */

export function toCents(value: number): number {
  return Math.round(value * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

/** Arredonda um valor para 2 casas decimais (centavos). */
export function roundMoney(value: number): number {
  return fromCents(toCents(value));
}

/** Soma uma lista de valores em centavos e devolve o total já arredondado. */
export function sumMoney(values: Iterable<number>): number {
  let cents = 0;
  for (const v of values) cents += toCents(v);
  return fromCents(cents);
}

/**
 * Divide um total em `count` parcelas, distribuindo os centavos que sobram nas
 * primeiras parcelas. `position` é o número da parcela (1-based).
 */
export function installmentShare(total: number, count: number, position: number): number {
  const sign = Math.sign(total);
  const totalCents = Math.abs(toCents(total));
  const base = Math.floor(totalCents / count);
  const remainder = totalCents % count;
  const cents = position <= remainder ? base + 1 : base;
  return fromCents(cents) * sign;
}
