import { Link } from 'react-router-dom';
import { 
  Leaf, 
  TrendingUp, 
  Shield, 
  BarChart3, 
  Smartphone, 
  Factory, 
  Tractor,
  Cpu,
  ArrowRight,
  Play,
  CheckCircle,
  Users,
  Globe,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import heroImage from '../assets/hero-agriculture-modern.jpg';
import technologyImage from '../assets/technology-showcase.jpg';

const HomePage = () => {
  const handleWhatsApp = () => {
    window.open('https://wa.me/5541995494343', '_blank');
  };

  const solutions = [
    {
      id: 'supply-x',
      icon: Globe,
      title: 'Supply-X',
      subtitle: 'Plataforma Completa',
      description: 'Solução modular de rastreamento que integra SPI (Indústria) e SPP (Produtores) para controle total da cadeia produtiva.',
      features: [
        'Integração SPI + SPP',
        'Rastreabilidade completa',
        'Comunicação integrada',
        'Dados em tempo real'
      ],
      color: 'bg-blue-500',
      href: '/solucoes/supply-x'
    },
    {
      id: 'growx-app',
      icon: Smartphone,
      title: 'Grow-X App',
      subtitle: 'Cannabis & Agricultura Urbana',
      description: 'Solução completa de monitoramento e gestão de cultivo, pensada especialmente para o universo canábico no Brasil.',
      features: [
        'Controle remoto de estufas',
        'IA para otimização de cultivo',
        'Rede social para growers',
        'Marketplace integrado'
      ],
      color: 'bg-green-500',
      href: '/solucoes/growx-app'
    }
  ];

  const products = [
    {
      icon: Cpu,
      title: 'Estação Meteorológica',
      description: 'Sensores de alta precisão com transmissão LoRa para monitoramento ambiental completo.'
    },
    {
      icon: Zap,
      title: 'Módulo Sem Fio',
      description: 'Controle de até 4 estufas com tecnologia wireless avançada.'
    },
    {
      icon: Factory,
      title: 'Estufa Automatizada',
      description: 'Sistema completo de automação para cultivo controlado e otimizado.'
    }
  ];

  const stats = [
{ number: 'Conexão', label: 'campo e indústria' },
{ number: 'Controle', label: 'em tempo real' },
{ number: 'Dados', label: 'para decisões ágeis' },
{ number: 'Inovação', label: 'de ponta a ponta' },

 ];

  const benefits = [
    {
      icon: TrendingUp,
      title: 'Produtividade',
      description: 'Aumentada'
    },
    {
      icon: Shield,
      title: 'Rastreabilidade',
      description: 'Total'
    },
    {
      icon: Leaf,
      title: 'Sustentabilidade',
      description: 'Práticas responsáveis'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="growx-hero growx-section">
        <div className="growx-container">
          <div className="grid lg:grid-cols-2 gap-12 items-center text-center lg:text-left">
            <div className="growx-hero-content">
              <div className="inline-flex items-center px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6">
                <Leaf className="w-4 h-4 mr-2" />
                Tecnologia Sustentável para o Agronegócio
              </div>
              
              <h1 className="growx-title mb-6">
                Inovando o Cultivo com{' '}
                <span className="growx-text-gradient">Tecnologia</span>
              </h1>
              
              <p className="growx-subtitle mb-8">
                Soluções completas para automação, rastreamento e controle ambiental 
                com IoT, IA e Blockchain para agricultura individual, familiar ou industrial.
              </p>

              {/* Benefits Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                {benefits.map((benefit, index) => {
                  const IconComponent = benefit.icon;
                  return (
                    <div key={index} className="text-center">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <IconComponent className="w-6 h-6 text-primary" />
                      </div>
                      <div className="text-sm font-semibold text-foreground mb-1">
                        {benefit.title.split(" ")[0]}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {benefit.description.split(" ").slice(0, 3).join(" ")}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative mt-12 lg:mt-0">
              <img 
                src={heroImage} 
                alt="Agricultura Moderna Grow-X" 
                className="rounded-2xl shadow-2xl w-full h-auto object-cover"
              />
              
              {/* Stats Overlay */}
              <div className="absolute bottom-6 left-6 right-6 bg-card/95 backdrop-blur-sm border border-border rounded-xl p-4 sm:p-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {stats.map((stat, index) => (
                    <div key={index} className="text-center">
                      <div className="text-xl sm:text-2xl font-bold text-primary">{stat.number}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Indicator */}
              <div className="absolute top-6 right-6 bg-card border border-border rounded-lg p-3 shadow-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <div className="text-sm font-medium text-foreground">Tecnologia em Campo</div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Cultivos monitorados<br />
                  <span className="text-primary font-medium">Em tempo real</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section className="growx-section">
        <div className="growx-container">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6">
              Nossas Soluções
            </div>
            <h2 className="growx-title mb-4">
              Soluções tecnológicas para<br />
              <span className="text-primary">Produtores e Indústrias</span>
            </h2>
            <p className="growx-subtitle max-w-3xl mx-auto">
              Plataformas integradas que conectam campo e indústria, otimizam operações e garantem rastreabilidade em tempo real.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {solutions.map((solution, index) => {
              const IconComponent = solution.icon;
              return (
                <Link
                  key={solution.id}
                  to={solution.href}
                  className="growx-card p-8 group hover:scale-105 transition-all duration-300 block"
                >
                  <div className="flex items-center mb-6">
                    <div className={`w-16 h-16 ${solution.color} rounded-xl flex items-center justify-center mr-4`}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">{solution.title}</h3>
                      <p className="text-primary font-medium">{solution.subtitle}</p>
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    {solution.description}
                  </p>

                  <ul className="space-y-2 mb-6">
                    {solution.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center text-sm text-foreground">
                        <CheckCircle className="w-4 h-4 text-primary mr-3 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <div className="flex items-center text-primary font-semibold group-hover:translate-x-2 transition-transform">
                    Ver {solution.title}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="growx-section bg-card">
        <div className="growx-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="growx-title mb-6">
                <span className="text-primary">Produtos Inovadores</span>
              </h2>
              <p className="growx-subtitle mb-8">
                Hardware de ponta desenvolvido especificamente para agricultura de precisão e cultivo controlado
              </p>

              <div className="space-y-6">
                {products.map((product, index) => {
                  const IconComponent = product.icon;
                  return (
                    <div key={index} className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <IconComponent className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">{product.title}</h3>
                        <p className="text-muted-foreground">{product.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8">
                <Link to="/produtos">
                  <Button className="growx-btn-primary">
                    Ver Todos os Produtos
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative mt-12 lg:mt-0">
              <img 
                src={technologyImage} 
                alt="Tecnologia Grow-X" 
                className="rounded-2xl shadow-2xl w-full h-auto object-cover"
              />
              
              {/* Technology Stats */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-2xl flex items-end">
                <div className="p-6 text-white">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-2xl font-bold">100%</div>
                      <div className="text-sm opacity-90">Rastreabilidade</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">10+</div>
                      <div className="text-sm opacity-90">Módulos</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">24/7</div>
                      <div className="text-sm opacity-90">Monitoramento</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">∞</div>
                      <div className="text-sm opacity-90">Escalabilidade</div>
                    </div>
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
            Pronto para Transformar seu Agronegócio?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Entre em contato conosco e descubra como nossas soluções podem revolucionar sua operação
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contato">
              <Button 
                variant="secondary" 
                size="lg"
                className="bg-white text-primary hover:bg-white/90"
              >
                Agendar Demonstração
              </Button>
            </Link>
            
            <Button 
              variant="outline" 
              size="lg"
              onClick={handleWhatsApp}
              className="border-white text-white hover:bg-white hover:text-primary"
            >
              Falar via WhatsApp
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;

