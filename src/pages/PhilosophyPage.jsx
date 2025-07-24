import { 
  Target, 
  Eye, 
  Heart,
  Leaf,
  Users,
  Lightbulb,
  Shield,
  TrendingUp,
  Globe,
  Award,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const PhilosophyPage = () => {
  const handleWhatsApp = () => {
    window.open('https://wa.me/5541995494343', '_blank');
  };

  const coreValues = [
    {
      icon: Lightbulb,
      title: 'Inovação',
      description: 'Buscamos constantemente novas tecnologias e soluções para revolucionar a agricultura brasileira',
      principles: [
        'Pesquisa e desenvolvimento contínuo',
        'Adoção de tecnologias emergentes',
        'Criatividade na solução de problemas',
        'Melhoria contínua dos processos'
      ]
    },
    {
      icon: Users,
      title: 'Colaboração',
      description: 'Trabalhamos em parceria com nossos clientes, fornecedores e comunidade para criar soluções efetivas',
      principles: [
        'Relacionamentos de longo prazo',
        'Transparência na comunicação',
        'Trabalho em equipe',
        'Compartilhamento de conhecimento'
      ]
    },
    {
      icon: Leaf,
      title: 'Sustentabilidade',
      description: 'Desenvolvemos tecnologias que promovem práticas agrícolas sustentáveis e responsáveis',
      principles: [
        'Preservação ambiental',
        'Uso eficiente de recursos',
        'Práticas eco-friendly',
        'Responsabilidade social'
      ]
    },
    {
      icon: Shield,
      title: 'Excelência',
      description: 'Comprometidos com a qualidade superior em todos os aspectos do nosso trabalho',
      principles: [
        'Padrões elevados de qualidade',
        'Atendimento excepcional',
        'Produtos confiáveis',
        'Melhoria contínua'
      ]
    }
  ];

  const philosophyPillars = [
    {
      icon: Target,
      title: 'Foco no Cliente',
      description: 'Colocamos as necessidades dos nossos clientes no centro de tudo que fazemos'
    },
    {
      icon: TrendingUp,
      title: 'Crescimento Sustentável',
      description: 'Buscamos crescimento que beneficie todos os stakeholders de forma equilibrada'
    },
    {
      icon: Globe,
      title: 'Impacto Positivo',
      description: 'Trabalhamos para gerar impacto positivo na sociedade e no meio ambiente'
    },
    {
      icon: Award,
      title: 'Reconhecimento',
      description: 'Valorizamos e reconhecemos as contribuições de nossa equipe e parceiros'
    }
  ];

  const commitments = [
    'Democratizar o acesso à tecnologia agrícola de ponta',
    'Promover práticas sustentáveis no agronegócio',
    'Apoiar o desenvolvimento de pequenos e médios produtores',
    'Contribuir para a segurança alimentar do país',
    'Fomentar a inovação no setor agrícola brasileiro',
    'Manter os mais altos padrões éticos em nossos negócios'
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="growx-hero growx-section">
        <div className="growx-container">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6">
              <Heart className="w-4 h-4 mr-2" />
              Nossos Princípios
            </div>
            
            <h1 className="growx-title mb-6">
              Filosofia, Missão e <span className="text-primary">Valores</span>
            </h1>
            
            <p className="growx-subtitle max-w-4xl mx-auto mb-12">
              Conheça os princípios que orientam nossa empresa e definem nossa forma de trabalhar, 
              sempre com foco na transformação positiva da agricultura brasileira.
            </p>
          </div>
        </div>
      </section>

      {/* Mission, Vision, Values */}
      <section className="growx-section">
        <div className="growx-container">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Mission */}
            <div className="growx-card p-8 text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-4">Nossa Missão</h3>
              <p className="text-muted-foreground leading-relaxed">
                Democratizar o acesso à tecnologia agrícola de ponta, oferecendo soluções 
                que aumentam a produtividade, reduzem custos e promovem práticas sustentáveis 
                no agronegócio brasileiro.
              </p>
            </div>

            {/* Vision */}
            <div className="growx-card p-8 text-center">
              <div className="w-16 h-16 bg-green-500 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Eye className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-4">Nossa Visão</h3>
              <p className="text-muted-foreground leading-relaxed">
                Ser a empresa líder em tecnologia agrícola no Brasil, reconhecida pela 
                inovação, qualidade e impacto positivo na transformação do agronegócio 
                nacional rumo à sustentabilidade.
              </p>
            </div>

            {/* Philosophy */}
            <div className="growx-card p-8 text-center">
              <div className="w-16 h-16 bg-purple-500 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-4">Nossa Filosofia</h3>
              <p className="text-muted-foreground leading-relaxed">
                Acreditamos que a tecnologia deve ser acessível, sustentável e centrada 
                nas pessoas. Trabalhamos com paixão para criar soluções que realmente 
                fazem a diferença na vida dos produtores.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="growx-section bg-card">
        <div className="growx-container">
          <div className="text-center mb-16">
            <h2 className="growx-title mb-4">
              Nossos <span className="text-primary">Valores</span>
            </h2>
            <p className="growx-subtitle max-w-3xl mx-auto">
              Princípios fundamentais que orientam nossas decisões e ações no dia a dia
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {coreValues.map((value, index) => {
              const IconComponent = value.icon;
              return (
                <div key={index} className="growx-card p-8">
                  <div className="flex items-center mb-6">
                    <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mr-4">
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-foreground">{value.title}</h3>
                  </div>
                  
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    {value.description}
                  </p>

                  <ul className="space-y-2">
                    {value.principles.map((principle, idx) => (
                      <li key={idx} className="flex items-center text-sm text-foreground">
                        <CheckCircle className="w-4 h-4 text-primary mr-3 flex-shrink-0" />
                        {principle}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Philosophy Pillars */}
      <section className="growx-section">
        <div className="growx-container">
          <div className="text-center mb-16">
            <h2 className="growx-title mb-4">
              Pilares da Nossa <span className="text-primary">Filosofia</span>
            </h2>
            <p className="growx-subtitle max-w-3xl mx-auto">
              Fundamentos que sustentam nossa forma de trabalhar e nos relacionar
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {philosophyPillars.map((pillar, index) => {
              const IconComponent = pillar.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <IconComponent className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">{pillar.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{pillar.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Commitments */}
      <section className="growx-section bg-card">
        <div className="growx-container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="growx-title mb-6">
                Nossos <span className="text-primary">Compromissos</span>
              </h2>
              <p className="growx-subtitle mb-8">
                Assumimos responsabilidades que vão além do nosso negócio, 
                contribuindo para um futuro melhor para a agricultura brasileira.
              </p>

              <div className="space-y-4">
                {commitments.map((commitment, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-foreground">{commitment}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <Button 
                  onClick={handleWhatsApp}
                  className="growx-btn-primary"
                >
                  Converse Conosco
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-8">
                <div className="text-center">
                  <Globe className="w-16 h-16 text-primary mx-auto mb-6" />
                  <h3 className="text-2xl font-bold text-foreground mb-4">Impacto Positivo</h3>
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    Trabalhamos todos os dias para gerar impacto positivo na agricultura, 
                    na sociedade e no meio ambiente através da tecnologia.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary">100%</div>
                      <div className="text-xs text-muted-foreground">Sustentável</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary">∞</div>
                      <div className="text-xs text-muted-foreground">Inovação</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary">24/7</div>
                      <div className="text-xs text-muted-foreground">Dedicação</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary">+</div>
                      <div className="text-xs text-muted-foreground">Impacto</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Culture Section */}
      <section className="growx-section">
        <div className="growx-container">
          <div className="text-center mb-16">
            <h2 className="growx-title mb-4">
              Nossa <span className="text-primary">Cultura</span>
            </h2>
            <p className="growx-subtitle max-w-3xl mx-auto">
              Um ambiente de trabalho que valoriza pessoas, ideias e resultados
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="growx-card p-8 text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">Pessoas em Primeiro Lugar</h3>
              <p className="text-muted-foreground">
                Valorizamos cada membro da nossa equipe e investimos no seu desenvolvimento 
                pessoal e profissional contínuo.
              </p>
            </div>

            <div className="growx-card p-8 text-center">
              <div className="w-16 h-16 bg-green-500 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Lightbulb className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">Ambiente de Inovação</h3>
              <p className="text-muted-foreground">
                Criamos um ambiente que estimula a criatividade, experimentação e 
                o desenvolvimento de soluções inovadoras.
              </p>
            </div>

            <div className="growx-card p-8 text-center">
              <div className="w-16 h-16 bg-purple-500 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Award className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">Reconhecimento e Crescimento</h3>
              <p className="text-muted-foreground">
                Reconhecemos conquistas e oferecemos oportunidades de crescimento 
                para todos os membros da nossa equipe.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="growx-section bg-primary text-primary-foreground">
        <div className="growx-container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Compartilhe Nossos Valores
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Se você se identifica com nossa filosofia e valores, venha fazer parte da transformação 
            da agricultura brasileira
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="secondary" 
              size="lg"
              onClick={handleWhatsApp}
              className="bg-white text-primary hover:bg-white/90"
            >
              Falar Conosco
            </Button>
            
            <Button 
              variant="outline" 
              size="lg"
              className="border-white text-white hover:bg-white hover:text-primary"
            >
              Conhecer a Equipe
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PhilosophyPage;

