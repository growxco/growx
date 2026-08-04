/** Utilidades de CPF compartilhadas pelas funções da API. */

export const digitos = (v) => String(v || '').replace(/\D/g, '');

/** Valida CPF pelos dois dígitos verificadores. */
export function cpfValido(valor) {
  const c = digitos(valor);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  for (const [len, pos] of [[9, 10], [10, 11]]) {
    let soma = 0;
    for (let i = 0; i < len; i++) soma += Number(c[i]) * (pos - i);
    let dv = (soma * 10) % 11;
    if (dv === 10) dv = 0;
    if (dv !== Number(c[len])) return false;
  }
  return true;
}

/** ***.***.649-45 — o suficiente pro cliente reconhecer o próprio pedido. */
export function mascaraCpf(valor) {
  const c = digitos(valor);
  return c.length === 11 ? `***.***.${c.slice(6, 9)}-${c.slice(9)}` : null;
}

export const emailValido = (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v || '').trim());
