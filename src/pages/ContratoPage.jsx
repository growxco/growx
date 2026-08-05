import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { SEO } from '@/components/visual';
import { OFERTA } from '@/lib/oferta';
import PreVendaHeader from '@/components/prevenda/PreVendaHeader';

const BG = 'var(--prevenda-bg)';
const LINE = 'var(--prevenda-line)';
const GREEN = 'var(--prevenda-green)';
const MUTED = 'var(--prevenda-muted)';
const CTA_TEXT = 'var(--prevenda-cta-foreground)';
const PIX_ENABLED = import.meta.env.VITE_PREVENDA_PIX_ENABLED === 'true';

/** Fonte única: a mesma constante usada pela cobrança em api/checkout.js. */
const CONTRATO_VERSAO = OFERTA.contratoVersao;
const PRECO_E_PAGAMENTO = PIX_ENABLED
  ? 'R$ 2.800,00 (dois mil e oitocentos reais) à vista via Pix; ou R$ 3.000,00 (três mil reais) no cartão de crédito, em até 12 (doze) parcelas de R$ 250,00, sujeitas às condições do emissor do cartão.'
  : 'R$ 3.000,00 (três mil reais) no cartão de crédito, em até 12 (doze) parcelas de R$ 250,00, sujeitas às condições do emissor do cartão. O Pix não integra a oferta atual e somente poderá ser disponibilizado depois da homologação do fluxo exclusivo.';
const PROCESSAMENTO_PAGAMENTO = PIX_ENABLED
  ? 'Os pagamentos são processados pela Stripe (cartão) e pelo Mercado Pago (Pix). A CONTRATADA não coleta, não processa e não armazena dados de cartão de crédito.'
  : 'O pagamento é processado pela Stripe (cartão). A CONTRATADA não coleta, não processa e não armazena dados de cartão de crédito. Caso o Pix seja homologado e passe a integrar a oferta, seu processamento será feito pelo Mercado Pago.';
const DADOS_NO_PROCESSADOR = PIX_ENABLED
  ? 'Nome, documento, contato, endereço de entrega e dados do pagamento ficam armazenados nos campos próprios da Stripe ou do Mercado Pago, que podem realizar transferência internacional de dados com as salvaguardas do art. 33 da LGPD.'
  : 'Nome, documento, contato, endereço de entrega e dados do pagamento ficam armazenados nos campos próprios da Stripe, que pode realizar transferência internacional de dados com as salvaguardas do art. 33 da LGPD. Se o Pix for homologado e utilizado, esses dados também poderão ser tratados pelo Mercado Pago.';

