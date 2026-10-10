import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, ChevronDown, Expand, X } from 'lucide-react';
import { SEO, LeadForm } from '@/components/visual';
import { track } from '@/lib/analytics';
import { whatsappLink } from '@/lib/crm';
import { buildInterestConsent } from '../../shared/interest-consent';
import logo from '../assets/logo-growx-oficial.png';
import central from '../assets/modulo-hero.webp';

import './PreSaleExperience.css';
import './PreSaleIndoorDirection.css';

const event = (name, details = {}) => track(name, { page: '/prevenda', ...details });
const compatibility = whatsappLink('Olá! Tenho interesse no Módulo Grow-X com GXP e quero avaliar meu projeto. Posso informar os equipamentos que já tenho e o que desejo reunir na central?');
const screens = [
  { id: 'jardim', label: 'Ver o cultivo', name: 'Jardim', src: '/assets/prevenda-gxp/jardim-foco.jpg', title: 'O cultivo que você quer acompanhar, em foco.', text: 'Abra o cultivo e encontre seus dados, a fase e o caminho para o Diário. Você retoma o registro certo sem depender de fotos e notas espalhadas.', position: 'center 6%' },
  { id: 'diario', label: 'Registrar o dia', name: 'Diário', src: '/assets/prevenda-gxp/diario.jpg', title: 'O que aconteceu hoje fica no Diário.', text: 'Fotografia, nota e origem no mesmo registro. O Diário guarda o percurso para consultar depois; compartilhar é uma escolha separada.', position: 'center 15%' },
  { id: 'cultivo', label: 'Consultar o percurso', name: 'Ficha de cultivo', src: '/assets/prevenda-gxp/cultivo-historia.jpg', title: 'Os dados do ciclo ficam junto da sua história.', text: 'Nome, início e plantas registradas na ficha do cultivo. O caminho de volta ao Diário mantém o registro ligado ao ciclo que você está acompanhando.', position: 'center 12%' },
];
const routines = [
  { id: 'luz', name: 'Luz', lead: 'Luz na hora certa.', text: 'Programação de liga/desliga para iluminação compatível. Defina os horários de acender e apagar no conjunto previsto para o seu indoor.', condition: 'A agenda exige relógio sincronizado. Dimmer depende de driver compatível, instalação DIM e validação específica.', detail: 'Programação de iluminação', position: '73% 22%', origin: '72% 22%' },
  { id: 'rega', name: 'Rega', lead: 'Acionamento de rega com condições definidas.', text: 'Controle previsto da bomba de irrigação a partir de leituras válidas de umidade do solo, com duração limitada e verificação do reservatório.', condition: 'Automação depende de sensores e boia validados. O volume entregue depende da vazão da instalação; medição de vazão e válvulas individuais não estão confirmadas no conjunto.', detail: 'Bomba e reservatório', position: '76% 96%', origin: '77% 96%' },
  { id: 'clima', name: 'Clima', lead: 'Temperatura e umidade para decidir.', text: 'Medições previstas de temperatura e umidade relativa do ar por DHT22. Elas dão contexto para avaliar o ambiente e configurar equipamentos climáticos compatíveis.', condition: 'Leituras precisam ser válidas e recentes. Sensores e acessórios do kit ainda serão definidos; não há telemetria ao vivo nesta página.', detail: 'Temperatura e umidade relativa', position: '76% 58%', origin: '75% 60%' },
  { id: 'ar', name: 'Ventilação', lead: 'Circulação e exaustão coordenadas.', text: 'Circulação prevista por intervalos ou acompanhando a iluminação. O exaustor pode seguir uma agenda, a luz ou as condições de temperatura e umidade.', condition: 'Cada equipamento exige compatibilidade elétrica e configuração próprias. Os modos descritos seguem o contrato; integração física ainda em validação.', detail: 'Ventilador e exaustor', position: '91% 18%', origin: '91% 18%' },
];
const questions = [
  ['O GXP já controla esta central?', 'A interface demonstrada organiza o cultivo e seus registros. A área Módulo é informativa nesta versão e não envia comandos físicos. Integração, firmware, notificações push e vinculação do dispositivo continuam em validação.'],
  ['Posso aproveitar o equipamento que já tenho?', 'Essa é a proposta: avaliar o seu setup antes de definir a composição. É necessário conferir tensão, corrente, potência e características de cada carga, sensores e instalação. O formato de uma tomada não comprova compatibilidade elétrica.'],
  ['O que vem incluído?', 'A base documentada do controlador prevê seis saídas AC. Sensores, cabos, acessórios, acesso ao GXP e suporte precisam constar da proposta final. Tenda, lâmpada, bomba e ventiladores não são itens incluídos confirmados.'],
  ['Qual é o preço e quando abre a pré-venda?', 'A referência de varejo já publicada é R$ 5.000 por unidade; não constitui oferta de compra. Preço de pré-venda, parcelamento, composição, entrega e frete ainda precisam de aprovação. A cobrança permanece pausada, sem reserva de unidade.'],
];

