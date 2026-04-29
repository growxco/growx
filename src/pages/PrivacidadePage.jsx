import { ShieldCheck } from 'lucide-react';
import { SEO, Container, Eyebrow, Reveal, GlassCard, Aurora, GridPattern } from '@/components/visual';

const SECTIONS = [
  {
    title: '1. Quem somos',
    body: `A Grow-X Co. é controladora dos dados pessoais coletados neste site (www.growx.com.br). Sediada em Av. Sete de Setembro 4923, sala 1203, Batel, Curitiba/PR. Encarregado de Dados (DPO): Julio Calcagnotto — privacidade@growx.com.br.`,
  },
  {
    title: '2. Quais dados coletamos',
    body: `(a) Dados de identificação fornecidos voluntariamente em formulários (nome, e-mail, telefone, empresa, cargo, segmento). (b) Dados de navegação (cookies analíticos, IP anonimizado, dispositivo, páginas visitadas) — apenas com seu consentimento. (c) UTMs de campanhas que trouxeram você até aqui.`,
  },
  {
    title: '3. Para que usamos',
    body: `(a) Responder seu contato e qualificar sua demanda comercial. (b) Personalizar conteúdo e comunicação por segmento (industrial / cultivo / parceiro). (c) Mensurar performance do site e melhorar a experiência. (d) Operar a plataforma Grow-X quando você for cliente. (e) Cumprir obrigações legais e regulatórias.`,
  },
  {
    title: '4. Base legal (LGPD Art. 7)',
    body: `Consentimento (cookies não-essenciais, newsletter), execução de contrato (clientes), legítimo interesse (qualificação comercial e segurança), cumprimento de obrigação legal.`,
  },
  {
    title: '5. Com quem compartilhamos',
    body: `Apenas com operadores estritamente necessários: HubSpot/Brevo (CRM), Google Analytics 4 (analytics), Vercel (hosting + analytics), Microsoft Clarity (heatmap), Meta/LinkedIn (apenas se você consentir cookies de marketing). Nunca vendemos seus dados.`,
  },
  {
    title: '6. Por quanto tempo guardamos',
    body: `Leads não convertidos: 24 meses. Clientes ativos: durante a vigência do contrato + 5 anos para fins fiscais. Dados de navegação: 14 meses. Você pode pedir exclusão antes via privacidade@growx.com.br.`,
  },
  {
    title: '7. Seus direitos (LGPD Art. 18)',
    body: `Você pode: confirmar a existência de tratamento, acessar seus dados, corrigir, anonimizar, bloquear, eliminar, portar, revogar consentimento, ser informado sobre compartilhamentos. Atendemos em até 15 dias.`,
  },
  {
    title: '8. Cookies',
    body: `Usamos cookies essenciais (funcionamento do site) e analíticos/marketing apenas com consentimento. Você gerencia sua escolha pelo banner de cookies ou em /cookies.`,
  },
  {
    title: '9. Crianças',
    body: `O site não é direcionado a menores de 18. Não coletamos dados de menores intencionalmente. Se identificarmos, excluímos imediatamente.`,
  },
  {
    title: '10. Segurança',
    body: `HTTPS em toda navegação, dados sensíveis criptografados em trânsito e em repouso, controle de acesso por papel, logs de auditoria, plano de resposta a incidente.`,
  },
  {
    title: '11. Cannabis medicinal — observação especial',
    body: `Dados de pacientes que cultivam por habeas corpus ou prescrição são tratados com sigilo médico-equivalente. O Grow-X App roda criptografia ponto-a-ponto para diários clínicos. Nunca compartilhamos com terceiros sem ordem judicial.`,
  },
  {
    title: '12. Atualizações desta política',
    body: `Esta política pode ser atualizada. Notificamos mudanças relevantes por e-mail aos cadastrados. Versão vigente sempre publicada aqui com data abaixo.`,
  },
];

export default function PrivacidadePage() {
  return (
    <>
      <SEO
        title="Política de privacidade · Grow-X"
        description="Como a Grow-X trata seus dados pessoais. LGPD-compliant. DPO: Julio Calcagnotto."
        path="/privacidade"
      />
      <section className="relative isolate overflow-hidden pt-16 pb-16 sm:pt-20 lg:pt-28">
        <Aurora intensity="sm" />
        <GridPattern fine mask="bottom" />
        <Container narrow>
          <Reveal>
            <Eyebrow icon={ShieldCheck}>Privacidade · LGPD</Eyebrow>
            <h1 className="mt-6 text-display-xl text-foreground">
              Política de <span className="text-emerald-glow">privacidade.</span>
            </h1>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Como a Grow-X trata seus dados pessoais. Escrita em português direto, sem juridiquês desnecessário.
              Em vigor desde 23/04/2026.
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
                  <p>
                    Versão 1.0 · Vigente desde 23/04/2026 · Para exercer seus direitos LGPD ou tirar dúvidas:
                    {' '}<a href="mailto:privacidade@growx.com.br" className="text-emerald-glow hover:underline">privacidade@growx.com.br</a>.
                  </p>
                  <p className="mt-2">
                    <strong className="text-foreground/80">Importante:</strong> esta política é um documento operacional.
                    Para análise jurídica formal específica do seu caso (ex.: cliente B2B em DPA), entre em contato direto.
                  </p>
                </div>
              </div>
            </GlassCard>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
