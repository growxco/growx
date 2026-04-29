# Grow-X — Runbook operacional

Operações diárias do site `www.growx.com.br`. Quem opera o site usa esse documento.

## Stack
- **Framework**: Vite + React 19 + TailwindCSS 4
- **UI**: Radix primitives + Lucide icons + Framer Motion
- **SEO**: react-helmet-async + Schema.org JSON-LD inline
- **Analytics**: Vercel Analytics + Speed Insights + adapter para GA4/Meta/LinkedIn/Clarity
- **Forms/CRM**: adapter `src/lib/crm.js` (webhook + formsubmit fallback)
- **i18n**: `src/i18n/I18nProvider.jsx` (PT/EN no toggle do header)
- **Deploy**: Vercel (`grow-xs-projects` team) → projeto `growx`
- **Domínio**: `growx.com.br` + `www.growx.com.br`

## Comandos do dia-a-dia

```bash
# Desenvolvimento local
npm run dev                        # http://localhost:5173

# Build local (validação antes de deploy)
npm run build

# Otimização de imagens (rodar quando adicionar fotos novas grandes)
npm run optimize:images

# Deploy production (Vercel)
npx vercel --prod --scope grow-xs-projects

# Deploy preview (branch)
npx vercel --scope grow-xs-projects
```

## Estrutura de rotas (21 páginas)

| Rota | Página | Função |
|---|---|---|
| `/` | HomePage | Marca + ChoosePath + bento + ticker + terminal + FAQ |
| `/demo` | DemoPage | Form B2B qualificado (BANT) |
| `/lista-espera-app` | WaitlistAppPage | Form de pré-lançamento App + counter |
| `/contato` | ContactPage | Form genérico + roteamento por assunto |
| `/obrigado` | ObrigadoPage | Thank-you após envio de form |
| `/cannabis-medicinal` | CannabisMedicinalPage | Página dedicada P4 (paciente medicinal) |
| `/insights` | InsightsPage | Hub editorial (placeholders até conteúdo real) |
| `/casos` | CasosPage | Cases B2B (placeholders até autorização) |
| `/parceiros` | ParceirosPage | Programa de parceiros + form aplicação |
| `/imprensa` | ImprensaPage | Kit imprensa: logos, boilerplate, citações |
| `/solucoes/{supply-x,spi,spp,growx-app}` | SoluçõesXPage | 4 páginas de solução |
| `/produtos` + `/produtos/{estacao,modulo,estufa}` | ProdutosXPage | Hub + 3 hardware |
| `/sobre/{historia,executivo,filosofia}` | SobreXPage | 3 institucionais |
| `*` | NotFoundPage | 404 |

## Backend serverless (Vercel Functions)

Pasta `api/`:
- `api/chat.js` — POST endpoint do **Grow-X AI Assistant**. Usa Gemini Flash (primary) com fallback OpenAI gpt-4o-mini. System prompt server-side (nunca exposto). Rate limit 20 req/min por IP.
- `api/enrich-lead.js` — POST. Recebe lead, devolve classificação JSON (intent/segment/score/priority/next_steps). Chamado fire-and-forget pelo `LeadForm` após submit.
- `api/_lib/ai.js` — adapter compartilhado.

**Custo:** Gemini Flash tem free tier generoso (1M req/dia). Com Gemini como primário, custo prático ≈ R$ 0/mês até escalar.

**Segurança:**
- Keys server-side **sem prefixo `VITE_`** (não vazam pro browser).
- CORS restrito a `https://www.growx.com.br`.
- Rate limiting in-memory (20 req/min/IP). Pra escalar: usar Upstash Redis.
- Safety filters habilitados no Gemini.

**Rotação de keys:** veja [`ROTACIONAR-KEYS.md`](ROTACIONAR-KEYS.md).

## Variáveis de ambiente

Arquivo: `.env.local` (criar a partir de `.env.example`).
**Todas opcionais** — site funciona sem nenhuma. Cada uma faltando desliga só a integração correspondente.

