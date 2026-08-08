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
- `api/checkout.js` — cria checkout Stripe/MP somente depois de adquirir um slot atômico do lote.
- `api/_lib/inventory.js` — inventário DynamoDB de 100 slots e idempotência por request UUID. Não guarda nome, e-mail, CPF, telefone ou endereço.
- `api/_lib/lote.js` — reconcilia reservas vencidas com o provider antes de liberar qualquer slot.
- `api/cron/reconcile.js` — worker autenticado e bounded; é a única rota que consulta providers para reconciliar holds.
- `api/cron/webhook-redrive.js` — drena pelo GSI os efeitos externos pendentes, com lease, backoff e dead-letter alertado.
- `api/{stripe,mp}-webhook.js` — marca o slot consumido antes de notificar venda.

**Custo:** Gemini Flash tem free tier generoso (1M req/dia). Com Gemini como primário, custo prático ≈ R$ 0/mês até escalar.

**Segurança:**
- Keys server-side **sem prefixo `VITE_`** (não vazam pro browser).
- CORS restrito a `https://www.growx.com.br`.
- Rate limiting in-memory (20 req/min/IP). Pra escalar: usar Upstash Redis.
- Safety filters habilitados no Gemini.
- O rate limit in-memory não participa da garantia do lote. O teto é imposto exclusivamente pela transação DynamoDB.

**Rotação de keys:** veja [`ROTACIONAR-KEYS.md`](ROTACIONAR-KEYS.md).

## Variáveis de ambiente

Arquivo: `.env.local` (criar a partir de `.env.example`). O site institucional funciona sem integrações; a compra em `/prevenda` falha fechada sem DynamoDB e sem o provider escolhido.

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
| `PREVENDA_INVENTORY_TABLE` | **Obrigatória para comprar.** Tabela DynamoDB do lote, PK string `pk` | AWS DynamoDB |
| `PREVENDA_SALES_ENABLED` | Gate explícito. Somente `true` abre checkout; ausente/false pausa vendas | Aprovação CEO/Jurídico após publicação da oferta final |
| `PREVENDA_RELEASE_VERSION` | Deve ser idêntica a `OFERTA.contratoVersao`; impede aprovação de uma versão abrir outra | Manifesto do release |
| `PREVENDA_APPROVAL_REF` | Referência auditável `legal:*`, `argus:*` ou `release:*`; flag isolada não abre venda | Decisão aceita do release |
| `PREVENDA_DISCLOSURES_SHA256` | SHA-256 do pacote publicado com ficha elétrica, dimensões, kit e custo total de entrega | Artefato aprovado |
| `PREVENDA_TURNSTILE_ENABLED` | Gate anti-bot server-side. Também deve ser `true`; ausência mantém checkout fechado | Cloudflare Turnstile |
| `TURNSTILE_SECRET_KEY` | Segredo server-side do widget; nunca usar no bundle | Cloudflare Turnstile |
| `TURNSTILE_EXPECTED_ACTION` / `TURNSTILE_EXPECTED_HOSTNAMES` | Binding obrigatório do token (`prevenda_checkout` / `www.growx.com.br`) | Configuração do release |
| `VITE_TURNSTILE_SITE_KEY` | Chave pública do widget da pré-venda | Cloudflare Turnstile |
| `PREVENDA_RESERVATION_SECRET` | Segredo server-side com >=32 caracteres para HMAC de CPF/e-mail/IP; nunca reutilizar token de provider | Gerenciador de segredos |
| `PREVENDA_MP_SETTLEMENT_GRACE_MINUTES` | Graça conservadora após expiração MP (mínimo 120; default 180) | Operação de pagamentos |
| `CRON_SECRET` | Segredo >=32 caracteres que autentica o Vercel Cron de reconciliação | Gerenciador de segredos |
| `AWS_REGION` | Região da tabela (produção: `sa-east-1`) | AWS |
| `AWS_ROLE_ARN` | Role mínima assumida com token curto da Vercel; access keys estáticas são proibidas | AWS IAM / Vercel OIDC |
| `STRIPE_SECRET_KEY` | Checkout cartão + reconciliação Stripe | Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | Verifica a assinatura do endpoint exclusivo da pré-venda | Stripe Dashboard |
| `MP_ACCESS_TOKEN` | Checkout Pix + reconciliação Mercado Pago | Mercado Pago Developers |
| `MP_WEBHOOK_SECRET` | Verifica `x-signature` antes de consultar pagamentos Pix | Mercado Pago Developers |
| `RESEND_API_KEY` | Confirmação transacional do pedido | Resend |
| `LEAD_INBOX_EMAIL` | Inbox interna para avisos de venda | Grow-X |
| `SLACK_WEBHOOK_URL` | Aviso interno redundante de venda, opcional | Slack |
| `LOTE_ETAPA` | Marco confirmado da produção exibido ao comprador | Operação |