const CLAUSULAS = [
  {
    n: '1',
    t: 'Partes',
    p: [
      'CONTRATADA: GROW-X CO. TECNOLOGIAS LTDA, sociedade empresária limitada inscrita no CNPJ sob o nº 59.183.820/0001-09, com sede na Avenida Sete de Setembro, 4923, sala 1203, andar 12, Ed. Sun Tower Business, bairro Água Verde, Curitiba/PR, CEP 80.250-205, e-mail growx@growx.com.br, telefone (41) 99549-4343.',
      'CONTRATANTE: a pessoa física ou jurídica identificada no ato do pagamento, pelos dados informados no checkout (nome, e-mail, CPF/CNPJ, telefone e endereço de entrega).',
    ],
  },
  {
    n: '2',
    t: 'Objeto',
    p: [
      'Compra e venda, em regime de pré-venda, de 1 (uma) unidade do Módulo Grow-X — central de automação para cultivo indoor com 6 tomadas inteligentes controláveis, controle de fotoperíodo e, quando utilizado driver DIM/PWM compatível, transições graduais, acionamento de irrigação por leitura de umidade de solo, entradas para sensores ambientais e integração com o aplicativo GXP.',
      'Acompanha o produto: 3 (três) meses de assinatura GXP Premium, ativados quando do lançamento do aplicativo, sem cobrança adicional e sem renovação automática.',
      'A pré-venda refere-se a produto em desenvolvimento e industrialização, ainda não disponível em estoque na data da contratação.',
      'Antes da abertura da cobrança, a CONTRATADA deverá publicar a ficha elétrica aplicável (incluindo tensão, corrente e carga máxima), dimensões, composição final do kit e as condições de custo e cobertura de frete ou retirada. Esses dados deverão estar disponíveis antes de qualquer aceite e pagamento.',
    ],
  },
  {
    n: '3',
    t: 'Preço e forma de pagamento',
    p: [
      PRECO_E_PAGAMENTO,
      PROCESSAMENTO_PAGAMENTO,
      'O preço da pré-venda é válido enquanto durar o lote de lançamento. Após o lançamento, o preço público previsto é de R$ 5.500,00, sem efeito retroativo sobre pedidos já pagos.',
    ],
  },
  {
    n: '4',
    t: 'Prazo e forma de entrega',
    p: [
      `A pré-venda é limitada a ${OFERTA.loteTotal} (cem) unidades e encerra-se em ${OFERTA.encerramentoBR} ou quando esgotado o lote, o que ocorrer primeiro.`,
      `As entregas iniciam-se em ${OFERTA.entregaBR}, data do lançamento oficial do produto na ${OFERTA.evento}. Para contratações feitas a partir de ${OFERTA.entregaBR}, o prazo de entrega é de até 30 (trinta) dias corridos contados da confirmação do pagamento.`,
      'A entrega ocorre por envio ao endereço informado pelo CONTRATANTE ou, por opção dele, por retirada presencial durante o evento. Custo, cobertura e eventual gratuidade do frete serão informados antes da abertura da cobrança e integrarão a oferta aceita pelo CONTRATANTE.',
      `Havendo atraso superior a 30 (trinta) dias corridos contados do prazo aplicável ao pedido — ${OFERTA.entregaBR} para as contratações feitas até essa data, ou o prazo de 30 dias do parágrafo anterior para as posteriores — por causa imputável à CONTRATADA, o CONTRATANTE poderá, a seu exclusivo critério, exigir o cumprimento do contrato, aceitar produto equivalente ou rescindir o contrato com restituição integral e imediata dos valores pagos, monetariamente atualizados.`,
      'A CONTRATADA informará por e-mail qualquer alteração relevante do cronograma, com a nova previsão, tão logo dela tenha conhecimento.',
    ],
  },
  {
    n: '5',
    t: 'Direito de arrependimento',
    p: [
      'Por se tratar de contratação fora do estabelecimento comercial, o CONTRATANTE pode desistir da compra em até 7 (sete) dias corridos contados da contratação, nos termos do art. 49 do Código de Defesa do Consumidor, com devolução integral dos valores pagos.',
    ],
  },
  {
    n: '6',
    t: 'Cancelamento e reembolso integral até o envio',
    p: [
      'Além do direito legal de arrependimento, a CONTRATADA concede, por liberalidade contratual, o direito de cancelamento a qualquer tempo até o efetivo envio do produto, com reembolso integral do valor pago, sem multa, retenção ou justificativa.',
      'O pedido de cancelamento é feito pelos canais de atendimento indicados na cláusula 10. O reembolso é processado pelo mesmo meio de pagamento utilizado na compra, em até 10 (dez) dias úteis contados da solicitação, ressalvados os prazos próprios da instituição financeira ou do emissor do cartão.',
      'Após o envio do produto, aplicam-se as regras de troca e devolução previstas no Código de Defesa do Consumidor e a garantia da cláusula 7.',
    ],
  },
  {
    n: '7',
    t: 'Garantia de 12 meses',
    p: [
      'O produto conta com garantia total de 12 (doze) meses contados do recebimento, compreendendo a garantia legal de 90 (noventa) dias para produto durável (art. 26, II, do Código de Defesa do Consumidor) e garantia contratual complementar concedida pela CONTRATADA pelo período remanescente.',
      'A garantia cobre defeitos de fabricação, de componentes e de montagem. Constatado o defeito, a CONTRATADA realizará, sem custo, o reparo ou a substituição da unidade, incluídos os custos de logística.',
      'A garantia não cobre danos decorrentes de mau uso, violação do gabinete por terceiros não autorizados, ligação em tensão diversa da especificada, surtos e descargas elétricas, contato direto com água ou submersão, e desgaste natural de partes consumíveis.',
    ],
  },
  {
    n: '8',
    t: 'Uso do produto e responsabilidade',
    p: [
      'A CONTRATADA desenvolve e comercializa exclusivamente tecnologia de automação e monitoramento para cultivo indoor. A CONTRATADA não comercializa cannabis, sementes, mudas ou derivados, e não faz qualquer promessa de natureza terapêutica.',
      'O CONTRATANTE é o único responsável pela finalidade de uso do equipamento e pela observância da legislação aplicável ao seu projeto, incluindo eventuais autorizações judiciais, sanitárias ou administrativas exigidas.',
      'A instalação elétrica deve respeitar as especificações do manual e a carga máxima por tomada. Instalações em desacordo com o manual afastam a responsabilidade da CONTRATADA por danos a equipamentos conectados.',
    ],
  },
  {
    n: '9',
    t: 'Dados pessoais (LGPD)',
    p: [
      'Os dados pessoais informados são tratados para execução deste contrato, faturamento, entrega, suporte e cumprimento de obrigações legais, com fundamento no art. 7º, incisos II e V, da Lei nº 13.709/2018 (LGPD).',
      `${PROCESSAMENTO_PAGAMENTO} O CPF ou CNPJ é utilizado para emissão de nota fiscal e, junto ao código de uso único enviado por e-mail, para autenticar o CONTRATANTE na área de acompanhamento do pedido.`,
      `${DADOS_NO_PROCESSADOR} A CONTRATADA mantém, na Amazon Web Services, um livro técnico pseudonimizado com HMAC do documento e do IP, identificadores da reserva, slot e provedor, estados financeiro e de notificação, datas e versão contratual. Esse livro não contém nome, e-mail, documento em claro, telefone ou endereço.`,
      'Os controles de risco são retidos por até 48 horas; guardas de reservas liberadas, por 30 dias; efeitos técnicos de webhook, por 400 dias; e guardas de pedidos pagos, reembolsados ou contestados, por até 5 anos, observadas as obrigações legais e o exercício regular de direitos. Slots do lote não expiram para preservar a capacidade e a trilha técnica, sem dados pessoais em claro.',
      'O CONTRATANTE pode exercer os direitos do art. 18 da LGPD — inclusive acesso, correção e eliminação — pelos canais da cláusula 10. A eliminação observa a retenção mínima legal aplicável a documentos fiscais e ao registro do aceite contratual, que a CONTRATADA é obrigada a preservar. Política completa em growx.com.br/privacidade.',
    ],
  },
  {
    n: '10',
    t: 'Atendimento',
    p: [
      'WhatsApp +55 41 99549-4343 e e-mail growx@growx.com.br, em dias úteis. O acompanhamento do pedido está disponível em growx.com.br/prevenda/pedido, mediante e-mail e CPF/CNPJ informados na compra e código de uso único enviado ao e-mail informado.',
    ],
  },
  {
    n: '11',
    t: 'Disposições finais',
    p: [
      'Este instrumento é aceito eletronicamente no ato do pagamento; o aceite, a data e a versão do contrato ficam registrados no processador de pagamento e no livro técnico pseudonimizado da CONTRATADA.',
      'A eventual invalidade de qualquer cláusula não prejudica as demais.',
      'Fica eleito o foro do domicílio do CONTRATANTE para dirimir controvérsias, na forma do art. 101, I, do Código de Defesa do Consumidor.',
    ],
  },
];

