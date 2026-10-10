# Pré-venda — reconstrução para revisão interna

Base de produção: `1e5e13866bac98e21ecd50a2588b359b03a916de`. Checkout isolado `D:\GrowX-Prevenda-20261010`, branch `codex/prevenda-editorial-rebuild`. Esta candidata não foi publicada. A autorização de publicação permanece, mas a revisão crítica interna foi solicitada antes do merge.

## Diagnóstico e direção

A versão anterior abriu com um render sem escala comprovada, título abstrato, demonstração tardia e ressalvas repetidas. A cena ilustrativa tinha mais espaço que a interface; quatro capacidades viraram colunas de texto. O cadastro não diferenciava aviso de abertura de conversa sobre equipamentos.

Reconstrução de composição, hierarquia e interação, em quatro momentos:

1. Módulo e GXP juntos: cultivo indoor, função do app, função da central projetada, etapa e CTA de interesse.
2. Exploração de capturas reais: ver o cultivo, registrar o dia e consultar o percurso. Recortes editoriais identificados; botão abre a captura original inteira, com Escape/foco.
3. Central em detalhe: painel conceitual com seis saídas AC, seleção de luz/rega/clima/ventilação e um bloco próximo de homologação. Compatibilidade parte dos equipamentos existentes, sem criar diagramas elétricos ou dimensões.
4. Interesse com intenção: aviso da abertura por cadastro existente; avaliação do setup em conversa no WhatsApp oficial.

## Inventário de ativos e limites de prova

| Material | Classificação confirmada | Uso nesta candidata |
| --- | --- | --- |
| `src/assets/modulo-contexto.webp` | Render conceitual, assim identificado em `PreVendaPage.jsx` | Composição de abertura, identificado como render |
| `src/assets/modulo-tomadas.webp` | Render conceitual do painel, seis saídas | Seção do hardware, sem inferir conector final ou escala |
| `src/assets/modulo-hero.webp`, `modulo-aberto.webp` | Renders conceituais, apesar das variáveis `foto*` | Preservados sem alteração; não usados na candidata |
| `src/assets/modulo-produto.webp` | Montagem sem comprovação independente de fotografia física | Não usado nem chamado de foto real |
| `public/assets/module-render.webp` | Render conceitual já publicado | Preservado; não domina a nova abertura |
| `public/assets/gxp-context.webp`, `gxp-garden.webp` | Cenas ilustrativas previamente publicadas; não são clientes documentados | Preservadas; excluídas da candidata |
| `diario.jpg` | Captura original c10 `9927abb3`, 09/10/2026, conta QA | Hero e exploração, sem interface recriada |
| `jardim-foco.jpg` | Cópia sem alteração de `390-00-jardim-antes-de-abrir-o-cultivo.jpg`, c10 ficha-cultivo | Exploração |
| `cultivo-historia.jpg` | Cópia sem alteração de `390-03-ficha-cultivo-gerenciar-e-historia.jpg`, c10 ficha-cultivo | Exploração |

Capturas fonte: `C:\Users\fer_e\Documents\Codex\2026-10-08\gxp-integration\captures\2026-10-09-c10-9927abb3\` e `2026-10-09-c10-9927abb3-ficha-cultivo\`. LEIAME documenta dados sintéticos de QA, origem e ausência de alterações durante as capturas. Imagens originais ficam inteiras no repositório; os recortes são apenas enquadramento CSS e podem ser ampliados.

Não foi localizada foto comprovada de unidade física ou de cliente real nas pastas fornecidas de Produtos, catálogos e ativos do site. Não há escala física documentada para apresentar. A candidata não transforma imagem artificial em cliente ou instalação real. Este limite de material impede cumprir literalmente a demonstração de cliente + hardware físicos, sem novos originais comprovados.

Não foi usada a campanha de cinco cenas rejeitada, nem gerada arte de hardware/interface. As 30 imagens LinkedIn e outras páginas permanecem intactas.

## Cadastro, template e destino

Preservados `LeadForm`, `submitLead`, `/api/contact`, consentimento versionado `prevenda-lista-2026-08-08` e tracker existente. Nenhuma mudança de backend, credencial, ambiente ou destino.

Aviso de abertura: nome, e-mail e consentimento obrigatórios; WhatsApp opcional; seleção de ponto de partida opcional com valor inicial explícito. O valor descritivo entra no campo `message`, e não em campo novo que a API descartaria. Formulário `prevenda-lista`, segmento `cultivo`, origem `prevenda`, página `/prevenda`.

O template `leadInboxText` em `api/contact.js` inclui formulário, nome, e-mail, WhatsApp, mensagem, origem, correlação e consentimento. Portanto, a intenção escolhida chega no texto encaminhado ao inbox. O endpoint normaliza mensagem em até 2.000 caracteres; demais destinos configurados recebem o payload normalizado. O frontend pode recorrer aos fallbacks existentes, sem alteração nesta entrega.

Avaliação de setup: link oficial `https://wa.me/5541995494343` com mensagem introdutória do Módulo + GXP, sem envio automático. A página orienta informar equipamentos, marca/modelo, tensão e potência durante a conversa, sem coletar esses dados no cadastro de aviso.