**Como configurar no Vercel:**
1. https://vercel.com/grow-xs-projects/growx/settings/environment-variables
2. Adicionar variável (Production scope)
3. Re-deploy: `npx vercel --prod --scope grow-xs-projects`

## Inventário atômico da pré-venda

### Contrato da tabela

- Uma tabela dedicada com partition key **string** `pk`, sem sort key, e TTL habilitado no atributo numérico **`ttl`**.
- Capacidade on-demand, criptografia e point-in-time recovery recomendados.
- Nunca gravar `ttl` em `SLOT#*`. `REQUEST#*` e `BUYER#*` recebem o TTL de retenção definido abaixo.
- O código cria sob demanda `SLOT#001` até `SLOT#100`, `REQUEST#<uuid>`, `BUYER#<hmac>` e `RATE#<hmac>#<janela>` na mesma `TransactWriteItems`.
- Estados possíveis: `held`, `paid`, `released`. Ausência e `released` são os únicos estados reutilizáveis.
- `BUYER#<hmac>` permite uma única reserva `held`/`paid` por CPF e volta a `released` somente na mesma transação que libera a reserva.
- `RATE#<hmac>#<janela>` limita a três aquisições bem-sucedidas por IP em cada janela fixa de 31 minutos. Colisão de slot não incrementa o contador; esses itens expiram após 48 horas.
- `REQUEST`/`BUYER` liberados recebem TTL de 30 dias; os pagos, 5 anos. `SLOT` nunca recebe TTL, pois exclusão automática não pode reabrir capacidade.
- `SLOT`/`REQUEST`/`BUYER` registram `contract_version`, `terms_acknowledged_at` e `email_hash` sem PII em claro. Retry do mesmo UUID com identidade ou versão contratual divergente falha fechado.
- A role usada pela Vercel precisa de `dynamodb:GetItem`, `dynamodb:BatchGetItem` e `dynamodb:UpdateItem` exclusivamente na tabela, mais `dynamodb:Query` exclusivamente no GSI `webhook-outbox-due`. Como `TransactWriteItems` é autorizado pelas ações de item subjacentes, `dynamodb:PutItem` e `dynamodb:DeleteItem` também são permitidos na tabela somente quando `dynamodb:EnclosingOperation=TransactWriteItems`; não conceder uma ação IAM fictícia `dynamodb:TransactWriteItems`.

O template `infra/prevenda-inventory.yml` provisiona somente a tabela; não cria usuário nem chave IAM. `infra/prevenda-vercel-oidc.yml` cria a role temporária com trust exato para `owner:grow-xs-projects:project:growx:environment:production`. O provider OIDC existente precisa aceitar a audiência `sts.amazonaws.com` antes do smoke.

