import { SEO } from '@/components/visual';
import { PageHero } from '@/components/sections';
import { Journey, JourneyCards } from '@/components/sections/MarketingJourney';
export default function CannabisMedicinalPage() {
 return <><SEO title="Cultivo controlado · registros e contexto no GXP" description="Conheça o Jardim e o Diário do GXP para organizar registros e contexto. Recursos demonstrados não constituem garantia clínica ou farmacêutica." path="/cannabis-medicinal"/>
 <PageHero eyebrow="GXP · cultivo controlado" title="Sua experiência ganha registro e contexto." intro="Conheça o Jardim e o Diário para organizar suas próprias observações. As telas demonstradas não comprovam resultados clínicos, certificações ou controle farmacêutico." primaryCta={{label:'Conhecer o GXP',href:'/solucoes/growx-app'}} secondaryCta={{label:'Conversar sobre o projeto',href:'/contato?produto=gxp'}} status="Experiência web demonstrada"/>
 <Journey eyebrow="Antes de escolher" title="O recurso precisa corresponder à sua necessidade."><JourneyCards items={[{title:'Registrar e retomar',text:'Consulte o percurso de Jardim e Diário com dados de demonstração.',to:'/solucoes/growx-app',label:'Ver a experiência do GXP'},{title:'Equipamentos compatíveis',text:'Composição, instalação e atuação física continuam sujeitos à validação do projeto.',to:'/produtos/modulo-sem-fio',label:'Avaliar o módulo'},{title:'Seu acesso',text:'Confira recursos, permissões e condições disponíveis no portal e na proposta.',to:'/contato?produto=gxp',label:'Conversar sobre o acesso'}]}/></Journey></>;
}
