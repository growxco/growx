import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Smartphone, 
  Users, 
  Brain, 
  Wifi,
  Leaf,
  Camera,
  MessageCircle,
  ShoppingCart,
  BarChart3,
  Clock,
  Star,
  CheckCircle,
  ArrowRight,
  Download,
  Shield,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import growxAppHero from '../assets/growx-app-hero-cannabis.jpg';
import iconGrowXApp from '../assets/icon-gx-app.png';

const GrowXAppPage = () => {
  const handleWhatsApp = () => {
    window.open('https://wa.me/5541995494343', '_blank');
  };

  const handleDownload = (platform) => {
    // Placeholder para links de download
    if (platform === 'android') {
      window.open('https://play.google.com/store/apps/details?id=com.growx.app', '_blank');
    } else {
      window.open('https://apps.apple.com/app/growx-app/id123456789', '_blank');
    }
  };

  const features = [
    {
      icon: Wifi,
      title: 'Controle Remoto de Estufas',
      description: 'Monitore e controle suas estufas de qualquer lugar através do app com conectividade IoT avançada'
    },
    {
      icon: Brain,
      title: 'IA para Otimização de Cultivo',
      description: 'Inteligência artificial que aprende com seu cultivo e sugere melhorias personalizadas'
    },
    {
      icon: Users,
      title: 'Rede Social para Growers',
      description: 'Conecte-se com outros cultivadores, compartilhe experiências e aprenda com a comunidade'
    },
    {
      icon: ShoppingCart,
      title: 'Marketplace Integrado',
      description: 'Compre e venda produtos, sementes e equipamentos dentro do próprio aplicativo'
    }
  ];

  const appFeatures = [
    {
      icon: Camera,
      title: 'Diário de Cultivo',
      description: 'Registre o progresso das suas plantas com fotos e anotações detalhadas'
    },
    {
      icon: BarChart3,
      title: 'Analytics Avançado',
      description: 'Acompanhe métricas de crescimento, consumo e produtividade'
    },
    {
      icon: MessageCircle,
      title: 'Chat com Especialistas',
      description: 'Tire dúvidas diretamente com agrônomos e especialistas em cannabis'
    },
    {
      icon: Shield,
      title: 'Cultivo Legal',
      description: 'Ferramentas para manter seu cultivo dentro da legalidade brasileira'
    },
    {
      icon: Clock,
      title: 'Cronogramas Automáticos',
      description: 'Lembretes e cronogramas personalizados para cada fase do cultivo'
    },
    {
      icon: Zap,
      title: 'Automação Completa',
      description: 'Integração com hardware Grow-X para automação total do ambiente'
    }
  ];

  const benefits = [
    {
      title: 'Para Pacientes Medicinais',
      description: 'Cultivo controlado e documentado para uso medicinal com rastreabilidade completa',
      features: ['Dosagem precisa', 'Qualidade garantida', 'Documentação médica']
    },
    {
      title: 'Para Growers Domésticos',
      description: 'Ferramentas profissionais para cultivo doméstico com resultados superiores',
      features: ['Cultivo otimizado', 'Comunidade ativa', 'Suporte técnico']
    },
    {
      title: 'Para Projetos Estruturados',
      description: 'Soluções escaláveis para operações maiores e mais complexas',
      features: ['Gestão completa', 'Múltiplas estufas', 'Relatórios avançados']
    }
  ];

  const stats = [
    { number: 'Ambiente Ideal', label: 'Mantenha clima, luz e irrigação sempre no ponto certo, sem esforç' },
    { number: 'Alertas Inteligentes', label: 'Receba avisos estratégicos e aja na hora certa para evitar prejuízos' },
    { number: 'Controle Remoto', label: 'Gerencie sua estufa de onde estiver — autonomia total na palma da mão' },
    { number: 'Produtividade Controlada', label: 'Cultive mais e melhor com dados precisos e automações inteligentes' },

  ];

  const communityFeatures = [
    'Fóruns especializados por tipo de cultivo',
    'Marketplace de genética e equipamentos',
    'Eventos e encontros da comunidade',
    'Ranking de cultivadores experientes',
    'Troca de experiências e dicas',
    'Suporte técnico colaborativo'
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="growx-hero growx-section">
        <div className="growx-container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center px-4 py-2 bg-green-500/10 text-green-600 rounded-full text-sm font-medium mb-6">
                <Leaf className="w-4 h-4 mr-2" />
                Cannabis & Agricultura Urbana
              </div>
              
              <h1 className="growx-title mb-6">
                Grow-X <span className="text-green-600">App</span>
              </h1>
              
              <p className="growx-subtitle mb-8">
                Solução completa de monitoramento e gestão de cultivo, pensada especialmente para o universo 
                canábico no Brasil. Ideal para pacientes, cultivadores medicinais, growers domésticos e projetos mais estruturados.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button 
                  onClick={() => handleDownload('android')}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Android
                </Button>
                
                <Button 
                  onClick={() => handleDownload('ios')}
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download iOS
                </Button>
              </div>

              {/* App Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center p-3 bg-card rounded-lg border">
                    <div className="text-lg font-bold text-green-600">{stat.number}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <img 
                src={growxAppHero} 
                alt="Grow-X App Cannabis" 
                className="rounded-2xl shadow-2xl"
              />
              
              {/* App Icon Overlay */}
              <div className="absolute top-6 left-6 bg-card border border-border rounded-xl p-4 shadow-lg">
                <img 
                  src={iconGrowXApp} 
                  alt="Grow-X App Icon" 
                  className="w-12 h-12"
                />
                <div className="text-sm font-medium text-foreground mt-2">Grow-X App</div>
                <div className="flex items-center mt-1">
                  </div>
              </div>

              {/* Live Status */}
              <div className="absolute bottom-6 right-6 bg-card border border-border rounded-lg p-3 shadow-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                  <div className="text-sm font-medium text-foreground">APP em desenvolvimento</div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  <span className="text-green-600 font-medium">Lançamento previsto</span> Novembro 2026
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Features */}
      <section className="growx-section">
        <div className="growx-container">
          <div className="text-center mb-16">
            <h2 className="growx-title mb-4">
              Recursos <span className="text-green-600">Principais</span>
            </h2>
            <p className="growx-subtitle max-w-3xl mx-auto">
              Tecnologia de ponta desenvolvida especificamente para o cultivo de cannabis
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div key={index} className="growx-card p-8">
                  <div className="flex items-center mb-6">
                    <div className="w-16 h-16 bg-green-500 rounded-xl flex items-center justify-center mr-4">
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">{feature.title}</h3>
                  </div>
                  
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* App Features Grid */}
      <section className="growx-section bg-card">
        <div className="growx-container">
          <div className="text-center mb-16">
            <h2 className="growx-title mb-4">
              Funcionalidades <span className="text-green-600">Completas</span>
            </h2>
            <p className="growx-subtitle max-w-3xl mx-auto">
              Tudo que você precisa para um cultivo profissional e bem-sucedido
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {appFeatures.map((feature, index) => {
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

      {/* Target Audiences */}
      <section className="growx-section">
        <div className="growx-container">
          <div className="text-center mb-16">
            <h2 className="growx-title mb-4">
              Para Todos os <span className="text-green-600">Cultivadores</span>
            </h2>
            <p className="growx-subtitle max-w-3xl mx-auto">
              Soluções adaptadas para diferentes perfis e necessidades de cultivo
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="growx-card p-8">
                <h3 className="text-xl font-bold text-foreground mb-4">{benefit.title}</h3>
                <p className="text-muted-foreground mb-6">{benefit.description}</p>
                
                <ul className="space-y-2">
                  {benefit.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center text-sm text-foreground">
                      <CheckCircle className="w-4 h-4 text-green-600 mr-3 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="growx-section bg-card">
        <div className="growx-container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="growx-title mb-6">
                Comunidade <span className="text-green-600">Grow-X</span>
              </h2>
              <p className="growx-subtitle mb-8">
                Mais que um app, uma comunidade completa de cultivadores que compartilham 
                conhecimento, experiências e apoiam uns aos outros no cultivo responsável.
              </p>

              <div className="space-y-4 mb-8">
                {communityFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-foreground">{feature}</span>
                  </div>
                ))}
              </div>

              <Button 
                onClick={handleWhatsApp}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Entrar na Comunidade
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-2xl p-8 text-white">
                <div className="text-center mb-6">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-80" />
                  <h3 className="text-2xl font-bold mb-2">Clube Virtual Grow-X</h3>
                  <p className="opacity-90">Comunidade exclusiva de cultivadores</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">Diario de cultivo</div>
                    <div className="text-sm opacity-80">Compartilhe e tenha acesso a diarios de cultivo de outros growers</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">Aprendizado contínuo</div>
                    <div className="text-sm opacity-80">Acesso a experiências e aprendizados dos melhores growerss</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">Planos acessíveis</div>
                    <div className="text-sm opacity-80">Assinaturas mensais com benefícios exclusivos</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">Crescimento colaborativo</div>
                    <div className="text-sm opacity-80">Cultive melhor com apoio de quem já passou pelos mesmos desafios</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Download CTA */}
      <section className="growx-section bg-green-600 text-white">
        <div className="growx-container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Comece seu Cultivo Profissional Hoje!
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Baixe o Grow-X App e transforme seu cultivo com tecnologia de ponta e uma comunidade incrível
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button 
              variant="secondary" 
              size="lg"
              onClick={() => handleDownload('android')}
              className="bg-white text-green-600 hover:bg-white/90"
            >
              <Download className="w-5 h-5 mr-2" />
              Download para Android
            </Button>
            
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => handleDownload('ios')}
              className="border-white text-white hover:bg-white hover:text-green-600"
            >
              <Download className="w-5 h-5 mr-2" />
              Download para iOS
            </Button>
          </div>

          <p className="text-sm opacity-75">
            Disponível gratuitamente na App Store e Google Play
          </p>
        </div>
      </section>
    </div>
  );
};

export default GrowXAppPage;

