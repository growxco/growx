import { Link } from 'react-router-dom'; 
import { 
  Calendar, 
  Users, 
  Trophy, 
  Target,
  Lightbulb,
  Rocket,
  Globe,
  Award,
  TrendingUp,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const HistoryPage = () => {
  const handleWhatsApp = () => {
    window.open('https://wa.me/5541995494343', '_blank');
  };

  const values = [
    {
      icon: Lightbulb,
      title: 'Inovação',
      description: 'Desenvolvimento de tecnologias de ponta para agricultura'
    },
    {
      icon: Users,
      title: 'Colaboração',
      description: 'Trabalho em parceria com produtores e indústrias'
    },
    {
      icon: Target,
      title: 'Sustentabilidade',
      description: 'Soluções que promovem práticas agrícolas responsáveis'
    },
    {
      icon: Award,
      title: 'Excelência',
      description: 'Compromisso com qualidade em todos os produtos e serviços'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="growx-hero growx-section">
        <div className="growx-container">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6">
              <Calendar className="w-4 h-4 mr-2" />
              Nossa Trajetória
            </div>
            
            <h1 className="growx-title mb-6">
              A História da <span className="text-primary">Grow-X</span>
            </h1>
            
            <p className="growx-subtitle max-w-4xl mx-auto mb-12">
               De Startup Visionária a Referência em Cultivo Tecnológico
A Grow-X Co. começou com foco exclusivo no cultivo indoor de cannabis,
 desenvolvendo soluções como o Grow-X App, que integra inteligência artificial
  para suporte e marketplace especializado. Ao longo do tempo, 
  expandimos nossa atuação para outros tipos de cultivos, sempre focados na automação e otimização.
   Com a integração da PLK DO BRASIL, passamos a oferecer também o SUPPLY-X, uma plataforma robusta 
   que conecta todas as etapas da cadeia produtiva agrícola, do plantio à fase final de processamento. 
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={handleWhatsApp}
                className="growx-btn-primary"
              >
                Entre em Contato
              </Button>
              
              <Button variant="outline">
                Conheça Nossa Equipe
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="growx-section">
        <div className="growx-container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="growx-title mb-6">
                Quem <span className="text-primary">Somos</span>
              </h2>
              <p className="growx-subtitle mb-8">
                Somos uma empresa de tecnologia focada em revolucionar a agricultura brasileira 
                através de soluções inovadoras de IoT, automação e monitoramento.
              </p>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">Especialistas em tecnologia agrícola</span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">Soluções para toda a cadeia produtiva</span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">Foco em sustentabilidade e eficiência</span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">Atendimento em todo o território nacional</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-8">
                <div className="text-center">
                  <Rocket className="w-16 h-16 text-primary mx-auto mb-6" />
                  <h3 className="text-2xl font-bold text-foreground mb-4">Nossa Missão</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Democratizar o acesso à tecnologia agrícola de ponta, oferecendo soluções 
                    que aumentam a produtividade, reduzem custos e promovem práticas sustentáveis 
                    no agronegócio brasileiro.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="growx-section bg-card">
        <div className="growx-container">
          <div className="text-center mb-16">
            <h2 className="growx-title mb-4">
              Nossos <span className="text-primary">Valores</span>
            </h2>
            <p className="growx-subtitle max-w-3xl mx-auto">
              Princípios que orientam nosso trabalho e relacionamento com clientes
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => {
              const IconComponent = value.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <IconComponent className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">{value.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{value.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Products Overview */}
      <section className="growx-section">
        <div className="growx-container">
          <div className="text-center mb-16">
            <h2 className="growx-title mb-4">
              Nossas <span className="text-primary">Soluções</span>
            </h2>
            <p className="growx-subtitle max-w-3xl mx-auto">
              Desenvolvemos produtos e plataformas que atendem diferentes segmentos do agronegócio
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="growx-card p-8 text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">Supply-X Platform</h3>
              <p className="text-muted-foreground">
                Plataforma modular que integra SPI (Indústria) e SPP (Produtores) 
                para controle total da cadeia produtiva.
              </p>
            </div>

            <div className="growx-card p-8 text-center">
              <div className="w-16 h-16 bg-green-500 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Lightbulb className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">Grow-X App</h3>
              <p className="text-muted-foreground">
                Aplicativo especializado em cannabis medicinal e agricultura urbana 
                com recursos de automação e comunidade.
              </p>
            </div>

            <div className="growx-card p-8 text-center">
              <div className="w-16 h-16 bg-purple-500 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">Hardware IoT</h3>
              <p className="text-muted-foreground">
                Estações meteorológicas, módulos de controle e estufas automatizadas 
                com tecnologia de ponta.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Information */}
      <section className="growx-section bg-card">
        <div className="growx-container">
          <div className="text-center mb-12">
            <h2 className="growx-title mb-4">
              Nossa <span className="text-primary">Localização</span>
            </h2>
            <p className="growx-subtitle max-w-3xl mx-auto">
              Estamos localizados em Curitiba, PR, mas atendemos todo o Brasil
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Globe className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Endereço</h3>
                    <p className="text-muted-foreground text-sm">
                      Rua Parnaíba, 330<br />
                      São Francisco, Curitiba, PR<br />
                      Brasil
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Atendimento</h3>
                    <p className="text-muted-foreground text-sm">
                      Atendemos todo o território nacional<br />
                      com suporte técnico especializado<br />
                      e soluções customizadas
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-8 text-white">
                <h3 className="text-2xl font-bold mb-4">Entre em Contato</h3>
                <p className="mb-6 opacity-90">
                  Converse com nossa equipe e descubra como podemos ajudar 
                  a transformar sua operação agrícola.
                </p>
                <Button 
                  onClick={handleWhatsApp}
                  variant="secondary"
                  className="bg-white text-primary hover:bg-white/90"
                >
                  Falar Conosco
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="growx-section bg-primary text-primary-foreground">
        <div className="growx-container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Conheça Mais Sobre a Grow-X
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Descubra como nossas soluções podem revolucionar sua operação agrícola
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="secondary" 
              size="lg"
              onClick={handleWhatsApp}
              className="bg-white text-primary hover:bg-white/90"
            >
              Solicitar Demonstração
            </Button>

<Link to="/produtos">
  <Button 
    variant="outline" 
    size="lg"
    className="border-white text-white hover:bg-white hover:text-primary"
  >
    Ver Nossos Produtos
  </Button>
</Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HistoryPage;