Lacunas verificadas: template não define responsável, SLA de atendimento ou confirmação de entrega/persistência. HTTP de sucesso comprova somente aceitação síncrona de um canal; não é venda nem reserva. Nenhum lead real foi enviado. Não prometer resposta em prazo inexistente.

## Condições comerciais e fontes

Catálogo editorial A4 GXP + Módulo consultado: referência R$ 5.000 varejo / R$ 3.500 atacado; assinaturas separadas; composição e venda sujeitas à validação. A candidata conserva somente R$ 5.000 já público, junto das condições, sem nova oferta ou parcelamento.

Manifesto `src/lib/prevendaRelease.js` permanece `approved:false`. Seis saídas AC conforme base contratual; DHT22 descrito apenas como referência documentada, não item incluído confirmado. Integração, firmware, comandos, push e vinculação não apresentados como homologados.

Decisões para abrir vendas: preço/parcelamento e condições finais; composição de kit/acessórios/acesso GXP; prazo e conclusão da homologação. Não há checkout, estoque, urgência, garantia, depoimento ou resultado inventado.

## Evidência para revisão

Capturas locais `rebuild-desktop-hero.png`, `rebuild-mobile-hero.png`, `rebuild-desktop-gxp.png`, `rebuild-mobile-gxp.png`, `rebuild-desktop-modulo.png`, `rebuild-mobile-modulo.png`, `rebuild-desktop-full.png`, `rebuild-mobile-full.png`. Fullpage oculta a barra fixa apenas no screenshot para evitar artefato de composição; capturas de viewport mantêm a barra real.

Library — capturas da candidata local, não da produção:

- Desktop hero: `libfile_fa00c699a6e48191b6c530bfce3488d3`, `file_0000000029bc81f59c30bbea83f59b0a`.
- Mobile hero: `libfile_c7275f2e8b7c8191af87d39433a79865`, `file_000000008ba481f5ba7a14d6d5b7b1a7`.
- Desktop central: `libfile_5ad0851e05808191a47ade77d27e5067`, `file_00000000d9e081f59bc2c6de968e0fb3`.
- Mobile completo: `libfile_eada3aa26f6481918e32ecece64e2629`, `file_0000000029cc81f5912c68c333c2fce3`.

O objetivo da revisão é qualidade de comunicação e composição: público, necessidade, produto, etapa e próximo passo reconhecíveis. Não confundir aprovação técnica com aceite de design.

## Rollback preservado

Produção atual anterior à reconstrução: commit `1e5e13866bac98e21ecd50a2588b359b03a916de`, deployment `https://growx-chvrv1slp-grow-xs-projects.vercel.app`, `dpl_Dx2zcek8TKP7wWoi1mADSv5ygBbn`.

Produção PR39: `https://growx-hx9dpdd2v-grow-xs-projects.vercel.app`, commit `eee5dd93`. Antes da reconstrução inteira PR38: `https://growx-1e37jam1j-grow-xs-projects.vercel.app`, commit `b27ecba7`.

Nenhum rollback executado. Após revisão interna, publicação seguirá PR e Git deployment oficiais. Se necessário: `vercel rollback <deployment> --scope grow-xs-projects`, verificando primeiro novas alterações concorrentes. Nenhuma modificação de proteção ou cobrança.

## Validação concluída da candidata

Lint sem erros; 41 testes frontend; guarda de oferta fechada; build site + agenda sequencial no D:. Browser QA executado no build em http://127.0.0.1:5568, em 320x812, 390x844, 768x1024 e 1440x1000: zero pageerrors e zero erros de assets, sem overflow horizontal. Diálogos originais, Escape/foco, capacidades, âncoras e dois modos de contato verificados. Nome/e-mail/consentimento e e-mail inválido exercitados; 503 e 200 do cadastro interceptados localmente; mensagem qualificadora confirmada no payload. Nenhuma escrita externa, lead real ou pagamento.

Contraste das notas/legendas e rótulos medidos no celular: mínimo 5,08:1, todos acima de 4,5:1; notas comerciais e de homologação em 12px. Hero e seções inspecionados visualmente. Capturas de revisão atualizadas nos mesmos quatro Library IDs, agora versão 1.

Hashes SHA256 das duas novas imagens são idênticos às capturas fonte: jardim-foco 6a88a1fd69b3703e7e24fcafe480ed9659c2563c5ca33cbc4b3e55dd63e21245; cultivo-historia 62904bff019977fa8a4869b61004ea6921be8648485346e51538dd666803fcc3.

Evidências: rebuild-qa-evidence.json, rebuild-mobile-contrast.json e rebuild-*-*.png no diretório local da tarefa. Não existe prova de conversão comercial nem entrega de aviso.
