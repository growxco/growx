import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logoGrowX from '../assets/logo-growx-oficial.png';

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const location = useLocation();

  const navigationItems = [
    {
      name: 'Início',
      href: '/',
      type: 'link'
    },
    {
      name: 'Soluções',
      type: 'dropdown',
      items: [
        {
          name: 'Supply-X',
          href: '/solucoes/supply-x',
          description: 'Plataforma completa SPI + SPP'
        },
        {
          name: 'SPI - Indústria',
          href: '/solucoes/spi',
          description: 'Para grandes indústrias'
        },
        {
          name: 'SPP - Produtores',
          href: '/solucoes/spp',
          description: 'App que salva o produtor'
        },
        {
          name: 'Grow-X App',
          href: '/solucoes/growx-app',
          description: 'Cannabis & Agricultura Urbana'
        }
      ]
    },
    {
      name: 'Produtos',
      type: 'link-with-dropdown',
      href: '/produtos',
      items: [
        {
          name: 'Estação Meteorológica',
          href: '/produtos/estacao-meteorologica',
          description: 'Sensores LoRa para monitoramento'
        },
        {
          name: 'Módulo Sem Fio',
          href: '/produtos/modulo-sem-fio',
          description: 'Controle de estufas'
        },
        {
          name: 'Estufa Automatizada',
          href: '/produtos/estufa-automatizada',
          description: 'Sistema completo de cultivo'
        }
      ]
    },
    {
      name: 'Sobre Nós',
      type: 'dropdown',
      items: [
        {
          name: 'História',
          href: '/sobre/historia',
          description: 'Nossa trajetória'
        },
        {
          name: 'Executivo',
          href: '/sobre/executivo',
          description: 'Liderança e equipe'
        },
        {
          name: 'Filosofia, Missão e Valores',
          href: '/sobre/filosofia',
          description: 'Nossos princípios'
        }
      ]
    },
    {
      name: 'Contato',
      href: '/contato',
      type: 'link'
    }
  ];

  const handleDropdownToggle = (itemName) => {
    setActiveDropdown(activeDropdown === itemName ? null : itemName);
  };

  const handleWhatsApp = () => {
    window.open('https://wa.me/5541995494343', '_blank');
  };

  const isActivePath = (href) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="growx-container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img 
              src={logoGrowX} 
              alt="Grow-X" 
              className="h-8 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navigationItems.map((item) => (
              <div key={item.name} className="relative">
                {item.type === 'link' ? (
                  <Link
                    to={item.href}
                    className={`text-sm font-medium transition-colors hover:text-primary ${
                      isActivePath(item.href) ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    {item.name}
                  </Link>
                ) : item.type === 'link-with-dropdown' ? (
                  <div className="flex items-center">
                    <Link
                      to={item.href}
                      className={`text-sm font-medium transition-colors hover:text-primary ${
                        isActivePath(item.href) ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      {item.name}
                    </Link>
                    <button
                      onClick={() => handleDropdownToggle(item.name)}
                      className={`flex items-center text-sm font-medium transition-colors hover:text-primary ${
                        activeDropdown === item.name ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${
                        activeDropdown === item.name ? 'rotate-180' : ''
                      }`} />
                    </button>

                    {/* Dropdown Menu */}
                    {activeDropdown === item.name && (
                      <div className="absolute top-full left-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-lg py-2 z-50">
                        {item.items.map((subItem) => (
                          <Link
                            key={subItem.name}
                            to={subItem.href}
                            onClick={() => setActiveDropdown(null)}
                            className={`block px-4 py-3 text-sm hover:bg-accent transition-colors ${
                              isActivePath(subItem.href) ? 'text-primary bg-accent' : 'text-foreground'
                            }`}
                          >
                            <div className="font-medium">{subItem.name}</div>
                            <div className="text-xs text-muted-foreground mt-1">{subItem.description}</div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={() => handleDropdownToggle(item.name)}
                      className={`flex items-center text-sm font-medium transition-colors hover:text-primary ${
                        activeDropdown === item.name ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      {item.name}
                      <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${
                        activeDropdown === item.name ? 'rotate-180' : ''
                      }`} />
                    </button>

                    {/* Dropdown Menu */}
                    {activeDropdown === item.name && (
                      <div className="absolute top-full left-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-lg py-2 z-50">
                        {item.items.map((subItem) => (
                          <Link
                            key={subItem.name}
                            to={subItem.href}
                            onClick={() => setActiveDropdown(null)}
                            className={`block px-4 py-3 text-sm hover:bg-accent transition-colors ${
                              isActivePath(subItem.href) ? 'text-primary bg-accent' : 'text-foreground'
                            }`}
                          >
                            <div className="font-medium">{subItem.name}</div>
                            <div className="text-xs text-muted-foreground mt-1">{subItem.description}</div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* CTA Button */}
          <div className="hidden lg:flex items-center space-x-4">
            <Button 
              onClick={handleWhatsApp}
              className="growx-btn-primary"
            >
              Agendar Demo
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-border">
            <nav className="py-4 space-y-2 flex flex-col items-start">
              {navigationItems.map((item) => (
                <div key={item.name}>
                  {item.type === 'link' ? (
                    <Link
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`block px-4 py-2 text-sm font-medium transition-colors hover:text-primary ${
                        isActivePath(item.href) ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      {item.name}
                    </Link>
                  ) : item.type === 'link-with-dropdown' ? (
                    <div className="flex flex-col w-full">
                    <Link
                      to={item.href}
                      onClick={() => {
                        handleDropdownToggle(item.name);
                        if (item.type === 'link-with-dropdown') {
                          setIsMobileMenuOpen(false);
                        }
                      }}
                      className={`flex items-center justify-between w-full px-4 py-2 text-sm font-medium transition-colors hover:text-primary ${
                        isActivePath(item.href) ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      {item.name}
                      <ChevronDown className={`h-4 w-4 transition-transform ${
                        activeDropdown === item.name ? 'rotate-180' : ''
                      }`} />
                    </Link>

                      {activeDropdown === item.name && (
                        <div className="pl-4 py-2 space-y-1">
                          {item.items.map((subItem) => (
                            <Link
                              key={subItem.name}
                              to={subItem.href}
                              onClick={() => {
                                setActiveDropdown(null);
                                setIsMobileMenuOpen(false);
                              }}
                              className={`block px-4 py-2 text-sm hover:text-primary transition-colors ${
                                isActivePath(subItem.href) ? 'text-primary' : 'text-muted-foreground'
                              }`}
                            >
                              {subItem.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col w-full">
                    <Link
                      to={item.href}
                      onClick={() => {
                        handleDropdownToggle(item.name);
                        if (item.type === 'link-with-dropdown') {
                          setIsMobileMenuOpen(false);
                        }
                      }}
                      className={`flex items-center justify-between w-full px-4 py-2 text-sm font-medium transition-colors hover:text-primary ${
                        isActivePath(item.href) ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      {item.name}
                      <ChevronDown className={`h-4 w-4 transition-transform ${
                        activeDropdown === item.name ? 'rotate-180' : ''
                      }`} />
                    </Link>

                      {activeDropdown === item.name && (
                        <div className="pl-4 py-2 space-y-1">
                          {item.items.map((subItem) => (
                            <Link
                              key={subItem.name}
                              to={subItem.href}
                              onClick={() => {
                                setActiveDropdown(null);
                                setIsMobileMenuOpen(false);
                              }}
                              className={`block px-4 py-2 text-sm hover:text-primary transition-colors ${
                                isActivePath(subItem.href) ? 'text-primary' : 'text-muted-foreground'
                              }`}
                            >
                              {subItem.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              <div className="px-4 pt-4">
                <Button 
                  onClick={() => {
                    handleWhatsApp();
                    setIsMobileMenuOpen(false);
                  }}
                  className="growx-btn-primary w-full"
                >
                  Agendar Demo
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>

      {/* Overlay for dropdown */}
      {activeDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setActiveDropdown(null)}
        />
      )}
    </header>
  );
};

export default Header;

