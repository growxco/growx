import { ArrowLeft, Cloud, Thermometer, Droplets, Wind, Eye, Zap, Shield, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Breadcrumbs from '@/components/Breadcrumbs';
import estacaoMeteorologica from '../assets/estacao-meteorologica.webp';

const EstacaoMeteorologicaPage = () => {
  const handleWhatsApp = () => {
    window.open('https://wa.me/5541995494343?text=Olá! Gostaria de saber mais sobre a Estação Meteorológica da Grow-X.', '_blank');
  };

  const features = [
    {
      icon: <Thermometer className="w-8 h-8 text-primary" />,
      title: "Temperatura Precisa",
      description: "Monitoramento contínuo da temperatura ambiente com precisão de ±0.1°C"
    },
    {
      icon: <Droplets className="w-8 h-8 text-primary" />,
      title: "Umidade do Solo",
      description: "Sensores de umidade que medem a necessidade real de irrigação"
    },
    {
      icon: <Wind className="w-8 h-8 text-primary" />,
      title: "Velocidade do Vento",
      description: "Dados de vento para otimizar aplicação de defensivos e irrigação"
    },
    {
      icon: <Cloud className="w-8 h-8 text-primary" />,
      title: "Previsão Meteorológica",
      description: "Integração com dados meteorológicos para planejamento agrícola"
    },
    {
      icon: <Zap className="w-8 h-8 text-primary" />,
      title: "Tecnologia LoRa",
      description: "Comunicação de longo alcance com baixo consumo de energia"
    },
    {
      icon: <Smartphone className="w-8 h-8 text-primary" />,
      title: "App SPP Integrado",
      description: "Dados em tempo real direto no aplicativo Supply-X Produtores"
    }
  ];

  const benefits = [
    {
      icon: <Droplets className="w-6 h-6 text-primary" />,
      title: "Economia de Água",
      description: "Até 40% de redução no consumo de água com irrigação inteligente"
    },
    {
      icon: <Eye className="w-6 h-6 text-primary" />,
      title: "Monitoramento 24/7",
      description: "Dados meteorológicos em tempo real, 24 horas por dia"
    },
    {
      icon: <Shield className="w-6 h-6 text-primary" />,
      title: "Prevenção de Perdas",
      description: "Alertas antecipados para condições climáticas adversas"
    }
  ];

  const specifications = [
    { label: "Alcance LoRa", value: "Até 15 km em campo aberto" },
    { label: "Autonomia", value: "12 meses com bateria" },
    { label: "Resistência", value: "IP67 - À prova d'água" },
    { label: "Temperatura", value: "-40°C a +85°C" },
    { label: "Conectividade", value: "LoRa + 4G (opcional)" },
    { label: "Sensores", value: "Temperatura, umidade, vento, chuva" }
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
              <Cloud className="w-16 h-16 text-primary mr-4" />
              <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                Estação Meteorológica
              </h1>
            </div>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Sensores meteorológicos inteligentes com tecnologia LoRa para monitoramento 
              preciso das condições climáticas em propriedades rurais.
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
              src={estacaoMeteorologica} 
              alt="Estação Meteorológica Grow-X" 
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
              Tecnologia de ponta para monitoramento meteorológico preciso e confiável
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

      {/* Benefits Section */}
      <section className="py-16 bg-muted/30">
        <div className="growx-container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">
                Benefícios para o Produtor
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
      <section className="py-16">
        <div className="growx-container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Integração com SPP
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A Estação Meteorológica funciona perfeitamente integrada ao aplicativo 
              Supply-X Produtores (SPP), fornecendo dados em tempo real para decisões inteligentes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="growx-card p-6 text-center">
              <Cloud className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-3">
                Coleta de Dados
              </h3>
              <p className="text-muted-foreground">
                Sensores coletam dados meteorológicos continuamente
              </p>
            </div>
            <div className="growx-card p-6 text-center">
              <Zap className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-3">
                Transmissão LoRa
              </h3>
              <p className="text-muted-foreground">
                Dados enviados via LoRa para o gateway central
              </p>
            </div>
            <div className="growx-card p-6 text-center">
              <Smartphone className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-3">
                App SPP
              </h3>
              <p className="text-muted-foreground">
                Visualização e análise dos dados no aplicativo
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
              Pronto para Revolucionar sua Propriedade?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Entre em contato conosco e descubra como a Estação Meteorológica 
              pode transformar sua produção agrícola.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={handleWhatsApp} className="growx-btn-primary">
                Falar com Especialista
              </Button>
              <Button variant="outline" asChild>
                <Link to="/solucoes/spp">Conhecer o SPP</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default EstacaoMeteorologicaPage;

