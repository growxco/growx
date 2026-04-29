# Grow-X · Site institucional & comercial

Site oficial da Grow-X Co. — `www.growx.com.br`

> Inteligência operacional para o agro brasileiro. Hardware, software e dados conectados de ponta a ponta.

## Stack

- Vite + React 19 + TailwindCSS 4
- Radix UI primitives, Lucide icons, Framer Motion
- React Router 7 (SPA com lazy load por rota)
- react-helmet-async + Schema.org JSON-LD
- Vercel Analytics + Speed Insights
- i18n PT/EN próprio (sem dep externa)

## Quick start

```bash
git clone <repo>
cd growx
npm install --legacy-peer-deps
cp .env.example .env.local       # opcional — todas variáveis são opt-in
npm run dev                       # http://localhost:5173
```

## Deploy

```bash
npx vercel --prod --scope grow-xs-projects
```

Projeto Vercel: `grow-xs-projects/growx` · domínios `growx.com.br` + `www.growx.com.br`.

## Documentação

- [`DOCS/RUNBOOK.md`](DOCS/RUNBOOK.md) — operação dia-a-dia (comandos, rotas, env, eventos analytics)
- [`DOCS/CHECKLIST-EXTERNAL.md`](DOCS/CHECKLIST-EXTERNAL.md) — bloqueios externos pendentes (credenciais, conteúdo, autorizações)
- [`.env.example`](.env.example) — todas as variáveis de ambiente

## Estrutura

```
src/
├── components/
│   ├── visual/           # primitives (Aurora, GlassCard, LeadForm, ThemeToggle, etc)
│   ├── sections/         # composições (Hero, BentoSolutions, FAQ, ChoosePath, etc)
│   ├── Header.jsx        # nav + ⌘K + theme + lang toggle
│   ├── Footer.jsx
│   ├── Breadcrumbs.jsx
│   ├── CommandPalette.jsx
│   ├── CookieBanner.jsx  # LGPD
│   ├── PageLoader.jsx
│   ├── SkipLink.jsx      # a11y
│   └── ui/               # shadcn primitives
├── pages/                # 21 rotas (lazy loaded exceto Home)
├── i18n/                 # PT/EN dictionary + provider
├── lib/
│   ├── analytics.js      # GA4 + Meta + LinkedIn + Clarity adapter
│   ├── crm.js            # form submit → webhook/formsubmit/mailto
│   └── utils.js
├── assets/
├── App.jsx
├── main.jsx
└── index.css             # design system + tokens (dark default + light)
```

## Comandos

```bash
npm run dev               # dev server
npm run build             # build production
npm run preview           # preview build local
npm run lint              # eslint
npm run optimize:images   # converte assets >800KB pra WebP (1920px max)
```

## Padrões

- **Mobile-first** com sticky CTA bottom
- **Dark default** + light theme via `<ThemeToggle />`
- **i18n** PT/EN via `useI18n().t('chave')`
- **Lazy load** todas as rotas exceto Home
- **SEO** por página via `<SEO title="..." description="..." path="..." />`
- **Forms** todas via `<LeadForm form="..." segment="..." fields={...} />`
- **Analytics** em CTAs via `analytics.ctaDemo(page)` etc.

## Bloqueios externos

Veja [`DOCS/CHECKLIST-EXTERNAL.md`](DOCS/CHECKLIST-EXTERNAL.md) — nenhum bloqueia operação, todos elevam qualidade quando resolvidos.
