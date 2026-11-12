# Modelo de dados — planos e permissões

O schema descreve coleções implementadas e próximas extensões. Usuários, perfis, dados privados, empresas/membros, chamados, candidaturas, denúncias, notificações, fila de distribuição, contato assistido, permissões, planos, funcionalidades, concessões e histórico estão conectados ao cliente e às regras locais. Catálogos de categorias/especialidades, transições detalhadas e relatórios agregados continuam no roadmap.

## Coleções propostas

### `plans/{planId}`

Define o catálogo de planos.

| Campo | Tipo sugerido | Descrição |
| --- | --- | --- |
| `name` | string | Nome editável apresentado no painel. |
| `scope` | `individual` ou `company` | Tipo de conta ao qual se aplica. |
| `enabled` | boolean | Indica se novas concessões podem usar o plano. |
| `isDefault` | boolean | Identifica o Básico de fallback para aquele escopo. |
| `sortOrder` | number | Ordem de exibição administrativa. |
| `createdAt`, `updatedAt` | Timestamp | Auditoria técnica da configuração. |
| `updatedBy` | string | UID do administrador que editou o catálogo. |

Usar IDs estáveis, por exemplo `basic_individual` e `basic_company`. Os nomes indicados são valores iniciais editáveis, não enumerações compiladas no código. O plano Básico de cada escopo precisa permanecer disponível como fallback. Não incluir preço, cobrança ou provedor de pagamento.

### `planFeatures/{planFeatureId}`

Um documento por funcionalidade configurada para um plano. Usar um ID determinístico como `{planId}_{featureKey}` para facilitar leitura e atualização.

| Campo | Tipo sugerido | Descrição |
| --- | --- | --- |
| `planId` | string | Plano dono desta configuração. |
| `featureKey` | string | Chave estável consumida pelos módulos, como `advancedIndicators`. |
| `enabled` | boolean | Se a funcionalidade pode ser usada. |
| `limit` | number ou `null` | Limite configurável; `null` significa sem limite para aquela funcionalidade. |
| `unit` | string | Unidade do limite, quando aplicável, como `cities` ou `teamMembers`. |
| `window` | string ou `null` | Janela de contagem definida pelo módulo, se houver limite temporal. |
| `updatedAt`, `updatedBy` | Timestamp/string | Auditoria da configuração. |

Exemplos de chaves que poderão ser definidas por módulos futuros: quantidade de cidades, divulgações, consultas, candidaturas, membros, ferramentas e indicadores. Os exemplos não fixam valores nem políticas comerciais. Uma funcionalidade desativada é diferente de uma funcionalidade habilitada com limite `0`.

### `accountSubscriptions/{scope}_{accountId}`

Uma concessão corrente por conta e escopo. Usar identificador estável que não conflite entre contas individuais e empresariais.

| Campo | Tipo sugerido | Descrição |
| --- | --- | --- |
| `scope` | `individual` ou `company` | Escopo da assinatura administrativa. |
| `accountId` | string | UID do usuário ou ID da empresa. |
| `planId` | string | Plano concedido. |
| `status` | `active`, `suspended` ou `expired` | Estado persistido da concessão. A autorização também confere as datas. |
| `grantType` | `manual`, `trial` ou `courtesy` | Origem operacional da concessão, sem cobrança automática. |
| `startsAt` | Timestamp | Primeiro instante em que a concessão libera recursos. |
| `expiresAt` | Timestamp | Limite exclusivo da concessão paga. Obrigatório para concessões pagas. |
| `version` | number | Versão para evitar que uma reconciliação atrasada substitua uma renovação. |
| `reason` | string | Motivo administrativo obrigatório em alteração manual. |
| `createdAt`, `updatedAt` | Timestamp | Auditoria técnica. |
| `createdBy`, `updatedBy` | string | UID do administrador responsável. |

A ausência de uma concessão vigente significa usar o plano Básico. A conta individual e cada empresa usam documentos independentes. A consulta deve buscar a conta pela titularidade do recurso, não pelo usuário que está visualizando a tela.

### `planChangeHistory/{eventId}`

Registro append-only. Um evento deve ser gravado na mesma transação da alteração administrativa da assinatura. Para expiração, usar chave idempotente baseada na assinatura e versão/vencimento, para que tentativas repetidas não dupliquem o histórico.

Campos sugeridos: `scope`, `accountId`, `eventType`, `previousPlanId`, `newPlanId`, `startsAt`, `expiresAt`, `occurredAt` (server timestamp), `actorUid` (UID administrativo ou identificador do processo de sistema), `reason`, `grantType`, `subscriptionVersion` e `idempotencyKey`.

Tipos de evento: `assigned`, `changed`, `renewed`, `extended`, `suspended`, `reactivated` e `expired`. Não alterar nem apagar eventos históricos por edição posterior do catálogo ou da concessão atual.

### `adminPermissions/{uid}`

Documento administrado por processo confiável, contendo `enabled`, papéis/escopos administrativos e dados mínimos de auditoria (`createdAt`, `updatedAt`, `updatedBy`). Usuários não podem criar, alterar ou remover a própria permissão administrativa. O primeiro administrador deve ser provisionado por um processo de implantação controlado, definido antes de habilitar o painel.

## Regras de gravação e consultas

