import SPPVideo from '@/components/sections/SPPVideo';
import { SEO } from '@/components/visual';
import { PageHero } from '@/components/sections';
import { Journey, JourneyCards } from '@/components/sections/MarketingJourney';
export default function SPPPage() {
 return <><SEO title="SPP · o trabalho do campo ganha histórico" description="Áreas, atividades e documentos para agricultura familiar, orgânicos e acompanhamento técnico. Conheça a jornada do SPP no Supply-X." path="/solucoes/spp"/>
 <PageHero eyebrow="Grow-X · Supply-X" title="SPP · o trabalho do campo ganha histórico" intro="Áreas, atividades e documentos para agricultura familiar, orgânicos e acompanhamento técnico. Conheça a jornada do SPP no Supply-X." primaryCta={{label:'Conhecer no Supply-X',href:'https://www.supplyx.com.br/spp',external:true}} secondaryCta={{label:'Ver vídeo do SPP', href: '/solucoes/spp#video'}} status="Integração contratada por projeto"/>
 <SPPVideo />
 <Journey eyebrow="Próximo passo" title="Conheça o percurso que corresponde à sua necessidade."><JourneyCards items={[{title:'SPI · Indústria',text:'Pequenas, médias e grandes operações: entenda o que precisa organizar antes de definir a implantação.',href:'https://www.supplyx.com.br/spi',label:'Explorar o SPI'},{title:'SPP · Produtores',text:'Agricultura familiar, orgânicos e cooperativas têm percursos distintos. O SPP pode ser avaliado de forma independente do SPI.',href:'https://www.supplyx.com.br/spp',label:'Explorar o SPP'},{title:'Escopo confirmado',text:'Integrações, permissões, conectividade e recursos disponíveis precisam ser confirmados na demonstração e na proposta.',to:'/contato?produto=spp',label:'Conversar sobre o projeto'}]}/></Journey></>;
}
