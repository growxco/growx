/**
 * Premium SVG monogram logos as dignified placeholder for partners/clients.
 * Substitute via prop `<TrustStrip logos={[{name, src}]} />` when real logos are authorized.
 *
 * Visual aesthetic: emerald-tinted monogram on a stroked wordmark — looks intentional, not "logo placeholder".
 */
export const PARTNER_MONOGRAMS = [
  { name: 'Cooperativa Indústria', mono: 'CI' },
  { name: 'Agro Originação', mono: 'AO' },
  { name: 'Verde Cadeia', mono: 'VC' },
  { name: 'Indústria 4.0 BR', mono: 'I4' },
  { name: 'Sojicultura SA', mono: 'SS' },
  { name: 'Estufa Pro', mono: 'EP' },
  { name: 'Cultivo Médico', mono: 'CM' },
  { name: 'Grãos Direto', mono: 'GD' },
];

export default function PartnerLogos() {
  return (
    <div className="flex w-max items-center gap-12">
      {PARTNER_MONOGRAMS.map((p) => (
        <PartnerMark key={p.name} name={p.name} mono={p.mono} />
      ))}
    </div>
  );
}

function PartnerMark({ name, mono }) {
  return (
    <div className="inline-flex h-10 items-center gap-3 whitespace-nowrap text-foreground/60 transition hover:text-foreground">
      <svg viewBox="0 0 36 36" width="28" height="28" aria-hidden>
        <defs>
          <linearGradient id={`pm-${mono}`} x1="0" x2="1">
            <stop offset="0%" stopColor="oklch(0.65 0.18 145)" />
            <stop offset="100%" stopColor="oklch(0.82 0.20 145)" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="34" height="34" rx="8" fill="oklch(0.18 0.022 150 / 60%)" stroke="url(#pm-${mono})" strokeOpacity="0.5" strokeWidth="1" />
        <text
          x="18"
          y="23"
          textAnchor="middle"
          fontFamily="Geist Mono, monospace"
          fontSize="12"
          fontWeight="700"
          fill="url(#pm-${mono})"
          letterSpacing="1"
        >
          {mono}
        </text>
      </svg>
      <span className="font-display text-xs font-semibold uppercase tracking-[0.18em] sm:text-sm">{name}</span>
    </div>
  );
}
