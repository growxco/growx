import { 
  Cpu, 
  Zap, 
  Factory,
  Wifi,
  Thermometer,
  Droplets,
  BarChart3,
  Shield,
  CheckCircle,
  ArrowRight,
  Smartphone,
  Cloud,
  Battery,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import estacaoMeteorologica from '../assets/estacao-meteorologica.webp';
import estufaAutomatizada from '../assets/estufa-automatizada.jpg';
import chipImage from '../assets/chip.png';

const ProductsPage = () => {
  const handleWhatsApp = () => {
    window.open('https://wa.me/5541995494343', '_blank');
  };

  const products = [
    {
      id: 'estacao-meteorologica',
      name: 'Estação Meteorológica Grow-X',
      category: 'Hardware para Agricultura',
      price: 'Consulte',
      image: estacaoMeteorologica,
      description: 'Sensores de alta precisão com transmissão LoRa para monitoramento ambiental completo. Ideal para produtores rurais que precisam de dados meteorológicos precisos.',
      features: [
        'Sensores de temperatura e umidade',
        'Medição de precipitação',
        'Velocidade e direção do vento',
        'Pressão atmosférica',
        'Radiação solar',
        'Transmissão LoRa de longo alcance',
        'Bateria de longa duração',
        'Resistente às intempéries'
      ],
      specifications: {
        'Alcance de Transmissão': 'Até 15km (LoRa)',
        'Autonomia da Bateria': '2+ anos',
        'Precisão Temperatura': '±0.3°C',
        'Precisão Umidade': '±2%',
        'Resistência': 'IP67',
        'Alimentação': 'Bateria + Painel Solar'
      },
      applications: [
        'Agricultura de precisão',
        'Irrigação inteligente',
        'Previsão de pragas',
        'Otimização de plantio'
      ]
    },
    {
      id: 'modulo-sem-fio',
      name: 'Módulo Sem Fio para Controle de Estufas',
      category: 'Hardware para Automação',
      price: 'Consulte',
      image: chipImage,
      description: 'Controle de até 4 estufas com tecnologia wireless avançada. Perfeito para cultivos domésticos e projetos estruturados de cannabis.',
      features: [
        'Controle de até 4 estufas',
        'Conectividade WiFi e Bluetooth',
        'Sensores integrados',
        'Controle de ventilação',
        'Monitoramento de pH',
        'Automação de irrigação',
        'Alertas em tempo real',
        'Interface mobile'
      ],
      specifications: {
        'Conectividade': 'WiFi 2.4GHz + Bluetooth 5.0',
        'Canais de Controle': '4 estufas independentes',
        'Sensores': 'Temp, Umidade, pH, EC',
        'Saídas': '8 relés programáveis',
        'Alimentação': '12V DC',
        'Dimensões': '120x80x40mm'
      },
      applications: [
        'Cultivo de cannabis medicinal',
        'Agricultura urbana',
        'Estufas domésticas',
        'Projetos de pesquisa'
      ]
    },
    {
      id: 'estufa-automatizada',
      name: 'Estufa Automatizada Grow-X',
      category: 'Hardware Completo',
      price: 'Sob Consulta',
      image: estufaAutomatizada,
      description: 'Sistema completo de automação para cultivo controlado e otimizado. Em desenvolvimento com tecnologia de ponta para máxima eficiência.',
      features: [
        'Controle climático total',
        'Sistema de irrigação automatizado',
        'Iluminação LED inteligente',
        'Ventilação controlada',
        'Monitoramento 24/7',
        'Integração com apps',
        'Alertas preventivos',
        'Relatórios de produtividade'
      ],
      specifications: {
        'Tamanhos Disponíveis': '2x2m, 3x3m, 4x4m',
        'Controle Climático': 'Temperatura ±1°C',
        'Sistema de Irrigação': 'Gotejamento + Nebulização',
        'Iluminação': 'LED Full Spectrum',
        'Conectividade': 'WiFi + 4G',
        'Status': 'Em Desenvolvimento'
      },
      applications: [
        'Cultivo profissional de cannabis',
        'Pesquisa e desenvolvimento',
        'Produção medicinal',
        'Cultivo comercial'
      ]
    }
  ];

  const productCategories = [
    {
      name: 'Sensores e Monitoramento',
      description: 'Equipamentos para coleta de dados ambientais e meteorológicos',
      icon: Factory,
      color: 'bg-green-500'
    },
    {
      name: 'Automação e Controle',
      description: 'Sistemas para automação de estufas e cultivo controlado',
      icon: Smartphone,
      color: 'bg-blue-500'
    }
  ];

  const commonFeatures = [
    {
      icon: Wifi,
      title: 'Conectividade IoT',
      description: 'Conexão sem fio para monitoramento remoto'
    },
    {
      icon: Cloud,
      title: 'Dados na Nuvem',
      description: 'Armazenamento seguro e acesso de qualquer lugar'
    },
    {
      icon: Battery,
      title: 'Longa Autonomia',
      description: 'Baterias de longa duração com painéis solares'
    },
    {
      icon: Shield,
      title: 'Resistência Industrial',
      description: 'Equipamentos robustos para uso em campo'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="growx-hero growx-section">
        <div className="growx-container">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6">
              <Cpu className="w-4 h-4 mr-2" />
              Hardware de Ponta para Agricultura
            </div>
            
            <h1 className="growx-title mb-6">
              Produtos <span className="text-primary">Grow-X</span>
            </h1>
            
            <p className="growx-subtitle max-w-4xl mx-auto mb-12">
              Hardware de ponta desenvolvido especificamente para agricultura de precisão e cultivo controlado. 
              Soluções completas que integram sensores, automação e conectividade IoT.
            </p>

            {/* Product Categories */}
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {productCategories.map((category, index) => {
                const IconComponent = category.icon;
                return (
                  <div key={index} className="growx-card p-6 text-center">
                    <div className={`w-16 h-16 ${category.color} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-3">{category.name}</h3>
                    <p className="text-muted-foreground">{category.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="growx-section">
        <div className="growx-container">
          <div className="space-y-16">
            {products.map((product, index) => (
              <div key={product.id} className={`grid lg:grid-cols-2 gap-12 items-center ${index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''}`}>
                <div className={index % 2 === 1 ? 'lg:col-start-2' : ''}>
                  <div className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
                    {product.category}
                  </div>
                  
                  <h2 className="text-3xl font-bold text-foreground mb-4">{product.name}</h2>
                  
                  <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                    {product.description}
                  </p>

                  {/* Features */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Características Principais:</h3>
                    <div className="grid md:grid-cols-2 gap-2">
                      {product.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center text-sm text-foreground">
                          <CheckCircle className="w-4 h-4 text-primary mr-3 flex-shrink-0" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Specifications */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Especificações Técnicas:</h3>
                    <div className="bg-card border border-border rounded-lg p-4">
                      {Object.entries(product.specifications).map(([key, value]) => (
                        <div key={key} className="flex justify-between py-2 border-b border-border last:border-b-0">
                          <span className="text-sm text-muted-foreground">{key}:</span>
                          <span className="text-sm font-medium text-foreground">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Applications */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Aplicações:</h3>
                    <div className="flex flex-wrap gap-2">
                      {product.applications.map((app, idx) => (
                        <span key={idx} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                          {app}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button 
                      onClick={handleWhatsApp}
                      className="growx-btn-primary"
                    >
                      Solicitar Orçamento
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                    
                    <Button variant="outline">
                      Especificações Técnicas
                    </Button>
                  </div>
                </div>

                <div className={index % 2 === 1 ? 'lg:col-start-1' : ''}>
                  <div className="relative">
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      className="rounded-2xl shadow-2xl w-full"
                    />
                    
                    {/* Price Badge */}
                    <div className="absolute top-6 right-6 bg-card border border-border rounded-lg p-3 shadow-lg">
                      <div className="text-sm text-muted-foreground">Preço</div>
                      <div className="text-lg font-bold text-primary">{product.price}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Common Features */}
      <section className="growx-section bg-card">
        <div className="growx-container">
          <div className="text-center mb-16">
            <h2 className="growx-title mb-4">
              Tecnologia <span className="text-primary">Comum</span>
            </h2>
            <p className="growx-subtitle max-w-3xl mx-auto">
              Recursos avançados presentes em todos os produtos Grow-X
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {commonFeatures.map((feature, index) => {
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

      {/* Connectivity Section */}
      <section className="growx-section">
        <div className="growx-container">
          <div className="text-center mb-16">
            <h2 className="growx-title mb-4">
              Conectividade <span className="text-primary">Avançada</span>
            </h2>
            <p className="growx-subtitle max-w-3xl mx-auto">
              Todos os produtos Grow-X são projetados para máxima conectividade e integração
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="growx-card p-8 text-center">
              <div className="w-16 h-16 bg-green-500 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Wifi className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">Conectividade IoT</h3>
              <p className="text-muted-foreground mb-6">
                Todos os produtos se conectam via LoRa, WiFi ou 4G para monitoramento remoto em tempo real.
              </p>
              <ul className="space-y-2 text-left">
                <li className="flex items-center text-sm text-foreground">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-3 flex-shrink-0" />
                  Transmissão de dados em tempo real
                </li>
                <li className="flex items-center text-sm text-foreground">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-3 flex-shrink-0" />
                  Alertas automáticos
                </li>
                <li className="flex items-center text-sm text-foreground">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-3 flex-shrink-0" />
                  Controle remoto
                </li>
              </ul>
            </div>

            <div className="growx-card p-8 text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Cloud className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">Armazenamento na Nuvem</h3>
              <p className="text-muted-foreground mb-6">
                Dados seguros na nuvem com acesso de qualquer lugar e histórico completo.
              </p>
              <ul className="space-y-2 text-left">
                <li className="flex items-center text-sm text-foreground">
                  <CheckCircle className="w-4 h-4 text-blue-600 mr-3 flex-shrink-0" />
                  Backup automático
                </li>
                <li className="flex items-center text-sm text-foreground">
                  <CheckCircle className="w-4 h-4 text-blue-600 mr-3 flex-shrink-0" />
                  Acesso multiplataforma
                </li>
                <li className="flex items-center text-sm text-foreground">
                  <CheckCircle className="w-4 h-4 text-blue-600 mr-3 flex-shrink-0" />
                  Análise de tendências
                </li>
              </ul>
            </div>

            <div className="growx-card p-8 text-center">
              <div className="w-16 h-16 bg-purple-500 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Settings className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">Automação Inteligente</h3>
              <p className="text-muted-foreground mb-6">
                Sistemas inteligentes que aprendem e se adaptam às condições do seu cultivo.
              </p>
              <ul className="space-y-2 text-left">
                <li className="flex items-center text-sm text-foreground">
                  <CheckCircle className="w-4 h-4 text-purple-600 mr-3 flex-shrink-0" />
                  Automação baseada em IA
                </li>
                <li className="flex items-center text-sm text-foreground">
                  <CheckCircle className="w-4 h-4 text-purple-600 mr-3 flex-shrink-0" />
                  Otimização contínua
                </li>
                <li className="flex items-center text-sm text-foreground">
                  <CheckCircle className="w-4 h-4 text-purple-600 mr-3 flex-shrink-0" />
                  Prevenção de problemas
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="growx-section bg-primary text-primary-foreground">
        <div className="growx-container">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">
              Pronto para Modernizar sua Produção?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Entre em contato conosco e descubra qual produto Grow-X é ideal para sua operação
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={handleWhatsApp}
                variant="secondary"
                size="lg"
                className="bg-white text-primary hover:bg-gray-100"
              >
                Solicitar Orçamento
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              
              <Button 
                variant="outline"
                size="lg"
                className="border-white text-white hover:bg-white hover:text-primary"
              >
                Falar com Especialista
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProductsPage;

