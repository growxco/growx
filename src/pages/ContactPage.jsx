import { useState } from 'react';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock,
  Send,
  MessageCircle,
  Linkedin,
  Instagram,
  Facebook,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    subject: '',
    message: ''
  });

  const handleWhatsApp = () => {
    window.open('https://wa.me/5541995494343', '_blank');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Aqui seria implementada a lógica de envio do formulário
    console.log('Form submitted:', formData);
    alert('Mensagem enviada com sucesso! Entraremos em contato em breve.');
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const contactInfo = [
    {
      icon: MapPin,
      title: 'Endereço',
      details: [
        'Av Sete de Setembro 4923, Sala 1203',
        'Batel, Curitiba, PR',
        'CEP: 80510-000'
      ]
    },
    {
      icon: Phone,
      title: 'Telefone',
      details: [
        '+55 (41) 99549-4343',
        'WhatsApp disponível',
        'Seg-Sex: 8h às 18h'
      ]
    },
    {
      icon: Mail,
      title: 'E-mail',
      details: [
        'growx@growx.com.br',
      ]
    },
    {
      icon: Clock,
      title: 'Horário de Atendimento',
      details: [
        'Segunda a Sexta: 8h às 18h',
        'Sábado: 8h às 12h',
        'Domingo: Fechado'
      ]
    }
  ];

  const socialLinks = [
    { 
      name: 'LinkedIn', 
      icon: Linkedin, 
      href: 'https://br.linkedin.com/company/growxco',
      color: 'bg-blue-600'
    },
    { 
      name: 'Instagram', 
      icon: Instagram, 
      href: 'https://www.instagram.com/grow_x.co',
      color: 'bg-pink-600'
    },
    { 
      name: 'Facebook', 
      icon: Facebook, 
      href: 'https://facebook.com/grow_x.co',
      color: 'bg-blue-700'
    }
  ];

  const services = [
    'Consultoria em Agricultura de Precisão',
    'Implementação de Sistemas IoT',
    'Treinamento e Capacitação',
    'Suporte Técnico Especializado',
    'Desenvolvimento de Soluções Customizadas',
    'Manutenção e Monitoramento'
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="growx-hero growx-section">
        <div className="growx-container">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6">
              <MessageCircle className="w-4 h-4 mr-2" />
              Entre em Contato Conosco
            </div>
            
            <h1 className="growx-title mb-6">
              Vamos Conversar sobre seu <span className="text-primary">Projeto</span>
            </h1>
            
            <p className="growx-subtitle max-w-3xl mx-auto mb-12">
              Nossa equipe de especialistas está pronta para ajudar você a transformar sua operação 
              com tecnologia de ponta. Entre em contato e descubra como podemos colaborar.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={handleWhatsApp}
                className="growx-btn-primary"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp Direto
              </Button>
              
              <Button variant="outline">
                <Phone className="w-4 h-4 mr-2" />
                Ligar Agora
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="growx-section">
        <div className="growx-container">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="growx-card p-8">
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Envie sua Mensagem
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Nome Completo *
                    </label>
                    <Input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Seu nome completo"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      E-mail *
                    </label>
                    <Input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Telefone
                    </label>
                    <Input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Empresa
                    </label>
                    <Input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      placeholder="Nome da empresa"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Assunto *
                  </label>
                  <Input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    placeholder="Qual o assunto da sua mensagem?"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Mensagem *
                  </label>
                  <Textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder="Descreva seu projeto ou dúvida..."
                    rows={5}
                    required
                  />
                </div>

                <Button type="submit" className="w-full growx-btn-primary">
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Mensagem
                </Button>
              </form>
            </div>

            {/* Contact Information */}
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-6">
                  Informações de Contato
                </h2>
                
                <div className="space-y-6">
                  {contactInfo.map((info, index) => {
                    const IconComponent = info.icon;
                    return (
                      <div key={index} className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <IconComponent className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground mb-2">{info.title}</h3>
                          {info.details.map((detail, idx) => (
                            <p key={idx} className="text-muted-foreground text-sm">{detail}</p>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Social Media */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Redes Sociais
                </h3>
                
                <div className="flex space-x-4">
                  {socialLinks.map((social) => {
                    const IconComponent = social.icon;
                    return (
                      <a
                        key={social.name}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`w-12 h-12 ${social.color} rounded-lg flex items-center justify-center text-white hover:opacity-80 transition-opacity`}
                        aria-label={social.name}
                      >
                        <IconComponent className="w-6 h-6" />
                      </a>
                    );
                  })}
                </div>
              </div>

              {/* Services */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Nossos Serviços
                </h3>
                
                <ul className="space-y-2">
                  {services.map((service, index) => (
                    <li key={index} className="flex items-center text-sm text-foreground">
                      <CheckCircle className="w-4 h-4 text-primary mr-3 flex-shrink-0" />
                      {service}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
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

          <div className="grid lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-2">
              {/* Placeholder para mapa - seria integrado com Google Maps */}
              <div className="bg-muted rounded-2xl h-96 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-16 h-16 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-foreground mb-2">Mapa Interativo</h3>
                  <p className="text-muted-foreground">
                    Rua Parnaíba, 330 - São Francisco<br />
                    Curitiba, PR - CEP: 80510-000
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="growx-card p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">
                  Atendimento Presencial
                </h3>
                <p className="text-muted-foreground mb-4">
                  Agende uma visita ao nosso escritório para conhecer nossas soluções de perto.
                </p>
                <Button 
                  onClick={handleWhatsApp}
                  className="w-full growx-btn-primary"
                >
                  Agendar Visita
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              <div className="growx-card p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">
                  Suporte Remoto
                </h3>
                <p className="text-muted-foreground mb-4">
                  Oferecemos suporte técnico e consultoria online para todo o Brasil.
                </p>
                <Button variant="outline" className="w-full">
                  Suporte Online
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="growx-section">
        <div className="growx-container">
          <div className="text-center mb-12">
            <h2 className="growx-title mb-4">
              Perguntas <span className="text-primary">Frequentes</span>
            </h2>
            <p className="growx-subtitle max-w-3xl mx-auto">
              Respostas para as dúvidas mais comuns sobre nossos produtos e serviços
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="growx-card p-6">
                <h3 className="text-lg font-bold text-foreground mb-3">
                  Qual o prazo de entrega dos produtos?
                </h3>
                <p className="text-muted-foreground">
                  O prazo varia de acordo com o produto e localização. Geralmente entre 15 a 30 dias úteis 
                  para produtos em estoque e até 60 dias para soluções customizadas.
                </p>
              </div>

              <div className="growx-card p-6">
                <h3 className="text-lg font-bold text-foreground mb-3">
                  Vocês oferecem suporte técnico?
                </h3>
                <p className="text-muted-foreground">
                  Sim! Oferecemos suporte técnico completo, incluindo instalação, treinamento, 
                  manutenção e consultoria especializada para todos os nossos produtos.
                </p>
              </div>

              <div className="growx-card p-6">
                <h3 className="text-lg font-bold text-foreground mb-3">
                  É possível customizar as soluções?
                </h3>
                <p className="text-muted-foreground">
                  Absolutamente! Desenvolvemos soluções customizadas para atender necessidades 
                  específicas de cada cliente, desde pequenos produtores até grandes indústrias.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="growx-card p-6">
                <h3 className="text-lg font-bold text-foreground mb-3">
                  Qual o investimento necessário?
                </h3>
                <p className="text-muted-foreground">
                  O investimento varia conforme a solução escolhida. Oferecemos opções para diferentes 
                  orçamentos e condições de pagamento flexíveis. Entre em contato para um orçamento personalizado.
                </p>
              </div>

              <div className="growx-card p-6">
                <h3 className="text-lg font-bold text-foreground mb-3">
                  Atendem todo o Brasil?
                </h3>
                <p className="text-muted-foreground">
                  Sim! Atendemos todo o território nacional com entrega, instalação e suporte técnico. 
                  Temos parcerias regionais para garantir atendimento de qualidade em todo o país.
                </p>
              </div>

              <div className="growx-card p-6">
                <h3 className="text-lg font-bold text-foreground mb-3">
                  Como funciona a garantia?
                </h3>
                <p className="text-muted-foreground">
                  Todos os produtos têm garantia de 12 meses contra defeitos de fabricação, 
                  com possibilidade de extensão. Suporte técnico vitalício para todos os clientes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="growx-section bg-primary text-primary-foreground">
        <div className="growx-container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Pronto para Começar seu Projeto?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Nossa equipe está pronta para ajudar você a transformar sua operação. 
            Entre em contato agora mesmo!
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="secondary" 
              size="lg"
              onClick={handleWhatsApp}
              className="bg-white text-primary hover:bg-white/90"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              WhatsApp Agora
            </Button>
            
            <Button 
              variant="outline" 
              size="lg"
              className="border-white text-white hover:bg-white hover:text-primary"
            >
              <Phone className="w-5 h-5 mr-2" />
              Ligar Agora
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;

