import { Link } from 'react-router-dom';
import { ExternalLink, Factory, Tractor, Sprout, ShieldCheck, ArrowRight } from 'lucide-react';
import { Section, GlassCard, Reveal } from '@/components/visual';
import { analytics } from '@/lib/analytics';
import { APP_PORTAL_URLS, CORPORATE_CONTACT_PATH } from '@/lib/portalLinks';
import spiScreen from '@/assets/real-spi-app.webp';
import sppScreen from '@/assets/real-spp-app.webp';
import gxpScreen from '@/assets/real-gxp-app.webp';

const PORTALS = [
  {
    name: 'SPI',
    key: 'spi',
    label: 'Empresa',
    href: APP_PORTAL_URLS.spi,
    contactHref: CORPORATE_CONTACT_PATH,
    icon: Factory,
    title: 'Empresa entra em contato. Cliente acessa o portal.',
    description: 'SPI é venda corporativa: diagnóstico, escopo e implantação. O portal fica para operação autorizada da indústria.',
    chips: ['B2B', 'Qualidade', 'ERP'],
    image: spiScreen,
    primaryLabel: 'Solicitar acesso corporativo',
  },
  {
    name: 'SPP',
    key: 'spp',
    label: 'Produtores',
    href: APP_PORTAL_URLS.spp,
    icon: Tractor,
    title: 'Assinatura para gestão agrícola.',
    description: 'O produtor entra direto no SPP para organizar talhão, safra, clima, diário e decisões agronômicas.',
    chips: ['Assinatura', 'Talhão', 'Safra'],
    image: sppScreen,
    primaryLabel: 'Assinar SPP',
  },
  {
    name: 'GXP',
    key: 'gxp',
    label: 'Cultivo controlado',
    href: APP_PORTAL_URLS.gxp,
    icon: Sprout,
    title: 'Assinatura para o clube de cultivo.',
    description: 'GXP é o app de cultivo, evidência, comunidade e jornada do grower. A entrada principal é assinatura.',
    chips: ['Assinatura', 'Ciclos', 'Comunidade'],
    image: gxpScreen,
    primaryLabel: 'Assinar GXP',
  },
];

export default function AppPortals() {
  return (
    <Section
      id="portais"
      eyebrow="Portais digitais"
      title={<>Os aplicativos da <span className="text-emerald-glow">Grow-X Co.</span></>}
      intro="O site apresenta a companhia e roteia tráfego. A assinatura acontece em SPP/GXP; SPI é contato corporativo com a Grow-X."
      size="tight"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {PORTALS.map((portal, index) => {
          const Icon = portal.icon;
          return (
            <Reveal key={portal.name} delay={index * 0.06} className="h-full">
              <GlassCard
                variant="strong"
                className="group flex h-full flex-col overflow-hidden p-0 transition-all duration-300 hover:-translate-y-1 hover:border-[oklch(0.700_0.180_145/45%)] hover:shadow-glow-md"
              >
                <div className="relative aspect-[16/10] overflow-hidden border-b border-foreground/10 bg-foreground/[0.03]">
                  <img src={portal.image} alt={`Tela real do ${portal.name}`} className="h-full w-full object-cover object-top" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/55 via-transparent to-transparent" />
                </div>

                <div className="flex items-start justify-between gap-4 px-6 pt-6 sm:px-7">
                  <span className="inline-flex size-12 items-center justify-center rounded-xl bg-emerald/15 text-emerald-glow ring-hairline">
                    <Icon className="size-5" />
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/10 bg-foreground/[0.03] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {portal.label}
                    <ExternalLink className="size-3" />
                  </span>
                </div>

                <div className="mt-7 px-6 sm:px-7">
                  <div className="font-display text-3xl font-bold text-foreground">{portal.name}</div>
                  <h3 className="mt-3 text-xl font-semibold leading-tight text-foreground">{portal.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{portal.description}</p>
                </div>

                <div className="mt-6 flex flex-wrap gap-1.5 px-6 sm:px-7">
                  {portal.chips.map((chip) => (
                    <span key={chip} className="chip-muted">{chip}</span>
                  ))}
                </div>

                <div className="mt-auto flex flex-col gap-2 px-6 pb-6 pt-7 sm:px-7">
                  {portal.contactHref ? (
                    <Link to={portal.contactHref} onClick={() => analytics.ctaSpiEnterpriseContact('/')} className="btn-primary w-full justify-center">
                      {portal.primaryLabel}
                      <ArrowRight className="size-4" />
                    </Link>
                  ) : (
                    <a
                      href={portal.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      onClick={() => {
                        analytics.externalAppOpen(portal.key, '/');
                        if (portal.key === 'spp') analytics.ctaSppSubscription('/');
                        if (portal.key === 'gxp') analytics.ctaGxpSubscription('/');
                      }}
                      className="btn-primary w-full justify-center"
                    >
                      {portal.primaryLabel}
                      <ExternalLink className="size-4" />
                    </a>
                  )}
                  {portal.contactHref && (
                    <a href={portal.href} target="_blank" rel="noreferrer noopener" onClick={() => analytics.externalAppOpen(portal.key, '/')} className="btn-ghost w-full justify-center">
                      Abrir portal SPI
                    </a>
                  )}
                </div>
              </GlassCard>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={0.24}>
        <GlassCard variant="emerald" className="mt-5 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-background/45 text-emerald-glow ring-hairline">
              <ShieldCheck className="size-4" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-foreground">Tráfego certo para o lugar certo.</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                SPP e GXP vendem assinatura. SPI qualifica empresa antes de liberar acesso operacional.
              </p>
            </div>
          </div>
          <Link to={CORPORATE_CONTACT_PATH} className="btn-primary shrink-0">Contato corporativo SPI</Link>
        </GlassCard>
      </Reveal>
    </Section>
  );
}
