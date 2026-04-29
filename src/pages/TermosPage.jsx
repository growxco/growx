import { FileText } from 'lucide-react';
import { SEO, Container, Eyebrow, Reveal, GlassCard, Aurora, GridPattern } from '@/components/visual';

const SECTIONS = [
  {
    title: '1. Aceitação dos termos',
    body: `Ao acessar www.growx.com.br ou usar qualquer serviço da Grow-X Co., você concorda com estes Termos de Uso e com a Política de Privacidade. Se não concordar, por favor não use o site/serviços.`,
  },
  {
    title: '2. Sobre a Grow-X',
    body: `A Grow-X Co. é empresa brasileira de tecnologia (CNPJ a publicar). Atua em duas frentes: (i) Industrial — Supply-X, SPI, SPP e hardware proprietário pra agroindústria; (ii) Cultivo — Grow-X App, Estufa Automatizada, Módulo Sem Fio para cultivo controlado e cannabis medicinal.`,
  },
  {
    title: '3. Cannabis medicinal — esclarecimento jurídico',
    body: `A Grow-X NÃO comercializa cannabis, sementes, flores, óleos ou qualquer produto derivado. Atendemos cultivadores legalmente autorizados (pacientes com habeas corpus, associações autorizadas, prescrições médicas válidas). Toda responsabilidade legal sobre cultivo é do usuário.`,
  },
  {
    title: '4. Não somos prescritores',
    body: `A Grow-X não oferece orientação médica. Conteúdo no site e no app tem caráter informativo e técnico. Decisões clínicas são entre paciente e profissional de saúde habilitado.`,
  },
  {
    title: '5. Conta e responsabilidades do usuário',
    body: `Você é responsável por: (a) manter sigilo de credenciais; (b) usar dentro da legislação aplicável; (c) não tentar burlar segurança/limites; (d) responder por todo conteúdo que publicar.`,
  },
  {
    title: '6. Propriedade intelectual',
    body: `Todo conteúdo, marca, software, hardware, design e documentação Grow-X são protegidos. Uso comercial sem licença é vedado. Insights publicados podem ser citados com atribuição e link.`,
  },
  {
    title: '7. Disponibilidade do serviço',
    body: `Buscamos uptime acima de 99.5% mas não garantimos serviço ininterrupto. Manutenções programadas são comunicadas. Não respondemos por interrupções por força maior, ataques ou falhas de infraestrutura de terceiros.`,
  },
  {
    title: '8. Limitação de responsabilidade',
    body: `Na máxima extensão permitida em lei: a responsabilidade total da Grow-X em qualquer reclamação é limitada ao valor pago pelo serviço nos últimos 12 meses. Não respondemos por danos indiretos, lucros cessantes ou perdas de oportunidade.`,
  },
  {
    title: '9. Foro',
    body: `Estes Termos são regidos pela lei brasileira. Foro eleito: Curitiba/PR.`,
  },
  {
    title: '10. Mudanças nos Termos',
    body: `Podemos atualizar estes Termos. Mudanças relevantes serão notificadas com 15 dias de antecedência por e-mail aos clientes ativos.`,
  },
];

export default function TermosPage() {
  return (
    <>
      <SEO
        title="Termos de uso · Grow-X"
        description="Termos de uso do site e dos serviços Grow-X. Inclui esclarecimentos sobre cannabis medicinal."
        path="/termos"
      />
      <section className="relative isolate overflow-hidden pt-16 pb-16 sm:pt-20 lg:pt-28">
        <Aurora intensity="sm" />
        <GridPattern fine mask="bottom" />
        <Container narrow>
          <Reveal>
            <Eyebrow icon={FileText}>Termos de uso</Eyebrow>
            <h1 className="mt-6 text-display-xl text-foreground">
              Termos de <span className="text-emerald-glow">uso.</span>
            </h1>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Regras de uso do site, serviços e plataforma Grow-X. Em português direto, sem juridiquês.
            </p>
          </Reveal>
        </Container>
      </section>

      <section className="section-y-tight">
        <Container narrow>
          <Reveal>
            <GlassCard variant="strong" className="overflow-hidden">
              <div className="space-y-7 p-8 sm:p-10">
                {SECTIONS.map((s) => (
                  <article key={s.title}>
                    <h2 className="font-display text-lg font-semibold text-foreground sm:text-xl">{s.title}</h2>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{s.body}</p>
                  </article>
                ))}
                <div className="border-t border-foreground/[0.08] pt-6 text-xs text-muted-foreground">
                  Versão 1.0 · Vigente desde 23/04/2026 · Dúvidas: <a href="mailto:juridico@growx.com.br" className="text-emerald-glow hover:underline">juridico@growx.com.br</a>
                </div>
              </div>
            </GlassCard>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
