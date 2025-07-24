import { 
  Users, 
  Linkedin, 
  Mail,
  Award,
  Target,
  Lightbulb,
  TrendingUp,
  MessageCircle,
  GraduationCap,
  Building
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Importando as fotos dos executivos
import fernandoPhoto from '../assets/fernando_schreiber_ceo.jpeg';
import jeffersonPhoto from '../assets/jefferson_schreiber_cto.jpeg';
import julioPhoto from '../assets/julio_calcagnotto_juridico.jpeg';

const ExecutivePage = () => {
  const handleWhatsApp = () => {
    window.open('https://wa.me/5541995494343', '_blank');
  };

  const handleContact = () => {
    window.open('mailto:contato@growxco.com.br', '_blank');
  };

  const executives = [
    {
      name: 'Fernando Schreiber',
      position: 'CEO',
      photo: fernandoPhoto,
      description: 'Fernando Schreiber é o arquiteto da transformação da Grow-X Co. no setor de cultivo automatizado. Com mestrado em Psicologia Social e uma visão única de mercado, Fernando idealizou a integração entre tecnologia, cultivo e uma rede social para o compartilhamento de dados e a futura implementação de inteligência artificial. Como CEO e Diretor de Marketing, ele lidera a estratégia de crescimento da empresa.',
      expertise: ['Psicologia Social', 'Estratégia de Mercado', 'Inovação', 'Liderança']
    },
    {
      name: 'Jefferson Schreiber',
      position: 'Diretor de Tecnologia (CTO)',
      photo: jeffersonPhoto,
      description: 'Com mais de três décadas de experiência em tecnologia, Jefferson Schreiber é o responsável por transformar a visão estratégica da Grow-X Co. em soluções tecnológicas concretas. Como CTO, ele lidera o desenvolvimento das estufas automatizadas, sistemas de monitoramento e plataformas digitais que diferenciam a empresa no mercado.',
      expertise: ['Desenvolvimento de Software', 'IoT', 'Automação', 'Sistemas Embarcados']
    },
    {
      name: 'Julio Calcagnotto',
      position: 'Diretor Jurídico',
      photo: julioPhoto,
      description: 'Julio é o responsável por garantir que todas as operações da Grow-X Co. estejam em total conformidade com as regulamentações do setor. Especialista em direito empresarial e legislação canábica, Julio é uma peça chave para o sucesso jurídico da empresa. Seu profundo conhecimento do mercado permite à Grow-X Co. operar de forma ética e segura.',
      expertise: ['Direito Empresarial', 'Legislação Canábica', 'Compliance', 'Regulamentações']
    }
  ];

  const companyValues = [
    {
      icon: Target,
      title: 'Visão Estratégica',
      description: 'Liderança com visão de longo prazo para o crescimento sustentável da agricultura'
    },
    {
      icon: Lightbulb,
      title: 'Inovação Contínua',
      description: 'Compromisso com o desenvolvimento de soluções tecnológicas revolucionárias'
    },
    {
      icon: Award,
      title: 'Experiência Comprovada',
      description: 'Décadas de experiência combinada em tecnologia e agronegócio'
    },
    {
      icon: TrendingUp,
      title: 'Excelência Operacional',
      description: 'Dedicação à qualidade e conformidade em todas as operações'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="growx-hero growx-section">
        <div className="growx-container">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6">
              <Users className="w-4 h-4 mr-2" />
              Liderança e Equipe
            </div>
            
            <h1 className="growx-title mb-6">
              Equipe <span className="text-primary">Executiva</span>
            </h1>
            
            <p className="growx-subtitle max-w-4xl mx-auto mb-12">
              Nossa liderança é formada por profissionais experientes e visionários, comprometidos 
              em revolucionar a agricultura brasileira através da tecnologia.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={handleContact}
                className="growx-btn-primary"
              >
                <Mail className="w-4 h-4 mr-2" />
                Entrar em Contato
              </Button>
              
              <Button 
                onClick={handleWhatsApp}
                variant="outline"
                className="growx-btn-outline"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Leadership Message */}
      <section className="growx-section bg-card">
        <div className="growx-container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">
                Mensagem da <span className="text-primary">Liderança</span>
              </h2>
              
              <blockquote className="text-lg text-muted-foreground mb-8 italic leading-relaxed">
                "Na Grow-X Co., acreditamos que a tecnologia é a chave para transformar a agricultura brasileira. 
                Nossa missão é democratizar o acesso a soluções inovadoras que aumentem a produtividade, 
                reduzam custos e promovam práticas sustentáveis. Com nossa experiência combinada em tecnologia, 
                psicologia social e direito, estamos preparados para liderar essa transformação."
              </blockquote>
              
              <div className="text-sm text-muted-foreground">
                <strong>Diretoria Grow-X Co.</strong>
              </div>
            </div>

            <div className="bg-primary/5 rounded-2xl p-8">
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10 text-white" />
              </div>
              
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Compromisso com a excelência
                  </div>
                </div>
                <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                    Foco em resultados sustentáveis
                  </div>
                </div>
                <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                    Inovação constante
                  </div>
                </div>
                <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                    Valorização das pessoas
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Executives Section */}
      <section className="growx-section">
        <div className="growx-container">
          <div className="text-center mb-16">
            <h2 className="growx-title mb-4">
              Nossos <span className="text-primary">Líderes</span>
            </h2>
            <p className="growx-subtitle max-w-3xl mx-auto">
              Conheça os profissionais que lideram a transformação da Grow-X Co.
            </p>
          </div>

          <div className="space-y-16">
            {executives.map((executive, index) => (
              <div key={executive.name} className={`grid lg:grid-cols-2 gap-12 items-center ${index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''}`}>
                <div className={index % 2 === 1 ? 'lg:col-start-2' : ''}>
                  <h3 className="text-2xl font-bold text-foreground mb-2">{executive.name}</h3>
                  <div className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6">
                    {executive.position}
                  </div>
                  
                  <p className="text-muted-foreground mb-8 leading-relaxed">
                    {executive.description}
                  </p>

                  <div className="mb-8">
                    <div className="flex items-center mb-4">
                      <GraduationCap className="w-5 h-5 text-primary mr-2" />
                      <h4 className="text-lg font-semibold text-foreground">Áreas de Especialização</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {executive.expertise.map((skill, idx) => (
                        <span key={idx} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={`flex justify-center ${index % 2 === 1 ? 'lg:col-start-1' : ''}`}>
                  <div className="relative">
                    <div className="w-80 h-80 rounded-full overflow-hidden border-4 border-primary/20 shadow-2xl">
                      <img 
                        src={executive.photo} 
                        alt={executive.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {/* Badge */}
                    <div className="absolute bottom-4 right-4 w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-lg">
                      <Building className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Company Values */}
      <section className="growx-section bg-card">
        <div className="growx-container">
          <div className="text-center mb-16">
            <h2 className="growx-title mb-4">
              Nossos <span className="text-primary">Diferenciais</span>
            </h2>
            <p className="growx-subtitle max-w-3xl mx-auto">
              Características que definem nossa liderança e nossa forma de trabalhar
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {companyValues.map((value, index) => {
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

      {/* Contact Section */}
      <section className="growx-section">
        <div className="growx-container">
          <div className="text-center mb-16">
            <h2 className="growx-title mb-4">
              Fale com Nossa <span className="text-primary">Equipe</span>
            </h2>
            <p className="growx-subtitle max-w-3xl mx-auto">
              Entre em contato conosco para conhecer melhor nossa empresa e soluções
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="growx-card p-8 text-center">
              <div className="w-16 h-16 bg-green-500 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">E-mail Corporativo</h3>
              <p className="text-muted-foreground mb-6">
                Entre em contato através do nosso e-mail oficial para questões comerciais e parcerias.
              </p>
              <Button 
                onClick={handleContact}
                className="growx-btn-primary w-full"
              >
                Enviar E-mail
              </Button>
            </div>

            <div className="growx-card p-8 text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">WhatsApp Direto</h3>
              <p className="text-muted-foreground mb-6">
                Fale diretamente com nossa equipe através do WhatsApp para atendimento rápido.
              </p>
              <Button 
                onClick={handleWhatsApp}
                className="growx-btn-primary w-full"
              >
                Abrir WhatsApp
              </Button>
            </div>

            <div className="growx-card p-8 text-center">
              <div className="w-16 h-16 bg-purple-500 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Building className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">Reunião Presencial</h3>
              <p className="text-muted-foreground mb-6">
                Agende uma reunião presencial em nosso escritório em Curitiba, PR.
              </p>
              <Button 
                onClick={handleContact}
                className="growx-btn-primary w-full"
              >
                Agendar Reunião
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="growx-section bg-primary text-primary-foreground">
        <div className="growx-container">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">
              Conheça Nossa Equipe Pessoalmente
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Estamos sempre disponíveis para conversar sobre como podemos ajudar sua operação
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={handleContact}
                variant="secondary"
                size="lg"
                className="bg-white text-primary hover:bg-gray-100"
              >
                <Mail className="w-5 h-5 mr-2" />
                Enviar E-mail
              </Button>
              
              <Button 
                onClick={handleWhatsApp}
                variant="outline"
                size="lg"
                className="border-white text-white hover:bg-white hover:text-primary"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ExecutivePage;