export default function ContratoPage() {
  const [lote, setLote] = useState(null);

  useEffect(() => {
    let active = true;
    fetch('/api/lote')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => { if (active && data) setLote(data); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const cobrancaAberta = Boolean(lote?.confiavel && !lote?.esgotado)
    && Date.now() < new Date(OFERTA.checkoutFechamentoISO).getTime();

  return (
    <div style={{ background: BG }} className="prevenda-shell min-h-screen text-white">
      <SEO
        title="Contrato de pré-venda — Módulo Grow-X"
        description={`Minuta da pré-venda do Módulo Grow-X: ${PIX_ENABLED ? 'R$ 2.800 no Pix ou R$ 3.000 no cartão em até 12x' : 'R$ 3.000 no cartão em até 12x de R$ 250'}, entrega a partir de 20/11/2026, reembolso integral até o envio e garantia de 12 meses.`}
        path="/prevenda/contrato"
      />

      <PreVendaHeader />

      <div className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
        <Link to="/prevenda" className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em]" style={{ color: GREEN }}>
          <ArrowLeft aria-hidden="true" size={14} />
          voltar pra pré-venda
        </Link>

        <h1 className="mt-8 text-display-lg font-extrabold text-white">Minuta do contrato de pré-venda</h1>
        <p className="mt-4 text-lg" style={{ color: MUTED }}>
          Módulo Grow-X · versão <strong className="text-white">{CONTRATO_VERSAO}</strong> · atualizada em 5 de agosto de 2026
        </p>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: MUTED }}>
          {cobrancaAberta
            ? 'Cobrança aberta para o lote disponível. O aceite desta versão é registrado no pagamento.'
            : 'Compra ainda não aberta. A ficha técnica, a composição do kit e as condições de frete precisam estar publicadas e aprovadas antes de qualquer cobrança.'}
        </p>

        <a
          href="/prevenda#reservar"
          className="mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition hover:brightness-110"
          style={{ background: GREEN, color: CTA_TEXT }}
        >
          <ShoppingCart aria-hidden="true" size={16} />
          Voltar e comprar
        </a>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            ['Entrega', 'a partir de 20/11/2026'],
            ['Cancelamento', 'reembolso integral até o envio'],
            ['Garantia', '12 meses conforme o contrato'],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl border px-5 py-4" style={{ borderColor: 'rgba(74,222,128,0.24)', background: 'rgba(74,222,128,0.06)' }}>
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em]" style={{ color: GREEN }}>{k}</p>
              <p className="mt-1.5 text-sm font-semibold text-white">{v}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 space-y-10">
          {CLAUSULAS.map(({ n, t, p }) => (
            <section key={n}>
              <h2 className="text-lg font-bold text-white">
                <span className="font-mono" style={{ color: GREEN }}>{n}.</span> {t}
              </h2>
              <div className="mt-4 space-y-3">
                {p.map((texto, i) => (
                  <p key={i} className="text-sm leading-relaxed" style={{ color: MUTED }}>{texto}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-14 rounded-2xl border p-6" style={{ borderColor: LINE, background: 'var(--prevenda-surface)' }}>
          <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
            Quando a cobrança for aberta, o aceite deste contrato será registrado no momento do pagamento, junto ao seu pedido, com data e versão.
            Para consultar o seu pedido e o aceite, acesse a{' '}
            <Link to="/prevenda/pedido" className="font-semibold underline underline-offset-2" style={{ color: GREEN }}>
              área do cliente
            </Link>{' '}
            com o e-mail e o CPF/CNPJ usados na compra e o código de uso único enviado por e-mail.
          </p>
        </div>

        <a
          href="/prevenda#reservar"
          className="mt-8 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition hover:brightness-110"
          style={{ background: GREEN, color: CTA_TEXT }}
        >
          <ShoppingCart aria-hidden="true" size={16} />
          Voltar e comprar
        </a>

        <div className="mt-8 flex flex-wrap gap-4 text-sm" style={{ color: MUTED }}>
          <Link to="/prevenda" className="underline underline-offset-2 transition hover:text-white">Pré-venda</Link>
          <Link to="/prevenda/pedido" className="underline underline-offset-2 transition hover:text-white">Meu pedido</Link>
          <Link to="/privacidade" className="underline underline-offset-2 transition hover:text-white">Privacidade</Link>
          <Link to="/termos" className="underline underline-offset-2 transition hover:text-white">Termos do site</Link>
        </div>

        <p className="mt-10 text-xs" style={{ color: 'var(--prevenda-muted-soft)' }}>
          GROW-X CO. TECNOLOGIAS LTDA · CNPJ 59.183.820/0001-09 · Curitiba/PR · © 2026
        </p>
      </div>
    </div>
  );
}
