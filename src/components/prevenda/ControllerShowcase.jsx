import { useRef, useState } from 'react';

import controladorPainel from '@/assets/controlador-painel.webp';
import controladorIluminacao from '@/assets/controlador-iluminacao.webp';
import controladorIrrigacao from '@/assets/controlador-irrigacao.webp';
import controladorAlertas from '@/assets/controlador-alertas.webp';
import controladorOffline from '@/assets/controlador-offline.webp';
import gxpSalaControle from '@/assets/gxp-sala-controle-real.webp';
import gxpRastro from '@/assets/gxp-rastro-real.webp';

const TELAS = [
  {
    id: 'painel',
    label: 'Painel',
    title: 'Tudo importante em uma tela',
    description: 'Estado da central, ambiente, luz, vasos e as seis saídas ficam visíveis antes de qualquer comando.',
    src: controladorPainel,
    alt: 'Protótipo do painel operacional do controlador Grow-X',
  },
  {
    id: 'luz',
    label: 'Luz',
    title: 'Fotoperíodo e dimming compatível',
    description: 'Horários, transições graduais e intensidade aparecem juntos; o dimming depende de driver compatível.',
    src: controladorIluminacao,
    alt: 'Protótipo da configuração de iluminação do controlador Grow-X',
  },
  {
    id: 'agua',
    label: 'Água',
    title: 'Rega com guardrails visíveis',
    description: 'Umidade do solo, leituras válidas, intervalo e limite da bomba deixam a regra auditável antes de ativar.',
    src: controladorIrrigacao,
    alt: 'Protótipo da configuração de irrigação por umidade do controlador Grow-X',
  },
  {
    id: 'alertas',
    label: 'Alertas',
    title: 'O problema vem com contexto',
    description: 'Severidade, causa, efeito e horário ajudam a decidir o que fazer sem tratar todo aviso como emergência.',
    src: controladorAlertas,
    alt: 'Protótipo da central de alertas do controlador Grow-X',
  },
  {
    id: 'offline',
    label: 'Offline',
    title: 'Última configuração fica na central',
    description: 'Sem nuvem, o controlador mantém localmente a última rotina e o app deixa claro quais dados não estão confirmados.',
    src: controladorOffline,
    alt: 'Protótipo do controlador Grow-X sem comunicação com a nuvem',
  },
];

const PROTOTYPE_CAPTION = 'Protótipo do controlador Grow-X baseado no firmware v0.6.0. Dados ilustrativos. Recursos marcados como “em breve” não integram a entrega atual.';
const GXP_CAPTION = 'Captura real de gxp.ia.br em conta de demonstração. Os estados e horários exibidos são dados de teste e não comprovam telemetria atual.';

