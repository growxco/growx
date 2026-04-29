# 🎯 Como pegar os 2 IDs que faltam (≤5 min cada)

Status atual:
- ✅ Microsoft Clarity Project ID = `wg34yg52s0` — configurado
- ✅ Meta Pixel ID = `118629574671054` (provisório, asset_id da URL — **confirmar abaixo**)
- ❌ GA4 Measurement ID — preciso de você
- ❌ LinkedIn Insight Partner ID — preciso de você

---

## 1. CONFIRMAR Meta Pixel ID (1 min)

Setei `118629574671054` (que estava na URL do Business Manager). Mas asset_id pode ser página, ad account ou pixel — preciso confirmar.

**Checagem:**
1. Abra https://business.facebook.com/events_manager2/list/dataset
2. Veja a lista de pixels da conta
3. Confirme se o ID `118629574671054` está lá

**Se SIM**: nada a fazer, já configurado.
**Se NÃO**: copie o pixel ID correto (15-16 dígitos) e rode:
```bash
cd C:/GitHub/growx
node scripts/setup-marketing-ids.mjs --pixel=PIXEL_ID_CORRETO
```

---

## 2. GA4 Measurement ID (≤3 min)

A URL que você mandou tinha account `369986298` e property `506988062`. O **Measurement ID** é diferente — começa com `G-`.

**Passos:**
1. Abra https://analytics.google.com/analytics/web/#/p506988062/admin/streams/table
2. Se já existe um Web Stream, clique nele
3. No topo: **"Measurement ID"** = `G-XXXXXXXXX` (10 chars depois do G-)
4. Copie

**Se ainda não tem Web Stream:**
1. Mesmo link → `+ Add Stream` → Web
2. URL: `https://www.growx.com.br`
3. Stream name: `Grow-X Production`
4. Enhanced measurement: **ON** (todas as opções)
5. Create → copie o Measurement ID

---

## 3. LinkedIn Insight Partner ID (≤5 min)

Você mandou só `linkedin.com`. Precisa do Partner ID:

**Passos:**
1. Abra https://www.linkedin.com/campaignmanager/accounts
2. Se não tem ad account ainda: criar um (grátis, sem precisar gastar — só pra ter o Insight Tag)
   - Nome: `Grow-X`
   - Currency: BRL
   - Associate with Page: criar ou vincular Página da Grow-X
3. Dentro do account → menu superior → **"Account Assets"** → **"Insight Tag"**
4. Botão **"Manage Insight Tag"** → **"See tag"**
5. Procure linha `_linkedin_partner_id = "XXXXXXX"` (6-8 dígitos)
6. Copie só o número

---

## 4. Configurar tudo de uma vez (1 comando)

Depois que tiver os 2 IDs faltantes, rode UM comando que seta tudo + faz redeploy:

```bash
cd C:/GitHub/growx
node scripts/setup-marketing-ids.mjs \
  --ga4=G-XXXXXXXXX \
  --linkedin=12345678
```

Sub-args opcionais (se quiser reconfigurar tudo):
```bash
node scripts/setup-marketing-ids.mjs \
  --ga4=G-XXX \
  --pixel=118629574671054 \
  --linkedin=12345678 \
  --clarity=wg34yg52s0 \
  --calendly=https://calendly.com/growx/demo \
  --crm=https://hubspot-form-submit-url
```

O script:
1. Verifica se a env var já existe → remove a antiga
2. Adiciona a nova (production + preview + development)
3. Dispara `vercel --prod` automaticamente
4. Em 1-2 min as integrations estão ativas

---

## 5. Validar (1 min)

Depois do deploy:

**GA4**: abra DevTools (F12) na home, console → digite `gtag` → deve responder com função (não `undefined`).

**Meta Pixel**: instale [Meta Pixel Helper](https://chromewebstore.google.com/detail/meta-pixel-helper) → ícone fica verde com "PageView fired" na home.

**Clarity**: abra https://clarity.microsoft.com → seu projeto → "Live" → você verá sua sessão em tempo real (~30s de delay).

**LinkedIn**: instale [LinkedIn Insight Tag Helper](https://chromewebstore.google.com/detail/linkedin-insight-tag-help) → mostra "Tag detected" na home.

---

## Recap rápido

| Plataforma | Status | Ação |
|---|---|---|
| Clarity | 🟢 ON (`wg34yg52s0`) | Validar visita aparece em "Live" |
| Meta Pixel | 🟡 ON (provisório) | Confirmar ID em events_manager2 |
| GA4 | ⚪ OFF | Pegar `G-XXX` em /admin/streams |
| LinkedIn | ⚪ OFF | Pegar Partner ID em Account Assets > Insight Tag |
