import { Link } from 'react-router-dom';
import { ShieldCheck, FileCheck2, Stethoscope, Lock, ArrowRight } from 'lucide-react';
import { SEO, Container, Eyebrow, Reveal, Aurora, GridPattern, StatusDot } from '@/components/visual';
import { FeatureGrid, UseCases, FAQ, FinalCTA, LiveTicker } from '@/components/sections';

const PILLARS = [
  { icon: ShieldCheck, title: 'Padrão farmacêutico', description: 'Climatização, iluminação, irrigação e logger documentando cada parâmetro do ciclo.' },
  { icon: FileCheck2, title: 'Documentação clínica', description: 'Trilha digital por planta, fenótipo e lote — pronta pra prescritor ou auditoria.' },
  { icon: Stethoscope, title: 'Conformidade regulatória', description: 'Estrutura compatível com práticas exigidas em pareceres e habeas corpus.' },
  { icon: Lock, title: 'Privacidade por padrão', description: 'Dados sensíveis criptografados; LGPD-compliant; visibilidade controlada pelo paciente.' },
];

const FAQS = [
  {
    q: 'A Grow-X comercializa cannabis ou produtos derivados?',
    a: 'Não. A Grow-X é empresa de tecnologia. O Grow-X App e nosso hardware atendem cultivadores legais (pacientes com habeas corpus, associações autorizadas e operações com prescrição). Não vendemos planta, semente, flor ou óleo.',
  },
  {
    q: 'Posso usar o Grow-X App se tenho habeas corpus pra cultivo?',
    a: 'Sim — esse é exatamente um dos públicos centrais. O app foi desenhado pra registrar e documentar cada ciclo de forma a sustentar relatórios médicos e auditoria.',
  },
  {
    q: 'O hardware Grow-X funciona em estufa pequena, doméstica?',
    a: 'Sim. A Estufa Automatizada vem em tamanhos de 2×2m a 4×4m. O Módulo Sem Fio controla até 4 estufas, ideal pra cultivos domésticos e pequenas associações.',
  },
  {
    q: 'A documentação que o app gera serve pra apresentar a um médico?',
    a: 'Sim. O diário inclui foto, métricas climáticas, intervenções e linha do tempo por planta. É o que prescritores precisam pra acompanhamento longitudinal.',
  },
  {
    q: 'Vocês oferecem orientação médica?',
    a: 'Não. Não somos prescritores. O Grow-X conecta cultivadores a profissionais de saúde via comunidade, mas qualquer decisão clínica é entre paciente e médico.',
  },
  {
    q: 'Qual o status legal do cultivo medicinal hoje no Brasil?',
    a: 'O cultivo é permitido via autorização judicial (habeas corpus) ou em associações autorizadas. A Grow-X opera dentro desse marco. Para detalhes jurídicos, consulte nosso diretor jurídico ou seu advogado.',
  },
];

export default function CannabisMedicinalPage() {
  return (
    <>
      <SEO
        title="Cannabis medicinal · Cultivo controlado com padrão farmacêutico"
        description="Tecnologia Grow-X para pacientes com HC, associações e cultivo medicinal estruturado. Hardware, app e documentação clínica."
        path="/cannabis-medicinal"
      />

      <section className="relative isolate overflow-hidden pt-16 pb-16 sm:pt-20 lg:pt-28">
        <Aurora intensity="md" />
        <GridPattern fine mask="bottom" />
        <Container>
          <Reveal className="max-w-3xl">
            <Eyebrow icon={Stethoscope}>Cannabis medicinal</Eyebrow>
            <h1 className="mt-6 text-display-xl text-foreground">
              Cultivo medicinal com <span className="text-emerald-glow">padrão farmacêutico.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Para pacientes com HC, associações autorizadas e operações que exigem rastreabilidade clínica:
              hardware proprietário, app de documentação por planta e comunidade séria.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/lista-espera-app" className="btn-primary">
                Lista de espera medicinal
                <ArrowRight className="size-4" />
              </Link>
              <Link to="/contato" className="btn-ghost">Falar com especialista</Link>
              <StatusDot label="Diretor jurídico interno · cannabis & agro" />
            </div>
            <p className="mt-6 max-w-xl text-xs leading-relaxed text-muted-foreground">
              <strong>Importante:</strong> a Grow-X não comercializa cannabis nem oferece orientação médica.
              Conteúdo informativo. Decisões clínicas são entre paciente e prescritor.
            </p>
          </Reveal>
        </Container>
      </section>

      <LiveTicker />

      <FeatureGrid
        eyebrow="O que muda com a Grow-X"
        title="Quatro camadas — uma operação clínica."
        items={PILLARS}
        columns={4}
      />

      <UseCases
        eyebrow="Para quem é"
        title="Três perfis de cultivo medicinal."
        items={[
          { title: 'Paciente com HC', description: 'Cultivo individual com documentação que sustenta acompanhamento médico e renovação judicial.', points: ['Diário por planta', 'Trilha climática', 'Backup criptografado'] },
          { title: 'Associação autorizada', description: 'Operação multi-paciente com gestão centralizada, governança de produção e relatório por associado.', points: ['Multi-tenant', 'Auditoria', 'Compliance'] },
          { title: 'Operação estruturada', description: 'Projeto comercial com prescrição médica e exigência de padrão farmacêutico do início ao fim.', points: ['Multi-estufa', 'API', 'Suporte dedicado'] },
        ]}
      />

      <FAQ
        eyebrow="Perguntas frequentes"
        title="O que pacientes e associações perguntam."
        items={FAQS}
      />

      <FinalCTA />
    </>
  );
}
