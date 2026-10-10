import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, ChevronDown, Expand, X, Lightbulb, Droplets, Wind, Thermometer } from 'lucide-react';
import { SEO, LeadForm } from '@/components/visual';
import { track } from '@/lib/analytics';
import { whatsappLink } from '@/lib/crm';
import { buildInterestConsent } from '../../shared/interest-consent';
import logo from '../assets/logo-growx-oficial.png';
import central from '../assets/modulo-hero.webp';
import outlets from '../assets/modulo-tomadas.webp';
import './PreSaleExperience.css';
import './PreSaleIndoorDirection.css';

const event = (name, details = {}) => track(name, { page: '/prevenda', ...details });
const compatibility = whatsappLink('Olá! Tenho interesse no Módulo Grow-X com GXP e quero avaliar meu projeto. Posso informar os equipamentos que já tenho e o que desejo reunir na central?');
const screens = [
  { id: 'jardim', label: 'Ver o cultivo', name: 'Jardim', src: '/assets/prevenda-gxp/jardim-foco.jpg', title: 'O cultivo que você quer acompanhar, em foco.', text: 'Abra o cultivo e encontre seus dados, a fase e o caminho para o Diário. Você retoma o registro certo sem depender de fotos e notas espalhadas.', position: 'center 6%' },
  { id: 'diario', label: 'Registrar o dia', name: 'Diário', src: '/assets/prevenda-gxp/diario.jpg', title: 'O que aconteceu hoje fica no Diário.', text: 'Fotografia, nota e origem no mesmo registro. O Diário guarda o percurso para consultar depois; compartilhar é uma escolha separada.', position: 'center 15%' },
  { id: 'cultivo', label: 'Consultar o percurso', name: 'Ficha de cultivo', src: '/assets/prevenda-gxp/cultivo-historia.jpg', title: 'Os dados do ciclo ficam junto da sua história.', text: 'Nome, início e plantas registradas na ficha do cultivo. O caminho de volta ao Diário mantém o registro ligado ao ciclo que você está acompanhando.', position: 'center 12%' },
];
const capabilities = [
  { id: 'luz', icon: Lightbulb, name: 'Luz', title: 'Iluminação no projeto da central.', text: 'Liga/desliga de iluminação compatível é uma das capacidades projetadas. Controle de intensidade exige driver compatível e validação específica.' },
  { id: 'rega', icon: Droplets, name: 'Rega', title: 'Bomba e sensores avaliados juntos.', text: 'A proposta reúne leitura de sensores compatíveis e acionamento da bomba. Sensores, boia, duração e condições de segurança dependem da instalação validada.' },
  { id: 'clima', icon: Thermometer, name: 'Clima', title: 'Temperatura e umidade com contexto.', text: 'DHT22 é a referência documentada para temperatura e umidade do ar. Modelo, quantidade e inclusão de sensores serão definidos na composição final.' },
  { id: 'ar', icon: Wind, name: 'Ventilação', title: 'Equipamentos compatíveis na mesma central.', text: 'Exaustor e ventilador entram na avaliação das cargas conectadas às saídas AC. Tensão, corrente e potência precisam ser conferidas por equipamento.' },
];
const routines = [
  { id: 'luz', name: 'Luz', lead: 'A iluminação faz parte da sua rotina.', text: 'A proposta de automação inclui o acionamento de iluminação compatível. O objetivo é reunir esse cuidado no projeto do seu indoor.', detail: 'Iluminação · acionamento projetado' },
  { id: 'rega', name: 'Rega', lead: 'A água também precisa de um plano.', text: 'Bomba, reservatório e sensores precisam ser avaliados juntos. A proposta é integrar o acionamento de rega ao conjunto compatível.', detail: 'Rega · bomba e instalação a avaliar' },
  { id: 'clima', name: 'Clima', lead: 'O ambiente entra na conversa.', text: 'Temperatura, umidade e circulação de ar fazem parte do projeto. Sensores, ventilador e exaustor compatíveis dependem da avaliação do seu setup.', detail: 'Clima · sensores a avaliar' },
  { id: 'ar', name: 'Ventilação', lead: 'O ar também participa da rotina.', text: 'Ventilador e exaustor entram na avaliação do seu indoor. A central é projetada para reunir cargas compatíveis no mesmo conjunto.', detail: 'Ventilação · equipamentos compatíveis' },
];
const questions = [
  ['O GXP já controla esta central?', 'A interface demonstrada organiza o cultivo e seus registros. A área Módulo é informativa nesta versão e não envia comandos físicos. Integração, firmware, notificações push e vinculação do dispositivo continuam em validação.'],
  ['Posso aproveitar o equipamento que já tenho?', 'Essa é a proposta: avaliar o seu setup antes de definir a composição. É necessário conferir tensão, corrente, potência e características de cada carga, sensores e instalação. O formato de uma tomada não comprova compatibilidade elétrica.'],
  ['O que vem incluído?', 'A base documentada do controlador prevê seis saídas AC. Sensores, cabos, acessórios, acesso ao GXP e suporte precisam constar da proposta final. Tenda, lâmpada, bomba e ventiladores não são itens incluídos confirmados.'],
  ['Qual é o preço e quando abre a pré-venda?', 'A referência de varejo já publicada é R$ 5.000 por unidade; não constitui oferta de compra. Preço de pré-venda, parcelamento, composição, entrega e frete ainda precisam de aprovação. A cobrança permanece pausada, sem reserva de unidade.'],
];

