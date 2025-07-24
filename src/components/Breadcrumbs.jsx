import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Não mostrar breadcrumbs na página inicial
  if (location.pathname === '/') {
    return null;
  }

  // Mapeamento de rotas para nomes amigáveis
  const routeNames = {
    'solucoes': 'Soluções',
    'supply-x': 'Supply-X',
    'spi': 'SPI - Indústria',
    'spp': 'SPP - Produtores',
    'growx-app': 'Grow-X App',
    'produtos': 'Produtos',
    'sobre': 'Sobre Nós',
    'historia': 'História',
    'executivo': 'Executivo',
    'filosofia': 'Filosofia, Missão e Valores',
    'contato': 'Contato'
  };

  const breadcrumbItems = [
    {
      name: 'Início',
      href: '/',
      icon: Home
    }
  ];

  // Construir breadcrumbs baseado no caminho atual
  let currentPath = '';
  pathnames.forEach((pathname, index) => {
    currentPath += `/${pathname}`;
    const isLast = index === pathnames.length - 1;
    
    breadcrumbItems.push({
      name: routeNames[pathname] || pathname,
      href: currentPath,
      isLast
    });
  });

  return (
    <div className="bg-card border-b border-border">
      <div className="growx-container">
        <nav className="growx-breadcrumb py-4">
          {breadcrumbItems.map((item, index) => {
            const IconComponent = item.icon;
            
            return (
              <div key={item.href} className="flex items-center">
                {index > 0 && (
                  <ChevronRight className="w-4 h-4 mx-2 growx-breadcrumb-separator" />
                )}
                
                {item.isLast ? (
                  <span className="text-primary font-medium">
                    {IconComponent && <IconComponent className="w-4 h-4 mr-1 inline" />}
                    {item.name}
                  </span>
                ) : (
                  <Link
                    to={item.href}
                    className="growx-breadcrumb-item flex items-center"
                  >
                    {IconComponent && <IconComponent className="w-4 h-4 mr-1" />}
                    {item.name}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default Breadcrumbs;

