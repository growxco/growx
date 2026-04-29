# Grow-X — Checklist de bloqueios externos

**O que depende de input/credencial/aprovação externa pra deixar o site no nível máximo absoluto.**
Nada aqui impede o site de operar — todo placeholder é seguro, sinalizado, e cai em fallback. Mas cada item desbloqueado eleva qualidade/conversão.

---

## 🔑 CREDENCIAIS / IDs (ligar em ≤30min cada quando tiver)

| # | Item | Onde obter | Onde colar | Impacto |
|---|---|---|---|---|
| 1 | **GA4 Measurement ID** | analytics.google.com → Admin → Data Streams | Vercel env `VITE_GA_ID` | Atribuição real de tráfego, funil, queries |
| 2 | **Meta Pixel ID** | business.facebook.com/events_manager | `VITE_META_PIXEL_ID` | Retargeting + lookalike (se cannabis bloquear conta, usar só pra agro) |
| 3 | **LinkedIn Insight Tag** | linkedin.com/campaignmanager → Account Assets → Insight Tag | `VITE_LINKEDIN_PARTNER_ID` | Atribuição B2B + retargeting LinkedIn |
| 4 | **Microsoft Clarity** | clarity.microsoft.com → New Project | `VITE_CLARITY_ID` | Heatmap + session replay (LGPD-friendly) |
| 5 | **HubSpot Free CRM** | hubspot.com → Sign up | Form webhook em `VITE_CRM_WEBHOOK_URL` | Pipeline real B2B |
| 6 | **Brevo** (newsletter + transacional) | brevo.com → Sign up | Webhook em `VITE_CRM_WEBHOOK_URL` (se preferir Brevo a HubSpot) | Newsletter + automação |
| 7 | **Calendly** | calendly.com → New event 30min | `VITE_CALENDLY_URL` | Agendamento direto na DemoPage |
| 8 | **WhatsApp Business API** | Meta Cloud API ou Twilio | Backend custom (não SPA) | Bot qualificação + atendimento escalável |

---

## 📸 ASSETS REAIS (substituir placeholders)

| # | Item | Onde está hoje | Como trocar |
|---|---|---|---|
| 1 | **Logos de clientes / parceiros** (trust strip) | Badges genéricas em `<TrustStrip />` | Passar prop `logos={[{name,src}]}` em `src/pages/HomePage.jsx` |
| 2 | **3 cases reais com números** | `src/pages/CasosPage.jsx` (badge "Em validação editorial") | Editar `CASES` array; remover badge `status`; criar artigos individuais em `/insights` |
| 3 | **Vídeo hero** (60s drone/operação) | Hero atual usa LiveKPIPanel | Adicionar `<video>` opcional em `src/components/sections/Hero.jsx` |
| 4 | **Foto institucional do escritório** Batel | Não tem | Adicionar em `/sobre/historia` |
| 5 | **Logos de imprensa** (Globo Rural, Canal Rural, etc) quando aparecerem | Não tem ainda | Criar seção "Imprensa nos viu" no Footer |
| 6 | **Imagem de capa por artigo Insights** | SVG editorial genérico | Criar 6 capas WebP 16:9 |

---

## 📝 CONTEÚDO REAL (escrever e publicar)

| # | Item | Status | Onde publicar |
|---|---|---|---|
| 1 | 6 artigos pilares (2 indústria, 2 produtor, 2 cultivo) | 6 placeholders no `/insights` | Substituir array `INSIGHTS` em `src/pages/InsightsPage.jsx` + criar páginas individuais (próxima iteração) |
| 2 | Newsletter quinzenal · primeiro envio | Não enviada | Brevo + lista importada do CRM |
| 3 | 1 tese fundadora/mês assinada Schreiber | 0 publicadas | LinkedIn pessoal + `/insights` categoria "Tese" |
| 4 | 1 case study escrito (NDA quebrada) | 0 publicados | `/casos` |
| 5 | Whitepaper "Como dimensionar SPI em uma cooperativa" | 0 | Lead magnet gated |
| 6 | Calculadora ROI SPI | 0 | Próxima iteração de produto |

---

## 🤝 AUTORIZAÇÕES / RELACIONAMENTO

| # | Item | Status | Quem aprova |
|---|---|---|---|
| 1 | Liberação de 1 cliente B2B pra virar case público | Pendente | Comercial + cliente |
| 2 | 5 cultivadores referência aceitarem programa de embaixadores | Pendente | Comercial / comunidade |
| 3 | 3 outreaches pra mídia setorial (Globo Rural, Canal Rural, AgFunder) | Pendente | CEO + assessoria |
| 4 | LGPD: revisão final pelo Calcagnotto da política de privacidade pública (`/privacidade`) | Página ainda não criada | Jurídico |
| 5 | Disclaimer cannabis medicinal por página `/cannabis-medicinal` | ✅ Já no código (rodapé do hero) | Jurídico revisar texto |
| 6 | OG image 1200×630 final pra redes (hoje: SVG genérico) | Versão funcional já no ar | Designer |
| 7 | E-mail dedicado `imprensa@growx.com.br` | Apontado no `/imprensa` mas pode não existir | TI/admin |

---

## 💰 INVESTIMENTOS QUANDO HOUVER VERBA

| # | Item | Custo aprox | Retorno esperado |
|---|---|---|---|
| 1 | Migração SPA → Next.js SSG | 2–3 semanas dev | Indexação real do conteúdo (5–10× tráfego orgânico em 6m) |
| 2 | Redator técnico freelancer agro/cannabis | R$ 5K/mês | 4 artigos/mês indexados |
| 3 | SDR júnior B2B | R$ 4K + comissão | Pipeline ativo |
| 4 | LinkedIn Ads B2B (teste) | R$ 1.5K/mês | 5–15 leads B2B/mês |
| 5 | Assessoria de imprensa setorial | R$ 3K/mês | 1 menção/mês mídia agro |
| 6 | Designer dedicado p/ Insights + sociais | R$ 3K/mês | Capas + reels + carrosséis LinkedIn |
| 7 | Vídeo institucional 90s (drone + dashboard) | R$ 8–15K (one-off) | Hero + redes + sales deck |

---

## 🚧 RISCOS REGULATÓRIOS / DE PLATAFORMA (não-negociáveis)

| Risco | Mitigação no código |
|---|---|
| Meta/Google bloquearem ads pra `/cannabis-medicinal` | Página tem disclaimer, foco em "cultivo controlado" e "padrão farmacêutico" — não em uso/dose |
| Conta de Instagram banida por menção a cannabis | Conteúdo cannabis fica off do Insta corporativo; usar conta dedicada `grow_x.co` (já existe) |
| LGPD em formulários | CookieBanner + texto de consentimento já em todo `LeadForm` |
| Cannabis em LinkedIn Ads | Posicionar como "agtech medicinal B2B"; cinzento mas mais permissivo |

---

## ✅ Como saber que tudo foi resolvido

Faça este checklist quando voltar amanhã:

```
[ ] Variáveis de env preenchidas no Vercel (GA4, Pixel, Clarity mínimo)
[ ] CRM webhook funciona: enviar form de teste em /demo e ver chegar no HubSpot
[ ] Calendly URL configurada e link no /demo abre agenda
[ ] Pelo menos 1 logo real no Trust Strip
[ ] Pelo menos 1 case real no /casos sem badge "em validação"
[ ] Pelo menos 1 artigo real no /insights sem badge "em produção"
[ ] Newsletter quinzenal em ferramenta com lista importada
[ ] Política de privacidade publicada e linkada no Footer
[ ] OG image final (versus SVG placeholder atual)
```