| Variável | Função | Como obter |
|---|---|---|
| `VITE_GA_ID` | GA4 measurement ID | https://analytics.google.com (G-XXXXXXX) |
| `VITE_META_PIXEL_ID` | Facebook/Instagram pixel | https://business.facebook.com/events_manager |
| `VITE_LINKEDIN_PARTNER_ID` | LinkedIn insight tag | https://www.linkedin.com/campaignmanager |
| `VITE_CLARITY_ID` | Microsoft Clarity (heatmap) | https://clarity.microsoft.com |
| `VITE_CRM_WEBHOOK_URL` | Endpoint que recebe POST JSON dos forms | HubSpot Forms / Brevo / n8n / Make / Zapier |
| `VITE_FORMSUBMIT_EMAIL` | Fallback email se webhook não setado | já configurado: `growx@growx.com.br` |
| `VITE_CALENDLY_URL` | URL pública do Calendly da demo | https://calendly.com/growx/demo |
| `OPENAI_API_KEY` | **Server-side**. Fallback do AI Assistant | platform.openai.com/api-keys |
| `GEMINI_API_KEY` | **Server-side**. Modelo principal (Gemini Flash) | aistudio.google.com/app/apikey |
| `AI_CHAT_MODEL` | Modelo principal (default: `gemini-1.5-flash-latest`) | — |
| `AI_FALLBACK_MODEL` | Modelo fallback (default: `gpt-4o-mini`) | — |
| `AI_RATE_LIMIT_PER_MINUTE` | Limite de calls/IP/min em `/api/chat` (default: 20) | — |
| `VITE_AI_ASSISTANT_ENABLED` | Liga/desliga o widget no Header (default: true se key configurada) | — |

**Como configurar no Vercel:**
1. https://vercel.com/grow-xs-projects/growx/settings/environment-variables
2. Adicionar variável (Production scope)
3. Re-deploy: `npx vercel --prod --scope grow-xs-projects`

## Eventos analytics que disparam

```
page_view              ← em toda navegação SPA
click_cta_demo         ← qualquer CTA "Agendar demo"
click_cta_waitlist     ← CTA "Lista de espera"
click_whatsapp         ← qualquer abertura de WhatsApp (com intent contextual)
form_start             ← primeiro touch em qualquer form
form_submit            ← submissão de form (todas)
form_qualified         ← lead com score ≥ 50 (B2B)
schedule_demo          ← form /demo enviado
lead                   ← captura genérica
```

Mapeamento Meta Pixel: `lead`/`form_submit` → standard `Lead`. `schedule_demo` → standard `Schedule`. `click_cta_waitlist` → `CompleteRegistration`.

## Lead scoring (heurística básica)

Em `src/lib/crm.js → scoreLead({ segment, role, companySize, urgency, hasEmail })`.

| Sinal | Pontos |
|---|---|
| Email preenchido | +5 |
| Segment = industrial | +15 |
| Segment = cooperativa | +18 |
| Role contém "diretor/c-level/ceo/cto/coo/presidente/gerente" | +20 |
| Company size ≥ 51 | +16–26 |
| Urgency = agora | +25 |
| Urgency = 30d | +18 |

Score ≥ 50 dispara `form_qualified` no analytics → SDR notifica.

## Conteúdo para preencher (placeholders explícitos no site)

- `/casos` — todos os 3 cases marcados "Em validação editorial". Trocar por dados reais quando autorizados.
- `/insights` — 6 cards com badge "em produção". Publicar artigos reais e remover badge.
- `/lista-espera-app` — `WaitlistCounter base={412}` é número placeholder. Substituir pelo total real lido do CRM/banco.
- `/imprensa` — boilerplate institucional já preenchido com dados reais; logos do kit ainda referenciam `/og-image.svg` (substituir por logos PNG/SVG dedicados quando disponíveis).
- Trust strip — usa badges genuínas (Curitiba, jurídico, LGPD, hardware). Quando logos de clientes/parceiros forem autorizados, passar `<TrustStrip logos={[...]} />`.

## Quem cuida do quê

| Área | Owner sugerido |
|---|---|
| Frontend / build / deploy | Tech Lead |
| Conteúdo `/insights` | Editorial / SDR |
| Casos `/casos` | SDR + comercial (autorização cliente) |
| CRM webhook + leads | Comercial / Marketing Ops |
| Analytics IDs | Marketing |
| Imagens novas | Designer (rodar `npm run optimize:images`) |
| Compliance cannabis | Diretor jurídico (Calcagnotto) |
| Releases / WhatsApp Business | Comercial |
