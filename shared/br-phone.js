const DDD_BR_VALIDOS = new Set([
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '21', '22', '24', '27', '28',
  '31', '32', '33', '34', '35', '37', '38',
  '41', '42', '43', '44', '45', '46', '47', '48', '49',
  '51', '53', '54', '55',
  '61', '62', '63', '64', '65', '66', '67', '68', '69',
  '71', '73', '74', '75', '77', '79',
  '81', '82', '83', '84', '85', '86', '87', '88', '89',
  '91', '92', '93', '94', '95', '96', '97', '98', '99',
]);

const somenteDigitos = (valor) => String(valor || '').replace(/\D/g, '');

/**
 * Retorna apenas DDD + número, removendo o código do Brasil quando informado.
 * Não corta excesso de dígitos: entradas ambíguas devem falhar na validação.
 */
export function telefoneBrNacional(valor) {
  const original = String(valor || '').trim();
  let digitos = somenteDigitos(original);

  if (digitos.startsWith('0055')) {
    digitos = digitos.slice(4);
  } else if ((original.startsWith('+') || digitos.length > 11) && digitos.startsWith('55')) {
    digitos = digitos.slice(2);
  }

  // Aceita o zero de tronco ainda usado em algumas agendas brasileiras.
  if (digitos.length > 11 && digitos.startsWith('0')) digitos = digitos.slice(1);
  return digitos;
}

/** Valida DDD brasileiro e número móvel (9 dígitos) ou fixo (8 dígitos). */
export function telefoneBrValido(valor) {
  const nacional = telefoneBrNacional(valor);
  if (!DDD_BR_VALIDOS.has(nacional.slice(0, 2))) return false;
  if (/^(\d)\1+$/.test(nacional)) return false;
  if (nacional.length === 11) return nacional[2] === '9';
  if (nacional.length === 10) return /^[2-5]/.test(nacional[2]);
  return false;
}

/** Normaliza um telefone válido para o formato canônico semelhante a E.164. */
export function normalizaTelefoneBr(valor) {
  const nacional = telefoneBrNacional(valor);
  return telefoneBrValido(nacional) ? `+55${nacional}` : '';
}

/** Máscara progressiva para campos brasileiros: (41) 99999-9999. */
export function formataTelefoneBr(valor) {
  const nacional = telefoneBrNacional(valor).slice(0, 11);
  if (!nacional) return '';
  if (nacional.length < 3) return `(${nacional}`;

  const ddd = nacional.slice(0, 2);
  const numero = nacional.slice(2);
  if (numero.length <= 4) return `(${ddd}) ${numero}`;

  const corte = numero.length > 8 ? 5 : 4;
  return `(${ddd}) ${numero.slice(0, corte)}-${numero.slice(corte)}`;
}
