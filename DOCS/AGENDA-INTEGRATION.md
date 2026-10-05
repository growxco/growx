# Agenda dos Sócios

Entrada isolada em /socios/agenda, com calendário, tarefas, responsáveis, filtros, recorrência, checklist, capacidade, histórico e backup. A entrada não importa o shell de marketing, Analytics, Clarity ou chat público.

## Configuração segura

O backend permanece bloqueado até que o banco e as contas estejam configurados. Nunca incluir registros, backups ou credenciais neste repositório.

Variáveis exclusivamente de servidor:
- AGENDA_DATABASE_URL: conexão PostgreSQL com o usuário restrito growx_agenda_runtime, usando pooler apropriado para funções serverless. Não reutilizar postgres ou service_role.
- AGENDA_DATABASE_CA: substituição opcional do certificado público da autoridade do banco. Por padrão, o servidor inclui a Supabase Root2021 CA publicada no painel oficial (válida até26/04/2031; SHA-256807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa). A conexão exige validação do certificado e do hostname; nunca desligar a validação.
- AGENDA_ACCOUNTS_JSON: objeto com exatamente fernando, jefferson e julio. Cada entrada possui email exclusivo e hash PBKDF2-SHA256 com600.000 iterações, salt aleatório de16 bytes e derivação de32 bytes. As senhas em texto não são armazenadas pelo aplicativo.

A definição/entrada das credenciais é feita pelo proprietário em fluxo seguro. O formulário /socios/agenda?configurar=senha gera três senhas individuais com o gerador criptográfico do navegador e calcula os respectivos hashes. Os valores ficam somente na memória da página até ela ser fechada ou limpa. O proprietário copia cada senha para o seu gerenciador e copia uma configuração de hashes para o Vercel; a página não envia senhas nem aplica mudanças sozinha. O proprietário deve colar a configuração no campo protegido do Vercel. Não salvar senhas em snippets SQL ou enviá-las em mensagens.

A migração cria apenas o schema privado growx_agenda e um papel sem LOGIN. Todas as tabelas têm RLS forçada; anon/authenticated/service_role não recebem permissões. O runtime não pode apagar itens nem alterar o histórico existente. A ativação de LOGIN e a senha técnica são concluídas pelo proprietário. Antes de usar, verificar privilégios efetivos e eventuais permissões herdadas.

## Segurança e uso

Cada conta usa seu e-mail e uma senha própria, com acesso à mesma agenda compartilhada. O servidor determina a identidade pelo e-mail e senha, ignorando seletores de pessoa enviados pelo cliente. O histórico registra a conta autenticada, sem garantir a identidade física de quem usa a credencial. A sessão usa cookie Secure, HttpOnly e SameSite=Strict, vence em oito horas e pode ser encerrada. Trocar o hash ou e-mail de uma conta invalida as sessões dessa conta após a aplicação da configuração, preservando as sessões das demais.

As APIs exigem sessão, gravações exigem origem autorizada e JSON, e tentativas de senha têm limite persistente por IP. Dados, histórico e idempotência são gravados em transações; revisões protegem contra sobrescrita. Registros são arquivados de forma recuperável.

## Migração de registros

Usar exportação/importação autenticada e privada. A inicialização cria somente configurações vazias; não há agenda ou dados de cliente embutidos no código. A importação padrão adiciona rascunhos para revisão, sem substituir registros já existentes.

Até a implantação de leituras e exportações paginadas, cada gravação respeita um orçamento conservador de 3.500.000 bytes para a resposta completa, abaixo do limite de 4,5 MB do Vercel. O cálculo inclui todos os itens, inclusive arquivados, seu JSON/identificador em UTF-8, uma reserva de 2.048 bytes por item para metadados e 262.144 bytes para configurações, histórico e envelope. Não é um limite de tamanho do arquivo de backup: um arquivo permitido pode ultrapassar a capacidade restante. As gravações são serializadas no banco, e um lote que excederia o orçamento é revertido inteiro, incluindo histórico e idempotência. Lotes anteriores continuam salvos. Ler/exportar, arquivar/restaurar e edições que não aumentam o orçamento permanecem disponíveis; arquivar não libera espaço. Para liberar capacidade, reduza notas ou checklist existentes. Conteúdo que já ultrapassasse o orçamento antes desta proteção exige redução ou paginação antes de produção.

## Verificação antes de produção

1. Confirmar banco, usuário restrito, TLS e permissões efetivas.
2. Configurar segredos apenas no servidor e validar preview protegido.
3. Testar login/logout, erro de senha, expiração, acesso sem sessão, concorrência e persistência.
4. Conferir layout no celular, ausência de rastreadores, CSP e cache.
5. Confirmar que marketing, pré-venda e APIs financeiras continuam funcionando.
6. Somente então publicar a rota na produção.

Testes locais usam PGlite e dados sintéticos. Eles não substituem a verificação final no ambiente hospedado nem comprovam acesso com credenciais reais.
