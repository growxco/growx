/** Utilidades de CPF do lado do cliente (a API valida tudo de novo). */

export const digitos = (v) => String(v || '').replace(/\D/g, '');

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

/** Formata enquanto digita: 060.622.649-45 */
export function formataCpf(valor) {
  return digitos(valor).slice(0, 11)
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

export const emailValido = (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v || '').trim());
export const nomeCompleto = (v) => String(v || '').trim().split(/\s+/).filter(Boolean).length >= 2;