- Mudança manual atualiza `accountSubscriptions` e cria `planChangeHistory` atomicamente.
- A gravação do histórico inclui sempre administrador/processo responsável, conta, plano anterior e novo, horário, motivo e datas.
- Uma operação de renovação confirma a versão atual; a reconciliação do vencimento confirma a mesma versão antes de atualizar o status.
- Não atualizar documentos de perfil ou apagar subcoleções quando o plano muda.
- O índice para a futura reconciliação por `status` + `expiresAt` será necessário quando essa rotina for implementada; consultas de histórico de vencimento também poderão exigir `accountId` + `occurredAt`. Os índices atuais de diretório, chamados e membros estão declarados em `firestore.indexes.json`, mas ainda não publicados no Firebase.
- Regras Firestore têm limites de chamadas `get()`/`exists()`; leituras de documentos consultados pelas regras contam como operações de leitura. Considerar esse impacto ao desenhar a leitura de plano e funcionalidades ([limites e condições](https://firebase.google.com/docs/firestore/security/rules-conditions)).

## Datas

Gravar timestamps UTC. Ao converter uma data escolhida no painel para `expiresAt`, interpretar a data no fuso `America/Sao_Paulo` e usar a meia-noite local do dia seguinte para representar o último dia inclusivo exibido. A autorização considera `startsAt <= request.time < expiresAt`.

## Dados preservados

O histórico de atividades e os conteúdos dos módulos não são parte de `accountSubscriptions` e nunca recebem TTL por vencimento de plano. TTL do Firestore é mecanismo de exclusão de documentos, tem atraso de processamento e não serve para downgrade; a documentação informa que TTL requer faturamento e remove documentos ([TTL do Firestore](https://firebase.google.com/docs/firestore/ttl)).

## Domínios funcionais da plataforma

Os nomes abaixo são propostas para futuras coleções. Separar campos privados em documentos próprios: regras Firestore concedem ou negam acesso a documentos e não filtram campos privados de um documento que foi lido. O diretório público deve consultar somente projeções aprovadas para publicação.

| Coleção/documento proposto | Conteúdo principal | Observações |
| --- | --- | --- |
| `users/{uid}` | Identidade e estado geral da conta | Estado: `active`, `suspended` ou `blocked`; não representa vencimento de plano. |
| `professionalProfiles/{uid}` | Perfil público, especialidades, cursos, qualificações, certificados, experiência, áreas e disponibilidade | Foto opcional; iniciais/avatar cobrem ausência de fotografia. Listas usam as chaves `serviceCities`, `specialties`, `courses`, `qualifications`, `certifications` nas regras. |
| `professionalPrivate/{uid}` | Telefone e consentimento privado de WhatsApp | Não expor em buscas públicas; leitura limitada ao titular e administradores. |
| `companyProfiles/{companyId}` | Perfil e resumo público empresarial | Separar contato/documentação restritos e definir visibilidade antes de publicar. |
| `companyPrivate/{companyId}` | Endereço comercial, contatos, razão social, CNPJ e consentimento de WhatsApp | Acesso limitado a membros ativos da empresa e administradores. |
| `companyMembers/{companyId}_{uid}` | Associação, papel e estado do membro | Um usuário pode participar de várias empresas. |
| `categories`, `specialties` | Catálogos administráveis | IDs estáveis para perfis, filtros e requisitos. |
| `locations/{ibgeCode}` | Estado/município normalizado | Usar código IBGE; pode ser catálogo local ou fonte/cache validado do IBGE. |
| `professionalServiceAreas`, `companyServiceAreas` | Cidades explicitamente atendidas | Proximidade não adiciona cidades automaticamente nem indica aceitação de deslocamento. |
| `serviceCalls/{callId}` | Oportunidade, categoria, requisitos/certificações, local, datas, remuneração, deslocamento, quantidade e estado | Empresa é titular; validar transições e prazo. |
| `callApplications/{applicationId}` | Candidatura de profissional ou empresa | Guardar tipo/ID do candidato, chamado, mensagem, data e estado. Eventos de histórico são append-only. |
| `distributionQueue/{itemId}` | Resultado de compatibilidade e estado de contato | Guardar chamado, candidato, motivos, versão do critério e eventos; não expor dados privados. |
| `notifications/{uid}/items/{notificationId}` | Notificação interna por usuário | Leitura/atualização limitadas ao dono; incluir estado lida/não lida e origem. |
| `pushDevices/{deviceId}` | Token, plataforma e consentimento | Restrito ao dono e backend de envio; permitir revogação por dispositivo. |
| `outreachEvents/{eventId}` | Preparação e início de contato assistido | Ator, destinatário, chamado, horário e evento `prepared`/`contactInitiated`; sem estado entregue/lido. |
| `reports/{reportId}` | Denúncias e moderação | Acesso limitado ao denunciante e equipe autorizada. |
| `adminAuditLogs/{eventId}` | Auditoria administrativa geral | Append-only para clientes; registrar ator, alvo, ação, horário do servidor e justificativa. |

Chamados usam os estados `draft`, `published`, `acceptingApplications`, `underReview`, `negotiating`, `filled`, `completed`, `cancelled` e `expired`. Candidaturas usam `submitted`, `viewed`, `underReview`, `selected`, `negotiating`, `approved`, `rejected` e `cancelled`. Persistir valores estáveis e localizar os rótulos na interface. Definir uma matriz de transições e atores antes da implementação; somente a empresa titular ou administrador autorizado altera chamados, e candidatura valida tipo de fornecedor, requisitos e prazo.

As coleções de planos descritas acima seguem a mesma separação: o plano controla novas ações e permissões, enquanto perfis, empresas, chamados e candidaturas permanecem dados permanentes. Os índices compostos declarados hoje atendem aos diretórios, à fila de oportunidades e à busca de associações; precisam ser publicados no projeto existente. Novos índices devem acompanhar consultas reais e análise de cotas.


