# Pré-venda indoor — revisão comercial completa

Não publicada. Branch local codex/prevenda-indoor-direction no checkout isolado D:\GrowX-Prevenda-20261010; continua sobre produção 886ab646. O hero aprovado foi preservado; primeira candidata de direção febe991f. Nenhum push, PR, merge, deploy ou alteração de GXP c10/Claude.

## Mudanças desta revisão

- Título “O que você quer automatizar no seu indoor?”, rótulo “Funções projetadas”, quatro abas: Luz, Rega, Clima, Ventilação.
- Lineart retirado. Recortes CSS do ambiente IA fornecido pelo root apresentam LED, plantas, tubulação e ventilador. Cada detalhe identificado como ilustração, sem declarar instalação real ou equipamentos incluídos.
- Faixas “O cultivo é seu” e “Seu equipamento → Módulo projetado” retiradas.
- Módulo conceitual e captura original da área Módulo GXP em escala legível. Captura preserva “Esta tela não envia comandos”; botão abre original inteira. Não se usa Diário como painel de controle.
- Mobile: título e aviso curto, abas, detalhe, função/condição, Módulo, GXP, CTA. Pagamento/reserva continuam fechados.
- Restante: registros e história do cultivo; equipamentos existentes/compatibilidade; composição do conjunto; cadastro de interesse ou WhatsApp; FAQ. Direção clara/verde, sem fundo bege. Metadados e fallback estático alinhados à automação indoor, mantendo o fechamento comercial.

## Rastreabilidade das funções

Fonte técnica consultada em leitura: C:\Users\fer_e\Documents\Codex\2026-10-08\gxp-integration\sources\gabrieleAnne_growx-app\docs\CONTRATO_APP.md, contrato firmware/aplicativo 1.9 + aditivo §25. Relatos de bancada nesse documento não foram transformados em prova de integração GXP ou validação física realizada nesta tarefa.

| Função | Fonte e limite preservado na página |
| --- | --- |
| Luz na hora certa | §§2.2, 4, 24.4: programação de liga/desliga, relógio NTP válido; DIM/PWM opcional, driver/instalação compatíveis e validação específica. Sem horários ou parâmetros de cultivo sugeridos. |
| Rega | §7d: bomba + manifold, sensores de solo válidos/recentes, boia validada e duração limitada. Sem promessa de volume exato. |
| Clima | §7c: DHT22, somente temperatura e umidade relativa do ar; dados válidos/recentes; sensores não tratados como inclusão confirmada. Sem telemetria fictícia. |
| Ventilação | §§7e, 24.3: circulação por intervalo ou luz, exaustor por clima/luz/agenda; configuração e compatibilidade por equipamento. |

Não confirmado no contrato atual: medição de vazão, válvulas individuais ou controle garantido de volume. O documento antigo D:\Downloads\Documentação do Módulo de Irrigação para Sistema Grow-X.md descreve um subsistema de solenoides e expansão futura de sensores de fluxo/pressão, com arquitetura distinta. Não foi usado para ampliar o conjunto comercial atual. A página explicita que o volume depende da vazão da instalação e que medição de vazão/válvulas individuais não estão confirmadas. Nenhum novo equipamento foi declarado incluído.

## Capturas e procedência

Imagem IA de ambiente: Library libfile_a728d8f68b188191be53ea4bdd911bc5, versão 0. Hero preservado; detalhes são enquadramentos CSS, não novos assets de hardware gerados. Original PNG 2.644.761 bytes preservado. Derivada WebP qualidade 86 servida, 284.926 bytes (89,2% menor), sem mudança de cena, dimensões ou enquadramento; inspecionada visualmente.

Área Módulo original: 390-05-modulo.jpg, c10 9927abb3, 09/10/2026, conta de QA. LEIAME explicita área informativa sem comandos, sem dispositivo cadastrado. Cópia integral public/assets/prevenda-gxp/modulo-original.jpg; SHA256 fonte e destino iguais: FF6E08C12CEB836633963F501B7C40A488247EF07A1A3B12B577E35DCBBF98FE. Jardim, Diário e ficha originais mantidos.

| Library | Versão | Arquivo |
| --- | --- | --- |
| libfile_5cd0c00fc2b481919441090627d3c3ee | 1 | indoor-commercial-desktop-automation.png |
| libfile_f1b12437a0a481918156f4901e73c1f3 | 1 | indoor-commercial-mobile-automation.png |
| libfile_6c2128c321948191a7050cbe692f33b5 | 0 | indoor-commercial-desktop-full.png |
| libfile_9383f9f9ead08191a1e68c14d6ef145b | 0 | indoor-commercial-mobile-full.png |

As capturas antigas da produção permanecem como histórico. As duas capturas da seção de automação foram atualizadas nos IDs existentes, sem duplicação. Os dois arquivos completos são novos. Capturas de seção/fullpage ocultam apenas os elementos fixos para evitar artefatos; capturas viewport mantêm a UI real. Library confirmou persistência; user.library-file-version não é suportado como xattr neste Windows.

## Verificação

Lint, 41 testes frontend, gate comercial e build sequencial site+agenda passaram. QA do build em 1440/390/320/768: zero pageerrors/erros de assets/overflow; título literal; quatro funções, modal original da área Módulo e três telas de registros, Escape, dois caminhos de contato, CTA #lista, FAQ e validação dos três campos obrigatórios.

503 e 200 de /api/contact interceptados localmente: qualificação no campo message e consentimento presale_and_launch_updates_only conferidos. Zero escrita externa; nenhum lead, pagamento ou mensagem real. Aceite do canal não foi tratado como entrega/persistência ou venda.

Barra, teclado, formulário e rodapé passaram em 320/390/1440 com área segura simulada de 34px. Não é iPhone/Safari físico. Notas e labels medidos pelo script existente: mínimo 5,67:1. Evidências locais indoor-commercial-evidence.json, indoor-commercial-sticky-evidence.json e indoor-commercial-contrast.json. Capturas completas desktop/mobile e detalhes de rega/ventilação foram inspecionados visualmente.

Backend, release approved:false, consentimento, destinos, tracker já instalado, outras páginas e os 30 assets LinkedIn preservados. Sem nova condição comercial. Rollback registrado anteriormente permanece disponível, sem execução.

Revisão visual da página completa aprovada pelo root e pela revisão independente. Imagem otimizada; publicação autorizada pelo fluxo normal de PR/CI/deploy. Para abrir cobrança, continuam necessárias oferta final, composição/condições e validação/entrega aprovadas.

## Liberação após revisão final

Root e revisão independente aprovaram a página completa de automação indoor e autorizaram a publicação pelo fluxo normal. Nenhum bloqueio visual/editorial restante. QA adicional das quatro funções por Tab/Enter em 320/390/1440 passou: foco visível, contraste mínimo de texto 10,74:1 e de indicador de foco 4,05:1. As três intenções (conhecer o conjunto, setup existente, montando setup) foram conferidas no payload message com consentimento presale_and_launch_updates_only, três respostas mockadas e zero escrita externa. Evidência indoor-final-review-evidence.json. Sem lead/pagamento reais.