function InterestCta({ placement, children = 'Quero conhecer a proposta' }) {
  return <a className="px-button" href="#lista" onClick={() => event('click_cta_prevenda', { placement, intent: 'interest' })}>{children}<ArrowRight size={18} aria-hidden="true" /></a>;
}

function revealFocusedControl(root, target) {
  if (!target?.isConnected || !root?.contains(target)) return;
  const bar = root.querySelector('.px-sticky');
  if (bar?.contains(target)) return;
  const rect = target.getBoundingClientRect();
  const visibleBottom = bar && !bar.hidden ? bar.getBoundingClientRect().top - 12 : window.innerHeight - 12;
  if (rect.bottom > visibleBottom || rect.top < 12) {
    target.scrollIntoView({ block: 'center', behavior: 'instant' });
  }
}

export default function ClosedPreSalePage() {
  const [screenIndex, setScreenIndex] = useState(0);
  const [routineIndex, setRoutineIndex] = useState(0);
  const [capabilityIndex, setCapabilityIndex] = useState(0);
  const [contactMode, setContactMode] = useState('aviso');
  const dialog = useRef(null);
  const hero = useRef(null);
  const contactPanel = useRef(null);
  const pageRoot = useRef(null);
  const [stickyVisible, setStickyVisible] = useState(false);

  useEffect(() => {
    const update = () => {
      const heroRect = hero.current?.querySelector('.px-hero-action .px-button')?.getBoundingClientRect();
      const panelRect = contactPanel.current?.getBoundingClientRect();
      const panelVisible = panelRect && panelRect.top < window.innerHeight && panelRect.bottom > 0;
      setStickyVisible(Boolean(heroRect && heroRect.bottom <= 0 && !panelVisible));
    };
    const observer = new IntersectionObserver(update);
    const heroCta = hero.current?.querySelector('.px-hero-action .px-button');
    if (heroCta) observer.observe(heroCta);
    if (contactPanel.current) observer.observe(contactPanel.current);
    update();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!stickyVisible) return;
    const frame = requestAnimationFrame(() => {
      const target = document.activeElement;
      const rect = target?.getBoundingClientRect();
      if (rect && rect.top >= 0 && rect.top < window.innerHeight) {
        revealFocusedControl(pageRoot.current, target);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [stickyVisible]);

  const keepFocusVisible = (e) => {
    const target = e.target;
    requestAnimationFrame(() => revealFocusedControl(pageRoot.current, target));
  };
  const screen = screens[screenIndex];
  const capability = capabilities[capabilityIndex];

  return <div ref={pageRoot} className="px-page px-indoor-direction" onFocusCapture={keepFocusVisible}>
    <SEO title="Módulo Grow-X + GXP — cultivo e equipamentos, no mesmo projeto" description="Veja as telas reais do GXP e conheça a central Grow-X projetada com seis saídas AC. Receba a proposta na abertura ou converse sobre seu setup. Pré-venda fechada, sem pagamento." path="/prevenda" />
    <header className="px-header px-wrap"><Link to="/" aria-label="Grow-X, página inicial"><img src={logo} width="135" height="36" alt="Grow-X" /></Link><nav aria-label="Nesta página"><a href="#automacao">A automação</a><a href="#modulo">A central</a><a href="#lista">Seu projeto</a></nav><a href="#lista" className="px-header-contact" onClick={() => event('click_cta_prevenda', { placement: 'header', intent: 'interest' })}>Fale com a Grow-X <ArrowUpRight size={17} aria-hidden="true" /></a></header>
    <main>
      <section ref={hero} className="px-hero pi-hero" aria-labelledby="px-title">
        <div className="pi-hero-inner px-wrap">
          <div className="px-hero-copy"><p className="px-eyebrow">Grow-X / automação de plantio indoor</p><h1 id="px-title">Automação para o seu plantio indoor.</h1><p className="px-intro">Luz, rega e clima fazem parte de todo dia. Conheça a proposta Grow-X para reunir equipamentos compatíveis e acompanhar a história do seu cultivo.</p><div className="px-hero-action"><InterestCta placement="hero">Quero automatizar meu indoor</InterestCta><p>Cadastro de interesse. Sem pagamento ou reserva.</p></div><p className="pi-validation"><strong>Integração física em validação.</strong> O GXP já registra o cultivo. A automação com o Módulo é uma proposta em desenvolvimento.</p></div>
        <img className="pi-hero-backdrop" src="/assets/prevenda-indoor/hero-ambiente-indoor-ilustrativo.png" width="1672" height="941" fetchPriority="high" alt="Ilustração IA de ambiente indoor com tenda, LED, plantas, ventilador e tubos de rega; não representa instalação Grow-X" />
          <div className="pi-environment">
            <p className="pi-scene-caption">Ambiente ilustrativo gerado por IA.<br />Não representa instalação real Grow-X.</p>
          </div>
        </div>
        <div className="pi-purpose px-wrap"><span>O cultivo é seu.</span><p>A proposta é conectar a rotina dos equipamentos ao contexto do plantio — com o app para registrar e uma central projetada para automatizar.</p><a href="#automacao">Conheça a proposta <ArrowRight size={18} aria-hidden="true" /></a></div>
      </section>

      <section id="automacao" className="pi-automation" aria-labelledby="pi-automation-title"><div className="px-wrap">
        <div className="pi-section-heading"><div><p className="px-eyebrow">Primeiro, a rotina do seu indoor</p><h2 id="pi-automation-title">Luz. Água. Ambiente.<br /><span>Um projeto que olha o conjunto.</span></h2></div><p>Luz, rega e circulação de ar se encontram no mesmo ambiente. O projeto começa na rotina e nos equipamentos que você usa.</p></div>
        <div className="pi-routine-layout"><div className={'pi-routine-scene pi-routine-' + routines[routineIndex].id}>

          <svg className="pi-plan" viewBox="0 0 600 650" role="img" aria-label="Esquema ilustrativo das relações entre luz, reservatório de rega e ventilação; não representa instalação validada"><g className="pi-structure"><path d="M65 50H550V595H65Z M90 70H525V575H90 M110 445H160V520H110Z M200 445H250V520H200Z M290 445H340V520H290Z" /></g><g className="pi-plants"><path d="M135 445V275M225 445V245M315 445V290" /><path className="leaf" d="M135 360Q80 320 95 290Q143 290 135 360ZM135 380Q190 350 175 325Q127 325 135 380ZM225 330Q170 290 185 260Q233 260 225 330ZM225 370Q280 330 265 310Q217 310 225 370ZM315 370Q260 330 275 300Q323 300 315 370ZM315 410Q365 375 350 350Q307 350 315 410Z" /></g><g className="pi-light-line"><path d="M130 85H420M165 105L100 260M250 105V270M335 105L400 260" /></g><g className="pi-air-line"><circle cx="475" cy="175" r="38" /><path d="M475 139V211M439 175H511M451 149L499 201M451 201L499 149M442 225C365 238 402 280 325 300" /></g><g className="pi-water-line"><path d="M410 465H520V575H410ZM430 450H500M465 465V390H200V445M200 390H110V445M200 390H290V445" /><circle cx="465" cy="545" r="12" /></g><text x="110" y="35">PROJETO DO SEU INDOOR</text><text x="420" y="610">RESERVATÓRIO</text></svg>
          <div className="pi-scene-selector" aria-label="Explorar proposta de automação">{routines.map((item,index)=><button key={item.id} type="button" aria-pressed={index===routineIndex} onClick={()=>{setRoutineIndex(index);event('prevenda_capability_view',{capability:item.id,placement:'indoor_scene'});}}><span>0{index+1}</span>{item.name}<ArrowUpRight size={15} aria-hidden="true" /></button>)}</div>
          <p className="pi-scene-disclosure">Esquema ilustrativo da proposta. Equipamentos e sensores não são itens incluídos confirmados.</p>
        </div><div className="pi-routine-story" aria-live="polite"><p className="px-eyebrow">{routines[routineIndex].detail}</p><h3>{routines[routineIndex].lead}</h3><p>{routines[routineIndex].text}</p><div className="pi-system-rail"><figure className="pi-module"><img src={central} width="1600" height="900" alt="Render conceitual existente do Módulo Grow-X" /><figcaption><strong>Módulo Grow-X</strong><span>Central projetada · render conceitual</span></figcaption></figure><figure className="pi-gxp"><img src="/assets/prevenda-gxp/jardim-foco.jpg" width="780" height="1560" alt="Tela original do Jardim GXP; dados sintéticos de QA" /><figcaption><strong>GXP</strong><span>App de cultivo · captura original de QA</span></figcaption></figure></div>
<div className="pi-routine-relationship"><span>Seu equipamento</span><ArrowRight size={17} aria-hidden="true" /><span>Módulo projetado</span></div><p className="pi-routine-status"><strong>Integração física em validação.</strong> Módulo: central projetada para automação. GXP: app existente para acompanhar e registrar o cultivo.</p><a className="px-link" href="#lista">Conversar sobre meu indoor <ArrowUpRight size={17} aria-hidden="true" /></a></div></div>
      </div></section>

      <section id="gxp" className="px-app" aria-labelledby="px-app-title"><div className="px-wrap">
        <div className="px-chapter-heading"><p className="px-eyebrow">01 / O aplicativo na sua rotina</p><h2 id="px-app-title">Abra o cultivo.<br />Retome de onde parou.</h2><p>O que observar, o que registrar, onde encontrar depois. Explore os três momentos nas telas originais do GXP.</p></div>
        <div id="como" className="px-app-explore"><div className="px-app-story"><div className="px-story-steps" aria-label="Explorar telas reais do GXP">{screens.map((item, index) => <button key={item.id} type="button" aria-pressed={index === screenIndex} onClick={() => { setScreenIndex(index); event('prevenda_demo_view', { screen: item.id }); }}><span>0{index + 1}</span>{item.label}<ArrowRight size={17} aria-hidden="true" /></button>)}</div><div className="px-story-copy" aria-live="polite"><p className="px-eyebrow">GXP / {screen.name}</p><h3>{screen.title}</h3><p>{screen.text}</p></div><Link to="/solucoes/growx-app" className="px-link" onClick={() => event('prevenda_app_explore')}>Conhecer o aplicativo <ArrowUpRight size={17} aria-hidden="true" /></Link></div><figure className="px-app-window"><div className="px-window-label"><span>{screen.name}</span><button type="button" aria-label={`Ampliar captura original: ${screen.name}`} onClick={() => { dialog.current?.showModal(); event('prevenda_demo_expand', { screen: screen.id }); }}><Expand size={16} aria-hidden="true" />Ver original</button></div><div className="px-screen-crop"><img key={screen.id} src={screen.src} width="780" height="1560" style={{ objectPosition: screen.position }} alt={`Detalhe da interface real GXP — ${screen.name}, dados sintéticos da conta de QA`} loading="lazy" /></div><figcaption>Recorte de captura original · c10 · 09/10/2026 · dados sintéticos de QA.</figcaption></figure></div>
      </div></section>

      <section id="modulo" className="px-hardware px-wrap" aria-labelledby="px-hardware-title"><div className="px-chapter-heading"><p className="px-eyebrow">02 / A central do seu projeto</p><h2 id="px-hardware-title">Seis saídas AC.<br />Uma central projetada<br />para o seu setup.</h2><p>O Módulo é o hardware. A proposta é concentrar equipamentos compatíveis em seis saídas AC, acrescentando uma camada física ao projeto do seu cultivo.</p></div>
        <div className="px-hardware-layout"><figure className="px-outlets"><img src={outlets} width="1100" height="825" alt="Render conceitual do painel projetado da central Grow-X, com seis saídas AC" loading="lazy" /><figcaption><span>6 saídas AC documentadas</span><p>Render conceitual. Gabinete, tomadas e acabamento finais dependem da validação de hardware.</p></figcaption></figure><div className="px-capabilities"><p className="px-eyebrow">O que você quer reunir?</p><div className="px-function-buttons" aria-label="Capacidades projetadas do Módulo">{capabilities.map(({ icon: Icon, ...item }, index) => <button key={item.id} type="button" aria-pressed={index === capabilityIndex} onClick={() => { setCapabilityIndex(index); event('prevenda_capability_view', { capability: item.id }); }}><Icon size={22} strokeWidth={1.6} aria-hidden="true" /><span>{item.name}</span></button>)}</div><div className="px-capability-copy" aria-live="polite"><h3>{capability.title}</h3><p>{capability.text}</p></div><div className="px-validation"><span className="px-dot" aria-hidden="true" /><div><strong>Projeto em validação</strong><p>Integração com o GXP, firmware e comandos físicos ainda em validação. As telas acima demonstram registros do app, sem acionamento da central.</p></div></div></div></div>
        <div id="compatibilidade" className="px-existing-setup"><div><p className="px-eyebrow">Já tem um grow?</p><h3>Comece pelos equipamentos<br />que você já usa.</h3></div><div><p>A central não substitui sua lâmpada, bomba ou exaustor. O time precisa avaliar as cargas e a instalação para definir o conjunto compatível.</p><a className="px-link" href={compatibility} target="_blank" rel="noopener noreferrer" onClick={() => event('click_whatsapp', { placement: 'compatibility', intent: 'setup_review' })}>Conversar sobre meu setup <ArrowUpRight size={17} aria-hidden="true" /></a></div><details><summary>O que precisa entrar na proposta <ChevronDown size={18} aria-hidden="true" /></summary><p>Controlador e limites elétricos; sensores e acessórios; equipamentos aproveitados; acesso ao GXP, instalação e suporte. A lista final do kit ainda será confirmada. Tenda, iluminação e acessórios das imagens não são itens incluídos confirmados.</p></details></div>
      </section>

      <section id="lista" className="px-interest" aria-labelledby="px-interest-title"><div className="px-wrap px-interest-layout"><div className="px-interest-copy"><p className="px-eyebrow">03 / Do seu interesse à conversa</p><h2 id="px-interest-title">Traga seu projeto<br />para a Grow-X.</h2><p>Quer conhecer o conjunto quando abrir a pré-venda? Deixe seu contato. Já tem equipamentos e quer entender a compatibilidade? Comece uma conversa com o time.</p><div className="px-commercial"><strong>Pré-venda fechada · sem cobrança</strong><p>Referência de varejo já publicada: <b>R$ 5.000/unidade.</b> Não é oferta de compra. Kit, preço final, condições e entrega serão apresentados antes da contratação.</p></div><div id="duvidas" className="px-questions">{questions.map(([question, answer]) => <details key={question} onToggle={e => { if (e.currentTarget.open) event('prevenda_faq_open', { question }); }}><summary>{question}<ChevronDown size={17} aria-hidden="true" /></summary><p>{answer}</p></details>)}</div></div><div ref={contactPanel} className="px-contact-panel"><div className="px-contact-choice" aria-label="Escolher próximo passo"><button type="button" aria-pressed={contactMode === 'aviso'} onClick={() => { setContactMode('aviso'); event('prevenda_interest_mode', { intent: 'launch_notice' }); }}>Aviso de abertura</button><button type="button" aria-pressed={contactMode === 'projeto'} onClick={() => { setContactMode('projeto'); event('prevenda_interest_mode', { intent: 'setup_review' }); }}>Avaliar meu setup</button></div>{contactMode === 'aviso' ? <div className="px-form"><h3>Receba a proposta na abertura.</h3><p>Seu contato fica associado ao interesse no Módulo + GXP. O cadastro autoriza avisos desta pré-venda e do lançamento; não é pedido nem reserva.</p><LeadForm form="prevenda-lista" segment="cultivo" source="prevenda" enrich={false} initialValues={{ message: 'Quero receber a proposta do Módulo Grow-X + GXP na abertura da pré-venda.' }} extra={{ consent: buildInterestConsent() }} fields={[{ name: 'name', label: 'Seu nome', required: true }, { name: 'email', label: 'E-mail para receber o aviso', type: 'email', required: true }, { name: 'phone', label: 'WhatsApp (opcional, para avisos por lá)', type: 'tel' }, { name: 'message', label: 'Seu ponto de partida', type: 'select', options: [{ value: 'Quero receber a proposta do Módulo Grow-X + GXP na abertura da pré-venda.', label: 'Quero conhecer o Módulo + GXP' }, { value: 'Já tenho um setup indoor e quero receber a proposta do Módulo Grow-X + GXP na abertura da pré-venda.', label: 'Já tenho um setup indoor' }, { value: 'Estou montando meu setup indoor e quero receber a proposta do Módulo Grow-X + GXP na abertura da pré-venda.', label: 'Estou montando meu setup' }] }, { name: 'agree', label: 'Autorizo avisos desta pré-venda e do lançamento por e-mail e, se informado, WhatsApp. Sem outras campanhas.', type: 'checkbox', required: true }]} submitLabel="Quero o aviso de abertura" successTitle="Solicitação aceita pelo canal de contato." successText="O canal aceitou sua solicitação de aviso. Isso não confirma entrega, reserva ou compra." onSuccess={res => event('prevenda_interest_accepted', { channel: res.mode, intent: 'launch_notice' })} /><p className="px-privacy">Uso dos dados conforme a <Link to="/privacidade">Política de Privacidade</Link>. Nenhum dado de pagamento é solicitado.</p></div> : <div className="px-project-contact"><p className="px-eyebrow">Conversa de compatibilidade</p><h3>O seu setup vem primeiro.</h3><p>No WhatsApp, conte quais equipamentos já usa e o que quer reunir na central. Marca, modelo, tensão e potência ajudam o time a entender o projeto.</p><a className="px-button" href={compatibility} target="_blank" rel="noopener noreferrer" onClick={() => event('click_whatsapp', { placement: 'contact', intent: 'setup_review' })}>Abrir conversa no WhatsApp <ArrowUpRight size={18} aria-hidden="true" /></a><p className="px-contact-note">A conversa inicia uma avaliação. Não confirma compatibilidade, orçamento, reserva ou prazo de retorno.</p></div>}</div></div></section>
    </main>
    <footer className="px-footer px-wrap"><Link to="/" aria-label="Página inicial Grow-X"><img src={logo} width="120" height="32" alt="Grow-X" /></Link><p>Módulo Grow-X + GXP<br /><span>Cultivo indoor. Registros. Equipamentos.</span></p><div><Link to="/prevenda/pedido">Consultar pedido anterior</Link><Link to="/privacidade">Privacidade</Link><a href={compatibility} target="_blank" rel="noopener noreferrer" onClick={() => event('click_whatsapp', { placement: 'footer', intent: 'setup_review' })}>WhatsApp +55 41 99549-4343</a></div></footer>
    <aside hidden={!stickyVisible} className="px-sticky" aria-label="Interesse no Módulo e GXP"><span>Módulo + GXP<small>Cadastro de interesse · sem cobrança</small></span><InterestCta placement="sticky" children="Quero conhecer" /></aside>
    <dialog ref={dialog} className="px-original-dialog" aria-label={`Captura original GXP — ${screen.name}`} onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }}><button className="px-close" type="button" aria-label="Fechar captura original" onClick={() => dialog.current?.close()}><X size={22} aria-hidden="true" /></button><p>GXP / {screen.name} · captura original de QA · 09/10/2026</p><img src={screen.src} width="780" height="1560" alt={`Captura original inteira da tela ${screen.name}, com dados sintéticos de QA`} /></dialog>
  </div>;
}
