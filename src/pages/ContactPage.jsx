import { MapPin, Phone, Mail, MessageCircle, Linkedin, Instagram, Facebook, ArrowRight, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO, Container, Eyebrow, Reveal, GlassCard, Aurora, GridPattern, StatusDot, LeadForm } from '@/components/visual';
import { CONTACT, whatsappLink } from '@/lib/crm';
import { analytics } from '@/lib/analytics';

const FIELDS = [
  { name: 'name', label: 'Nome completo', required: true, placeholder: 'Como você se chama?' },
  { name: 'email', label: 'E-mail', type: 'email', required: true, placeholder: 'seu@email.com' },
  { name: 'phone', label: 'Telefone / WhatsApp', type: 'tel', placeholder: '(41) 99999-9999' },
  { name: 'company', label: 'Empresa', placeholder: 'Razão social ou nome' },
  {
    name: 'subject',
    label: 'Sobre o que é?',
    type: 'select',
    required: true,
    options: [
      { value: 'demo', label: 'Quero agendar uma demo' },
      { value: 'parceiro', label: 'Quero ser parceiro' },
      { value: 'imprensa', label: 'Imprensa / pauta' },
      { value: 'suporte', label: 'Suporte / cliente atual' },
      { value: 'investidor', label: 'Investidor / fundo' },
      { value: 'outro', label: 'Outro' },
    ],
  },
  { name: 'message', label: 'Mensagem', type: 'textarea', required: true, placeholder: 'Descreva seu cenário, dúvida ou projeto.' },
];

const SOCIAL = [
  { icon: Linkedin, href: 'https://br.linkedin.com/company/growxco', label: 'LinkedIn' },
  { icon: Instagram, href: 'https://www.instagram.com/grow_x.co', label: 'Instagram' },
  { icon: Facebook, href: 'https://facebook.com/growxco', label: 'Facebook' },
];

export default function ContactPage() {
  const onWhatsApp = () => {
    analytics.ctaWhatsApp('/contato', 'generic');
    window.open(whatsappLink('Olá! Quero conversar sobre a Grow-X.'), '_blank', 'noopener');
  };

  return (
    <>
      <SEO
        title="Contato · Grow-X"
        description="Time Grow-X disponível em Curitiba/PR. WhatsApp, e-mail e formulário direto. Demo, parceria, imprensa, suporte."
        path="/contato"
      />

      <section className="relative isolate overflow-hidden pt-16 pb-16 sm:pt-20 lg:pt-28">
        <Aurora intensity="md" />
        <GridPattern fine mask="bottom" />
        <Container>
          <Reveal className="max-w-3xl">
            <Eyebrow icon={MessageCircle}>Contato</Eyebrow>
            <h1 className="mt-6 text-display-xl text-foreground">
              Vamos conversar sobre sua <span className="text-emerald-glow">operação?</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Quer demo? Use <Link to="/demo" className="text-emerald-glow hover:underline">/demo</Link> que é direto.
              Pra qualquer outra coisa (parceria, imprensa, suporte, investidor), use o canal certo abaixo ou o formulário.
            </p>
            <div className="mt-6">
              <StatusDot label="Atendimento ativo" />
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="section-y-tight">
        <Container>
          <div className="grid gap-5 lg:grid-cols-3">
            {[
              { icon: Calendar, title: 'Demo qualificada', desc: 'Form com triagem BANT, agenda direta com time fundador.', cta: 'Ir pra /demo', to: '/demo' },
              { icon: MessageCircle, title: 'WhatsApp', desc: 'Resposta humana em horário comercial.', cta: 'Abrir WhatsApp', onClick: onWhatsApp },
              { icon: Mail, title: 'E-mail', desc: 'Pra propostas, parcerias e contato comercial estruturado.', cta: CONTACT.email, href: `mailto:${CONTACT.email}` },
            ].map((b, i) => {
              const Icon = b.icon;
              const Wrapper = b.to ? Link : b.href ? 'a' : 'button';
              const props = b.to ? { to: b.to } : b.href ? { href: b.href } : { type: 'button', onClick: b.onClick };
              return (
                <Reveal key={b.title} delay={i * 0.06} className="h-full">
                  <Wrapper
                    {...props}
                    className="group flex h-full w-full flex-col items-start gap-4 rounded-2xl p-7 text-left surface lift hover:border-[oklch(0.700_0.180_145/45%)]"
                  >
                    <span className="inline-flex size-11 items-center justify-center rounded-xl bg-emerald/15 text-emerald-glow ring-hairline">
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{b.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.desc}</p>
                    </div>
                    <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-glow">
                      {b.cta}
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Wrapper>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </section>

      <section className="section-y-tight">
        <Container>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
            <Reveal className="lg:col-span-7">
              <GlassCard variant="strong" className="p-8 sm:p-10">
                <Eyebrow>Formulário</Eyebrow>
                <h2 className="mt-4 text-display-md text-foreground">Envie sua mensagem.</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Resposta em até 1 dia útil. Pra urgências, prefira WhatsApp.
                </p>
                <div className="mt-7">
                  <LeadForm
                    form="contact"
                    segment="other"
                    fields={FIELDS}
                    submitLabel="Enviar mensagem"
                    successTitle="Mensagem recebida."
                    successText="Em até 1 dia útil, alguém do time entra em contato."
                  />
                </div>
              </GlassCard>
            </Reveal>

            <Reveal delay={0.1} className="lg:col-span-5">
              <GlassCard variant="emerald" className="p-8 sm:p-10">
                <Eyebrow>Onde estamos</Eyebrow>
                <h3 className="mt-4 font-display text-2xl font-bold text-foreground">Curitiba/PR</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Time engenharia + agronomia + jurídico, no mesmo prédio, no Batel. Atendimento em português, deploy assistido e adaptação ao seu cenário.
                </p>
                <ul className="mt-6 space-y-4 text-sm">
                  <li className="flex items-start gap-3 text-foreground/85">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-emerald-glow" />
                    <span>Av. Sete de Setembro 4923, sala 1203 · Batel · Curitiba/PR</span>
                  </li>
                  <li className="flex items-start gap-3 text-foreground/85">
                    <Phone className="mt-0.5 size-4 shrink-0 text-emerald-glow" />
                    <a href="tel:+5541995494343" className="hover:text-emerald-glow">+55 (41) 99549-4343</a>
                  </li>
                  <li className="flex items-start gap-3 text-foreground/85">
                    <Mail className="mt-0.5 size-4 shrink-0 text-emerald-glow" />
                    <a href={`mailto:${CONTACT.email}`} className="hover:text-emerald-glow">{CONTACT.email}</a>
                  </li>
                </ul>
                <div className="mt-8 flex items-center gap-2">
                  {SOCIAL.map((s) => {
                    const I = s.icon;
                    return (
                      <a
                        key={s.label}
                        href={s.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={s.label}
                        className="inline-flex size-10 items-center justify-center rounded-lg border border-foreground/10 bg-foreground/5 text-foreground/70 transition-colors hover:border-emerald/40 hover:text-emerald-glow"
                      >
                        <I className="size-4" />
                      </a>
                    );
                  })}
                </div>
              </GlassCard>
            </Reveal>
          </div>
        </Container>
      </section>
    </>
  );
}
