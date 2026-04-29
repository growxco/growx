import { Users, GraduationCap, Mail, MessageCircle, Target, Lightbulb, Award, TrendingUp } from 'lucide-react';
import { SEO, Container, Eyebrow, Reveal, GlassCard, Aurora, GridPattern } from '@/components/visual';
import { FeatureGrid, FinalCTA } from '@/components/sections';
import fernandoPhoto from '../assets/fernando_schreiber_ceo.webp';
import jeffersonPhoto from '../assets/jefferson_schreiber_cto.webp';
import julioPhoto from '../assets/julio_calcagnotto_juridico.webp';

const EXECS = [
  {
    name: 'Fernando Schreiber',
    role: 'CEO · Fundador',
    photo: fernandoPhoto,
    bio: 'Arquiteto da transformação da Grow-X no setor de cultivo automatizado. Mestre em Psicologia Social, idealizou a integração entre tecnologia, cultivo e rede de dados — base pra futura IA aplicada ao agro.',
    skills: ['Estratégia de mercado', 'Psicologia social', 'Inovação', 'Liderança'],
  },
  {
    name: 'Jefferson Schreiber',
    role: 'CTO · Diretor de Tecnologia',
    photo: jeffersonPhoto,
    bio: '30+ anos em tecnologia. Lidera o desenvolvimento das estufas automatizadas, sistemas de monitoramento e plataformas digitais que diferenciam a Grow-X.',
    skills: ['Engenharia de software', 'IoT', 'Automação', 'Sistemas embarcados'],
  },
  {
    name: 'Julio Calcagnotto',
    role: 'Diretor Jurídico',
    photo: julioPhoto,
    bio: 'Garante conformidade total com regulamentações do setor. Especialista em direito empresarial e legislação canábica — peça-chave pra operação ética e segura.',
    skills: ['Direito empresarial', 'Legislação canábica', 'Compliance', 'Regulamentações'],
  },
];

const VALUES = [
  { icon: Target, title: 'Visão estratégica', description: 'Liderança com horizonte longo pro crescimento sustentável do agro.' },
  { icon: Lightbulb, title: 'Inovação contínua', description: 'Compromisso com soluções tecnológicas que mudam a régua do setor.' },
  { icon: Award, title: 'Experiência comprovada', description: 'Décadas combinadas em tecnologia e agronegócio.' },
  { icon: TrendingUp, title: 'Excelência operacional', description: 'Qualidade e conformidade em cada operação.' },
];

export default function ExecutivePage() {
  const handleWhatsApp = () => window.open('https://wa.me/5541995494343', '_blank');
  const handleMail = () => window.open('mailto:growx@growx.com.br', '_blank');

  return (
    <>
      <SEO
        title="Executivo — Liderança Grow-X"
        description="Fernando Schreiber, Jefferson Schreiber e Julio Calcagnotto. A liderança que constrói a Grow-X em Curitiba/PR."
        path="/sobre/executivo"
      />

      {/* Hero */}
      <section className="relative isolate overflow-hidden pt-16 pb-16 sm:pt-20 lg:pt-28">
        <Aurora intensity="md" />
        <GridPattern fine mask="bottom" />
        <Container>
          <Reveal className="max-w-3xl">
            <Eyebrow icon={Users}>Liderança & equipe</Eyebrow>
            <h1 className="mt-6 text-display-xl text-foreground">
              O time por trás da <span className="text-emerald-glow">Grow-X.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Liderança formada por engenharia, ciência humana e jurídico. Combinação rara que faz a Grow-X
              traduzir realidade do campo em tecnologia que opera de verdade.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <button onClick={handleMail} className="btn-primary">
                <Mail className="size-4" />
                E-mail corporativo
              </button>
              <button onClick={handleWhatsApp} className="btn-ghost">
                <MessageCircle className="size-4" />
                WhatsApp
              </button>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* Executives stack */}
      <section className="section-y">
        <Container>
          <div className="space-y-12">
            {EXECS.map((e, i) => (
              <Reveal key={e.name} delay={i * 0.06}>
                <GlassCard variant="strong" className="overflow-hidden">
                  <div className="grid items-stretch gap-0 lg:grid-cols-12">
                    <div className={`relative aspect-[4/5] lg:aspect-auto lg:col-span-5 ${i % 2 === 1 ? 'lg:order-2' : ''}`}>
                      <img src={e.photo} alt={e.name} className="absolute inset-0 h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-tr from-background/85 via-background/20 to-transparent" />
                      <div className="absolute bottom-5 left-5">
                        <div className="text-eyebrow text-emerald-glow">{e.role}</div>
                        <div className="mt-1 font-display text-xl font-bold text-foreground">{e.name}</div>
                      </div>
                    </div>
                    <div className={`flex flex-col justify-center p-8 sm:p-10 lg:col-span-7 lg:p-14 ${i % 2 === 1 ? 'lg:order-1' : ''}`}>
                      <p className="text-base leading-relaxed text-foreground/85 sm:text-lg">{e.bio}</p>
                      <div className="mt-7">
                        <div className="flex items-center gap-2 text-eyebrow text-muted-foreground">
                          <GraduationCap className="size-4" />
                          Especialização
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {e.skills.map((s) => (
                            <span key={s} className="chip">{s}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <FeatureGrid
        eyebrow="Diferenciais da liderança"
        title="O que pauta cada decisão."
        intro="Quatro princípios que sustentam a forma como a Grow-X é construída."
        items={VALUES}
        columns={4}
      />

      <FinalCTA />
    </>
  );
}
