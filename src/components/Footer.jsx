import { Link } from 'react-router-dom';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Linkedin, 
  Instagram, 
  Facebook,
  ArrowUp,
  Leaf
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import logoGrowX from '../assets/logo-growx-oficial.png';

const Footer = () => {
  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleWhatsApp = () => {
    window.open('https://wa.me/5541995494343', '_blank');
  };

  const quickLinks = [
    { name: 'Início', href: '/' },
    { name: 'Supply-X', href: '/solucoes/supply-x' },
    { name: 'SPI - Indústria', href: '/solucoes/spi' },
    { name: 'SPP - Produtores', href: '/solucoes/spp' },
    { name: 'Grow-X App', href: '/solucoes/growx-app' },
    { name: 'Produtos', href: '/produtos' }
  ];

  const aboutLinks = [
    { name: 'História', href: '/sobre/historia' },
    { name: 'Executivo', href: '/sobre/executivo' },
    { name: 'Filosofia e Valores', href: '/sobre/filosofia' },
    { name: 'Contato', href: '/contato' }
  ];

  const socialLinks = [
    { 
      name: 'LinkedIn', 
      icon: Linkedin, 
      href: 'https://br.linkedin.com/company/growxco' 
    },
    { 
      name: 'Instagram', 
      icon: Instagram, 
      href: 'https://www.instagram.com/grow_x.co' 
    },
    { 
      name: 'Facebook', 
      icon: Facebook, 
      href: 'https://facebook.com/growxco' 
    }
  ];

  return (
    <footer className="bg-card border-t border-border">
      {/* Main Footer Content */}
      <div className="growx-container py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center space-x-3 mb-6">
              <img 
                src={logoGrowX} 
                alt="Grow-X" 
                className="h-10 w-auto"
              />
            </Link>
            
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Tecnologia sustentável para o agronegócio. Soluções completas para automação, 
              rastreamento e controle ambiental com IoT, IA e Blockchain.
            </p>

            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Av Sete de Setembro 4923, sala 1203 | Batel, Curitiba, Brazil</span>
              </div>
              
              <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                <span>+55 (41) 99549-4343</span>
              </div>
              
              <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                <span>growx@growx.com.br</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-6">Links Rápidos</h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors duration-200 text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* About Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-6">Sobre Nós</h3>
            <ul className="space-y-3">
              {aboutLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors duration-200 text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter & Social */}
          <div>
            <h3 className="font-semibold text-foreground mb-6">Conecte-se</h3>
            
            <p className="text-muted-foreground text-sm mb-6">
              Fique por dentro das novidades e inovações da Grow-X.
            </p>

            <Button 
              onClick={handleWhatsApp}
              className="w-full growx-btn-primary mb-6"
            >
              Falar no WhatsApp
            </Button>

            {/* Social Links */}
            <div className="flex space-x-4">
              {socialLinks.map((social) => {
                const IconComponent = social.icon;
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-muted hover:bg-primary text-muted-foreground hover:text-primary-foreground rounded-lg flex items-center justify-center transition-all duration-200"
                    aria-label={social.name}
                  >
                    <IconComponent className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border">
        <div className="growx-container py-6">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            {/* Copyright */}
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Leaf className="w-4 h-4 text-primary" />
              <span>© 2025 Grow-X Co. Todos os direitos reservados.</span>
            </div>

            {/* Back to Top */}
            <Button
              onClick={handleScrollToTop}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <ArrowUp className="w-4 h-4" />
              <span>Voltar ao Topo</span>
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

