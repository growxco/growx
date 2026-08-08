import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Plus, ShoppingCart } from 'lucide-react';
import { SEO } from '@/components/visual';
import ThemeToggle from '@/components/visual/ThemeToggle';
import { track } from '@/lib/analytics';
import { clearCheckoutOutcome, readCheckoutOutcome } from '@/lib/checkoutReturn';
import { documentoValido, emailValido, formataDocumento, nomeCompleto } from '@/lib/cpf';
import { OFERTA, brlCurto, parcelaCurta } from '@/lib/oferta';
import { PREVENDA_RELEASE } from '@/lib/prevendaRelease';
import { formataTelefoneBr, normalizaTelefoneBr, telefoneBrValido } from '../../shared/br-phone.js';
import { safeCheckoutRedirectUrl } from '../../shared/checkout-redirect.js';
import { createRequestId } from '../../shared/provider-identifiers.js';
import { buildInterestConsent } from '../../shared/interest-consent.js';
import ControllerShowcase from '@/components/prevenda/ControllerShowcase';
import ImageLightbox from '@/components/prevenda/ImageLightbox';
import TurnstileWidget from '@/components/prevenda/TurnstileWidget';

import logoGrowX from '../assets/logo-growx-oficial.png';
import fotoHero from '../assets/modulo-hero.webp';
import fotoTomadas from '../assets/modulo-tomadas.webp';
import fotoAberto from '../assets/modulo-aberto.webp';
import fotoContexto from '../assets/modulo-contexto.webp';

const WHATSAPP = 'https://wa.me/5541995494343?text=Quero%20garantir%20meu%20M%C3%B3dulo%20Grow-X%20na%20pr%C3%A9-venda';
const ENCERRAMENTO = new Date(OFERTA.checkoutFechamentoISO);
const PRECO_PIX = brlCurto(OFERTA.pixCentavos);
const PRECO_CARTAO = brlCurto(OFERTA.cartaoCentavos);
const PIX_ENABLED = PREVENDA_RELEASE.approved
  && PREVENDA_RELEASE.paymentMethods.includes('pix')
  && import.meta.env.VITE_PREVENDA_PIX_ENABLED === 'true';
const DISCLOSURES_READY = PREVENDA_RELEASE.approved
  && Boolean(PREVENDA_RELEASE.disclosuresPath)
  && Boolean(PREVENDA_RELEASE.disclosuresSha256);
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
const PRECO_PUBLICO = brlCurto(OFERTA.publicoCentavos);
const PARCELA = parcelaCurta();
const PRECO_PRINCIPAL = PIX_ENABLED ? PRECO_PIX : PRECO_CARTAO;
const ROTULO_PRECO = PIX_ENABLED ? 'no Pix' : `no cartão · ${PARCELA}`;
const RESUMO_PAGAMENTO = PIX_ENABLED
  ? `${PRECO_PIX} no Pix ou ${PARCELA} no cartão (${PRECO_CARTAO})`
  : `${PRECO_CARTAO} no cartão ou até ${PARCELA}`;
const ECONOMIA = brlCurto(
  OFERTA.publicoCentavos - (PIX_ENABLED ? OFERTA.pixCentavos : OFERTA.cartaoCentavos),
);

/* Tokens próprios preservam a landing premium nos dois temas do site. */
const BG = 'var(--prevenda-bg)';
const SURFACE = 'var(--prevenda-surface)';
const LINE = 'var(--prevenda-line)';
const GREEN = 'var(--prevenda-green)';
const MUTED = 'var(--prevenda-muted)';
const CTA_TEXT = 'var(--prevenda-cta-foreground)';
const INPUT_CLASS = 'mt-2 w-full rounded-xl border bg-transparent px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/35 focus-visible:border-[#4ade80] focus-visible:ring-2 focus-visible:ring-[#4ade80]/30';

const NAV = [
  ['O módulo', '#modulo'],
  ['Controlador', '#controlador'],
  ['GXP real', '#gxp-real'],
  ['Como funciona', '#como'],
  ['FAQ', '#faq'],
];

const RECURSOS = [
  ['01', 'Seis tomadas inteligentes', 'Luz, exaustor, umidificador e bomba — cada tomada liga e desliga por rotina ou leitura compatível.'],
  ['02', 'Fotoperíodo verificável', 'Liga/desliga por horário e, com driver DIM/PWM compatível, transições graduais de nascer e pôr do sol.'],
  ['03', 'Rega por umidade', 'Limiar do solo, validade da leitura, intervalo e limite da bomba ficam explícitos antes de ativar. Boia de nível é opcional.'],
  ['04', 'Sensores + alertas no painel', 'Temperatura, umidade e sensores de vaso aparecem com status e idade da leitura; alertas trazem causa e efeito.'],
  ['05', 'GXP Premium incluso', 'A pré-venda inclui 3 meses de GXP Premium, sem renovação automática, conforme o contrato.'],
  ['06', 'Rotina local', 'Se a nuvem cair, a central mantém a última configuração local e o app marca o estado como não confirmado.'],
];

const PASSOS = [
  ['PASSO 1', 'Você escolhe e compra', `${RESUMO_PAGAMENTO}. ${PIX_ENABLED ? 'Cartão processado pela Stripe e Pix processado pelo Mercado Pago.' : 'Pagamento processado pela Stripe. O Pix só será oferecido depois da homologação do fluxo exclusivo.'}`],
  ['PASSO 2', 'Recebe a confirmação e o código da reserva', 'O aceite do contrato fica registrado junto ao pedido. Depois da confirmação do pagamento, você recebe o comprovante e a referência da reserva por e-mail.'],
  ['PASSO 3', 'Consulta a área de status', `Produção, montagem, QA e expedição aparecem na área do cliente. Para entrar, informe e-mail e CPF/CNPJ e confirme o código de uso único enviado por e-mail. Entregas a partir de ${OFERTA.entregaBR}.`],
];

const MARCOS = [
  ['Hoje', 'Reserva confirmada', 'Pagamento aprovado e unidade registrada no lote de lançamento.'],
  ['15/09', 'Produção do lote', 'Fabricação das placas e dos gabinetes.'],
  ['20/10', 'Montagem e testes', 'Montagem final e QA unidade por unidade.'],
  ['10/11', 'Expedição', 'Embalagem e emissão da nota fiscal.'],
  [OFERTA.entregaBR.slice(0, 5), 'Entregas', 'Envio ao endereço cadastrado ou retirada no evento.'],
];

const ESPECIFICACOES = [
  ['Saídas', '6 tomadas automatizadas'],
  ['Rede', 'Wi‑Fi 2,4 GHz'],
  ['Sensores previstos', 'Solo, temperatura e umidade do ar'],
  ['Iluminação', 'Liga/desliga e DIM/PWM com driver compatível'],
  ['Sem nuvem', 'Executa localmente a última configuração'],
  ['Gate de venda', 'Tensão, corrente, carga máxima, dimensões, kit e custo total precisam estar publicados antes do pagamento'],
];

const INCLUSO = [
  'Módulo Grow-X com 6 tomadas e entradas para sensores',
  '3 meses de GXP Premium inclusos',
  'Contrato de pré-venda + área do cliente com código por e-mail e CPF/CNPJ',
  'Reembolso integral até o envio · garantia de 12 meses conforme o contrato',
];

const FAQ = [
  ['Quando eu recebo o módulo?', `As entregas começam em ${OFERTA.entregaBR}, data do lançamento oficial na ${OFERTA.evento}. Você acompanha a etapa confirmada do lote na área do cliente.`],
  ['E se eu me arrepender?', 'Você pode cancelar a qualquer momento até o envio. O reembolso integral é processado pelo mesmo meio em até 10 dias úteis da solicitação, além do prazo da instituição financeira. Depois da entrega, vale a garantia total de 12 meses.'],
  ['Como sei que meu pedido tá garantido?', 'Depois da aprovação do pagamento, a confirmação, o comprovante e a referência da reserva chegam no seu e-mail. Para consultar o andamento em growx.com.br/prevenda/pedido, informe o e-mail e o CPF/CNPJ da compra e confirme o código de uso único enviado por e-mail.'],
  ['Quais as formas de pagamento?', PIX_ENABLED
    ? `Pix (${PRECO_PIX}) ou cartão em até ${PARCELA} (${PRECO_CARTAO}), processados por Stripe e Mercado Pago.`
    : `Cartão por ${PRECO_CARTAO}, em até ${PARCELA}, processado pela Stripe. O Pix só ficará disponível depois da homologação do fluxo exclusivo.`],
  ['Como funciona o frete?', 'O contrato permite envio ao endereço cadastrado ou retirada presencial na ExpoCannabis. O custo total da modalidade escolhida será informado antes da abertura do pagamento; nenhuma cobrança será criada enquanto essa condição não estiver publicada.'],
  ['Preciso entender de eletrônica e automação?', 'A configuração prevista é guiada e termina com as saídas desligadas. A instalação elétrica, a tensão e a carga de cada equipamento precisam respeitar o manual final.'],
  ['O que está pronto e o que é protótipo?', 'As capturas identificadas como GXP hoje são do sistema real. As telas do controlador vêm do protótipo UX/UI baseado no firmware v0.6.0; irrigação por agenda, push e atualização OTA aparecem no PDF como recursos futuros.'],
  ['Serve para o meu setup?', 'A central prevê 6 tomadas, entradas para sensores e Wi‑Fi 2,4 GHz. Tensão, carga máxima por tomada, dimensões e composição final do kit serão publicadas antes da abertura do pagamento, para você decidir com todas as características essenciais disponíveis.'],
];

