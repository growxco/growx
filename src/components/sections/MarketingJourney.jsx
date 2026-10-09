import { Link } from 'react-router-dom';
import { Container, Eyebrow } from '@/components/visual';

export function Journey({ id, eyebrow, title, intro, children }) {
  return <section id={id} className="section-y-tight scroll-mt-24"><Container><Eyebrow>{eyebrow}</Eyebrow><h2 className="mt-4 text-display-md text-foreground">{title}</h2>{intro && <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">{intro}</p>}<div className="mt-8">{children}</div></Container></section>;
}
export function JourneyCards({ items }) {
  return <div className="grid gap-5 md:grid-cols-3">{items.map(item=><article key={item.title} className="surface rounded-2xl p-6"><h3 className="text-xl font-semibold text-foreground">{item.title}</h3><p className="mt-3 text-base leading-relaxed text-muted-foreground">{item.text}</p>{item.to && <Link to={item.to} className="btn-ghost mt-5">{item.label}</Link>}{item.href && <a href={item.href} className="btn-ghost mt-5">{item.label}</a>}</article>)}</div>;
}
export function ProductScene({ src, alt, title, text }) {
  return <article className="grid items-center gap-8 lg:grid-cols-2"><figure className="m-0 overflow-hidden rounded-2xl surface"><img src={src} alt={alt} loading="lazy" width="1536" height="1024" className="h-auto w-full"/><figcaption className="p-4 text-sm leading-relaxed text-muted-foreground">Cena ilustrativa gerada por IA; interface real com dados de demonstração.</figcaption></figure><div><h3 className="text-2xl font-semibold text-foreground">{title}</h3><p className="mt-4 text-base leading-relaxed text-muted-foreground">{text}</p></div></article>;
}
export function GxpPrices() {
  return <Journey id="planos-gxp" eyebrow="Acesso ao GXP" title="Escolha o acesso para sua experiência." intro="O módulo é vendido separadamente. Os valores anuais correspondem a um pagamento único por 12 meses; confira a oferta e os recursos disponíveis no portal.">
    <div className="grid gap-5 md:grid-cols-2">{[{title:'Com módulo',upgrade:'R$ 29,90/mês ou R$ 329/ano',master:'R$ 79,90/mês ou R$ 949,90/ano'},{title:'Sem módulo',upgrade:'R$ 49,90/mês ou R$ 499/ano',master:'R$ 99,90/mês ou R$ 999/ano'}].map(plan=><article key={plan.title} className="surface rounded-2xl p-6"><h3 className="text-xl font-semibold">{plan.title}</h3><dl className="mt-5 space-y-4 text-base"><div><dt className="font-semibold">Upgrade</dt><dd className="mt-1 text-muted-foreground">{plan.upgrade}</dd></div><div><dt className="font-semibold">Master</dt><dd className="mt-1 text-muted-foreground">{plan.master}</dd></div></dl></article>)}</div>
  </Journey>;
}
