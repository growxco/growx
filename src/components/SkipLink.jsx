export default function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-emerald focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[oklch(0.13_0.02_150)] focus:outline-none focus:ring-2 focus:ring-emerald-glow"
    >
      Ir para o conteúdo
    </a>
  );
}