const PRODUCT_LD = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Módulo Grow-X',
  description:
    'Central de automação para cultivo indoor: 6 tomadas inteligentes, fotoperíodo, irrigação por umidade do solo, sensores, alertas e app GXP. Transições graduais exigem driver DIM/PWM compatível.',
  sku: 'GX-MODULO-PREVENDA',
  brand: { '@type': 'Brand', name: 'Grow-X' },
  manufacturer: { '@type': 'Organization', name: 'Grow-X Co.' },
  image: 'https://www.growx.com.br/og-prevenda-v2.jpg',
  offers: [
    ...(PIX_ENABLED ? [{ '@type': 'Offer', name: 'Pré-venda · Pix', price: (OFERTA.pixCentavos / 100).toFixed(2), priceCurrency: 'BRL', availability: 'https://schema.org/PreOrder', priceValidUntil: OFERTA.encerramentoISO, url: 'https://www.growx.com.br/prevenda', seller: { '@type': 'Organization', name: 'Grow-X Co.' } }] : []),
    { '@type': 'Offer', name: 'Pré-venda · cartão em até 12x', price: (OFERTA.cartaoCentavos / 100).toFixed(2), priceCurrency: 'BRL', availability: 'https://schema.org/PreOrder', priceValidUntil: OFERTA.encerramentoISO, url: 'https://www.growx.com.br/prevenda', seller: { '@type': 'Organization', name: 'Grow-X Co.' } },
  ],
  additionalProperty: [
    { '@type': 'PropertyValue', name: 'Dimming', value: 'Requer driver DIM/PWM compatível' },
  ],
};

function useDiasRestantes() {
  const [dias, setDias] = useState(() => Math.ceil((ENCERRAMENTO - Date.now()) / 86400000));
  useEffect(() => {
    const t = setInterval(() => setDias(Math.ceil((ENCERRAMENTO - Date.now()) / 86400000)), 60000);
    return () => clearInterval(t);
  }, []);
  return dias > 0 ? dias : 0;
}

function useCheckout() {
  const [loading, setLoading] = useState(null);
  const [erro, setErro] = useState(null);
  const requestIds = useRef({});

  // Ao mandar o comprador pro provedor a gente deixa o botão em "Abrindo…".
  // Se ele voltar (botão voltar do navegador), a página volta do bfcache com
  // esse estado congelado e os dois botões ficam travados pra sempre.
  useEffect(() => {
    const destravar = () => { setLoading(null); setErro(null); };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') destravar();
    };
    window.addEventListener('pageshow', destravar);
    window.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pageshow', destravar);
      window.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const pagar = async (metodo, comprador) => {
    if (loading) return;
    const requestId = requestIds.current[metodo] || createRequestId();
    if (!requestId) {
      setErro('Este navegador não oferece geração segura de identificadores. Atualize-o ou fale com o atendimento.');
      return;
    }
    requestIds.current[metodo] = requestId;
    setLoading(metodo);
    setErro(null);
    track('begin_checkout', { method: metodo, value: metodo === 'pix' ? 2800 : 3000, currency: 'BRL', page: '/prevenda' });
    try {
      const r = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: metodo, requestId, ...comprador }),
      });
      const data = await r.json().catch(() => null);
      if (r.ok && data?.url) {
        const redirectUrl = safeCheckoutRedirectUrl(data.url);
        if (redirectUrl) {
          window.location.assign(redirectUrl);
          return;
        }
      }
      track('checkout_error', { method: metodo, code: data?.error || r.status, page: '/prevenda' });
      const mensagens = {
        lote_esgotado: `As ${data?.total || OFERTA.loteTotal} unidades da pré-venda acabaram. Entre na lista do próximo lote.`,
        oferta_encerrada: `A pré-venda encerrou em ${OFERTA.encerramentoBR}. Entre na lista para o próximo lote.`,
        capacidade_indisponivel: 'Reservas pausadas por segurança enquanto confirmamos a capacidade do lote. Tente novamente em alguns minutos.',
        inventory_not_configured: 'Reservas temporariamente indisponíveis. O time já foi avisado.',
        reserva_em_processamento: 'Sua tentativa anterior ainda está sendo processada. Aguarde alguns segundos e tente de novo.',
        reserva_expirada: 'Sua reserva anterior expirou. Tente novamente para abrir uma nova janela de pagamento.',
        pedido_ja_confirmado: 'Este pedido já foi confirmado. Consulte o status na área do cliente.',
        comprador_ja_reservado: 'Já existe uma reserva ativa ou paga para este CPF/CNPJ. Consulte a área do cliente ou fale com o atendimento.',
        muitas_reservas: 'O limite de reservas deste acesso foi atingido. Aguarde a janela atual terminar ou fale com o atendimento.',
        vendas_pausadas: 'A cobrança está pausada até a publicação da ficha elétrica, composição do kit e custo total da modalidade de entrega.',
        release_nao_aprovado: 'A versão final da oferta ainda não tem a aprovação auditável exigida para abrir cobranças.',
        pix_em_homologacao: 'O Pix permanece indisponível até o fluxo exclusivo ser homologado. Use cartão quando a pré-venda abrir.',
        verificacao_seguranca_invalida: 'A verificação de segurança expirou ou já foi usada. Conclua novamente e tente outra vez.',
        verificacao_seguranca_indisponivel: 'A verificação de segurança está indisponível. Nenhuma reserva será aberta agora.',
        reconciliacao_financeira_pendente: 'Reservas pausadas enquanto confirmamos o estado financeiro do lote anterior. Nenhuma cobrança será aberta agora.',
        provider_indisponivel: 'O provedor de pagamento não respondeu com segurança. Nenhuma nova vaga será aberta até a reconciliação.',
        telefone_invalido: 'Informe um WhatsApp brasileiro válido, com DDD.',
      };
      if (data?.error === 'reserva_expirada') delete requestIds.current[metodo];
      setErro(mensagens[data?.error] || 'Não conseguimos abrir o checkout agora. Tenta de novo — ou fecha direto no WhatsApp.');
    } catch {
      setErro('Falha de conexão. Tenta de novo — ou fecha direto no WhatsApp.');
    }
    setLoading(null);
  };

  return { loading, erro, pagar };
}

/* ---------------- blocos reutilizados ---------------- */

function Pill({ children, tone = 'line' }) {
  const styles = {
    green: { background: 'rgba(74,222,128,0.10)', borderColor: 'rgba(74,222,128,0.30)', color: GREEN },
    line: { background: 'transparent', borderColor: LINE, color: MUTED },
    amber: { background: 'rgba(245,181,68,0.08)', borderColor: 'rgba(245,181,68,0.32)', color: 'var(--prevenda-warning)' },
  }[tone];
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-[0.7rem] uppercase tracking-[0.14em]"
      style={styles}
    >
      {children}
    </span>
  );
}

function Erro({ erro }) {
  if (!erro) return null;
  return (
    <p role="alert" aria-live="assertive" className="mt-4 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'rgba(245,181,68,0.32)', background: 'rgba(245,181,68,0.08)', color: 'var(--prevenda-warning-text)' }}>
      {erro}{' '}
      <a href={WHATSAPP} target="_blank" rel="noreferrer noopener" className="font-semibold underline underline-offset-2" style={{ color: GREEN }}>
        Chamar no WhatsApp
      </a>
    </p>
  );
}

function EscolhaPagamento({ metodo, onChange, loading, disabled = false }) {
  const opcoes = [
    ...(PIX_ENABLED ? [{
      id: 'pix',
      titulo: 'Pix',
      preco: PRECO_PIX,
      detalhe: 'à vista · Mercado Pago',
    }] : []),
    {
      id: 'cartao',
      titulo: 'Cartão',
      preco: PRECO_CARTAO,
      detalhe: `até ${PARCELA} · Stripe`,
    },
  ];

  return (
    <fieldset className="mt-5">
      <legend className="font-mono text-[0.65rem] uppercase tracking-[0.14em]" style={{ color: MUTED }}>
        Escolha a forma de pagamento
      </legend>
      <div className={`mt-3 grid gap-3 ${PIX_ENABLED ? 'sm:grid-cols-2' : ''}`}>
        {opcoes.map((opcao) => {
          const selecionada = metodo === opcao.id;
          return (
            <label
              key={opcao.id}
              className="flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition hover:bg-white/[0.04]"
              style={{
                borderColor: selecionada ? 'rgba(74,222,128,0.65)' : LINE,
                background: selecionada ? 'rgba(74,222,128,0.08)' : 'transparent',
              }}
            >
              <input
                type="radio"
                name="forma-pagamento"
                value={opcao.id}
                checked={selecionada}
                onChange={() => onChange(opcao.id)}
                disabled={!!loading}
                className="mt-1 size-4 shrink-0 accent-[#4ade80] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80]"
              />
              <span className="min-w-0">
                <span className="block text-sm font-bold text-white">{opcao.titulo}</span>
                <span className="mt-1 block text-xl font-extrabold text-white">{opcao.preco}</span>
                <span className="mt-1 block text-xs" style={{ color: MUTED }}>{opcao.detalhe}</span>
              </span>
            </label>
          );
        })}
      </div>
      <button
        type="submit"
        disabled={!!loading || disabled}
        className="mt-4 inline-flex w-full items-center justify-center rounded-xl px-6 py-4 text-[0.95rem] font-bold transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80] focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
        style={{ background: GREEN, color: CTA_TEXT }}
      >
        {loading
          ? 'Abrindo checkout…'
          : metodo === 'pix'
            ? `Comprar no Pix — ${PRECO_PIX}`
            : `Comprar no cartão — ${PRECO_CARTAO}`}
      </button>
    </fieldset>
  );
}

