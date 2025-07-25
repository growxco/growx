import { ArrowLeft, Home, Thermometer, Droplets, Sun, Wind, Smartphone, Zap, Shield, Leaf, Settings, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Breadcrumbs from '@/components/Breadcrumbs';
import estufaAutomatizada from '../assets/estufa-automatizada.jpg';

const EstufaAutomatizadaPage = () => {
  const handleWhatsApp = () => {
    window.open('https://wa.me/5541995494343?text=Olá! Gostaria de saber mais sobre a Estufa Automatizada da Grow-X.', '_blank');
  };

  const features = [
    {
      icon: <Thermometer className="w-8 h-8 text-primary" />,
      title: "Controle de Temperatura",
      description: "Sistema automatizado de aquecimento e resfriamento com precisão"
    },
    {
      icon: <Droplets className="w-8 h-8 text-primary" />,
      title: "Irrigação Inteligente",
      description: "Sistema de irrigação automatizado baseado em sensores de umidade"
    },
    {
      icon: <Sun className="w-8 h-8 text-primary" />,
      title: "Iluminação LED",
      description: "LEDs full spectrum com simulação de nascer e pôr do sol, controle de intensidade e ciclos de luz personalizáveis"
    },
    {
      icon: <Wind className="w-8 h-8 text-primary" />,
      title: "Ventilação Automática",
      description: "Controle automático de ventiladores e exaustores"
    },
    {
      icon: <Eye className="w-8 h-8 text-primary" />,
      title: "Monitoramento 24/7",
      description: "Câmeras e sensores para monitoramento contínuo"
    },
    {
      icon: <Smartphone className="w-8 h-8 text-primary" />,
      title: "Controle Remoto",
      description: "Gerenciamento completo via aplicativo Grow-X"
    }
  ];

  const benefits = [
    {
      icon: <Leaf className="w-6 h-6 text-primary" />,
      title: "Produtividade Máxima",
      description: "Ambiente controlado para máximo rendimento das plantas"
    },
    {
      icon: <Zap className="w-6 h-6 text-primary" />,
      title: "Eficiência Energética",
      description: "Sistemas otimizados para menor consumo de energia"
    },
    {
      icon: <Shield className="w-6 h-6 text-primary" />,
      title: "Proteção Total",
      description: "Ambiente protegido contra pragas e condições climáticas"
    }
  ];

  const specifications = [
    { label: "Tamanhos", value: "2x2m, 3x3m, 4x4m (personalizável)" },
    { label: "Estrutura", value: "Alumínio anodizado resistente" },
    { label: "Cobertura", value: "Policarbonato duplo ou vidro" },
    { label: "Iluminação", value: "LED full spectrum 600W-1000W" },
    { label: "Ventilação", value: "Sistema de exaustão e circulação" },
    { label: "Automação", value: "Módulo Grow-X integrado" }
  ];

  const systems = [
    {
      title: "Sistema de Climatização",
      description: "Controle preciso de temperatura e umidade com aquecedores, resfriadores e umidificadores",
      icon: <Thermometer className="w-8 h-8 text-primary" />
    },
    {
      title: "Sistema de Irrigação",
      description: "Irrigação automatizada por gotejamento com sensores de umidade do solo",
      icon: <Droplets className="w-8 h-8 text-primary" />
    },
    {
      title: "Sistema de Iluminação",
      description: "LEDs full spectrum com simulação de nascer e pôr do sol, controle de intensidade e ciclos de luz personalizáveis",
      icon: <Sun className="w-8 h-8 text-primary" />
    },
    {
      title: "Sistema de Ventilação",
      description: "Ventiladores e exaustores com controle automático baseado em temperatura",
      icon: <Wind className="w-8 h-8 text-primary" />
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-br from-background to-muted/30">
        <div className="growx-container">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center mb-6">
              <Home className="w-16 h-16 text-primary mr-4" />
              <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                Estufa Automatizada
              </h1>
            </div>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Sistema completo de cultivo indoor com automação total, ideal para cannabis, 
              agricultura urbana e cultivos especializados.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={handleWhatsApp} className="growx-btn-primary">
                Solicitar Orçamento
              </Button>
              <Button variant="outline" asChild>
                <Link to="/produtos">Ver Todos os Produtos</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Product Image Section */}
      <section className="py-16">
        <div className="growx-container">
          <div className="max-w-3xl mx-auto">
            <img 
              src={estufaAutomatizada} 
              alt="Estufa Automatizada Grow-X" 
              className="rounded-2xl shadow-2xl w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="growx-container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Recursos Completos
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tudo que você precisa para um cultivo indoor profissional e automatizado
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="growx-card p-6 text-center">
                <div className="flex justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Systems Section */}
      <section className="py-16 bg-muted/30">
        <div className="growx-container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Sistemas Integrados
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Cada estufa inclui sistemas especializados para controle total do ambiente
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {systems.map((system, index) => (
              <div key={index} className="growx-card p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 p-3 bg-primary/10 rounded-lg">
                    {system.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-3">
                      {system.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {system.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits & Specs Section */}
      <section className="py-16">
        <div className="growx-container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">
                Vantagens da Estufa
              </h2>
              <div className="space-y-6">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="flex-shrink-0 p-2 bg-primary/10 rounded-lg">
                      {benefit.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {benefit.title}
                      </h3>
                      <p className="text-muted-foreground">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="growx-card p-8">
              <h3 className="text-2xl font-bold text-foreground mb-6 text-center">
                Especificações
              </h3>
              <div className="space-y-4">
                {specifications.map((spec, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-border last:border-b-0">
                    <span className="font-medium text-foreground">{spec.label}:</span>
                    <span className="text-muted-foreground text-right">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integration Section */}
      <section className="py-16 bg-muted/30">
        <div className="growx-container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Controle Total via Grow-X App
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Monitore e controle sua estufa de qualquer lugar através do aplicativo Grow-X
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="growx-card p-6 text-center">
              <Eye className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-3">
                Monitoramento
              </h3>
              <p className="text-muted-foreground">
                Acompanhe temperatura, umidade, luz e outros parâmetros em tempo real
              </p>
            </div>
            <div className="growx-card p-6 text-center">
              <Settings className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-3">
                Controle
              </h3>
              <p className="text-muted-foreground">
                Ajuste todos os sistemas remotamente através do aplicativo
              </p>
            </div>
            <div className="growx-card p-6 text-center">
              <Smartphone className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-3">
                Alertas
              </h3>
              <p className="text-muted-foreground">
                Receba notificações sobre condições importantes do cultivo
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary/5">
        <div className="growx-container">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Comece seu Cultivo Profissional
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Entre em contato conosco e descubra como a Estufa Automatizada 
              pode transformar seu cultivo indoor.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={handleWhatsApp} className="growx-btn-primary">
                Solicitar Projeto Personalizado
              </Button>
              <Button variant="outline" asChild>
                <Link to="/solucoes/growx-app">Conhecer o Grow-X App</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default EstufaAutomatizadaPage;

