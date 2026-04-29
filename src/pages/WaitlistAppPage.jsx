import { Smartphone, Sparkles, Lock, Users } from 'lucide-react';
import { SEO, Container, Eyebrow, Reveal, GlassCard, Aurora, GridPattern, LeadForm, WaitlistCounter, StatusDot } from '@/components/visual';

const FIELDS = [
  { name: 'name', label: 'Como você se chama', required: true, placeholder: 'Seu nome ou apelido' },
  { name: 'email', label: 'Melhor e-mail', type: 'email', required: true, placeholder: 'seu@email.com' },
  {
    name: 'profile',
    label: 'O que mais combina com você?',
    type: 'select',
    required: true,
    options: [
      { value: 'patient', label: 'Paciente medicinal (HC ou prescrição)' },
      { value: 'grower', label: 'Cultivador estruturado / clube' },
      { value: 'pro', label: 'Cultivo profissional / em escala' },
      { value: 'curious', label: 'Estou estudando o assunto' },
    ],
  },
  {
    name: 'setup',
    label: 'Setup atual',
    type: 'select',
    options: [
      { value: 'none', label: 'Ainda não cultivo' },
      { value: 'indoor', label: 'Indoor / estufa' },
      { value: 'outdoor', label: 'Outdoor' },
      { value: 'mixed', label: 'Mista' },
    ],
  },
  { name: 'notes', label: 'Quer adicionar algo?', type: 'textarea', placeholder: 'O que você espera do Grow-X App?' },
];

const PERKS = [
  { icon: Sparkles, t: 'Acesso antecipado', d: 'Você entra antes do lançamento público.' },
  { icon: Users, t: 'Comunidade fechada', d: 'Discord + grupo de mentoria com o time Grow-X.' },
  { icon: Lock, t: 'Convite pra beta', d: 'Quem se cadastrar primeiro entra no beta privado.' },
];

export default function WaitlistAppPage() {
  return (
    <>
      <SEO
        title="Lista de espera · Grow-X App"
        description="Cultivo controlado e cannabis medicinal com padrão farmacêutico. Acesso antecipado, comunidade e beta privado."
        path="/lista-espera-app"
      />

      <section className="relative isolate overflow-hidden pt-16 pb-16 sm:pt-20 lg:pt-28">
        <Aurora intensity="lg" />
        <GridPattern fine mask="bottom" />
        <Container>
          <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-6">
              <Reveal>
                <Eyebrow icon={Smartphone}>Grow-X App · pré-lançamento</Eyebrow>
              </Reveal>
              <Reveal delay={0.06}>
                <h1 className="mt-6 text-display-xl text-foreground">
                  Cultivo controlado com <span className="text-emerald-glow">padrão farmacêutico.</span>
                </h1>
              </Reveal>
              <Reveal delay={0.14}>
                <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
                  IoT + IA + comunidade. O 1º clube canábico virtual do Brasil. Lança em Nov/2026 — entra agora pra ter
                  acesso antecipado e influenciar o produto.
                </p>
              </Reveal>
              <Reveal delay={0.22}>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <WaitlistCounter base={412} />
                  <StatusDot label="Beta privado · próximas 4 semanas" />
                </div>
              </Reveal>

              <div className="mt-10 space-y-3">
                {PERKS.map((p, i) => {
                  const Icon = p.icon;
                  return (
                    <Reveal key={p.t} delay={0.3 + i * 0.05}>
                      <div className="flex items-start gap-4 rounded-2xl glass p-5 ring-hairline">
                        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald/15 text-emerald-glow ring-hairline">
                          <Icon className="size-4" />
                        </span>
                        <div>
                          <div className="text-sm font-semibold text-foreground">{p.t}</div>
                          <div className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">{p.d}</div>
                        </div>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            </div>

            <Reveal delay={0.18} className="lg:col-span-6">
              <GlassCard variant="emerald" className="p-7 sm:p-9">
                <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">Entrar na lista de espera.</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Sem spam. Mandamos só o essencial: convite, beta, lançamento.
                </p>
                <div className="mt-6">
                  <LeadForm
                    form="waitlist-app"
                    segment="cultivo"
                    fields={FIELDS}
                    submitLabel="Quero entrar na lista"
                    successTitle="Você está na lista."
                    successText="Em breve você recebe convite pro Discord da comunidade e instruções pro beta privado."
                  />
                </div>
              </GlassCard>
            </Reveal>
          </div>
        </Container>
      </section>
    </>
  );
}