function Nav({ compraDisponivel, ctaHref, ctaLabel, ctaLabelMobile }) {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <nav
      className="fixed inset-x-0 top-0 z-50 transition-colors duration-300"
      style={solid ? { background: 'var(--prevenda-nav)', backdropFilter: 'blur(14px)', borderBottom: `1px solid ${LINE}` } : { background: 'transparent' }}
    >
      <div className="mx-auto flex h-[72px] w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2" aria-label="Grow-X — início">
          <img src={logoGrowX} alt="Grow-X" className="h-7 w-auto" />
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          {NAV.map(([label, href]) => (
            <a key={href} href={href} className="text-sm text-white/70 transition hover:text-white">{label}</a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/prevenda/pedido"
            className="hidden rounded-lg px-3 py-2 text-sm font-semibold sm:inline-flex"
            style={{ color: MUTED }}
          >
            Meu pedido
          </Link>
          <ThemeToggle className="prevenda-theme-toggle size-10 shrink-0" />
          <a
            href={ctaHref}
            onClick={() => track('click_cta_prevenda', { placement: 'nav', page: '/prevenda' })}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80] sm:px-5"
            style={{ background: GREEN, color: CTA_TEXT }}
          >
            {compraDisponivel && <ShoppingCart aria-hidden="true" size={16} />}
            <span className="sm:hidden">{ctaLabelMobile}</span>
            <span className="hidden sm:inline">{ctaLabel}</span>
          </a>
        </div>
      </div>
    </nav>
  );
}

function BarraFixa({ ctaHref, ctaLabel }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 760);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!show) return null;
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 px-4 py-3"
      style={{
        bottom: 'var(--growx-cookie-offset, 0px)',
        background: 'var(--prevenda-nav)',
        backdropFilter: 'blur(14px)',
        borderTop: `1px solid ${LINE}`,
        paddingBottom: 'max(.75rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] whitespace-nowrap" style={{ color: MUTED }}>Entrega {OFERTA.entregaBR.slice(0, 5)}</p>
          <p className="text-sm font-bold text-white">
            <span style={{ color: GREEN }}>{PRECO_PRINCIPAL}</span>{' '}
            <span style={{ color: MUTED }}>{PIX_ENABLED ? 'no Pix' : 'no cartão'}</span>
            <span className="hidden sm:inline" style={{ color: MUTED }}>
              {PIX_ENABLED ? ` · ou ${PARCELA}` : ` · ${PARCELA}`}
            </span>
          </p>
        </div>
        <a
          href={ctaHref}
          onClick={() => track('click_cta_prevenda', { placement: 'sticky', page: '/prevenda' })}
          className="shrink-0 rounded-xl px-5 py-3 text-sm font-bold transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80]"
          style={{ background: GREEN, color: CTA_TEXT }}
        >
          {ctaLabel}
        </a>
      </div>
    </div>
  );
}

function ListaEspera({ purchaseHref = '#reservar', purchaseLabel = 'Voltar à compra' }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [erros, setErros] = useState({});
  const [aviso, setAviso] = useState('');
  const [estado, setEstado] = useState('idle'); // idle | enviando | ok | erro
  const refs = useRef({});

  const enviar = async (e) => {
    e.preventDefault();
    if (estado === 'enviando') return;

    const telefoneCanonico = normalizaTelefoneBr(whatsapp);
    const falhas = {
      nome: !nomeCompleto(nome),
      email: !emailValido(email),
      whatsapp: !telefoneCanonico,
    };
    const primeiraFalha = Object.entries(falhas).find(([, invalido]) => invalido)?.[0];

    setErros(falhas);
    if (primeiraFalha) {
      setAviso({
        nome: 'Informe seu nome completo (nome e sobrenome).',
        email: 'Informe um e-mail válido.',
        whatsapp: 'Informe um WhatsApp válido, com DDD.',
      }[primeiraFalha]);
      setEstado('idle');
      requestAnimationFrame(() => refs.current[primeiraFalha]?.focus());
      return;
    }

    setAviso('');
    setEstado('enviando');
    try {
      const r = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nome.trim(),
          email: email.trim().toLowerCase(),
          phone: telefoneCanonico,
          message: 'Interesse na lista da pré-venda do Módulo Grow-X.',
          _form: 'prevenda-lista',
          _segment: 'cultivo',
          _source: 'prevenda',
          _path: '/prevenda',
          consent: buildInterestConsent(),
        }),
      });
      if (!r.ok) throw new Error('falhou');
      track('lead', { segment: 'cultivo', source: 'prevenda-lista', page: '/prevenda' });
      setEstado('ok');
    } catch {
      setEstado('erro');
      setAviso('Não conseguimos registrar agora. Tente de novo ou fale com o time no WhatsApp.');
    }
  };

  if (estado === 'ok') {
    return (
      <div className="rounded-2xl border p-6" style={{ borderColor: 'rgba(74,222,128,0.30)', background: 'rgba(74,222,128,0.07)' }}>
        <p className="text-lg font-bold text-white">Interesse cadastrado.</p>
        <p className="mt-1 text-sm" style={{ color: MUTED }}>Te chamamos antes do preço subir.</p>
        <a
          href={purchaseHref}
          onClick={() => track('click_cta_prevenda', { placement: 'interest-success', page: '/prevenda' })}
          className="mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold"
          style={{ background: GREEN, color: CTA_TEXT }}
        >
          <ShoppingCart aria-hidden="true" size={16} />
          {purchaseLabel}
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} noValidate className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-semibold text-white" htmlFor="lista-nome">
        Nome completo
        <input
          ref={(node) => { refs.current.nome = node; }}
          id="lista-nome" type="text" value={nome}
          onChange={(e) => {
            setNome(e.target.value);
            setErros((current) => ({ ...current, nome: false }));
          }}
          placeholder="Nome e sobrenome" autoComplete="name" required
          aria-invalid={erros.nome || undefined} aria-describedby="lista-erro"
          className={INPUT_CLASS}
          style={{ borderColor: erros.nome ? 'rgba(245,181,68,0.6)' : LINE }}
        />
      </label>
      <label className="text-sm font-semibold text-white" htmlFor="lista-email">
        E-mail
        <input
          ref={(node) => { refs.current.email = node; }}
          id="lista-email" type="email" value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErros((current) => ({ ...current, email: false }));
          }}
          placeholder="voce@exemplo.com" autoComplete="email" required
          aria-invalid={erros.email || undefined} aria-describedby="lista-erro"
          className={INPUT_CLASS}
          style={{ borderColor: erros.email ? 'rgba(245,181,68,0.6)' : LINE }}
        />
      </label>
      <label className="text-sm font-semibold text-white" htmlFor="lista-whatsapp">
        WhatsApp com DDD
        <input
          ref={(node) => { refs.current.whatsapp = node; }}
          id="lista-whatsapp" type="tel" inputMode="tel" value={whatsapp}
          onChange={(e) => {
            setWhatsapp(formataTelefoneBr(e.target.value));
            setErros((current) => ({ ...current, whatsapp: false }));
          }}
          placeholder="(41) 99999-9999" autoComplete="tel" required
          aria-invalid={erros.whatsapp || undefined} aria-describedby="lista-erro"
          className={INPUT_CLASS}
          style={{ borderColor: erros.whatsapp ? 'rgba(245,181,68,0.6)' : LINE }}
        />
      </label>
      <button
        type="submit" disabled={estado === 'enviando'}
        className="mt-7 rounded-xl px-6 py-3.5 text-sm font-bold transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80] disabled:opacity-60"
        style={{ background: GREEN, color: CTA_TEXT }}
      >
        {estado === 'enviando' ? 'Enviando…' : 'Enviar interesse'}
      </button>
      <p id="lista-erro" role={aviso ? 'alert' : undefined} aria-live="assertive" className="min-h-5 text-sm sm:col-span-2" style={{ color: 'var(--prevenda-warning)' }}>
        {aviso}{aviso && (
          <>{' '}<a href={WHATSAPP} target="_blank" rel="noreferrer noopener" className="font-semibold underline underline-offset-2" style={{ color: GREEN }}>Falar no WhatsApp</a></>
        )}
      </p>
      <p className="text-xs leading-relaxed sm:col-span-2" style={{ color: MUTED }}>
        Ao enviar, você autoriza e-mail e WhatsApp somente sobre esta pré-venda e o lançamento do Módulo Grow-X. Veja a{' '}
        <Link to="/privacidade" className="underline underline-offset-2" style={{ color: GREEN }}>
          Política de Privacidade
        </Link>.
      </p>
    </form>
  );
}