function InterestCta({ placement, children = 'Quero automatizar meu indoor' }) {
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
  const [expandedAsset, setExpandedAsset] = useState(null);
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
  const openOriginal = (asset) => {
    setExpandedAsset(asset);
    requestAnimationFrame(() => dialog.current?.showModal());
    event('prevenda_demo_expand', { screen: asset.id || asset.name });
  };
  const original = expandedAsset || screen;

  return <div ref={pageRoot} className="px-page px-indoor-direction" onFocusCapture={keepFocusVisible}>
    <SEO title="Automação de plantio indoor | Módulo Grow-X + GXP" description="Conheça as funções projetadas de luz, rega, clima e ventilação para o seu indoor, com Módulo Grow-X e GXP. Integração física em validação; cadastro de interesse sem pagamento ou reserva." path="/prevenda" />
    <header className="px-header px-wrap"><Link to="/" aria-label="Grow-X, página inicial"><img src={logo} width="135" height="36" alt="Grow-X" /></Link><nav aria-label="Nesta página"><a href="#automacao">A automação</a><a href="#modulo">A central</a><a href="#lista">Seu projeto</a></nav><a href="#lista" className="px-header-contact" onClick={() => event('click_cta_prevenda', { placement: 'header', intent: 'interest' })}>Fale com a Grow-X <ArrowUpRight size={17} aria-hidden="true" /></a></header>
    <main>
      <section ref={hero} className="px-hero pi-hero" aria-labelledby="px-title">
        <div className="pi-hero-inner px-wrap">
          <div className="px-hero-copy"><p className="px-eyebrow">Grow-X / automação de plantio indoor</p><h1 id="px-title">Automação para o seu plantio indoor.</h1><p className="px-intro">Luz, rega e clima fazem parte de todo dia. Conheça a proposta Grow-X para reunir equipamentos compatíveis e acompanhar a história do seu cultivo.</p><div className="px-hero-action"><InterestCta placement="hero">Quero automatizar meu indoor</InterestCta><p>Cadastro de interesse. Sem pagamento ou reserva.</p></div><p className="pi-validation"><strong>Integração física em validação.</strong> O GXP já registra o cultivo. A automação com o Módulo é uma proposta em desenvolvimento.</p></div>
        <img className="pi-hero-backdrop" src="/assets/prevenda-indoor/hero-ambiente-indoor-ilustrativo.webp" width="1672" height="941" fetchPriority="high" alt="Ilustração IA de ambiente indoor com tenda, LED, plantas, ventilador e tubos de rega; não representa instalação Grow-X" />
          <div className="pi-environment">
            <p className="pi-scene-caption">Ambiente ilustrativo gerado por IA.<br />Não representa instalação real Grow-X.</p>
          </div>
        </div>
      </section>

      <section id="automacao" className="pi-automation pi-functions" aria-labelledby="pi-automation-title"><div className="px-wrap">
        <div className="pi-section-heading"><div><p className="px-eyebrow">Funções projetadas</p><h2 id="pi-automation-title">O que você quer automatizar<br />no seu indoor?</h2></div><p className="pi-section-status"><strong>Integração física em validação.</strong> Estas funções estão documentadas para a central. O GXP mostrado ainda não envia comandos ao equipamento.</p></div>
        <div className="pi-scene-selector" aria-label="Explorar funções projetadas">{routines.map((item,index)=><button key={item.id} type="button" aria-pressed={index===routineIndex} onClick={()=>{setRoutineIndex(index);event('prevenda_capability_view',{capability:item.id,placement:'indoor_scene'});}}><span>0{index+1}</span>{item.name}<ArrowUpRight size={15} aria-hidden="true" /></button>)}</div>
        <div className="pi-routine-layout"><figure className={'pi-function-detail pi-detail-' + routines[routineIndex].id}><div className="pi-function-image"><img src="/assets/prevenda-indoor/hero-ambiente-indoor-ilustrativo.webp" width="1672" height="941" style={{objectPosition:routines[routineIndex].position,transformOrigin:routines[routineIndex].origin}} alt={`Recorte da ilustração IA do ambiente indoor: ${routines[routineIndex].detail}. Não representa instalação Grow-X.`} loading="lazy" /></div><figcaption>Detalhe de ambiente ilustrativo gerado por IA. Equipamentos da cena não são itens incluídos confirmados.</figcaption></figure><div className="pi-routine-story" aria-live="polite"><p className="px-eyebrow">{routines[routineIndex].detail}</p><h3>{routines[routineIndex].lead}</h3><p>{routines[routineIndex].text}</p><p className="pi-function-condition">{routines[routineIndex].condition}</p></div></div>
        <div id="modulo" className="pi-product-pair"><div className="pi-product-heading"><p className="px-eyebrow">Os meios para reunir o controle e o acompanhamento</p><h3>Módulo Grow-X + GXP.</h3><p>A central foi projetada para acionar equipamentos. O app já permite registrar e consultar o cultivo.</p></div><figure className="pi-large-module"><img src={central} width="1600" height="900" alt="Render conceitual existente do Módulo Grow-X, com seis saídas AC previstas" loading="lazy" /><figcaption><strong>Módulo / a central</strong><span>Seis saídas AC documentadas. Render conceitual; acabamento e limites finais dependem da validação.</span></figcaption></figure><figure className="pi-large-gxp"><div className="pi-gxp-frame"><img src="/assets/prevenda-gxp/modulo-original.jpg" width="780" height="1560" alt="Captura original da área Módulo GXP, informativa e sem envio de comandos; dados de QA" loading="lazy" /></div><figcaption><strong>GXP / o aplicativo</strong><span>Captura original de QA. Cadastro e informações de dispositivos; esta tela não envia comandos.</span><button type="button" className="px-link" onClick={()=>openOriginal({id:'modulo',name:'Módulo',src:'/assets/prevenda-gxp/modulo-original.jpg'})}>Ampliar tela original <Expand size={16} aria-hidden="true" /></button></figcaption></figure></div>
        <div className="pi-functions-action"><InterestCta placement="functions" /><p>Cadastro de interesse. Sem pagamento ou reserva.</p></div>
      </div></section>

      <section id="gxp" className="px-app" aria-labelledby="px-app-title"><div className="px-wrap">
        <div className="px-chapter-heading"><p className="px-eyebrow">01 / O aplicativo na sua rotina</p><h2 id="px-app-title">Seu cultivo, registrado.<br />Sua história, acessível.</h2><p>Fotos, notas e informações do ciclo no GXP. As telas originais abaixo mostram registros do cultivo, não um painel de acionamento.</p></div>
        <div id="como" className="px-app-explore"><div className="px-app-story"><div className="px-story-steps" aria-label="Explorar telas reais do GXP">{screens.map((item, index) => <button key={item.id} type="button" aria-pressed={index === screenIndex} onClick={() => { setScreenIndex(index); event('prevenda_demo_view', { screen: item.id }); }}><span>0{index + 1}</span>{item.label}<ArrowRight size={17} aria-hidden="true" /></button>)}</div><div className="px-story-copy" aria-live="polite"><p className="px-eyebrow">GXP / {screen.name}</p><h3>{screen.title}</h3><p>{screen.text}</p></div><Link to="/solucoes/growx-app" className="px-link" onClick={() => event('prevenda_app_explore')}>Conhecer o aplicativo <ArrowUpRight size={17} aria-hidden="true" /></Link></div><figure className="px-app-window"><div className="px-window-label"><span>{screen.name}</span><button type="button" aria-label={`Ampliar captura original: ${screen.name}`} onClick={() => { openOriginal(screen); }}><Expand size={16} aria-hidden="true" />Ver original</button></div><div className="px-screen-crop"><img key={screen.id} src={screen.src} width="780" height="1560" style={{ objectPosition: screen.position }} alt={`Detalhe da interface real GXP — ${screen.name}, dados sintéticos da conta de QA`} loading="lazy" /></div><figcaption>Recorte de captura original · c10 · 09/10/2026 · dados sintéticos de QA.</figcaption></figure></div>
      </div></section>

      <section id="compatibilidade" className="pi-compatibility" aria-labelledby="pi-compatibility-title"><div className="px-wrap"><div className="pi-compat-heading"><div><p className="px-eyebrow">Já tem um indoor?</p><h2 id="pi-compatibility-title">Aproveite o que você já tem.<br />Confira o que combina.</h2></div><p>Lâmpada, bomba, ventilador e exaustor entram na avaliação. Marca, modelo, tensão e potência ajudam a definir o conjunto compatível.</p></div><div className="pi-compat-columns"><div><span>01 / Equipamentos existentes</span><h3>Seu setup como ponto de partida.</h3><p>Você informa as cargas que já usa. A compatibilidade depende das características elétricas e da instalação, além do formato das tomadas.</p></div><div><span>02 / Composição do conjunto</span><h3>Saiba o que será incluído.</h3><p>Controlador, sensores, cabos, acessórios, acesso ao GXP, instalação e suporte precisam constar da oferta final. Tenda e equipamentos das imagens não têm inclusão confirmada.</p></div></div><a className="px-button" href={compatibility} target="_blank" rel="noopener noreferrer" onClick={()=>event('click_whatsapp',{placement:'compatibility',intent:'setup_review'})}>Avaliar meu setup no WhatsApp <ArrowUpRight size={18} aria-hidden="true" /></a></div></section>

      <section id="lista" className="px-interest" aria-labelledby="px-interest-title"><div className="px-wrap px-interest-layout"><div className="px-interest-copy"><p className="px-eyebrow">03 / Do seu interesse à conversa</p><h2 id="px-interest-title">Quero automatizar.<br />Qual é o próximo passo?</h2><p>Receba o aviso da abertura ou converse sobre os equipamentos que já usa. Escolha o caminho que faz sentido para o seu indoor.</p><div className="px-commercial"><strong>Pré-venda fechada · sem cobrança</strong><p>Referência de varejo já publicada: <b>R$ 5.000/unidade.</b> Não é oferta de compra. Kit, preço final, condições e entrega serão apresentados antes da contratação.</p></div><div id="duvidas" className="px-questions">{questions.map(([question, answer]) => <details key={question} onToggle={e => { if (e.currentTarget.open) event('prevenda_faq_open', { question }); }}><summary>{question}<ChevronDown size={17} aria-hidden="true" /></summary><p>{answer}</p></details>)}</div></div><div ref={contactPanel} className="px-contact-panel"><div className="px-contact-choice" aria-label="Escolher próximo passo"><button type="button" aria-pressed={contactMode === 'aviso'} onClick={() => { setContactMode('aviso'); event('prevenda_interest_mode', { intent: 'launch_notice' }); }}>Aviso de abertura</button><button type="button" aria-pressed={contactMode === 'projeto'} onClick={() => { setContactMode('projeto'); event('prevenda_interest_mode', { intent: 'setup_review' }); }}>Avaliar meu setup</button></div>{contactMode === 'aviso' ? <div className="px-form"><h3>Receba a proposta na abertura.</h3><p>Seu contato fica associado ao interesse no Módulo + GXP. O cadastro autoriza avisos desta pré-venda e do lançamento; não é pedido nem reserva.</p><LeadForm form="prevenda-lista" segment="cultivo" source="prevenda" enrich={false} initialValues={{ message: 'Quero receber a proposta do Módulo Grow-X + GXP na abertura da pré-venda.' }} extra={{ consent: buildInterestConsent() }} fields={[{ name: 'name', label: 'Seu nome', required: true }, { name: 'email', label: 'E-mail para receber o aviso', type: 'email', required: true }, { name: 'phone', label: 'WhatsApp (opcional, para avisos por lá)', type: 'tel' }, { name: 'message', label: 'Seu ponto de partida', type: 'select', options: [{ value: 'Quero receber a proposta do Módulo Grow-X + GXP na abertura da pré-venda.', label: 'Quero conhecer o Módulo + GXP' }, { value: 'Já tenho um setup indoor e quero receber a proposta do Módulo Grow-X + GXP na abertura da pré-venda.', label: 'Já tenho um setup indoor' }, { value: 'Estou montando meu setup indoor e quero receber a proposta do Módulo Grow-X + GXP na abertura da pré-venda.', label: 'Estou montando meu setup' }] }, { name: 'agree', label: 'Autorizo avisos desta pré-venda e do lançamento por e-mail e, se informado, WhatsApp. Sem outras campanhas.', type: 'checkbox', required: true }]} submitLabel="Quero o aviso de abertura" successTitle="Solicitação aceita pelo canal de contato." successText="O canal aceitou sua solicitação de aviso. Isso não confirma entrega, reserva ou compra." onSuccess={res => event('prevenda_interest_accepted', { channel: res.mode, intent: 'launch_notice' })} /><p className="px-privacy">Uso dos dados conforme a <Link to="/privacidade">Política de Privacidade</Link>. Nenhum dado de pagamento é solicitado.</p></div> : <div className="px-project-contact"><p className="px-eyebrow">Conversa de compatibilidade</p><h3>O seu setup vem primeiro.</h3><p>No WhatsApp, conte quais equipamentos já usa e o que quer reunir na central. Marca, modelo, tensão e potência ajudam o time a entender o projeto.</p><a className="px-button" href={compatibility} target="_blank" rel="noopener noreferrer" onClick={() => event('click_whatsapp', { placement: 'contact', intent: 'setup_review' })}>Abrir conversa no WhatsApp <ArrowUpRight size={18} aria-hidden="true" /></a><p className="px-contact-note">A conversa inicia uma avaliação. Não confirma compatibilidade, orçamento, reserva ou prazo de retorno.</p></div>}</div></div></section>
    </main>
    <footer className="px-footer px-wrap"><Link to="/" aria-label="Página inicial Grow-X"><img src={logo} width="120" height="32" alt="Grow-X" /></Link><p>Módulo Grow-X + GXP<br /><span>Automação de plantio indoor.</span></p><div><Link to="/prevenda/pedido">Consultar pedido anterior</Link><Link to="/privacidade">Privacidade</Link><a href={compatibility} target="_blank" rel="noopener noreferrer" onClick={() => event('click_whatsapp', { placement: 'footer', intent: 'setup_review' })}>WhatsApp +55 41 99549-4343</a></div></footer>
    <aside hidden={!stickyVisible} className="px-sticky" aria-label="Interesse no Módulo e GXP"><span>Automação indoor<small>Cadastro de interesse · sem cobrança</small></span><InterestCta placement="sticky" children="Quero automatizar" /></aside>
    <dialog ref={dialog} className="px-original-dialog" aria-label={`Captura original GXP — ${original.name}`} onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }}><button className="px-close" type="button" aria-label="Fechar captura original" onClick={() => dialog.current?.close()}><X size={22} aria-hidden="true" /></button><p>GXP / {original.name} · captura original de QA · 09/10/2026</p><img src={original.src} width="780" height="1560" alt={`Captura original inteira da tela ${original.name}, com dados sintéticos de QA`} /></dialog>
  </div>;
}
