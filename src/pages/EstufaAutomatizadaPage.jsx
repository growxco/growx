import { SEO } from '@/components/visual';
import { PageHero } from '@/components/sections';
import { Journey, JourneyCards } from '@/components/sections/MarketingJourney';
import estufaImg from '../assets/estufa-automatizada-hero-v2.webp';
export default function EstufaAutomatizadaPage() {
 return <><SEO title="Estufa · avaliação de projeto" description="Converse sobre seu ambiente de cultivo, equipamentos e compatibilidade. Composição, instalação e recursos de automação dependem da proposta confirmada." path="/produtos/estufa-automatizada"/>
 <PageHero eyebrow="Ambiente de cultivo" title="Avalie a estufa no contexto do seu projeto." intro="Clima, iluminação, irrigação e acompanhamento têm requisitos próprios. Equipamentos, instalação e recursos de automação precisam ser definidos e validados antes da contratação." image={estufaImg} imageAlt="Ilustração de ambiente de cultivo; composição a confirmar no projeto" primaryCta={{label:'Conversar sobre o projeto',href:'/contato?produto=modulo'}} status="Projeto sujeito à avaliação"/>
 <Journey eyebrow="Escopo e compatibilidade" title="Combine os requisitos antes de escolher a composição."><JourneyCards items={[{title:'Seu ambiente',text:'Área disponível, condições do local e rotina de uso orientam a avaliação.'},{title:'Equipamentos e instalação',text:'Sensores, cargas, acessórios e instalação dependem de compatibilidade e da proposta confirmada.',to:'/produtos/modulo-sem-fio',label:'Conhecer o módulo'},{title:'Informações no GXP',text:'A experiência web demonstrada é informativa; não comprova comandos físicos em produção.',to:'/solucoes/growx-app',label:'Conhecer o GXP'}]}/></Journey></>;
}
