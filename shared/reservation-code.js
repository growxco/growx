const UUID_HEX = /^[0-9a-f]{32}$/i;

/**
 * Referência curta e legível derivada do request id da reserva.
 *
 * Não é credencial e não concede acesso ao pedido. A área do cliente continua
 * protegida por e-mail, CPF/CNPJ e código de uso único enviado por e-mail.
 */
export function reservationCode(requestId) {
  const hex = String(requestId || '').trim().replaceAll('-', '');
  if (!UUID_HEX.test(hex)) return '';
  const compact = hex.slice(0, 12).toUpperCase();
  return `GX-${compact.slice(0, 4)}-${compact.slice(4, 8)}-${compact.slice(8, 12)}`;
}
