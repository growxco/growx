import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Tractor, 
  Droplets, 
  Calculator, 
  Cloud,
  Clock,
  DollarSign,
  Users,
  BarChart3,
  CheckCircle,
  ArrowRight,
  Thermometer,
  Gauge,
  Smartphone,
  NotebookPen,
  SprayCan,
  FlaskConical,
  Leaf,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import sppHero from '../assets/spp-hero-rural.jpg';
import sppDashboard from '../assets/spp-dashboard-irrigation.jpg';
import sppChart from '../assets/spp-kc-chart.jpg';

const SPPPage = () => {
  const handleWhatsApp = () => {
    window.open('https://wa.me/5541995494343', '_blank');
  };

  const benefits = [
    {
      icon: Droplets,
      title: 'Economia de Água',
      description: 'Uso eficiente da água com base em sensores de umidade e dados meteorológicos',
      metric: 'Otimização',
      details: [
        'Irrigação orientada por dados',
        'Sensores de umidade do solo',
        'Evita excesso e desperdício'
      ]
    },
    {
      icon: Calculator,
      title: 'Cálculo de Irrigação',
      description: 'Algoritmos baseados em Kc e fatores climáticos auxiliam no planejamento hídrico',
      metric: 'Mais assertividade',
      details: [
        'Cálculo automático da lâmina de irrigação com base no coeficiente de cultura (Kc)',
        'Integração com dados climáticos',
        'Ajuste por fase e tipo de cultura'
      ]
    },
    {
      icon: Cloud,
      title: 'Dados Meteorológicos',
      description: 'Informações atualizadas para apoiar decisões agronômicas',
      metric: 'Atualização constante',
      details: [
        'Previsões e alertas locais',
        'Integração com estações meteorológicas',
        'Histórico climático acessível'
      ]
    },
    {
      icon: Clock,
      title: 'Decisão Ágil',
      description: 'Acesso rápido a recomendações e alertas na palma da mão',
      metric: 'Agilidade no campo',
      details: [
        'Interface intuitiva',
        'Alertas configuráveis',
        'Informações em tempo real'
      ]
    }
  ];

  const features = [
    {
    icon: Gauge,
    title: 'Controle Automatizado',
    description: 'Sistema de irrigação inteligente com base nos dados do campo'
  },
  {
    icon: NotebookPen,
    title: 'Diário de Campo',
    description: 'Registro diário das atividades realizadas na lavoura'
  },
  {
    icon: FlaskConical,
    title: 'Análise de Solo',
    description: 'Integração com laudos laboratoriais para correção e adubação'
  },
  {
    icon: Leaf,
    title: 'Análise Foliar',
    description: 'Acompanhamento nutricional por fase da cultura'
  },
  {
    icon: Users,
    title: 'Apoio Técnico',
    description: 'Suporte agronômico e técnico da equipe Grow-X'
  },
  {
    icon: Smartphone,
    title: 'App Mobile',
    description: 'Acompanhe sua lavoura de qualquer lugar pelo celular'
  }
  ];

  const ruralMetrics = [
    { label: 'Evita irrigação desnecessária com base em dados reais', value: 'Economia de Água', trend: 'down' },
    { label: 'Planejamento por fase do ciclo ajuda no manejo ideal da lavoura', value: 'Aumento de Produtividade', trend: 'up' },
    { label: 'Evita desperdícios com defensivos, água e mão de obra desnecessária', value: 'Redução de Custos', trend: 'down' },
    { label: 'Recomendações com base em solo, clima e fase da cultura', value: 'Tomada de decisão', trend: 'fast' }
  ];

  const cropTypes = [
    {
      name: 'Hortaliças',
      description: 'Controle preciso para cultivos de ciclo curto com alta demanda hídrica',
      benefits: ['Irrigação otimizada', 'Qualidade superior', 'Redução de perdas']
    },
    {
      name: 'Fruticultura',
      description: 'Gestão especializada para cultivos perenes com necessidades específicas',
      benefits: ['Manejo por estágio', 'Qualidade dos frutos', 'Produtividade constante']
    },
    {
      name: 'Grãos',
      description: 'Soluções para grandes áreas com foco em eficiência e sustentabilidade',
      benefits: ['Escala industrial', 'Economia de recursos', 'Sustentabilidade']
    }
  ];

  const testimonials = [
    {
      name: 'Alexandre de Castro',
      role: 'Produtor de Batata',
      location: 'Contenda, PR',
      quote: 'Antes, eu fazia tudo na mão, anotando cálculo de irrigação no caderno. Depois que comecei a usar o SPP, ganhei tempo e parei de desperdiçar água. Agora sei exatamente o que fazer e quando fazer.'
    },
    {
      name: 'Emilio Dzierwa',
      role: 'Produtor Rural',
      location: 'Palmeira, PR',
      quote: 'Com o módulo de gestão de equipamentos e área administrativa, percebi o quanto gastava com manutenção. Agora consigo decidir com base em dados quando vale mais trocar ou consertar. O controle financeiro melhorou muito.'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="growx-hero growx-section">
        <div className="growx-container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center px-4 py-2 bg-green-500/10 text-green-600 rounded-full text-sm font-medium mb-6">
                <Tractor className="w-4 h-4 mr-2" />
                App que Salva o Produtor Rural
              </div>
              
              <h1 className="growx-title mb-6">
                SPP - <span className="text-green-600">Produtores</span>
              </h1>
              
              <p className="growx-subtitle mb-8">
                O módulo da plataforma Grow-X desenvolvido especialmente para quem está na base da produção: 
                o produtor rural. Oferece uma visão completa e integrada de todas as etapas do cultivo, 
                desde o planejamento até a colheita.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button 
                  onClick={handleWhatsApp}
                  className="bg-green-600 hover:bg-green-700 text-white"
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
                {ruralMetrics.map((metric, index) => (
                  <div key={index} className="text-center p-3 bg-card rounded-lg border">
                    <div className="text-lg font-bold text-green-600">{metric.value}</div>
                    <div className="text-xs text-muted-foreground">{metric.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <img 
                src={sppHero} 
                alt="SPP Rural Platform" 
                className="rounded-2xl shadow-2xl"
              />
              
              {/* Status Indicator */}
              <div className="absolute top-6 left-6 bg-card border border-border rounded-lg p-3 shadow-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <div className="text-sm font-medium text-foreground">Sistema Rural</div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Monitoramento<br />
                  <span className="text-green-600 font-medium">24/7 Ativo</span>
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
              Como o SPP <span className="text-green-600">Salva</span> o Produtor
            </h2>
            <p className="growx-subtitle max-w-3xl mx-auto">
              Benefícios reais que impactam diretamente a rentabilidade e sustentabilidade da sua produção
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {benefits.map((benefit, index) => {
              const IconComponent = benefit.icon;
              return (
                <div key={index} className="growx-card p-8">
                  <div className="flex items-center mb-6">
                    <div className="w-16 h-16 bg-green-500 rounded-xl flex items-center justify-center mr-4">
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground">{benefit.title}</h3>
                      <div className="text-2xl font-bold text-green-600">{benefit.metric}</div>
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground mb-6">
                    {benefit.description}
                  </p>

                  <ul className="space-y-2">
                    {benefit.details.map((detail, idx) => (
                      <li key={idx} className="flex items-center text-sm text-foreground">
                        <CheckCircle className="w-4 h-4 text-green-600 mr-3 flex-shrink-0" />
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
              Recursos <span className="text-green-600">Completos</span>
            </h2>
            <p className="growx-subtitle max-w-3xl mx-auto">
              Tecnologia rural de ponta para máxima eficiência no campo
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div key={index} className="text-center p-6">
                  <div className="w-16 h-16 bg-green-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <IconComponent className="w-8 h-8 text-green-600" />
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
                Dashboard <span className="text-green-600">Rural</span>
              </h2>
              <p className="growx-subtitle mb-8">
                Interface simples e intuitiva desenvolvida especialmente para produtores rurais, 
                com informações claras e ações diretas para otimizar sua produção.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Monitoramento em tempo real das culturas</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Cálculo automático da lâmina de irrigação com base no coeficiente de cultura (Kc)</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Alertas meteorológicos personalizados</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Relatórios de produtividade</span>
                </div>
              </div>

              <Button 
                onClick={handleWhatsApp}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Testar o App Gratuitamente
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <div className="relative">
              <img 
                src={sppDashboard} 
                alt="SPP Dashboard" 
                className="rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Crop Types */}
      <section className="growx-section bg-card">
        <div className="growx-container">
          <div className="text-center mb-16">
            <h2 className="growx-title mb-4">
              Cultivos <span className="text-green-600">Suportados</span>
            </h2>
            <p className="growx-subtitle max-w-3xl mx-auto">
              Soluções especializadas para diferentes tipos de cultivo
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {cropTypes.map((crop, index) => (
              <div key={index} className="growx-card p-6">
                <h3 className="text-xl font-bold text-foreground mb-4">{crop.name}</h3>
                <p className="text-muted-foreground mb-6">{crop.description}</p>
                
                <ul className="space-y-2">
                  {crop.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-center text-sm text-foreground">
                      <CheckCircle className="w-4 h-4 text-green-600 mr-3 flex-shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="growx-section">
        <div className="growx-container">
          <div className="text-center mb-16">
            <h2 className="growx-title mb-4">
              Produtores que o SPP <span className="text-green-600">Salvou</span>
            </h2>
            <p className="growx-subtitle max-w-3xl mx-auto">
              Depoimentos reais de produtores que transformaram suas operações
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="growx-card p-8">
                <div className="mb-6">
                  <p className="text-lg text-foreground italic mb-4">
                    "{testimonial.quote}"
                  </p>
                </div>
                
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mr-4">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    <div className="text-xs text-green-600">{testimonial.location}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="growx-section bg-green-600 text-white">
        <div className="growx-container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Deixe o SPP Salvar sua Produção!
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Junte-se aos produtores que já economizam água, aumentam produtividade e reduzem custos
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="secondary" 
              size="lg"
              onClick={handleWhatsApp}
              className="bg-white text-green-600 hover:bg-white/90"
            >
              Começar Teste Gratuito
            </Button>
            
            <Link to="/solucoes/supply-x">
              <Button 
                variant="outline" 
                size="lg"
                className="border-white text-white hover:bg-white hover:text-green-600"
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

export default SPPPage;

