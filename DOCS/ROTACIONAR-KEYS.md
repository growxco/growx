# 🔐 Rotacionar API keys (OpenAI / Gemini) — pós-exposição

**Quando:** sempre que uma API key tiver sido exposta em qualquer lugar não-criptografado (chat, email, screenshot, repo público, log).

**Status atual (2026-04-23):** as keys originais foram fornecidas em chat de IA. Por boas práticas devem ser rotacionadas. Foram salvas em `.env.local` (gitignored) e nas Vercel env vars (production), mas **continuarão aceitas pela OpenAI/Google até serem explicitamente revogadas**.

---

## Procedimento (≤ 10 minutos)

### 1. OpenAI

1. Abra https://platform.openai.com/api-keys
2. Encontre a key antiga pelo nome/data de criação no painel
3. Clique nos `…` → **Revoke key**
4. Clique **+ Create new secret key**
5. Nome: `growx-prod-api`
6. Permissões: **Restricted** → habilite só o que usa (Model capabilities → Read+Write em Chat completions)
7. Copie a nova key (você só vê uma vez)
8. Atualize:
   ```bash
   # local
   # edite C:/GitHub/growx/.env.local — substitua valor de OPENAI_API_KEY
   ```
   ```bash
   # production (Vercel)
   cd C:/GitHub/growx
   echo "NOVA_KEY" | npx vercel env rm OPENAI_API_KEY production --yes --scope grow-xs-projects
   echo "NOVA_KEY" | npx vercel env add OPENAI_API_KEY production --scope grow-xs-projects
   npx vercel --prod --scope grow-xs-projects
   ```

### 2. Google Gemini

1. Abra https://aistudio.google.com/app/apikey
2. Encontre a key antiga pelo nome/data de criação no painel
3. **Delete API key**
4. Clique **Create API key** → escolha o projeto Grow-X (ou crie um)
5. Copie a nova key
6. Atualize:
   ```bash
   # local: edite .env.local

   # production:
   cd C:/GitHub/growx
   echo "NOVA_KEY" | npx vercel env rm GEMINI_API_KEY production --yes --scope grow-xs-projects
   echo "NOVA_KEY" | npx vercel env add GEMINI_API_KEY production --scope grow-xs-projects
   npx vercel --prod --scope grow-xs-projects
   ```

### 3. Confirmar revogação

```bash
# Tente fazer uma chamada com a key antiga — deve falhar com 401/invalid_api_key
curl -s -H "Authorization: Bearer KEY_ANTIGA" \
  https://api.openai.com/v1/models | head -10
```

Se voltar `invalid_api_key`, está revogado.

### 4. Validar nova key no site

```bash
# Após deploy:
curl -s -X POST https://www.growx.com.br/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Olá, o que é o SPI?"}]}'
```

Deve retornar JSON com `text`, `provider`, `model`.

---

## Defesas que já estão no código

- ✅ `.env.local` no `.gitignore` (nunca commita)
- ✅ Keys server-side **sem** prefixo `VITE_` (não vão pro browser)
- ✅ Rate limit 20 req/min por IP em `/api/chat` e `/api/enrich-lead`
- ✅ CORS restrito a `https://www.growx.com.br`
- ✅ Tamanho máximo de mensagem (2000 chars) e turnos (12)
- ✅ Safety filters habilitados no Gemini

## Custos estimados

| Modelo | Custo aprox | Volume realista no MVP |
|---|---|---|
| **Gemini 1.5 Flash** | Free tier 15 req/min · 1M req/dia | Cobre bem |
| **GPT-4o-mini** (fallback) | $0.15 / 1M tokens input · $0.60 output | ~$2/mês com 1k chats |
| **Lead enrichment** | ~500 tokens por lead | Negligível |

Com Gemini Flash como primário, **custo deve ficar próximo de zero** até o site escalar.

## Alertas a configurar

- OpenAI: usage limit em `$10/mês` (Settings → Limits)
- Google: quota alert em 80% do free tier (Cloud Console)

---

## Se for emergência (key vazou pra atacante)

1. Revogue **agora** (passos 1.1-1.3 e 2.1-2.3 acima)
2. Verifique logs de uso nas 2 plataformas (OpenAI Usage, Google Cloud Console)
3. Se houver uso anômalo, abra ticket de fraude
4. Recrie keys e redeploy
5. Considere rotacionar tudo do projeto (Vercel API token, etc) por precaução
