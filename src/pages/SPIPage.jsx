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
      title: 'Redução de Insumos',
      description: 'Uso racional de recursos com base em dados operacionais confiáveis',
      metric: 'Redução gradual',
      details: [
        'Planejamento com base em histórico de produção',
        'Evita desperdícios por falhas operacionais',
        'Apoia decisões logísticas com dados reais'
      ]
    },
    {
      icon: Truck,
      title: 'Logística Conectada',
      description: 'Integração com armazenadoras e transportadoras melhora previsibilidade',
      metric: 'Operação fluida',
      details: [
        'Agendamento digital de entregas',
        'Visualização antecipada de falhas',
        'Interface com sistemas externos'
      ]
    },
    {
      icon: Factory,
      title: 'Menos Interrupções',
      description: 'Controle e alerta sobre atrasos ou mudanças no status da carga',
      metric: 'Mais estabilidade',
      details: [
        'Notificações em tempo real',
        'Comunicação proativa com a fábrica',
        'Relatórios acessíveis'
      ]
    },
    {
      icon: Users,
      title: 'Comunicação Rastreável',
      description: 'Registro completo dos eventos da cadeia com histórico acessível',
      metric: '100% digital',
      details: [
        'Acesso a dados e documentos',
        'Organização da comunicação por carga',
        'Transparência entre produtor e indústria'
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
              <div className="inline-flex items-center px-4 py-2 bg-blue-500/10 text-blue-600 rounded-full text-sm font-medium mb-6">
                <Factory className="w-4 h-4 mr-2" />
                Solução Corporativa para Grandes Indústrias
              </div>
              
              <h1 className="growx-title mb-6">
                SPI - <span className="text-blue-600">Indústria</span>
              </h1>
              
              <p className="growx-subtitle mb-8">
                Plataforma para grandes indústrias que automatiza o recebimento, rastreabilidade 
                e controle de qualidade de cargas agrícolas em tempo real.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button 
                  onClick={handleWhatsApp}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
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
                    <div className="text-lg font-bold text-blue-600">{metric.value}</div>
                    <div className="text-xs text-muted-foreground">{metric.label}</div>
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
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <div className="text-sm font-medium text-foreground">Sistema Industrial</div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Disponibilidade  <br />
                  <span className="text-blue-600 font-medium">Sob demanda</span>
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
              Benefícios <span className="text-blue-600">Potenciais</span>
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
                    <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center mr-4">
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground">{benefit.title}</h3>
                      <div className="text-2xl font-bold text-blue-600">{benefit.metric}</div>
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground mb-6">
                    {benefit.description}
                  </p>

                  <ul className="space-y-2">
                    {benefit.details.map((detail, idx) => (
                      <li key={idx} className="flex items-center text-sm text-foreground">
                        <CheckCircle className="w-4 h-4 text-blue-600 mr-3 flex-shrink-0" />
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
              Recursos <span className="text-blue-600">Avançados</span>
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
                  <div className="w-16 h-16 bg-blue-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <IconComponent className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
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
                Dashboard <span className="text-blue-600">Industrial</span>
              </h2>
              <p className="growx-subtitle mb-8">
                Interface intuitiva com métricas em tempo real, alertas inteligentes e 
                controles operacionais centralizados para máxima eficiência.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  <span>Métricas de produção em tempo real</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  <span>Alertas preventivos e preditivos</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  <span>Controles operacionais centralizados</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  <span>Relatórios automatizados</span>
                </div>
              </div>

              <Button 
                onClick={handleWhatsApp}
                className="bg-blue-600 hover:bg-blue-700 text-white"
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
              Casos de <span className="text-blue-600">Uso</span>
            </h2>
            <p className="growx-subtitle max-w-3xl mx-auto">
              Soluções adaptadas para diferentes segmentos industriais
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {useCases.map((useCase, index) => (
              <div key={index} className="growx-card p-6">
                <h3 className="text-xl font-bold text-foreground mb-4">{useCase.title}</h3>
                <p className="text-muted-foreground mb-6">{useCase.description}</p>
                
                <ul className="space-y-2">
                  {useCase.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-center text-sm text-foreground">
                      <CheckCircle className="w-4 h-4 text-blue-600 mr-3 flex-shrink-0" />
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
      <section className="growx-section bg-blue-600 text-white">
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
              className="bg-white text-blue-600 hover:bg-white/90"
            >
              Solicitar Demonstração
            </Button>
            
            <Link to="/solucoes/supply-x">
              <Button 
                variant="outline" 
                size="lg"
                className="bg-gray-100 text-blue-600 hover:bg-gray-200"
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