export default function ControllerShowcase({ eyebrowClass, colors, onOpen }) {
  const [activeId, setActiveId] = useState('painel');
  const tabRefs = useRef([]);
  const active = TELAS.find((tela) => tela.id === activeId) || TELAS[0];
  const { green, muted, line, surface, panel, card } = colors;

  const moveTabFocus = (event, currentIndex) => {
    const keyTargets = {
      ArrowRight: (currentIndex + 1) % TELAS.length,
      ArrowDown: (currentIndex + 1) % TELAS.length,
      ArrowLeft: (currentIndex - 1 + TELAS.length) % TELAS.length,
      ArrowUp: (currentIndex - 1 + TELAS.length) % TELAS.length,
      Home: 0,
      End: TELAS.length - 1,
    };
    const nextIndex = keyTargets[event.key];
    if (nextIndex === undefined) return;
    event.preventDefault();
    setActiveId(TELAS[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <>
      <section id="controlador" className="border-y" style={{ borderColor: line, background: surface }}>
        <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="max-w-3xl">
            <p className={eyebrowClass} style={{ color: green }}>Controlador do módulo · especificação visual do PDF</p>
            <h2 className="mt-5 text-display-lg font-extrabold text-white">Você vê a regra antes de entregar o controle.</h2>
            <p className="mt-5 text-lg leading-relaxed" style={{ color: muted }}>
              O controlador foi desenhado para mostrar estado, origem da leitura, próximo evento e efeito de cada ação.
              Sugestões não ligam equipamentos sozinhas: a ativação continua sendo uma decisão sua.
            </p>
          </div>

          <div className="mt-10 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Telas do protótipo do controlador">
            {TELAS.map((tela, index) => {
              const selected = tela.id === active.id;
              return (
                <button
                  key={tela.id}
                  ref={(node) => { tabRefs.current[index] = node; }}
                  id={`controlador-tab-${tela.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls="controlador-tela"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveId(tela.id)}
                  onKeyDown={(event) => moveTabFocus(event, index)}
                  className="shrink-0 rounded-full border px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80]"
                  style={selected
                    ? { borderColor: 'rgba(74,222,128,.45)', background: 'rgba(74,222,128,.12)', color: green }
                    : { borderColor: line, color: muted }}
                >
                  {tela.label}
                </button>
              );
            })}
          </div>

          <div id="controlador-tela" role="tabpanel" aria-labelledby={`controlador-tab-${active.id}`} className="mt-6 grid gap-8 rounded-3xl border p-5 sm:p-8 lg:grid-cols-[minmax(0,.85fr)_minmax(340px,1fr)] lg:items-center" style={{ borderColor: line, background: panel }}>
            <div>
              <p className={eyebrowClass} style={{ color: green }}>{active.label}</p>
              <h3 className="mt-4 text-3xl font-extrabold text-white">{active.title}</h3>
              <p className="mt-4 max-w-xl leading-relaxed" style={{ color: muted }}>{active.description}</p>
              <ul className="mt-7 space-y-3 text-sm leading-relaxed text-white/85">
                <li className="flex gap-3"><span style={{ color: green }}>✓</span><span>Estados confirmados e não confirmados não se misturam.</span></li>
                <li className="flex gap-3"><span style={{ color: green }}>✓</span><span>Comandos manuais mostram duração e impacto antes do envio.</span></li>
                <li className="flex gap-3"><span style={{ color: green }}>✓</span><span>Parada geral não religa nenhuma saída ao ser liberada.</span></li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => onOpen({ ...active, caption: PROTOTYPE_CAPTION })}
              className="group mx-auto block w-full max-w-[430px] cursor-zoom-in overflow-hidden rounded-[2rem] border border-white/12 bg-black/30 p-2 text-left transition hover:border-[#4ade80]/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80]"
              aria-label={`Ampliar: ${active.alt}`}
            >
              <img src={active.src} alt={active.alt} className="max-h-[700px] w-full rounded-[1.55rem] object-cover object-top" loading="lazy" />
              <span className="mt-2 block px-2 pb-1 text-center text-xs font-semibold" style={{ color: green }}>Clique para ampliar</span>
            </button>
          </div>

          <p className="mt-4 text-xs leading-relaxed" style={{ color: muted }}>{PROTOTYPE_CAPTION}</p>
        </div>
      </section>

      <section id="gxp-real" className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="max-w-3xl">
          <p className={eyebrowClass} style={{ color: green }}>GXP hoje · capturas reais de gxp.ia.br</p>
          <h2 className="mt-5 text-display-lg font-extrabold text-white">O software já tem uma sala de controle.</h2>
          <p className="mt-5 text-lg leading-relaxed" style={{ color: muted }}>
            Estas são telas reais do GXP em ambiente de demonstração. Elas mostram a camada de dispositivos e a trilha de dados;
            o controlador do módulo acima continua identificado, honestamente, como protótipo.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {[
            { id: 'gxp-sala-controle', src: gxpSalaControle, title: 'Sala de controle ambiental', alt: 'Tela real do GXP mostrando a sala de controle ambiental' },
            { id: 'gxp-rastro', src: gxpRastro, title: 'Rastro de custódia', alt: 'Tela real do GXP mostrando o rastro de custódia' },
          ].map((image) => (
            <figure key={image.title} className="overflow-hidden rounded-2xl border" style={{ borderColor: line, background: card }}>
              <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${line}` }}>
                <span className="size-2.5 rounded-full bg-white/15" />
                <span className="size-2.5 rounded-full bg-white/15" />
                <span className="size-2.5 rounded-full bg-white/15" />
                <span className="ml-3 truncate rounded-md px-3 py-1 font-mono text-[0.7rem]" style={{ background: 'rgba(255,255,255,0.05)', color: muted }}>gxp.ia.br</span>
              </div>
              <button
                type="button"
                onClick={() => onOpen({ ...image, caption: GXP_CAPTION })}
                className="block w-full cursor-zoom-in text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#4ade80]"
                aria-label={`Ampliar: ${image.alt}`}
              >
                <img src={image.src} alt={image.alt} className="aspect-[16/7] w-full object-cover object-top" loading="lazy" />
              </button>
              <figcaption className="px-4 py-3 text-xs" style={{ color: muted }}>{image.title} · dados de demonstração</figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-4 text-xs leading-relaxed" style={{ color: muted }}>{GXP_CAPTION}</p>
      </section>
    </>
  );
}
