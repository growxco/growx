import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Factory, 
  TrendingUp, 
  Shield, 
  BarChart3,
  Truck,
  Cog,
  AlertTriangle,
  Users,
  Clock,
  DollarSign,
  CheckCircle,
  ArrowRight,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import spiHero from '../assets/spi-hero-industrial.png';
import spiDashboard from '../assets/spi-dashboard-industrial.jpg';
import spiMetrics from '../assets/spi-factory-metrics.jpg';

const SPIPage = () => {
  const handleWhatsApp = () => {
    window.open('https://wa.me/5541995494343', '_blank');
  };

  const benefits = [
  {
    icon: DollarSign,
    title: 'Reduza Insumos com Inteligência',
    description: 'Planeje com dados reais e elimine desperdícios operacionais de forma progressiva',
    metric: 'Economia recorrente',
    details: [
      'Planejamento com base em histórico de produção',
      'Evita desperdícios por falhas operacionais',
      'Apoia decisões logísticas com dados confiáveis'
    ]
  },
  {
    icon: Truck,
    title: 'Conecte sua Logística em Tempo Real',
    description: 'Mais fluidez no fluxo entre campo, transporte, armazenagem e indústria',
    metric: 'Operação sem gargalos',
    details: [
      'Agendamento digital de entregas',
      'Visualização antecipada de falhas',
      'Interface com sistemas externos (API)'
    ]
  },
  {
    icon: Factory,
    title: 'Garanta Estabilidade Operacional',
    description: 'Detecte atrasos e riscos antes que impactem o processo industrial',
    metric: 'Menos paradas, mais produção',
    details: [
      'Notificações em tempo real',
      'Comunicação proativa com a fábrica',
      'Relatórios de acompanhamento'
    ]
  },
  {
    icon: Users,
    title: 'Tenha Rastreabilidade de Ponta a Ponta',
    description: 'Organize toda a comunicação com registro automático e histórico acessível',
    metric: 'Transparência total',
    details: [
      'Acesso a dados e documentos por carga',
      'Organização da comunicação por evento',
      'Visibilidade compartilhada entre todos os elos'
    ]
  }
];

  const features = [
    {
      icon: BarChart3,
      title: 'Dashboard Operacional',
      description: 'Visualização centralizada de status logístico e indicadores de recebimento'
    },
    {
      icon: Cog,
      title: 'Automação de Agendamentos',
      description: 'Fluxo automatizado de eventos com notificações e confirmações de etapas'
    },
    {
      icon: AlertTriangle,
      title: 'Alertas Antecipados',
      description: 'Problemas operacionais são detectados antes de gerar impacto na fábrica'
    },
    {
      icon: Shield,
      title: 'Rastreabilidade de Qualidade',
      description: 'Associação de documentos e laudos por carga, lote e fornecedor'
    },
    {
      icon: Clock,
      title: 'Ações Antecipadas',
      description: 'Tempo de resposta reduzido com base em dados antecipados da produção'
    },
    {
      icon: Zap,
      title: 'Integração com ERP',
      description: 'Dados exportados ou conectados com sistemas da indústria via API ou arquivos'
    }
  ];

  const industrialMetrics = [
    { label: 'Automatize processos e elimine desperdícios desde o primeiro carregamento.', value: 'Redução de Custos', trend: 'down' },
    { label: 'Mais eficiência no recebimento, menor tempo de fila, maior produtividade.', value: 'Ganho Operacional', trend: 'up' },
    { label: 'Visibilidade total da carga: do campo e até nos processos da fábrica, em tempo real.', value: 'Rastreamento 100%', trend: 'down' },
    { label: 'Economias que geram retorno com resultados já comprovados conforme porte e complexidade da operação.', value: 'ROI Estimado', trend: 'custom' }
  ];

  const useCases = [
    {
      title: 'Agroindústrias',
      description: 'Gestão de recebimento de cargas e comunicação entre armazenagem e processamento',
      benefits: ['Controle de agendamentos', 'Rastreamento de carregamentos', 'Qualidade conectada']
    },
    {
      title: 'Produtores Integrados',
      description: 'Digitalização da comunicação entre campo e indústria com planejamento em tempo real',
      benefits: ['Informações antecipadas', 'Redução de conflitos logísticos', 'Segurança no planejamento']
    },
    {
      title: 'Centros de Distribuição',
      description: 'Acompanhamento de status e sincronização com fábricas e transportadoras',
      benefits: ['Monitoramento de entrega', 'Conferência por carga', 'Redução de incertezas na operação']
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="growx-hero growx-section">
        <div className="growx-container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center px-4 py-2 bg-amber-100 text-amber-600 rounded-full text-sm font-medium mb-6">
                <Factory className="w-4 h-4 mr-2" />
                Plataforma Inteligente para Indústrias
              </div>
              
              <h1 className="growx-title mb-6">
                SPI - <span className="text-amber-600">Indústria</span>
              </h1>
              
              <p className="growx-subtitle mb-8">
                Sistema completo que automatiza o recebimento de cargas agrícolas, assegura rastreabilidade ponta a ponta e eleva o controle de qualidade com monitoramento em tempo real. Reduza perdas, ganhe eficiência e tome decisões com base em dados confiáveis desde a origem até o destino final.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button 
                  onClick={handleWhatsApp}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Solicitar Demonstração
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                
                <Link to="/contato">
                  <Button variant="outline">
                    Falar com Especialista
                  </Button>
                </Link>
              </div>

              {/* Quick Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {industrialMetrics.map((metric, index) => (
                  <div key={index} className="text-center p-3 bg-card rounded-lg border">
                    <div className="text-lg font-bold text-amber-600">{metric.value}</div>
                    <div className="text-xs text-green-700">{metric.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <img 
                src={spiHero} 
                alt="SPI Industrial Platform" 
                className="rounded-2xl shadow-2xl"
              />
              
              {/* Status Indicator */}
              <div className="absolute top-6 right-6 bg-card border border-border rounded-lg p-3 shadow-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                  <div className="text-sm font-medium text-gray-800">Sistema Industrial</div>
                </div>
                <div className="text-xs text-green-700 mt-1">
                  Disponibilidade  <br />
                  <span className="text-amber-600 font-medium">Sob demanda</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="growx-section">
        <div className="growx-container">
          <div className="text-center mb-16">
            <h2 className="growx-title mb-4">
              Benefícios <span className="text-amber-600">Potenciais</span>
            </h2>
            <p className="growx-subtitle max-w-3xl mx-auto">
              Indicadores mensuráveis que impactam diretamente o bottom line da sua operação
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {benefits.map((benefit, index) => {
              const IconComponent = benefit.icon;
              return (
                <div key={index} className="growx-card p-8">
                  <div className="flex items-center mb-6">
                    <div className="w-16 h-16 bg-amber-500 rounded-xl flex items-center justify-center mr-4">
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{benefit.title}</h3>
                      <div className="text-2xl font-bold text-amber-600">{benefit.metric}</div>
                    </div>
                  </div>
                  
                  <p className="text-green-700 mb-6">
                    {benefit.description}
                  </p>

                  <ul className="space-y-2">
                    {benefit.details.map((detail, idx) => (
                      <li key={idx} className="flex items-center text-sm text-gray-800">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="growx-section bg-card">
        <div className="growx-container">
          <div className="text-center mb-16">
            <h2 className="growx-title mb-4">
              Recursos <span className="text-amber-600">Avançados</span>
            </h2>
            <p className="growx-subtitle max-w-3xl mx-auto">
              Tecnologias industriais de ponta para máxima eficiência operacional
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div key={index} className="text-center p-6">
                  <div className="w-16 h-16 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <IconComponent className="w-8 h-8 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">{feature.title}</h3>
                  <p className="text-green-700 text-sm leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="growx-section">
        <div className="growx-container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="growx-title mb-6">
                Dashboard <span className="text-amber-600">Industrial</span>
              </h2>
              <p className="growx-subtitle mb-8">
                Interface intuitiva com métricas em tempo real, alertas inteligentes e 
                controles operacionais centralizados para máxima eficiência.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Métricas de produção em tempo real</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Alertas preventivos e preditivos</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Controles operacionais centralizados</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Relatórios automatizados</span>
                </div>
              </div>

              <Button 
                onClick={handleWhatsApp}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Ver Demo do Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <div className="relative">
              <img 
                src={spiDashboard} 
                alt="SPI Dashboard" 
                className="rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="growx-section bg-card">
        <div className="growx-container">
          <div className="text-center mb-16">
            <h2 className="growx-title mb-4">
              Casos de <span className="text-amber-600">Uso</span>
            </h2>
            <p className="growx-subtitle max-w-3xl mx-auto">
              Soluções adaptadas para diferentes segmentos industriais
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {useCases.map((useCase, index) => (
              <div key={index} className="growx-card p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">{useCase.title}</h3>
                <p className="text-green-700 mb-6">{useCase.description}</p>
                
                <ul className="space-y-2">
                  {useCase.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-center text-sm text-gray-800">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="growx-section bg-amber-600 text-white">
        <div className="growx-container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Pronto para Otimizar sua Indústria?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Descubra como o SPI pode transformar sua operação industrial com tecnologia de ponta
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="secondary" 
              size="lg"
              onClick={handleWhatsApp}
              className="bg-white text-amber-600 hover:bg-white/90"
            >
              Solicitar Demonstração
            </Button>
            
            <Link to="/solucoes/supply-x">
              <Button 
                variant="outline" 
                size="lg"
                className="bg-gray-100 text-amber-600 hover:bg-gray-200"
              >
                Ver Supply-X Completo
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SPIPage;