As Vercel Functions ficam fixadas em **`gru1` (São Paulo)** pelo `regions` de `vercel.json`, próximo ao DynamoDB em `sa-east-1`; arquivos estáticos continuam globais na CDN. O arquivo aponta para o [schema oficial da Vercel](https://openapi.vercel.sh/vercel.json), e `tests/config/vercel-config.test.mjs` impede remover silenciosamente a região ou o cron.

### Gate de ativação

`PREVENDA_SALES_ENABLED` deve permanecer **ausente ou `false` durante todos os passos abaixo**. A troca para `true` é a última ação, somente depois de anexar as evidências de todos os gates ao release.

1. Criar a tabela, validar a PK `pk` como string, habilitar DynamoDB TTL em `ttl` e confirmar que as Functions do deployment executam em `gru1`.
2. Integrar a role mínima por **Vercel OIDC**, sem `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` persistentes. O runtime usa `@vercel/oidc-aws-credentials-provider`, audiência `sts.amazonaws.com` e sessão de 15 minutos; em `VERCEL_ENV=production`, ausência de `AWS_ROLE_ARN` falha fechado. Antes de qualquer escrita, executar um smoke read-only pelo deployment com `GetItem`/`BatchGetItem` (por exemplo, `GET /api/lote`), confirmar no CloudTrail a role esperada e a sessão temporária, e provar que não houve `TransactWriteItems`. Se a prova falhar, vendas continuam pausadas.
3. Reconciliar Stripe e Mercado Pago e representar toda venda pré-existente como slot `paid` antes do primeiro deploy com o novo checkout. Não iniciar a tabela vazia se já houver pedido pago.
   - Preflight read-only de **05/08/2026** encontrou 22 sessões Stripe antigas da pré-venda: 18 expiradas e 4 ainda abertas/não expiradas, todas sem a metadata do inventário atômico; MP retornou 0. Não mutar essas sessões automaticamente. Aguardar expiração ou decisão humana sobre as quatro abertas e repetir o inventário imediatamente antes da ativação.
   - Se qualquer uma liquidar, migrar o pagamento/slot para o ledger antes de instalar/ativar webhooks e antes de abrir novas vendas.
4. Configurar as envs Dynamo/Stripe/MP, incluindo `STRIPE_WEBHOOK_SECRET` e `MP_WEBHOOK_SECRET`, sem imprimir os valores. Rotacionar qualquer segredo de webhook que tenha aparecido em arquivo/log local antes do smoke.
5. Gerar `PREVENDA_RESERVATION_SECRET` exclusivo com pelo menos 32 caracteres e guardar somente no secret manager/Vercel.
6. Gerar `CRON_SECRET` exclusivo, configurar os crons `reconcile`, `financial-reconcile` e `webhook-redrive` em `* * * * *` e confirmar resposta autenticada sem expor o valor. Configurar também `RESEND_API_KEY` e a caixa de alerta (`PREVENDA_ALERT_EMAIL` ou `LEAD_INBOX_EMAIL`): dead-letter sem alerta entregue bloqueia a ativação.
7. Criar o widget Turnstile para `www.growx.com.br`, configurar `VITE_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, action e hostname, e provar no deployment que token ausente/reutilizado/origem divergente falha antes de qualquer leitura/escrita Dynamo. `PREVENDA_TURNSTILE_ENABLED` só vira `true` junto com esta prova. Tokens são validados exclusivamente no servidor e não entram em logs/analytics.
8. Fazer smokes **assinados pelo próprio provider** contra o deployment alvo; `curl` com assinatura fabricada ou chamada direta ao processador não satisfaz o caminho positivo deste gate. Uma cópia deliberadamente adulterada do payload/assinatura serve apenas para provar o caminho negativo sem refetch: Stripe responde `400 invalid_signature`; Mercado Pago responde `401 invalid_signature`.
   - **Stripe:** endpoint exclusivo com raw body intacto. Confirmar no Dashboard a assinatura dos eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`, `refund.created`, `refund.updated`, `refund.failed`, `charge.dispute.created`, `charge.dispute.updated`, `charge.dispute.closed`, `charge.dispute.funds_withdrawn` e `charge.dispute.funds_reinstated`. Gerar em modo de teste uma venda vinculada ao inventário e uma revisão de refund; gerar disputa/chargeback pelo mecanismo oficial de teste quando suportado. Cada entrega deve terminar em `2xx`, ter event id registrado sem PII e produzir uma única transição/outbox idempotente; replay não pode duplicar efeito.
   - **Mercado Pago Orders:** configurar notificações `type=order` com `data.id=ORD...` e `x-signature`. O webhook autenticado relê exclusivamente `GET /v1/orders/{order_id}` antes de qualquer transição. Provar em sandbox: Order criada, Pix processado, refund parcial/total e chargeback quando o ambiente permitir; cada evento precisa manter binding exato ORD/PAY/request/slot/valor e ser idempotente. **Payments** e **Chargebacks** ficam configurados apenas para o Checkout Pro legado já emitido. Quando o provider não oferecer simulação assinada de refund/chargeback, registrar a limitação e manter Pix desabilitado até um evento provider-native de baixo risco confirmar a cadeia completa. Fraud Alerts/Claims permanecem desabilitados: `stop_delivery` sem redelivery exige inbox + worker durável antes de ser seguro.
   - **Outbox/redrive:** induzir uma indisponibilidade do canal de e-mail além da tentativa do webhook, restaurar o canal e provar que `/api/cron/webhook-redrive` entrega uma única vez com a mesma Idempotency-Key. Rodar duas invocações concorrentes e provar uma única claim. Induzir um canal sem contexto seguro e provar `dead_letter` + alerta operacional, nunca `done`.
9. Tratar o **Pix como bloqueio separado**: o hot path novo usa `POST /v1/orders`, envia uma única transação `payment_method.id=pix` / `type=bank_transfer`, exige R$ 2.800 exatos e valida ORD/PAY antes de anexar o provider. O Checkout Pro permanece apenas para leitura/reconciliação legada. `PREVENDA_PIX_ENABLED` e `VITE_PREVENDA_PIX_ENABLED` continuam `false` até o smoke sandbox assinado provar criação, QR/link, pagamento, expiração, refund e chargeback pela cadeia Orders canônica. Referência: [Pix por Checkout API/Orders](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-integration/pix).
10. Rodar `node --test tests/config/*.test.mjs`, `npm run test:backend`, `npm run lint` e `npm run build` em Node 24, igual ao runtime implantado.
11. Em preview, confirmar que o gate desligado deixa `/api/lote` em modo não confiável e `/api/checkout` em 503; com o gate ligado, Dynamo, OIDC ou Turnstile ausente continua 503 sem disponibilidade parcial.
12. Imediatamente antes da ativação, repetir o **preflight final read-only** com paginação completa nos dois providers e guardar timestamp/contagens: nenhuma sessão/preferência legada ainda aberta; **zero pagamentos aprovados não representados no ledger**; total de pedidos pagos do provider igual ao total de slots `paid`. Se o resultado histórico for zero, registrar explicitamente a evidência `zero-paid`; se houver qualquer pago, migrá-lo para um slot antes de continuar. Resultado parcial, cursor incompleto ou divergência bloqueia a ativação.
13. Publicar e aprovar, antes de qualquer cobrança, a ficha elétrica aplicável (tensão, corrente e carga máxima), dimensões, composição final do kit e o custo total da modalidade de entrega escolhida. Gerar a nova versão contratual imutável, validar o direito de arrependimento contado também do recebimento e anexar as provas de Hardware/Jurídico, OIDC, webhooks e preflight ao release.
14. Calcular o SHA-256 do pacote publicado, criar em código um novo `PREVENDA_RELEASE` com `approved=true`, paths/hashes exatos, métodos permitidos e a referência da decisão final aceita. O teste deve recalcular o hash do contrato e o digest canônico do manifesto. Só então configurar `PREVENDA_RELEASE_VERSION`, `PREVENDA_APPROVAL_REF` e `PREVENDA_DISCLOSURES_SHA256` com valores idênticos ao manifesto. Provar que versão divergente, referência placeholder, hash ausente/fictício ou método não listado deixam `/api/lote` não confiável e `/api/checkout` em 503. O digest do manifesto deve ser persistido em `REQUEST`, `SLOT` e `BUYER`.
15. Somente então configurar `PREVENDA_SALES_ENABLED=true`. Fazer primeiro uma reserva sandbox/real controlada, confirmar ledger/outbox/reconciliação e ter rollback pronto; o canal Mercado Pago continua indisponível enquanto a homologação Orders do passo 9 estiver aberta.

### Semântica de reserva e reconciliação

- O checkout aceita um `requestId` UUID do browser. Repetições usam o mesmo `REQUEST#uuid` e nunca adquirem outro slot.
- A reserva dura 31 minutos: essa margem mantém o mínimo técnico de 30 minutos da Stripe depois da latência de criação. Em 15/11/2026, novos checkouts fecham às **23:30 BRT** e os providers expiram no fim do dia.
- `/api/lote` e `/api/checkout` não chamam providers: fazem somente leitura forte completa e aquisição Dynamo. O cron autenticado obtém uma claim distribuída por minuto e reconcilia no máximo oito holds, com cursor determinístico e deadline global de 45 segundos.
- `/api/cron/financial-reconcile` relê no máximo dois slots pagos por minuto pela cadeia canônica completa (Stripe: Session → PaymentIntent → Charge → refunds/disputes; MP Orders: Order → payment/refunds/chargebacks; Checkout Pro legado: Payment → refunds/chargeback) e aplica exatamente o mesmo ledger/outbox dos webhooks. Falha ou prova com mais de 60 minutos marca `financeiroPendente`, deixa `/api/lote` não confiável e bloqueia novo checkout.
- Falha de um provider mantém somente aquele slot ocupado e sinaliza `reconciliacaoPendente`; a contagem ainda vem de uma leitura forte e completa dos 100 slots. Leitura Dynamo incompleta continua 503.
- Um relógio vencido não libera nada. Stripe só libera após a sessão retornar `status=expired` e não paga. Uma reserva MP Orders só é liberada depois de `provider_expires_at` + graça (default 180 min) e de um novo `GET /v1/orders/{ORD}` autenticado provar a mesma reserva em `canceled`, `expired` ou `failed`; estados pendentes e qualquer ambiguidade preservam o hold. Checkout Pro legado mantém sua reconciliação paginada separada.
- Pagamentos aprovados, reembolsados ou em chargeback continuam consumindo o slot até decisão operacional explícita; um reembolso não reabre estoque.
- Eventos financeiros carregam um cursor e snapshot atômicos em `SLOT`/`REQUEST`/`BUYER`: timestamp autenticado do provider domina, prioridade semântica resolve apenas empates de precisão e o event id dá desempate determinístico final. `refunded_cents`, `disputed_cents` e `charged_back_cents` preservam a composição financeira sem reabrir capacidade. Evento antigo retorna `stale`, não altera `payment_status` e não pode disparar notificações; replay do mesmo evento é idempotente. O estado físico permanece `paid` durante refund, disputa e chargeback.
- `/api/pedido` exige código de uso único enviado ao e-mail da compra antes de consultar providers. O desafio usa aleatoriedade criptográfica, HMAC no Dynamo, TTL de 10 minutos, limite distribuído por identidade/IP e cinco tentativas atômicas; resposta pública constante impede enumeração. Depois da prova, os HMACs independentes de CPF e e-mail precisam coincidir com REQUEST/SLOT/BUYER, e o ledger é a fonte autoritativa do status financeiro. O GET oficial de uma Order pode omitir `payer`/moeda; por isso esses dados nunca substituem o vínculo pseudonimizado e, quando presentes, ainda precisam coincidir. Ledger indisponível aparece como status a confirmar e marca `fontes.ledger=false`/`busca_parcial=true`.
- Se um pagamento MP chegar depois da liberação, `markReservationPaid` recupera o slot apenas enquanto ele ainda pertencer à reserva antiga. Se já houve reuso, lança `late_payment_slot_reassigned`: o webhook não conta nem cumpre a venda tardia e executa reembolso integral idempotente antes de notificar a operação.
- Rejeição HTTP 4xx conclusiva na criação do checkout (exceto 408/409/425/429) libera atomicamente somente uma reserva ainda `held` e sem `provider_ref/url`, validando SLOT/REQUEST/BUYER. Cutoff local antes do POST usa o mesmo caminho. Timeout, conflito, rate limit, 5xx ou objeto retornado sem attach permanecem held para reconciliação.
- Timeout, 429, erro, resposta truncada ou configuração ausente no provider mantém a reserva afetada ocupada; falha/leitura parcial do Dynamo retorna 503.

### Outbox, redrive e dead-letter

- Cada efeito ocupa `WEBHOOK#<provider>#<hash-do-evento>#<canal>`. O item guarda somente hashes, referência técnica do provider, estado e contexto financeiro não pessoal; payload, nome, e-mail, documento, telefone e endereço nunca são persistidos no outbox.
- `outbox_partition=WEBHOOK_DUE` e `next_attempt_at` alimentam o GSI `webhook-outbox-due`. Efeitos `done` saem do índice; não há `Scan` da tabela.
- Falha deixa o item `failed` com backoff exponencial. A claim condicional usa lease de 60 segundos e impede duas invocações do cron de entregarem simultaneamente o mesmo efeito. O Resend recebe a mesma Idempotency-Key determinística do hot path.
- O dispatcher só refaz canais de mensagem. Antes de reconstruir contato em memória, relê a referência na API autenticada da Stripe/MP e valida produto, contrato, reserva, slot, buyer hash, valor e moeda. Divergência do estado canônico, referência ausente ou canal financeiro/inventário sem contexto completo vira `dead_letter`; nunca é marcado como concluído.
- Falha transitória vira `dead_letter` depois de seis tentativas; contexto comprovadamente inseguro vai direto para dead-letter. O alerta por Resend é obrigatório, também idempotente e reprogramado até ser aceito; enquanto houver alerta pendente, o cron responde 503. O alerta contém apenas metadados técnicos pseudonimizados.
- Para redrive manual, primeiro reconciliar provider + ledger, corrigir a causa e então provocar a redelivery assinada original ou criar ferramenta administrativa específica. Não alterar itens Dynamo diretamente nem marcar `done` à mão.

### Linhagem e retenção de dados

- CPF, e-mail e IP são normalizados apenas em memória na Vercel Function e transformados em HMAC-SHA256 com domínios separados (`buyer`, `email` e `risk`). Isso é **pseudonimização, não anonimização**: DynamoDB recebe hashes e identificadores técnicos, e a chave HMAC nunca é gravada na tabela ou em logs.
- Não rotacionar `PREVENDA_RESERVATION_SECRET` enquanto houver reservas `held`: a rotação muda os hashes e exige migração controlada dos guardas `BUYER`/consulta de pedido.
- O cadastro inicial de compra coleta somente nome, e-mail e CPF/CNPJ. Stripe coleta telefone/endereço nos campos padrão do Checkout para o cartão. Mercado Pago Orders recebe nome, e-mail e documento somente em `payer`; endereço de entrega é confirmado depois do pagamento, fora da criação do Pix.
- Metadata nova dos providers fica limitada a `source`, `sku`, `contract_version`, `request_id`, `slot_id` e `buyer_hash`. A consulta de pedido lê metadata PII antiga apenas como compatibilidade legada; nenhum checkout novo a produz.
- O ledger grava ainda `email_hash`, `contract_version`, `terms_acknowledged_at`, `payment_status` e o cursor técnico do evento financeiro. Esses campos não contêm nome, e-mail, documento, telefone ou endereço em claro.
- `RATE` e claims do cron retêm 48 horas; `REQUEST`/`BUYER` liberados retêm 30 dias; `REQUEST`/`BUYER` pagos retêm 5 anos. `SLOT` não expira e preserva a capacidade/trilha técnica. O prazo de 5 anos precisa de validação Jurídica antes da ativação das vendas.

### Rollback seguro

Retirar `PREVENDA_INVENTORY_TABLE` fecha novas compras com 503, mas não apaga nem libera slots. Não deletar a tabela no rollback. Restaurar a versão anterior do frontend sem restaurar o checkout antigo, pois o fluxo antigo não respeita o contador transacional.

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
