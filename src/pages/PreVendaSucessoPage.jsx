import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, MessageCircle } from 'lucide-react';
import { SEO, Container, GlassCard, Reveal, StatusDot } from '@/components/visual';
import { track } from '@/lib/analytics';

const WHATSAPP = 'https://wa.me/5541995494343?text=Acabei%20de%20garantir%20meu%20M%C3%B3dulo%20Grow-X%20na%20pr%C3%A9-venda';

export default function PreVendaSucessoPage() {
  const [params] = useSearchParams();
  // Stripe: ?session_id=cs_...  ·  Mercado Pago: ?payment_id=...&status=approved (ou collection_id)
  const sessionId = params.get('session_id') || '';
  const mpPaymentId = params.get('payment_id') || params.get('collection_id') || '';
  const [info, setInfo] = useState(null);

  useEffect(() => {
    const ref = sessionId
      ? `session_id=${encodeURIComponent(sessionId)}`
      : mpPaymentId
        ? `payment_id=${encodeURIComponent(mpPaymentId)}`
        : null;
    if (!ref) return;
    const dedupeKey = `gx-purchase-${sessionId || mpPaymentId}`;
    fetch(`/api/checkout?${ref}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setInfo(data);
        if (!sessionStorage.getItem(dedupeKey) && data.payment_status === 'paid') {
          sessionStorage.setItem(dedupeKey, '1');
          track('purchase', {
            value: (data.amount_total || 0) / 100,
            currency: (data.currency || 'brl').toUpperCase(),
            sku: data.sku || 'prevenda',
            page: '/prevenda/sucesso',
          });
        }
      })
      .catch(() => {});
  }, [sessionId, mpPaymentId]);

  const paid = info?.payment_status === 'paid';
  const pending = info && !paid; // Pix aguardando compensação, por exemplo

  return (
    <>
      <SEO title="Pedido confirmado — Pré-venda Módulo Grow-X" path="/prevenda/sucesso" noIndex />
      <section className="relative isolate overflow-hidden pt-20 pb-24 lg:pt-28">
        <Container narrow>
          <Reveal className="text-center">
            <CheckCircle2 className="mx-auto size-14 text-emerald-glow" />
            <h1 className="mt-6 text-display-xl text-foreground">
              {paid ? 'Você está dentro.' : pending ? 'Quase lá — pagamento em processamento.' : 'Recebemos seu pedido.'}
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              {paid
                ? 'Sua unidade do Módulo Grow-X está garantida no preço de pré-venda — com 3 meses de GXP Premium inclusos. O recibo chega no seu email e nosso time te chama no WhatsApp pra confirmar a entrega.'
                : pending
                  ? 'Seu pagamento está sendo confirmado (Pix pode levar alguns instantes). Assim que compensar, você recebe o recibo por email — sua posição já está registrada.'
                  : 'Se o pagamento foi concluído, o recibo chega no seu email em instantes. Qualquer coisa, chama a gente no WhatsApp.'}
            </p>
          </Reveal>

          <Reveal delay={0.1} className="mt-10">
            <GlassCard variant="surface" className="p-6 sm:p-8">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Próximos passos</h2>
              <ol className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
                <li><strong className="text-foreground">1.</strong> Recibo e confirmação do pagamento chegam no seu email.</li>
                <li><strong className="text-foreground">2.</strong> Nosso time chama você no WhatsApp pra confirmar dados de entrega.</li>
                <li><strong className="text-foreground">3.</strong> Em outubro, o GXP lança — seus 3 meses de Premium ativam automaticamente.</li>
                <li><strong className="text-foreground">4.</strong> A partir de 20/11: módulo entregue, ou retirada em mãos na ExpoCannabis Brasil.</li>
              </ol>
            </GlassCard>
          </Reveal>

          <Reveal delay={0.18} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href={WHATSAPP} target="_blank" rel="noreferrer noopener" className="btn-primary">
              <MessageCircle className="size-4" />
              Falar com o time agora
            </a>
            <Link to="/" className="btn-ghost">
              Voltar ao site
              <ArrowRight className="size-4" />
            </Link>
            <StatusDot label="Pré-venda · ExpoCannabis 2026" className="ml-1 hidden sm:inline-flex" />
          </Reveal>
        </Container>
      </section>
    </>
  );
}
