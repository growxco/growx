/** Documento do comprador no cliente (a API valida tudo de novo). CPF ou CNPJ. */

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

export function cnpjValido(valor) {
  const c = digitos(valor);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const calc = (len) => {
    let soma = 0;
    let peso = len - 7;
    for (let i = 0; i < len; i++) {
      soma += Number(c[i]) * peso;
      peso = peso - 1 < 2 ? 9 : peso - 1;
    }
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(c[12]) && calc(13) === Number(c[13]);
}

/** Associações e grow shops compram como PJ. */
export const documentoValido = (v) => cpfValido(v) || cnpjValido(v);

/** Formata conforme o tamanho: 060.622.649-45 ou 59.183.820/0001-09 */
export function formataDocumento(valor) {
  const c = digitos(valor).slice(0, 14);
  if (c.length <= 11) {
    return c
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
  }
  return c
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export const emailValido = (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v || '').trim());
export const nomeCompleto = (v) => String(v || '').trim().split(/\s+/).filter(Boolean).length >= 2;
