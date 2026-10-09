import { SEO, Container, LeadForm } from '@/components/visual';
import { PageHero } from '@/components/sections';
const FIELDS = [{name:'name',label:'Nome',required:true},{name:'email',label:'E-mail para contato',type:'email',required:true},{name:'message',label:'O que deseja conhecer? (opcional)',type:'textarea'}];
export default function WaitlistAppPage() {
 return <><SEO title="Interesse no GXP" description="Converse sobre o GXP e sua experiência. O cadastro de interesse não garante acesso antecipado, recursos, bônus ou datas de lançamento." path="/lista-espera-app"/>
 <PageHero eyebrow="GXP · próxima conversa" title="O que deseja conhecer no GXP?" intro="Conheça as telas demonstradas e deixe seu contato se quiser conversar. Este cadastro não garante acesso antecipado, bônus ou uma data de lançamento." primaryCta={{label:'Conhecer o GXP',href:'/solucoes/growx-app'}} status={null}/>
 <section className="section-y-tight"><Container narrow><h2 className="text-display-md mb-8">Deixe seu contato.</h2><LeadForm form="waitlist-app" segment="cultivo" fields={FIELDS} extra={{profile:'gxp'}} source="growx" submitLabel="Enviar interesse no GXP" successText="O canal recebeu sua solicitação. O time combina o próximo passo."/></Container></section></>;
}
