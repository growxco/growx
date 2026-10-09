import { SEO } from '@/components/visual';
import { PageHero } from '@/components/sections';
import { Journey, JourneyCards } from '@/components/sections/MarketingJourney';
export default function CasosPage() {
 return <><SEO title="Casos de uso · necessidades e percursos" description="Exemplos de necessidades para conhecer GXP, SPI e SPP. São percursos ilustrativos, sem alegação de resultados de clientes." path="/casos"/>
 <PageHero eyebrow="Casos de uso" title="Comece pela tarefa que precisa organizar." intro="Estes percursos ilustram necessidades. Não são histórias comprovadas de clientes nem indicadores de ganho obtido." primaryCta={{label:'Conversar sobre minha necessidade',href:'/contato'}} status={null}/>
 <Journey eyebrow="Necessidade → produto → próximo passo" title="Veja onde a conversa começa."><JourneyCards items={[{title:'Indústria',text:'Entender a etapa de uma remessa, localizar um laudo e combinar a próxima ação.',href:'https://www.supplyx.com.br/spi',label:'Explorar SPI'},{title:'Produtor',text:'Retomar o contexto de uma área, atividade ou documento no campo.',href:'https://www.supplyx.com.br/spp',label:'Explorar SPP'},{title:'Sua experiência',text:'Registrar uma observação, consultar o Jardim e retomar o Diário.',to:'/solucoes/growx-app',label:'Explorar GXP'}]}/></Journey></>;
}
