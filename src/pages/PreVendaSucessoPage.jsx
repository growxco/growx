import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, MessageCircle } from 'lucide-react';
import { SEO, Container, GlassCard, Reveal, StatusDot } from '@/components/visual';
import { track } from '@/lib/analytics';

const WHATSAPP = 'https://wa.me/5541995494343?text=Acabei%20de%20garantir%20meu%20M%C3%B3dulo%20Grow-X%20na%20pr%C3%A9-venda';

export default function PreVendaSucessoPage() {
  const [params] = useSearchParams();
  const sessionId = params.get('session_id') || '';
  const [info, setInfo] = useState(null);

  useEffect(() => {
    if (!sessionId) return;
    // Evita disparar conversão duplicada em refresh
    const fired = sessionStorage.getItem(`gx-purchase-${sessionId}`);
    fetch(`/api/checkout?session_id=${encodeURIComponent(sessionId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setInfo(data);
        if (!fired && data.payment_status === 'paid') {
          sessionStorage.setItem(`gx-purchase-${sessionId}`, '1');
          track('purchase', {
            value: (data.amount_total || 0) / 100,
            currency: (data.currency || 'brl').toUpperCase(),
            sku: data.sku || 'founder',
            page: '/prevenda/sucesso',
          });
        }
      })
      .catch(() => {});
  }, [sessionId]);

  const paid = info?.payment_status === 'paid';
  const isReserva = info?.sku === 'reserva';

  return (
    <>
      <SEO title="Pedido confirmado — Pré-venda Módulo Grow-X" path="/prevenda/sucesso" noIndex />
      <section className="relative isolate overflow-hidden pt-20 pb-24 lg:pt-28">
        <Container narrow>
          <Reveal className="text-center">
            <CheckCircle2 className="mx-auto size-14 text-emerald-glow" />
            <h1 className="mt-6 text-display-xl text-foreground">
              {paid ? 'Você está dentro.' : 'Recebemos seu pedido.'}
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              {paid
                ? isReserva
                  ? 'Sua reserva do Módulo Grow-X está garantida. Você receberá o recibo da Stripe por email e nosso time entra em contato pra formalizar a posição no lote.'
                  : 'Sua unidade Founder do Módulo Grow-X está garantida. Você receberá o recibo da Stripe por email — e a entrega começa em 20/11/2026, no lançamento da ExpoCannabis Brasil.'
                : 'Se o pagamento foi concluído, o recibo da Stripe chega no seu email em instantes. Qualquer coisa, chama a gente no WhatsApp.'}
            </p>
          </Reveal>

          <Reveal delay={0.1} className="mt-10">
            <GlassCard variant="surface" className="p-6 sm:p-8">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Próximos passos</h2>
              <ol className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
                <li><strong className="text-foreground">1.</strong> Recibo e confirmação da Stripe chegam no seu email.</li>
                <li><strong className="text-foreground">2.</strong> Nosso time chama você no WhatsApp pra confirmar dados de entrega e liberar o acesso antecipado ao app.</li>
                <li><strong className="text-foreground">3.</strong> Entrega (ou retirada na ExpoCannabis Brasil, se preferir) a partir de 20/11/2026.</li>
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
            <StatusDot label="Lote Founder · ExpoCannabis 2026" className="ml-1 hidden sm:inline-flex" />
          </Reveal>
        </Container>
      </section>
    </>
  );
}
