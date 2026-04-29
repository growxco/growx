import {
  Brain, Wifi, ShoppingCart, Camera, BarChart3, MessageCircle,
  Shield, Clock, Zap, Leaf, Users,
} from 'lucide-react';
import { SEO, softwareSchema } from '@/components/visual';
import { PageHero, FeatureGrid, MetricStrip, UseCases, FinalCTA, LiveTicker } from '@/components/sections';
import growxAppHero from '../assets/growx-app-hero-v2.webp';

const MAIN_FEATURES = [
  { icon: Wifi, title: 'Controle remoto de estufas', description: 'Monitore e controle suas estufas de qualquer lugar via IoT.' },
  { icon: Brain, title: 'IA pra otimização', description: 'Inteligência que aprende com seu cultivo e sugere melhorias.' },
  { icon: Users, title: 'Rede social pra growers', description: 'Comunidade exclusiva pra trocar experiência e aprender.' },
  { icon: ShoppingCart, title: 'Marketplace integrado', description: 'Compre e venda genética, equipamentos e insumos no app.' },
];

const APP_FEATURES = [
  { icon: Camera, title: 'Diário de cultivo', description: 'Registre o progresso com fotos, anotações e marcos.' },
  { icon: BarChart3, title: 'Analytics avançado', description: 'Métricas de crescimento, consumo e produtividade.' },
  { icon: MessageCircle, title: 'Chat com especialistas', description: 'Tire dúvidas com agrônomos e referências em cannabis.' },
  { icon: Shield, title: 'Cultivo legal', description: 'Ferramentas pra manter o cultivo dentro da legalidade.' },
  { icon: Clock, title: 'Cronogramas automáticos', description: 'Lembretes e cronogramas por fase de cultivo.' },
  { icon: Zap, title: 'Automação completa', description: 'Integração total com hardware Grow-X.' },
];

const METRICS = [
  { value: 'Ambiente ideal', label: 'Clima, luz e irrigação no ponto certo' },
  { value: 'Alertas', label: 'Receba avisos no momento exato' },
  { value: 'Controle remoto', label: 'Gerencie sua estufa de onde estiver' },
  { value: 'Produtividade', label: 'Cultive mais com dados precisos' },
];

export default function GrowXAppPage() {
  return (
    <>
      <SEO
        title="Grow-X App — Cultivo controlado e cannabis medicinal"
        description="Solução completa de monitoramento e gestão pra cannabis medicinal e cultivo controlado. IA, IoT e comunidade brasileira."
        path="/solucoes/growx-app"
        jsonLd={softwareSchema({
          name: 'Grow-X App',
          description: 'Plataforma de cultivo controlado e cannabis medicinal: IoT, IA, marketplace e comunidade.',
          applicationCategory: 'HealthApplication',
          os: 'iOS, Android, Web',
        })}
      />

      <PageHero
        eyebrow="Solução · Grow-X App"
        eyebrowIcon={Leaf}
        title={<>Cultivo <span className="text-emerald-glow">controlado</span> com padrão farmacêutico.</>}
        intro="Solução pra pacientes medicinais, cultivadores estruturados e operações em escala. Hardware + software + comunidade — tudo brasileiro."
        primaryCta={{ label: 'Lista de espera', href: '/contato' }}
        secondaryCta={{ label: 'Falar com especialista', href: '/contato' }}
        image={growxAppHero}
        imageAlt="Grow-X App"
        status="Pré-lançamento · Nov 2026"
      />

      <LiveTicker />
      <MetricStrip items={METRICS} />

      <FeatureGrid
        eyebrow="Recursos principais"
        title="Tecnologia desenhada pra cannabis."
        intro="Quatro pilares que diferenciam o Grow-X App de qualquer ferramenta genérica."
        items={MAIN_FEATURES}
        columns={4}
      />

      <FeatureGrid
        eyebrow="Funcionalidades completas"
        title="Tudo que cultivo profissional exige."
        items={APP_FEATURES}
      />

      <UseCases
        eyebrow="Para quem é"
        title="Três perfis. Mesma plataforma."
        intro="Da paciente que cultiva sua dose ao projeto comercial estruturado — adaptável a cada operação."
        items={[
          { title: 'Pacientes medicinais', description: 'Cultivo controlado e documentado pra uso medicinal com rastreabilidade clínica.', points: ['Dosagem precisa', 'Qualidade garantida', 'Documentação médica'] },
          { title: 'Growers estruturados', description: 'Ferramentas profissionais pra cultivo doméstico com resultado de operação séria.', points: ['Cultivo otimizado', 'Comunidade ativa', 'Suporte técnico'] },
          { title: 'Projetos em escala', description: 'Soluções escaláveis pra operações maiores e mais complexas.', points: ['Multi-estufa', 'Gestão completa', 'Relatórios avançados'] },
        ]}
      />

      <UseCases
        eyebrow="Comunidade"
        title="Não é só app — é clube."
        intro="O primeiro clube canábico virtual do Brasil. Diário de cultivo, marketplace, mentoria e troca real entre quem cultiva."
        items={[
          { title: 'Diário de cultivo', description: 'Compartilhe e acompanhe diários de outros growers pra aprender com prática real.', points: ['Histórico por planta', 'Comparação por strain', 'Lições aprendidas'] },
          { title: 'Aprendizado contínuo', description: 'Acesso a experiência consolidada — dos referências do cultivo brasileiro.', points: ['Conteúdo curado', 'Mentoria estruturada', 'Troca de protocolo'] },
          { title: 'Crescimento colaborativo', description: 'Cultive melhor com apoio de quem já passou pelos mesmos desafios.', points: ['Fórum técnico', 'Eventos', 'Ranking'] },
        ]}
      />

      <FinalCTA />
    </>
  );
}
