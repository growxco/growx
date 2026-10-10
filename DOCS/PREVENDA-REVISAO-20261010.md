# Pré-venda: candidata para revisão comercial

Base: `b27ecba764ed5d8774b2dc50f48cccacdccb37f9` (PR #38). Nenhum deploy ou merge autorizado nesta entrega.

A página transforma a lista de interesse em uma conversa sobre GXP + Módulo: benefício e produto, capturas originais navegáveis, situações de luz/rega/clima/ventilação, composição e compatibilidade, dúvidas e contato. Um CTA principal acompanha o percurso. O WhatsApp existente atende compatibilidade; pedidos anteriores ficam no rodapé. CSS restrito à pré-venda; demais páginas, imagens de hardware e 30 assets LinkedIn preservados.

## Fontes conciliadas

- HTTP servido em 10/10/2026: pré-venda fechada, referência de varejo R$ 5.000, nenhuma cobrança/reserva. A extração web com R$ 3.000/5.500 estava desatualizada.
- `src/lib/prevendaRelease.js`: `approved: false`, manifesto v3 imutável; sem mudança em checkout, lote, métodos ou contrato.
- Catálogo editorial GXP + Módulo, versão local consultada: R$ 5.000 varejo/R$ 3.500 atacado; assinaturas separadas; kit e venda dependem da proposta e validação. Somente a referência de varejo já pública foi mantida na página, claramente sem oferta.
- Contrato Anne `docs/CONTRATO_APP.md`: referência 1.9 + aditivo §25, seis saídas AC e DHT22. Validações de bancada de firmware não comprovam integração física do GXP. O relatório integrado c10 registra comandos, claim e push ainda sem homologação real ponta a ponta.
- Capturas originais c10, build `9927abb3`, 09/10/2026, conta de QA: Jardim, Diário e Módulo. JPGs copiados sem recriar, cortar ou alterar a interface. A tela Módulo é informativa e não envia comandos. Cada imagem é identificada como captura de QA.
- Render oficial existente `/assets/module-render.webp`, mantido e identificado como conceitual. Nenhuma fotografia ou cena de hardware inventada.

## Cadastro e medição

Mantidos `LeadForm`, formulário `prevenda-lista`, `/api/contact`, consentimento restrito aos avisos da pré-venda/lançamento e link de privacidade. Nome/e-mail; WhatsApp opcional. Sem CPF, endereço ou dado financeiro.

A API confirma aceitação síncrona de um destino; não prova persistência ou entrega. A mensagem de sucesso descreve apenas essa aceitação. Falha mantém mensagem de erro e o canal WhatsApp explícito. O enriquecimento adicional do componente fica desativado; o comportamento existente da API não foi alterado.

Eventos usam exclusivamente o adaptador existente `track`, sujeito ao consentimento: `click_cta_prevenda`, `click_whatsapp`, `prevenda_demo_view`, `prevenda_faq_open`, `prevenda_app_explore`, `prevenda_interest_accepted`. Eventos herdados do formulário permanecem técnicos, sem atribuir venda. Nenhum evento de compra/checkout foi adicionado.

## Validação

- Lint completo sem erros.
- 41 testes frontend passaram; guarda de oferta fechada passou.
- Builds sequenciais no D: completaram site + agenda; o segundo incorporou o ajuste visual do hero mobile.
- Browser QA no build: 1440×1000 e 390×844, dark/light, sem overflow horizontal; abas originais e dúvidas; âncoras internas e WhatsApp existente; campos obrigatórios e consentimento; falha 503 e aceitação 200 interceptadas localmente; consentimento de analytics e eventos. Nenhum lead real ou teste de pagamento.
- Evidências desktop/mobile e JSON ficam no diretório de entrega local da tarefa. Elas documentam comportamento técnico, não conversões comerciais reais.

## Decisões antes da abertura

1. Preço e condição final: conciliar contrato antigo R$ 3.000/5.500 com varejo R$ 5.000 e atacado R$ 3.500; definir eventual pré-venda, parcelamento e acesso GXP. Não há bônus Premium prometido nesta candidata.
2. Kit e compatibilidade: fechar estudo 2/4/6, quantidades, sensores, cabos, acessórios, limites elétricos/dimensões, manual/instalação e escopo de suporte; homologar a integração física que será comercializada.
3. Entrega e condições: aprovar frete/custo total, prazo, garantia/cancelamento e novo manifesto comercial auditável. A candidata continua fechada até essa decisão.
