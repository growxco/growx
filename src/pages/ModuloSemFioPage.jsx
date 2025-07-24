import { ArrowLeft, Cpu, Wifi, Smartphone, Zap, Shield, Settings, Leaf, Thermometer, Droplets } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Breadcrumbs from '@/components/Breadcrumbs';
import chipImage from '../assets/chip.png';

const ModuloSemFioPage = () => {
  const handleWhatsApp = () => {
    window.open('https://wa.me/5541995494343?text=Olá! Gostaria de saber mais sobre o Módulo Sem Fio da Grow-X.', '_blank');
  };

  const features = [
    {
      icon: <Wifi className="w-8 h-8 text-primary" />,
      title: "Conectividade Sem Fio",
      description: "Comunicação Wi-Fi e Bluetooth para controle remoto total"
    },
    {
      icon: <Cpu className="w-8 h-8 text-primary" />,
      title: "Processamento Inteligente",
      description: "Microcontrolador avançado para automação complexa"
    },
    {
      icon: <Settings className="w-8 h-8 text-primary" />,
      title: "Controle de Equipamentos",
      description: "Gerencia bombas, ventiladores, luzes e sistemas de irrigação"
    },
    {
      icon: <Smartphone className="w-8 h-8 text-primary" />,
      title: "App Grow-X Integrado",
      description: "Controle total através do aplicativo Grow-X"
    },
    {
      icon: <Thermometer className="w-8 h-8 text-primary" />,
      title: "Sensores Integrados",
      description: "Temperatura, umidade e outros sensores ambientais"
    },
    {
      icon: <Zap className="w-8 h-8 text-primary" />,
      title: "Baixo Consumo",
      description: "Eficiência energética para operação contínua"
    }
  ];

  const benefits = [
    {
      icon: <Leaf className="w-6 h-6 text-primary" />,
      title: "Cultivo Otimizado",
      description: "Controle preciso das condições ambientais para máximo rendimento"
    },
    {
      icon: <Smartphone className="w-6 h-6 text-primary" />,
      title: "Controle Remoto",
      description: "Monitore e controle sua estufa de qualquer lugar"
    },
    {
      icon: <Shield className="w-6 h-6 text-primary" />,
      title: "Automação Confiável",
      description: "Sistema robusto para operação 24/7 sem interrupções"
    }
  ];

  const specifications = [
    { label: "Conectividade", value: "Wi-Fi 2.4GHz + Bluetooth 5.0" },
    { label: "Alimentação", value: "12V DC ou bateria" },
    { label: "Saídas", value: "8 relés para equipamentos" },
    { label: "Entradas", value: "6 entradas analógicas/digitais" },
    { label: "Proteção", value: "IP65 - Resistente à água" },
    { label: "Temperatura", value: "-20°C a +70°C" }
  ];

  const applications = [
    {
      title: "Estufas de Cannabis",
      description: "Controle preciso de temperatura, umidade e iluminação para cultivo indoor",
      icon: <Leaf className="w-8 h-8 text-primary" />
    },
    {
      title: "Agricultura Urbana",
      description: "Automação de sistemas hidropônicos e aeropônicos",
      icon: <Droplets className="w-8 h-8 text-primary" />
    },
    {
      title: "Estufas Comerciais",
      description: "Gestão automatizada de grandes estruturas de cultivo protegido",
      icon: <Settings className="w-8 h-8 text-primary" />
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
              <Cpu className="w-16 h-16 text-primary mr-4" />
              <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                Módulo Sem Fio
              </h1>
            </div>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Sistema de controle inteligente sem fio para automação completa de estufas 
              e ambientes de cultivo controlado.
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
              src={chipImage} 
              alt="Módulo Sem Fio Grow-X" 
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
              Recursos Avançados
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tecnologia de automação de ponta para controle total do seu ambiente de cultivo
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

      {/* Applications Section */}
      <section className="py-16 bg-muted/30">
        <div className="growx-container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Aplicações
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Versatilidade para diferentes tipos de cultivo e ambientes
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {applications.map((app, index) => (
              <div key={index} className="growx-card p-6 text-center">
                <div className="flex justify-center mb-4">
                  {app.icon}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {app.title}
                </h3>
                <p className="text-muted-foreground">
                  {app.description}
                </p>
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
                Benefícios do Sistema
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
                Especificações Técnicas
              </h3>
              <div className="space-y-4">
                {specifications.map((spec, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-border last:border-b-0">
                    <span className="font-medium text-foreground">{spec.label}:</span>
                    <span className="text-muted-foreground">{spec.value}</span>
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
              Integração com Grow-X App
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              O Módulo Sem Fio funciona perfeitamente integrado ao aplicativo Grow-X, 
              proporcionando controle total do seu cultivo.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="growx-card p-6 text-center">
              <Cpu className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-3">
                Coleta de Dados
              </h3>
              <p className="text-muted-foreground text-sm">
                Sensores monitoram condições ambientais
              </p>
            </div>
            <div className="growx-card p-6 text-center">
              <Wifi className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-3">
                Transmissão
              </h3>
              <p className="text-muted-foreground text-sm">
                Dados enviados via Wi-Fi para a nuvem
              </p>
            </div>
            <div className="growx-card p-6 text-center">
              <Smartphone className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-3">
                App Grow-X
              </h3>
              <p className="text-muted-foreground text-sm">
                Visualização e controle pelo aplicativo
              </p>
            </div>
            <div className="growx-card p-6 text-center">
              <Settings className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-3">
                Automação
              </h3>
              <p className="text-muted-foreground text-sm">
                Controle automático dos equipamentos
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
              Automatize seu Cultivo Hoje Mesmo
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Entre em contato conosco e descubra como o Módulo Sem Fio 
              pode revolucionar seu sistema de cultivo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={handleWhatsApp} className="growx-btn-primary">
                Falar com Especialista
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

export default ModuloSemFioPage;

