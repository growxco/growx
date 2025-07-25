import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Factory, 
  Tractor,
  Globe,
  BarChart3,
  Shield,
  Zap,
  Users,
  TrendingUp,
  CheckCircle,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import supplyXHero from '../assets/supply-x-hero.jpg';
import supplyXBanner from '../assets/supply-x-banner.jpg';

const SupplyXPage = () => {
  const handleWhatsApp = () => {
    window.open('https://wa.me/5541995494343', '_blank');
  };

  const modules = [
    {
      id: 'spi',
      icon: Factory,
      title: 'SPI - Indústria',
      subtitle: 'Para todas Indústrias',
      description: 'Sistema digital para gestão de recebimento agrícola e rastreabilidade, com foco em reduzir erros operacionais e facilitar a comunicação entre produtores, transportadoras e indústria.',
      benefits: [
        'Economia de insumos',
        'Redução de caminhões parados',
        'Menos paradas de fábrica',
        'Comunicação integrada'
      ],
      metrics: [
        { value: 'Sensores e IoT', label: 'Permite rastrear e monitorar eventos críticos com sensores integrados' },
        { value: 'Módulos Adaptáveis', label: '	Escolha quais eventos deseja rastrear e configurar' },
        { value: 'Conexão com SPP', label: 'Conecte-se diretamente aos seus produtores e antecipe problemas na fábrica' }
      ],
      color: 'bg-amber-600',
      href: '/solucoes/spi'
    },
    {
      id: 'spp',
      icon: Tractor,
      title: 'SPP - Produtores',
      subtitle: 'App que Salva o Produtor',
      description: 'O módulo da plataforma Grow-X desenvolvido especialmente para quem está na base da produção: o produtor rural. Oferece uma visão completa e integrada de todas as etapas do cultivo.',
      benefits: [
        'Economia de água',
        'Cálculo de irrigação preciso',
        'Dados meteorológicos',
        'Decisões mais rápidas'
      ],
      metrics: [
        { value: 'Aumento de Produtividade', label: 'Planejamento por fase do ciclo ajuda no manejo ideal da lavoura.' },
        { value: 'Planejamento Total', label: 'Recomendações com base em solo, clima e fase da cultura' },
        { value: 'Redução de Custos', label: 'Evita desperdícios com defensivos, água e mão de obra desnecessária' }
      ],
      color: 'bg-green-500',
      href: '/solucoes/spp'
    }
  ];

  const features = [
    {
      icon: Globe,
      title: 'Plataforma Unificada',
      description: 'Integração completa entre indústria e produtores em uma única plataforma'
    },
    {
      icon: BarChart3,
      title: 'Analytics Avançado',
      description: 'Dashboards inteligentes com insights em tempo real para tomada de decisão'
    },
    {
      icon: Shield,
      title: 'Rastreabilidade Total',
      description: 'Controle completo da cadeia produtiva do campo à indústria'
    },
    {
      icon: Zap,
      title: 'Automação Inteligente',
      description: 'Processos automatizados que reduzem erros e aumentam eficiência'
    }
  ];

  const integrationBenefits = [
    'Comunicação direta entre produtores e indústrias',
    'Rastreabilidade completa da cadeia produtiva',
    'Otimização de logística e transporte',
    'Prevenção de erros e más previsões',
    'Dados unificados para melhor planejamento',
    'Redução de custos operacionais'
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="growx-hero growx-section">
        <div className="growx-container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6">
                <Globe className="w-4 h-4 mr-2" />
                Plataforma Modular de Rastreamento
              </div>
              
              <h1 className="growx-title mb-6">
                Supply-X: <span className="text-primary">Plataforma Completa</span>
              </h1>
              
              <p className="growx-subtitle mb-8">
                Solução modular de rastreamento que integra SPI (Indústria) e SPP (Produtores) 
                para controle total da cadeia produtiva com comunicação integrada e dados em tempo real.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button 
                  onClick={handleWhatsApp}
                  className="growx-btn-primary"
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

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">.</div>
                  <div className="text-sm text-muted-foreground">.</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">.</div>
                  <div className="text-sm text-muted-foreground">.</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">.</div>
                  <div className="text-sm text-muted-foreground">.</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <img 
                src={supplyXHero} 
                alt="Supply-X Platform" 
                className="rounded-2xl shadow-2xl"
              />
              
              {/* Platform Status */}
              <div className="absolute bottom-6 right-6 bg-card border border-border rounded-lg p-3 shadow-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <div className="text-sm font-medium text-foreground">Plataforma Ativa</div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Permite sincronização entre os módulos<br />
                  <span className="text-primary font-medium">Em tempo real</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section className="growx-section">
        <div className="growx-container">
          <div className="text-center mb-16">
            <h2 className="growx-title mb-4">
              Módulos <span className="text-primary">Integrados</span>
            </h2>
            <p className="growx-subtitle max-w-3xl mx-auto">
              Dois módulos especializados que trabalham em conjunto para otimizar toda a cadeia produtiva
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {modules.map((module) => {
              const IconComponent = module.icon;
              return (
                <div key={module.id} className="growx-card p-8">
                  <div className="flex items-center mb-6">
                    <div className={`w-16 h-16 ${module.color} rounded-xl flex items-center justify-center mr-4`}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">{module.title}</h3>
                      <p className="text-primary font-medium">{module.subtitle}</p>
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    {module.description}
                  </p>

                  {/* Benefits */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-foreground mb-3">Principais Benefícios:</h4>
                    <ul className="space-y-2">
                      {module.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-center text-sm text-foreground">
                          <CheckCircle className="w-4 h-4 text-primary mr-3 flex-shrink-0" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
                    {module.metrics.map((metric, idx) => (
                      <div key={idx} className="text-center">
                        <div className="text-lg font-bold text-primary">{metric.value}</div>
                        <div className="text-xs text-muted-foreground">{metric.label}</div>
                      </div>
                    ))}
                  </div>

                  <Link to={module.href}>
                    <Button className="w-full growx-btn-primary">
                      Explorar {module.title}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
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
              Recursos <span className="text-primary">Avançados</span>
            </h2>
            <p className="growx-subtitle max-w-3xl mx-auto">
              Tecnologias de ponta que garantem máxima eficiência e controle
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <IconComponent className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Integration Benefits */}
      <section className="growx-section">
        <div className="growx-container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="growx-title mb-6">
                Integração que <span className="text-primary">Transforma</span>
              </h2>
              <p className="growx-subtitle mb-8">
                A verdadeira força do Supply-X está na integração perfeita entre os módulos SPI e SPP, 
                criando um ecossistema completo de gestão.
              </p>

              <div className="space-y-4">
                {integrationBenefits.map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <Button 
                  onClick={handleWhatsApp}
                  className="growx-btn-primary"
                >
                  Solicitar Demonstração Completa
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>

            <div className="relative">
              <img 
                src={supplyXBanner} 
                alt="Supply-X Integration" 
                className="rounded-2xl shadow-2xl"
              />
              
              {/* Integration Indicator */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-2xl flex items-end">
                <div className="p-6 text-white">
                  <div className="flex items-center space-x-2 mb-2">
                    <Layers className="w-5 h-5" />
                    <span className="font-semibold">Integração Ativa</span>
                  </div>
                  <div className="text-sm opacity-90">
                    SPI + SPP sincronizados em tempo real
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="growx-section bg-primary text-primary-foreground">
        <div className="growx-container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Pronto para Integrar sua Cadeia Produtiva?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Descubra como o Supply-X pode revolucionar sua operação com integração completa entre indústria e produtores
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="secondary" 
              size="lg"
              onClick={handleWhatsApp}
              className="bg-white text-primary hover:bg-white/90"
            >
              Agendar Demonstração
            </Button>
            
            <Link to="/contato">
              <Button 
                variant="outline" 
                size="lg"
                className="border-white text-white hover:bg-white hover:text-primary"
              >
                Falar com Especialista
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SupplyXPage;

