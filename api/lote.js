/**
 * GET /api/lote — quantas unidades da pré-venda restam.
 * Público e sem dado pessoal: só contagem, para a página mostrar escassez real
 * em vez de um número inventado.
 */
import { estadoDoLote } from './_lib/lote.js';
import { rateLimit, clientIp } from './_lib/ai.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.growx.com.br');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  // A ausência da flag fecha a oferta. Assim um deploy, fork ou ambiente novo
  // nunca reabre cobrança por acidente e a UI recebe um estado explícito.
  if (process.env.PREVENDA_SALES_ENABLED !== 'true') {
    return res.status(200).json({
      total: 100,
      vendidas: 0,
      reservadas: 0,
      restantes: 0,
      esgotado: false,
      confiavel: false,
      motivo: 'validacao_produto',
      reconciliacaoPendente: false,
    });
  }

  if (!rateLimit(`lote:${clientIp(req)}`, 60)) return res.status(429).json({ error: 'rate_limited' });

  try {
    const lote = await estadoDoLote();
    return res.status(200).json({
      total: lote.total,
      vendidas: lote.vendidas,
      restantes: lote.restantes,
      esgotado: lote.esgotado,
      // Sem confirmação dos dois provedores a página não deve anunciar número.
      confiavel: lote.confiavel,
    });
  } catch {
    return res.status(502).json({ error: 'contagem_indisponivel' });
  }
}