/* ---------------- página ---------------- */

export default function PreVendaPage() {
  const { loading, erro, pagar } = useCheckout();
  const dias = useDiasRestantes();
  const eyebrow = useMemo(() => 'font-mono text-[0.7rem] uppercase tracking-[0.18em]', []);
  const fieldRefs = useRef({});
  const formStarted = useRef(false);
  const [form, setForm] = useState({
    nome: '', email: '', cpf: '', whatsapp: '', aceite: false, ciencia: false,
  });
  const [erroCampo, setErroCampo] = useState({});
  const [avisoForm, setAvisoForm] = useState(null);
  const [metodoPagamento, setMetodoPagamento] = useState(PIX_ENABLED ? 'pix' : 'cartao');
  const [lightbox, setLightbox] = useState(null);
  const [checkoutOutcome, setCheckoutOutcome] = useState(() => readCheckoutOutcome());
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [turnstileUnavailable, setTurnstileUnavailable] = useState(false);
  const closeLightbox = useCallback(() => setLightbox(null), []);
  const receberTurnstileToken = useCallback((token) => {
    setTurnstileToken(token);
    if (token) {
      setTurnstileUnavailable(false);
      setErroCampo((current) => ({ ...current, verificacao: false }));
    }
  }, []);
  const marcarTurnstileIndisponivel = useCallback(() => {
    setTurnstileUnavailable(true);
    setTurnstileToken('');
  }, []);

  const campo = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (erroCampo[k]) setErroCampo((current) => ({ ...current, [k]: false }));
  };

  const registrarInicioForm = () => {
    if (formStarted.current) return;
    formStarted.current = true;
    track('form_start', { form: 'prevenda-reserva', page: '/prevenda' });
  };

  /** Identificação e aceite são exigidos antes de sair da nossa página. */
  const pagarComDados = (metodo) => {
    const falhas = {
      nome: !nomeCompleto(form.nome),
      email: !emailValido(form.email),
      cpf: !documentoValido(form.cpf),
      whatsapp: !telefoneBrValido(form.whatsapp),
      ciencia: !form.ciencia,
      aceite: !form.aceite,
      verificacao: !turnstileToken,
    };
    setErroCampo(falhas);

    const primeiraFalha = Object.entries(falhas).find(([, ruim]) => ruim)?.[0];
    if (primeiraFalha) {
      setAvisoForm({
        nome: 'Informe seu nome completo (nome e sobrenome).',
        email: 'Confere o e-mail — é nele que chega a confirmação do pedido.',
        cpf: 'Documento inválido. Confere o CPF — ou informe o CNPJ, se a compra for pela empresa.',
        whatsapp: 'Informe um WhatsApp brasileiro válido, com DDD.',
        ciencia: DISCLOSURES_READY
          ? 'Confirme que você leu o pacote final de características essenciais e entrega.'
          : 'Confirme que entendeu por que a cobrança permanece bloqueada.',
        aceite: 'Marque o aceite do contrato pra seguir pro pagamento.',
        verificacao: turnstileUnavailable
          ? 'A verificação de segurança está indisponível. Nenhuma reserva será aberta.'
          : 'Conclua a verificação de segurança para continuar.',
      }[primeiraFalha]);
      track('checkout_dados_invalidos', { campo: primeiraFalha, method: metodo, page: '/prevenda' });
      requestAnimationFrame(() => requestAnimationFrame(() => fieldRefs.current[primeiraFalha]?.focus()));
      return;
    }

    setAvisoForm(null);
    const challengeToken = turnstileToken;
    setTurnstileToken('');
    setTurnstileResetKey((current) => current + 1);
    pagar(metodo, {
      nome: form.nome, email: form.email, cpf: form.cpf, aceite: true,
      telefone: normalizaTelefoneBr(form.whatsapp),
      cienciaEspecificacoes: form.ciencia,
      turnstileToken: challengeToken,
    });
  };

  const [lote, setLote] = useState(null);
  const [loteCarregando, setLoteCarregando] = useState(true);
  const encerrada = Date.now() > ENCERRAMENTO.getTime();

  useEffect(() => { track('view_prevenda', { page: '/prevenda' }); }, []);

  // Capacidade real vem do ledger transacional; sem confirmação, a UI falha fechada.
  useEffect(() => {
    fetch('/api/lote')
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error(data?.error || `lote_${r.status}`);
        return data;
      })
      .then((d) => setLote(d?.confiavel === true ? d : { ...d, confiavel: false }))
      .catch(() => setLote({ confiavel: false }))
      .finally(() => setLoteCarregando(false));
  }, []);

  const reservaPausada = loteCarregando || encerrada || lote?.esgotado || lote?.confiavel === false;
  const productLd = useMemo(() => {
    const availability = encerrada
      ? 'https://schema.org/Discontinued'
      : reservaPausada
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/PreOrder';
    return {
      ...PRODUCT_LD,
      offers: PRODUCT_LD.offers.map((offer) => ({ ...offer, availability })),
    };
  }, [encerrada, reservaPausada]);
  const aguardandoValidacao = lote?.motivo === 'validacao_produto';
  const seoTitle = aguardandoValidacao
    ? 'Módulo Grow-X — controlador, GXP e abertura da pré-venda'
    : PIX_ENABLED
      ? `Módulo Grow-X — Pré-venda: ${PRECO_PIX} no Pix ou ${PARCELA} · entrega ${OFERTA.entregaBR.slice(0, 5)}`
      : `Módulo Grow-X — Pré-venda: ${PRECO_CARTAO} ou até ${PARCELA} no cartão · entrega ${OFERTA.entregaBR.slice(0, 5)}`;
  const seoDescription = aguardandoValidacao
    ? 'Conheça o conceito do Módulo Grow-X, o controlador baseado no protótipo v0.6.0 e telas reais do GXP. Pagamento após a publicação das características essenciais e do custo total de entrega.'
    : PIX_ENABLED
      ? `O cérebro do seu grow: 6 tomadas, fotoperíodo, rega por umidade do solo e controlador documentado. Pré-venda ${PRECO_PIX} no Pix; preço público previsto de ${PRECO_PUBLICO}. Com 3 meses de GXP Premium.`
      : `O cérebro do seu grow: 6 tomadas, fotoperíodo, rega por umidade do solo e controlador documentado. Pré-venda no cartão por ${PRECO_CARTAO} ou até ${PARCELA}; preço público previsto de ${PRECO_PUBLICO}.`;
  const ocupadas = (Number(lote?.vendidas) || 0) + (Number(lote?.reservadas) || 0);
  const loteLabel = loteCarregando
    ? 'Verificando capacidade do lote'
    : encerrada
      ? 'Pré-venda encerrada'
      : lote?.confiavel === false
        ? lote?.motivo === 'validacao_produto'
          ? 'Pagamento aguardando oferta final'
          : 'Reservas temporariamente pausadas'
        : lote?.esgotado
          ? 'Lote esgotado'
          : ocupadas > 0
            ? `${lote.restantes} de ${lote.total} unidades disponíveis`
            : `Pré-venda aberta · lote limitado a ${OFERTA.loteTotal}`;
  const loteEmAtencao = encerrada || (!loteCarregando && (lote?.esgotado || lote?.confiavel === false));
  const compraDisponivel = !reservaPausada;
  const ctaHref = loteCarregando ? '#reservar' : compraDisponivel ? '#reservar' : '#lista';
  const ctaLabel = loteCarregando
    ? 'Ver disponibilidade'
    : compraDisponivel
      ? 'Comprar módulo'
      : encerrada || lote?.esgotado
        ? 'Entrar na lista do próximo lote'
        : 'Receber aviso da abertura';
  const ctaLabelMobile = loteCarregando ? 'Ver' : compraDisponivel ? 'Comprar' : 'Receber aviso';

  const dispensarCheckoutOutcome = () => {
    clearCheckoutOutcome();
    setCheckoutOutcome('');
  };

  return (
    <div style={{ background: BG }} className="prevenda-shell min-h-screen text-white">
      <SEO
        title={seoTitle}
        description={seoDescription}
        path="/prevenda"
        type="product"
        image="https://www.growx.com.br/og-prevenda-v2.jpg"
        jsonLd={productLd}
      />

      <Nav
        compraDisponivel={compraDisponivel}
        ctaHref={ctaHref}
        ctaLabel={ctaLabel}
        ctaLabelMobile={ctaLabelMobile}
      />

      {/* ---------- HERO ---------- */}
      <header id="topo" className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={fotoHero} alt="" aria-hidden className="h-full w-full object-cover object-[70%_center]" fetchPriority="high" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, var(--prevenda-bg) 0%, var(--prevenda-hero-95) 34%, var(--prevenda-hero-70) 56%, transparent 88%)' }} />
          {/* no mobile o texto passa por cima da foto — reforça o contraste */}
          <div className="absolute inset-0 lg:hidden" style={{ background: 'linear-gradient(180deg, var(--prevenda-hero-95) 0%, var(--prevenda-hero-82) 55%, var(--prevenda-bg) 100%)' }} />
          <div className="absolute inset-x-0 bottom-0 h-48" style={{ background: 'linear-gradient(180deg, transparent, var(--prevenda-bg))' }} />
        </div>

        <div className="mx-auto w-full max-w-6xl px-5 pb-20 pt-32 sm:px-8 sm:pb-28 sm:pt-44">
          {checkoutOutcome && (
            <div
              role="alert"
              className="mb-8 max-w-2xl rounded-2xl border px-5 py-4"
              style={{ borderColor: 'rgba(245,181,68,0.40)', background: 'rgba(245,181,68,0.10)' }}
            >
              <p className="font-bold text-white">
                {checkoutOutcome === 'cancelado' ? 'Checkout cancelado.' : 'O provedor não concluiu o checkout.'}
              </p>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--prevenda-warning-text)' }}>
                Esta mensagem não confirma falha ou aprovação do pagamento. Confira “Meu pedido” antes de iniciar outra tentativa.
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold">
                <a href="#reservar" className="underline underline-offset-4" style={{ color: GREEN }}>Revisar compra</a>
                <Link to="/prevenda/pedido" className="underline underline-offset-4" style={{ color: GREEN }}>Abrir Meu pedido</Link>
                <button type="button" onClick={dispensarCheckoutOutcome} className="underline underline-offset-4" style={{ color: MUTED }}>
                  Fechar aviso
                </button>
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Pill tone={loteEmAtencao ? 'amber' : 'green'}>
              <span className="inline-block size-1.5 rounded-full" style={{ background: GREEN }} />
              {loteLabel}
            </Pill>
            {dias > 0 && <Pill>Faltam {dias} dias para a pré-venda fechar</Pill>}
          </div>

          <h1 className="mt-8 max-w-2xl text-display-xl font-extrabold leading-[0.98] text-white">
            O cérebro<br />do seu grow.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed" style={{ color: MUTED }}>
            Uma central para luz, clima e rega, com seis tomadas, sensores compatíveis e rotina local.
            Você define as regras e acompanha o estado pelo GXP.
          </p>

          <div className="mt-9 flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <span className="text-5xl font-extrabold text-white sm:text-6xl">{PRECO_PRINCIPAL}</span>
            <span className="font-mono text-lg font-bold uppercase tracking-wide" style={{ color: GREEN }}>{ROTULO_PRECO}</span>
            {PIX_ENABLED && <span className="text-sm" style={{ color: MUTED }}>ou {PARCELA} no cartão</span>}
          </div>
          <div className="mt-4">
            <Pill tone="amber">preço público previsto: {PRECO_PUBLICO}</Pill>
          </div>

          <div className="mt-9 flex flex-wrap gap-3">
            <a
              href={ctaHref}
              onClick={() => track('click_cta_prevenda', { placement: 'hero', page: '/prevenda' })}
              className="inline-flex items-center gap-2 rounded-xl px-7 py-4 text-[0.95rem] font-bold transition hover:brightness-110"
              style={{ background: GREEN, color: CTA_TEXT }}
            >
              {compraDisponivel && <ShoppingCart aria-hidden="true" size={18} />}
              {ctaLabel}
            </a>
            <a
              href="#como"
              onClick={() => track('click_cta_prevenda', { placement: 'hero-como-funciona', page: '/prevenda' })}
              className="rounded-xl border px-7 py-4 text-[0.95rem] font-semibold text-white transition hover:bg-white/5"
              style={{ borderColor: LINE }}
            >
              Ver como funciona
            </a>
            <button
              type="button"
              onClick={() => {
                track('image_open', { image: 'modulo-hero', page: '/prevenda' });
                setLightbox({
                  src: fotoHero,
                  alt: 'Render conceitual do Módulo Grow-X ao lado de um cultivo indoor',
                  title: 'Conceito visual do Módulo Grow-X',
                  caption: 'Render conceitual do produto; gabinete, acabamento e conexões da unidade final ainda dependem da validação de Hardware.',
                });
              }}
              className="rounded-xl px-2 py-4 text-sm font-semibold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80]"
              style={{ color: MUTED }}
            >
              Ver módulo em detalhe
            </button>
          </div>

          <a
            href="#lista"
            onClick={() => track('click_cta_prevenda', { placement: 'hero-interesse', page: '/prevenda' })}
            className="mt-4 inline-flex text-sm font-semibold underline underline-offset-4"
            style={{ color: MUTED }}
          >
            Ainda não quer comprar? Receba o aviso do lançamento
          </a>

          <div className="mt-9 flex flex-wrap gap-x-7 gap-y-2 text-sm" style={{ color: MUTED }}>
            {['Reembolso integral até o envio', 'Garantia de 12 meses conforme o contrato', `Entrega a partir de ${OFERTA.entregaBR}`].map((t) => (
              <span key={t} className="inline-flex items-center gap-2">
                <Check aria-hidden="true" className="shrink-0" size={16} strokeWidth={2.5} style={{ color: GREEN }} />
                {t}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* ---------- FAIXA ---------- */}
      <section style={{ borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`, background: SURFACE }}>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span className={eyebrow} style={{ color: GREEN }}>Lançamento oficial → ExpoCannabis Brasil 2026</span>
          <span className="text-sm" style={{ color: MUTED }}>Pré-venda até {OFERTA.encerramentoBR}; preço público previsto de {PRECO_PUBLICO} após o lançamento.</span>
        </div>
      </section>

      {/* ---------- ATALHO DE COMPRA ---------- */}
      <section aria-label="Resumo da oferta" style={{ borderBottom: `1px solid ${LINE}` }}>
        <div className="mx-auto grid w-full max-w-6xl gap-5 px-5 py-7 sm:px-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className={eyebrow} style={{ color: GREEN }}>Lote de lançamento · {OFERTA.loteTotal} unidades</p>
            <p className="mt-2 text-xl font-extrabold text-white">
              {PRECO_PRINCIPAL} <span className="text-sm font-semibold" style={{ color: MUTED }}>{ROTULO_PRECO}</span>
            </p>
            <p className="mt-1 text-sm" style={{ color: MUTED }}>Reembolso integral até o envio · garantia de 12 meses conforme o contrato.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={ctaHref}
              onClick={() => track('click_cta_prevenda', { placement: 'offer-rail', page: '/prevenda' })}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold transition hover:brightness-110"
              style={{ background: GREEN, color: CTA_TEXT }}
            >
              {compraDisponivel && <ShoppingCart aria-hidden="true" size={17} />}
              {ctaLabel}
            </a>
            <Link
              to="/prevenda/pedido"
              className="rounded-xl border px-5 py-3.5 text-sm font-semibold"
              style={{ borderColor: LINE, color: MUTED }}
            >
              Já comprei
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- O MÓDULO ---------- */}
      <section id="modulo" className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <p className={eyebrow} style={{ color: GREEN }}>O módulo — 6 tomadas, 1 central</p>
        <h2 className="mt-5 max-w-2xl text-display-lg font-extrabold text-white">Aposenta a gambiarra de timers.</h2>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed" style={{ color: MUTED }}>
          Uma central única no lugar de réguas, timers analógicos e controladores avulsos.
          Depois da instalação e da configuração, a central aplica localmente as rotinas que você definiu.
        </p>

        <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
          <figure className="lg:sticky lg:top-28">
            <button
              type="button"
              onClick={() => {
                track('image_open', { image: 'modulo-tomadas', page: '/prevenda' });
                setLightbox({
                  src: fotoTomadas,
                  alt: 'Render conceitual do painel do Módulo Grow-X com seis tomadas',
                  title: 'Conceito de seis saídas em uma central',
                  caption: 'Render conceitual; formato das tomadas, gabinete e acabamento ainda dependem da validação de Hardware.',
                });
              }}
              className="w-full cursor-zoom-in overflow-hidden rounded-3xl border text-left transition hover:border-[#4ade80]/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80]"
              style={{ borderColor: LINE }}
              aria-label="Ampliar render conceitual do painel com seis tomadas"
            >
              <img src={fotoTomadas} alt="Render conceitual do painel do Módulo Grow-X com seis tomadas" className="w-full" loading="lazy" />
            </button>
            <figcaption className="mt-3 text-xs leading-relaxed" style={{ color: MUTED }}>
              Render conceitual; formato das tomadas, gabinete e acabamento ainda dependem da validação de Hardware.
            </figcaption>
          </figure>

          <div className="grid gap-4 sm:grid-cols-2">
            {RECURSOS.map(([n, titulo, texto]) => (
              <div key={n} className="rounded-2xl border p-6" style={{ borderColor: LINE, background: SURFACE }}>
                <p className="font-mono text-xs font-bold" style={{ color: GREEN }}>{n}</p>
                <h3 className="mt-3 text-base font-bold text-white">{titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: MUTED }}>{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- POR DENTRO ---------- */}
      <section id="dentro" style={{ borderTop: `1px solid ${LINE}`, background: SURFACE }}>
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-2 lg:items-center">
          <figure>
            <button
              type="button"
              onClick={() => {
                track('image_open', { image: 'modulo-aberto', page: '/prevenda' });
                setLightbox({
                  src: fotoAberto,
                  alt: 'Render conceitual do interior projetado para o Módulo Grow-X',
                  title: 'Projeto interno conceitual',
                  caption: 'Render conceitual do projeto interno; não representa uma unidade final validada pela equipe de Hardware.',
                });
              }}
              className="w-full cursor-zoom-in overflow-hidden rounded-3xl border text-left transition hover:border-[#4ade80]/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80]"
              style={{ borderColor: LINE }}
              aria-label="Ampliar render conceitual do interior do módulo"
            >
              <img src={fotoAberto} alt="Render conceitual do interior projetado para o Módulo Grow-X" className="w-full" loading="lazy" />
            </button>
            <figcaption className="mt-3 text-xs leading-relaxed" style={{ color: MUTED }}>
              Render conceitual do projeto interno; não representa uma unidade final validada pela equipe de Hardware.
            </figcaption>
          </figure>
          <div>
            <p className={eyebrow} style={{ color: GREEN }}>Por dentro</p>
            <h2 className="mt-5 text-display-lg font-extrabold text-white">Coisa séria, sem caixa-preta.</h2>
            <p className="mt-5 text-lg leading-relaxed" style={{ color: MUTED }}>
              O render conceitual mostra a arquitetura pretendida de placa, fonte embarcada e conexões para sensores.
              A unidade final terá garantia de 12 meses conforme o contrato; os limites elétricos serão formalizados antes da abertura da cobrança.
            </p>
            <div className="mt-8 space-y-4">
              {[
                'Central dedicada ao fluxo de automação do cultivo.',
                'Entradas previstas para solo, temperatura e umidade do ar.',
                'Defeitos de fabricação têm cobertura de 12 meses, conforme o contrato.',
              ].map((t) => (
                <div key={t} className="flex gap-3">
                  <Check aria-hidden="true" className="mt-0.5 shrink-0" size={16} strokeWidth={2.5} style={{ color: GREEN }} />
                  <p className="text-sm leading-relaxed" style={{ color: MUTED }}>{t}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <ControllerShowcase
        eyebrowClass={eyebrow}
        colors={{
          green: GREEN,
          muted: MUTED,
          line: LINE,
          surface: SURFACE,
          panel: 'var(--prevenda-panel)',
          card: 'var(--prevenda-surface-strong)',
        }}
        onOpen={(item) => {
          track('image_open', { image: item.id || item.title, page: '/prevenda' });
          setLightbox(item);
        }}
      />

      {/* ---------- COMPATIBILIDADE ---------- */}
      <section id="compatibilidade" style={{ borderTop: `1px solid ${LINE}`, background: SURFACE }}>
        <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
            <div>
              <p className={eyebrow} style={{ color: GREEN }}>Compatibilidade sem chute</p>
              <h2 className="mt-5 text-display-lg font-extrabold text-white">O que já está definido — e o que ainda falta confirmar.</h2>
              <p className="mt-5 text-lg leading-relaxed" style={{ color: MUTED }}>
                O protótipo do controlador define a experiência e os recursos centrais. O PDF não fixa limites elétricos,
                dimensões nem a composição final do kit; por isso esses dados não são tratados aqui como especificação pronta.
              </p>
              <a
                href={WHATSAPP}
                target="_blank"
                rel="noreferrer noopener"
                onClick={() => track('click_whatsapp', { page: '/prevenda', intent: 'compatibilidade' })}
                className="mt-7 inline-flex rounded-xl border px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80]"
                style={{ borderColor: LINE }}
              >
                Validar meu setup com o time
              </a>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              {ESPECIFICACOES.map(([term, value], index) => (
                <div key={term} className="rounded-2xl border p-5" style={{ borderColor: index === ESPECIFICACOES.length - 1 ? 'rgba(245,181,68,.34)' : LINE, background: BG }}>
                  <dt className="font-mono text-[0.65rem] uppercase tracking-[0.14em]" style={{ color: index === ESPECIFICACOES.length - 1 ? 'var(--prevenda-warning)' : GREEN }}>{term}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-white/85">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="mt-4 max-w-xl text-xs leading-relaxed" style={{ color: MUTED }}>
            Imagens do produto são renders conceituais. Gabinete, acabamento, conexões e limites elétricos da unidade final ainda dependem da validação de Hardware.
          </p>
        </div>
      </section>

      {/* ---------- COMO FUNCIONA ---------- */}
      <section id="como" className="scroll-mt-20" style={{ borderTop: `1px solid ${LINE}`, background: SURFACE }}>
        <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <p className={eyebrow} style={{ color: GREEN }}>Pré-venda sem mistério</p>
          <h2 className="mt-5 max-w-2xl text-display-lg font-extrabold text-white">
            {PIX_ENABLED ? 'Do Pix até a sua porta, tudo por escrito.' : 'Do cartão até a sua porta, tudo por escrito.'}
          </h2>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {PASSOS.map(([passo, titulo, texto]) => (
              <div key={passo} className="rounded-2xl border p-7" style={{ borderColor: LINE, background: BG }}>
                <p className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.16em]" style={{ color: GREEN }}>{passo}</p>
                <h3 className="mt-4 text-lg font-bold text-white">{titulo}</h3>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: MUTED }}>{texto}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <p className="rounded-2xl border px-6 py-5 text-sm" style={{ borderColor: 'rgba(74,222,128,0.24)', background: 'rgba(74,222,128,0.06)', color: '#d6f5e0' }}>
              Mudou de ideia? <strong className="text-white">Reembolso integral até o envio.</strong> Sem letra miúda.
            </p>
            <p className="rounded-2xl border px-6 py-5 text-sm" style={{ borderColor: 'rgba(74,222,128,0.24)', background: 'rgba(74,222,128,0.06)', color: '#d6f5e0' }}>
              Depois da entrega, <strong className="text-white">garantia de 12 meses</strong> conforme o contrato.
            </p>
          </div>

          <div className="mt-14">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className={eyebrow} style={{ color: GREEN }}>Cronograma previsto do lote</p>
                <h3 className="mt-3 text-2xl font-extrabold text-white">Cada marco aparece na área do cliente.</h3>
              </div>
              <p className="max-w-md text-xs leading-relaxed" style={{ color: MUTED }}>
                Datas são planejamento. O status confirmado é atualizado pelo time e não avança sozinho só porque o calendário virou.
              </p>
            </div>
            <ol className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {MARCOS.map(([date, title, detail], index) => (
                <li key={title} className="relative rounded-2xl border p-5" style={{ borderColor: index === 0 ? 'rgba(74,222,128,.35)' : LINE, background: BG }}>
                  <p className="font-mono text-xs font-bold" style={{ color: GREEN }}>{date}</p>
                  <h4 className="mt-3 text-sm font-bold text-white">{title}</h4>
                  <p className="mt-2 text-xs leading-relaxed" style={{ color: MUTED }}>{detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ---------- RESERVAR ---------- */}
      <section id="reservar" className="mx-auto w-full max-w-6xl scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28">
        <p className={eyebrow} style={{ color: GREEN }}>
          {lote?.motivo === 'validacao_produto' ? 'Abertura responsável da pré-venda' : 'Garanta o preço de pré-venda'}
        </p>
        <h2 className="mt-5 max-w-2xl text-display-lg font-extrabold text-white">
          {lote?.motivo === 'validacao_produto'
            ? 'O pagamento abre quando as características essenciais e o custo total estiverem publicados.'
            : `${ECONOMIA} abaixo do preço público previsto.`}
        </h2>

        <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          {/* card principal */}
          <div className="flex flex-col rounded-3xl border p-7 sm:p-9" style={{ borderColor: 'rgba(74,222,128,0.35)', background: 'linear-gradient(180deg, rgba(74,222,128,0.07), rgba(74,222,128,0.02))' }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.16em]" style={{ color: GREEN }}>Pré-venda · até {OFERTA.encerramentoBR}</p>
              {dias > 0 && <Pill tone="green">Faltam {dias} dias para fechar</Pill>}
            </div>
            {reservaPausada && (
              <div className="mt-3">
                <Pill tone="amber">Compra ainda não aberta</Pill>
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-baseline gap-3">
              <span className="text-5xl font-extrabold text-white sm:text-6xl">
                {PIX_ENABLED ? PRECO_PIX : PRECO_CARTAO}
              </span>
              <span className="text-sm" style={{ color: MUTED }}>
                {PIX_ENABLED ? `no Pix · ou ${PARCELA} (${PRECO_CARTAO})` : `no cartão · ${PARCELA}`}
              </span>
            </div>

            <div className="mt-8 space-y-3.5">
              {INCLUSO.map((t) => (
                <div key={t} className="flex gap-3">
                  <Check aria-hidden="true" className="mt-0.5 shrink-0" size={16} strokeWidth={2.5} style={{ color: GREEN }} />
                  <p className="text-sm leading-relaxed text-white/85">{t}</p>
                </div>
              ))}
            </div>

            {reservaPausada ? (
              <div className="mt-9 rounded-2xl border p-6" style={{ borderColor: 'rgba(245,181,68,0.35)', background: 'rgba(245,181,68,0.08)' }}>
                <p className="text-lg font-bold text-white">
                  {loteCarregando && 'Verificando a capacidade do lote…'}
                  {!loteCarregando && encerrada && 'Esta pré-venda foi encerrada.'}
                  {!loteCarregando && !encerrada && lote?.esgotado && `As ${lote.total || OFERTA.loteTotal} unidades da pré-venda acabaram.`}
                   {!loteCarregando && !encerrada && !lote?.esgotado && lote?.confiavel === false && (
                     lote?.motivo === 'validacao_produto'
                       ? 'O pagamento ainda não foi aberto.'
                       : 'Reservas temporariamente pausadas por segurança.'
                   )}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--prevenda-warning-text)' }}>
                  {loteCarregando
                    ? 'A compra é liberada somente depois que o servidor confirma uma vaga real.'
                    : lote?.confiavel === false && !encerrada
                      ? lote?.motivo === 'validacao_produto'
                        ? 'Tensão, corrente, carga máxima, composição do kit e custo total da entrega precisam estar publicados e aprovados antes de qualquer cobrança. Entre na lista para receber a abertura.'
                        : 'Não conseguimos confirmar o inventário agora. Nenhuma cobrança será aberta enquanto essa verificação falhar.'
                      : 'Entre na lista do próximo lote e receba o aviso antes da divulgação.'}
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  {!loteCarregando && (
                    <a
                      href="#lista"
                      onClick={() => track('click_cta_prevenda', { placement: 'purchase-gated-interest', page: '/prevenda' })}
                      className="rounded-xl px-5 py-3 text-sm font-bold"
                      style={{ background: GREEN, color: CTA_TEXT }}
                    >
                      Quero ser avisado quando abrir
                    </a>
                  )}
                  <a
                    href={WHATSAPP} target="_blank" rel="noreferrer noopener"
                    onClick={() => track('click_whatsapp', { page: '/prevenda', intent: 'reserva-pausada' })}
                    className="rounded-xl border px-5 py-3 text-sm font-semibold text-white"
                    style={{ borderColor: LINE }}
                  >
                    Falar com o time
                  </a>
                </div>
              </div>
            ) : (
              <form
                className="mt-9"
                noValidate
                onFocusCapture={registrarInicioForm}
                onSubmit={(event) => {
                  event.preventDefault();
                  pagarComDados(metodoPagamento);
                }}
              >
                <fieldset>
                  <legend className="font-mono text-[0.65rem] uppercase tracking-[0.14em]" style={{ color: MUTED }}>
                    Seus dados — usados no contrato e na nota fiscal
                  </legend>
                  <div className="mt-4 space-y-4">
                    <label className="block text-sm font-semibold text-white" htmlFor="reserva-nome">
                      Nome completo
                      <input
                        ref={(node) => { fieldRefs.current.nome = node; }}
                        id="reserva-nome" type="text" value={form.nome} onChange={campo('nome')}
                        placeholder="Nome e sobrenome" autoComplete="name" required
                        aria-invalid={erroCampo.nome || undefined} aria-describedby="reserva-erro"
                        className={INPUT_CLASS}
                        style={{ borderColor: erroCampo.nome ? 'rgba(245,181,68,0.6)' : LINE }}
                      />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-sm font-semibold text-white" htmlFor="reserva-email">
                        E-mail
                        <input
                          ref={(node) => { fieldRefs.current.email = node; }}
                          id="reserva-email" type="email" value={form.email} onChange={campo('email')}
                          placeholder="voce@exemplo.com" autoComplete="email" required
                          aria-invalid={erroCampo.email || undefined} aria-describedby="reserva-erro"
                          className={INPUT_CLASS}
                          style={{ borderColor: erroCampo.email ? 'rgba(245,181,68,0.6)' : LINE }}
                        />
                      </label>
                      <label className="block text-sm font-semibold text-white" htmlFor="reserva-cpf">
                        CPF ou CNPJ
                        <input
                          ref={(node) => { fieldRefs.current.cpf = node; }}
                          id="reserva-cpf" type="text" inputMode="numeric" value={form.cpf}
                          onChange={(event) => {
                            setForm((current) => ({ ...current, cpf: formataDocumento(event.target.value) }));
                            setErroCampo((current) => ({ ...current, cpf: false }));
                          }}
                          placeholder="Somente números" required
                          aria-invalid={erroCampo.cpf || undefined} aria-describedby="reserva-erro"
                          className={`${INPUT_CLASS} font-mono`}
                          style={{ borderColor: erroCampo.cpf ? 'rgba(245,181,68,0.6)' : LINE }}
                        />
                      </label>
                    </div>
                    <label className="block text-sm font-semibold text-white" htmlFor="reserva-whatsapp">
                      WhatsApp com DDD
                      <input
                        ref={(node) => { fieldRefs.current.whatsapp = node; }}
                        id="reserva-whatsapp" type="tel" inputMode="tel" value={form.whatsapp}
                        onChange={(event) => {
                          setForm((current) => ({ ...current, whatsapp: formataTelefoneBr(event.target.value) }));
                          setErroCampo((current) => ({ ...current, whatsapp: false }));
                        }}
                        placeholder="(41) 99999-9999" autoComplete="tel" required
                        aria-invalid={erroCampo.whatsapp || undefined} aria-describedby="reserva-erro reserva-whatsapp-finalidade"
                        className={`${INPUT_CLASS} font-mono`}
                        style={{ borderColor: erroCampo.whatsapp ? 'rgba(245,181,68,0.6)' : LINE }}
                      />
                    </label>
                  </div>
                </fieldset>

                <p id="reserva-whatsapp-finalidade" className="mt-4 text-xs leading-relaxed" style={{ color: MUTED }}>
                  {PIX_ENABLED
                    ? 'Usamos seu WhatsApp para confirmar a compra, os dados de entrega e atualizações do pedido. O pagamento é processado pelo provedor escolhido.'
                    : 'Usamos seu WhatsApp para confirmar a compra, os dados de entrega e atualizações do pedido. O cartão é processado pela Stripe; Pix permanece indisponível até a homologação do fluxo exclusivo.'}
                  {' '}O contato é mantido somente pelo prazo necessário para executar o contrato e cumprir obrigações legais, conforme a{' '}
                  <Link to="/privacidade" className="underline underline-offset-2" style={{ color: GREEN }}>Política de Privacidade</Link>.
                </p>

                <label
                  htmlFor="ciencia-especificacoes"
                  className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition"
                  style={{ borderColor: erroCampo.ciencia ? 'rgba(245,181,68,0.6)' : LINE, background: erroCampo.ciencia ? 'rgba(245,181,68,0.07)' : 'transparent' }}
                >
                  <input
                    ref={(node) => { fieldRefs.current.ciencia = node; }}
                    id="ciencia-especificacoes" type="checkbox" checked={form.ciencia} required
                    aria-invalid={erroCampo.ciencia || undefined} aria-describedby="reserva-erro"
                    onChange={(event) => {
                      setForm((current) => ({ ...current, ciencia: event.target.checked }));
                      setErroCampo((current) => ({ ...current, ciencia: false }));
                    }}
                    className="mt-0.5 size-4 shrink-0 accent-[#4ade80] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80]"
                  />
                  <span className="text-xs leading-relaxed text-white/85">
                    {DISCLOSURES_READY ? (
                      <>
                        Li a{' '}
                        <a
                          href={PREVENDA_RELEASE.disclosuresPath}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="font-semibold underline underline-offset-2"
                          style={{ color: GREEN }}
                        >
                          ficha elétrica, dimensional, kit e custo total da entrega
                        </a>{' '}
                        publicados nesta oferta. Posso cancelar com reembolso integral até o envio.
                      </>
                    ) : (
                      'Entendo que a cobrança permanece bloqueada enquanto a ficha elétrica, dimensões, kit e custo total da entrega não estiverem publicados e aprovados em uma nova versão.'
                    )}
                  </span>
                </label>

                <div
                  className="mt-3 flex items-start gap-3 rounded-xl border p-4 transition"
                  style={{ borderColor: erroCampo.aceite ? 'rgba(245,181,68,0.6)' : LINE, background: erroCampo.aceite ? 'rgba(245,181,68,0.07)' : 'transparent' }}
                >
                  <input
                    ref={(node) => { fieldRefs.current.aceite = node; }}
                    id="aceite-contrato" type="checkbox" checked={form.aceite} required
                    aria-invalid={erroCampo.aceite || undefined} aria-describedby="reserva-erro"
                    onChange={(event) => {
                      setForm((current) => ({ ...current, aceite: event.target.checked }));
                      setErroCampo((current) => ({ ...current, aceite: false }));
                    }}
                    className="mt-0.5 size-4 shrink-0 accent-[#4ade80] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80]"
                  />
                  <span className="text-xs leading-relaxed text-white/85">
                    <label htmlFor="aceite-contrato" className="cursor-pointer">Li e aceito o</label>{' '}
                    <a
                      href={OFERTA.contratoPath} target="_blank" rel="noreferrer noopener"
                      onClick={() => track('contract_open', { page: '/prevenda', version: OFERTA.contratoVersao })}
                      className="font-semibold underline underline-offset-2" style={{ color: GREEN }}
                    >
                      contrato de pré-venda
                    </a>{' '}
                    — entrega a partir de {OFERTA.entregaBR}, reembolso integral até o envio e garantia de 12 meses conforme o contrato.
                  </span>
                </div>

                <p id="reserva-erro" role="alert" aria-live="assertive" className="mt-3 min-h-4 text-xs font-semibold" style={{ color: 'var(--prevenda-warning)' }}>
                  {avisoForm || ''}
                </p>
                <div
                  ref={(node) => { fieldRefs.current.verificacao = node; }}
                  tabIndex={-1}
                  aria-invalid={erroCampo.verificacao || undefined}
                  className="outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80]"
                >
                  <TurnstileWidget
                    siteKey={TURNSTILE_SITE_KEY}
                    resetKey={turnstileResetKey}
                    onToken={receberTurnstileToken}
                    onUnavailable={marcarTurnstileIndisponivel}
                  />
                </div>
                <div className="mt-3">
                  <EscolhaPagamento
                    metodo={metodoPagamento}
                    onChange={(metodo) => {
                      if (metodo === 'pix' && !PIX_ENABLED) return;
                      setMetodoPagamento(metodo);
                      setAvisoForm(null);
                    }}
                    loading={loading}
                    disabled={reservaPausada || !turnstileToken || turnstileUnavailable}
                  />
                </div>
                <Erro erro={erro} />
              </form>
            )}

            <p className="mt-auto pt-5 text-xs leading-relaxed" style={{ color: MUTED }}>
              Pagamento processado pela Stripe{PIX_ENABLED ? ' ou pelo Mercado Pago, conforme a sua escolha' : ''}. Depois da aprovação,
              a confirmação e a referência da reserva ficam vinculadas ao pedido. Você acompanha o andamento na{' '}
              <Link to="/prevenda/pedido" className="underline underline-offset-2" style={{ color: GREEN }}>área de status</Link>{' '}
              com e-mail, CPF/CNPJ e o código de uso único enviado por e-mail.
            </p>
          </div>

          {/* card comparativo */}
          <div className="flex flex-col gap-6">
            <div className="rounded-3xl border p-7" style={{ borderColor: LINE, background: SURFACE }}>
              <p className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.16em]" style={{ color: MUTED }}>Depois do lançamento</p>
              <div className="mt-5 flex flex-wrap items-baseline gap-3">
                <span className="text-4xl font-extrabold text-white/70">{PRECO_PUBLICO}</span>
                <span className="text-sm" style={{ color: MUTED }}>preço público previsto</span>
              </div>
              <p className="mt-5 text-sm leading-relaxed" style={{ color: MUTED }}>
                Mesmo módulo, sem o bônus de Premium da pré-venda. Essa é a referência comercial planejada para depois do lançamento.
              </p>
            </div>
            <figure>
              <button
                type="button"
                onClick={() => {
                  track('image_open', { image: 'modulo-contexto', page: '/prevenda' });
                  setLightbox({
                    src: fotoContexto,
                    alt: 'Render conceitual do Módulo Grow-X em uma bancada de cultivo indoor',
                    title: 'Conceito do módulo no ambiente de cultivo',
                    caption: 'Composição conceitual de uso; não é uma instalação real nem prova de unidade final fabricada.',
                  });
                }}
                className="w-full cursor-zoom-in overflow-hidden rounded-3xl border text-left transition hover:border-[#4ade80]/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80]"
                style={{ borderColor: LINE }}
                aria-label="Ampliar render conceitual do módulo no ambiente de cultivo"
              >
                <img src={fotoContexto} alt="Render conceitual do Módulo Grow-X em uma bancada de cultivo indoor" className="w-full" loading="lazy" />
              </button>
              <figcaption className="mt-3 text-xs leading-relaxed" style={{ color: MUTED }}>
                Composição conceitual de uso; não é uma instalação real nem prova de unidade final fabricada.
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* ---------- LISTA DE ESPERA ---------- */}
      <section id="lista" style={{ borderTop: `1px solid ${LINE}`, background: SURFACE }}>
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className={eyebrow} style={{ color: GREEN }}>Cadastro de interesse</p>
            <h2 className="text-display-md font-extrabold text-white">Ainda não é a hora? Fica na lista.</h2>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: MUTED }}>
              Te avisamos quando o lote estiver acabando e no dia do lançamento na ExpoCannabis. Somente comunicações sobre este lançamento.
            </p>
          </div>
          <ListaEspera
            purchaseLabel={compraDisponivel ? 'Voltar à compra' : 'Ver estado da pré-venda'}
          />
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section id="faq" className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <p className={eyebrow} style={{ color: GREEN }}>Perguntas diretas, respostas diretas</p>
        <h2 className="mt-5 text-display-lg font-extrabold text-white">FAQ</h2>

        <div className="mt-10 max-w-3xl space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group rounded-2xl border px-6 py-5" style={{ borderColor: LINE, background: SURFACE }}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[0.95rem] font-semibold text-white marker:hidden">
                {q}
                <Plus aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-45" size={20} style={{ color: GREEN }} />
              </summary>
              <p className="mt-4 text-sm leading-relaxed" style={{ color: MUTED }}>{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ---------- CTA FINAL ---------- */}
      <section style={{ borderTop: `1px solid ${LINE}`, background: SURFACE }}>
        <div className="mx-auto w-full max-w-3xl px-5 py-20 text-center sm:px-8 sm:py-24">
          <h2 className="text-display-lg font-extrabold text-white">Regras claras. Estado visível. Menos gambiarra.</h2>
          <p className="mt-5 text-lg" style={{ color: MUTED }}>
            {PIX_ENABLED
              ? `${PRECO_PIX} no Pix durante a pré-venda; preço público previsto de ${PRECO_PUBLICO} depois do lançamento.`
              : `${PRECO_CARTAO} no cartão ou até ${PARCELA}; preço público previsto de ${PRECO_PUBLICO} depois do lançamento.`}
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <a
              href={ctaHref}
              onClick={() => track('click_cta_prevenda', { placement: 'final', page: '/prevenda' })}
              className="inline-flex items-center gap-2 rounded-xl px-7 py-4 text-[0.95rem] font-bold transition hover:brightness-110"
              style={{ background: GREEN, color: CTA_TEXT }}
            >
              {compraDisponivel && <ShoppingCart aria-hidden="true" size={18} />}
              {ctaLabel}
            </a>
            {compraDisponivel && <a
              href="#lista"
              onClick={() => track('click_cta_prevenda', { placement: 'final-interesse', page: '/prevenda' })}
              className="px-3 py-4 text-sm font-semibold underline underline-offset-4"
              style={{ color: MUTED }}
            >
              Só quero receber o aviso
            </a>}
          </div>
        </div>
      </section>

      {/* ---------- RODAPÉ ---------- */}
      <footer style={{ borderTop: `1px solid ${LINE}` }}>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
          <Link to="/"><img src={logoGrowX} alt="Grow-X" className="h-7 w-auto" /></Link>
          <div className="flex flex-wrap items-center gap-x-7 gap-y-2 text-sm" style={{ color: MUTED }}>
            <a href={WHATSAPP} target="_blank" rel="noreferrer noopener" className="transition hover:text-white">WhatsApp +55 41 99549-4343</a>
            <Link to="/" className="transition hover:text-white">growx.com.br</Link>
            <a href={OFERTA.contratoPath} className="transition hover:text-white">Contrato</a>
            <Link to="/prevenda/pedido" className="transition hover:text-white">Meu pedido</Link>
            <span>© 2026 Grow-X Co.</span>
          </div>
        </div>
        <div className="mx-auto w-full max-w-6xl px-5 pb-12 sm:px-8">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--prevenda-muted-soft)' }}>
            A Grow-X Co. desenvolve e vende tecnologia de automação e monitoramento para cultivo indoor de plantas
            de alto valor. Não comercializamos cannabis, sementes, derivados nem fazemos promessa terapêutica.
            O uso do equipamento é de responsabilidade do cliente, conforme a legislação aplicável ao seu projeto.
            Condições da pré-venda: entrega a partir de {OFERTA.entregaBR}, reembolso integral até o envio e
            garantia de 12 meses conforme o contrato.
          </p>
        </div>
      </footer>

      <BarraFixa ctaHref={ctaHref} ctaLabel={ctaLabel} />
      <ImageLightbox item={lightbox} onClose={closeLightbox} />
    </div>
  );
}
