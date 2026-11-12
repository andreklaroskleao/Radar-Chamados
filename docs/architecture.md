# Arquitetura — gestão manual de planos e acessos

**Estado:** especificação funcional mantida junto da implementação inicial da plataforma. O scaffold anterior era somente a base Next.js e os documentos; não havia aplicativo legado a preservar.

## Estado atual do repositório

- Next.js App Router, React e TypeScript são a stack da plataforma.
- Firebase JavaScript SDK cliente está integrado para cadastro, login, recuperação de senha e acesso ao Firestore.
- Perfis profissionais, empresas/membros, diretórios moderados, oportunidades e candidaturas têm fluxos iniciais funcionais.
- O painel administrativo modera perfis, empresas e chamados; controla suspensão de contas/empresas; mantém catálogo e limites de planos; registra concessões; administra fila de distribuição, denúncias, notificações e contato assistido.
- As regras locais agora autorizam caminhos definidos e negam o restante. A implantação das regras, provedor de Authentication e existência/localização da base precisam ser confirmadas no projeto Firebase existente.
- .env.local mantém a configuração pública do Firebase web app informado. Nenhuma chave privada, credencial Admin ou segredo de servidor deve ser incluída no cliente.
- Nenhum projeto Firebase foi criado, e billing, Storage, App Check, SMS, Cloud Functions ou pagamentos não foram habilitados.

## Objetivo e limites

O plano é um conjunto de permissões temporárias para uma conta. A cobrança, se houver, acontece fora da plataforma. Não fazem parte deste módulo gateways, pagamentos, assinaturas automáticas, APIs de cobrança, preços, faturamento ou migrações de infraestrutura.

Os planos Básico, Profissional Pro, Empresarial e Personalizado/Enterprise são configurações de dados, não ramificações fixas de código. Os nomes e limites iniciais devem poder ser editados no futuro. Nenhum limite comercial é definido aqui. O plano Básico é a configuração de fallback e não possui vencimento.

## Componentes propostos

| Componente | Responsabilidade |
| --- | --- |
| `plans` | Cadastro, tipo de conta compatível, nome e estado de cada plano. |
| `planFeatures` | Capacidades e limites configuráveis de cada plano. |
| `accountSubscriptions` | Concessão manual vigente para uma conta individual ou empresa. |
| `planChangeHistory` | Eventos imutáveis de concessão, alteração, renovação, prorrogação, suspensão, reativação e expiração. |
| `adminPermissions` | Autorizações administrativas independentes do plano comercial. |
| Serviço de autorização | Calcula os direitos efetivos e aplica as mesmas regras na interface, no backend e nas regras Firestore. |
| Painel administrativo | Pesquisa de contas, atribuição manual de planos, datas, motivo, renovação, suspensão e consulta ao histórico. |
| Rotina de reconciliação | Registra eventos de vencimento e marca concessões vencidas, sem apagar dados de negócio. |

A estrutura detalhada dos documentos está em [database.md](database.md). A autorização está em [security.md](security.md).

## Titularidade e plano efetivo

Cada concessão pertence a uma conta identificada pelo seu escopo e titular:

- **Individual:** o usuário profissional.
- **Empresa:** a empresa, independente do plano individual de seus membros.

Um usuário pode, portanto, ter um plano individual e participar de empresas com planos próprios. A permissão para usar um recurso segue a titularidade desse recurso: os dados pessoais consultam o plano individual; os dados empresariais consultam o plano da empresa e também a associação/permissão do membro.

O plano efetivo é calculado por conta:

1. Sem concessão paga vigente, a conta usa o plano Básico.
2. Uma concessão futura ainda não libera recursos pagos.
3. Uma concessão suspensa ou vencida não libera recursos pagos; o usuário permanece ativo e passa a usar os recursos do Básico.
4. A concessão e o histórico permanecem registrados. Renovar ou reativar a conta recupera os recursos permitidos sem reconstruir nem remover conteúdo.

## Datas e vencimento

A interface administrativa aceita 30, 90, 180 ou 365 dias e uma data personalizada. O início é inclusivo e o instante de término é exclusivo: o direito está ativo enquanto `startsAt <= agora < expiresAt`. Se o administrador informa um último dia de validade, `expiresAt` representa a meia-noite do dia seguinte em `America/Sao_Paulo`.

Persistir datas como Firestore `Timestamp` em UTC e converter datas de calendário usando o fuso IANA `America/Sao_Paulo`. Não usar o horário do navegador como autoridade. O prazo é verificado também pelas regras de segurança com o horário da requisição (`request.time`), conforme a [documentação de condições das regras Firestore](https://firebase.google.com/docs/firestore/security/rules-conditions).

### Expiração sem serviço Firebase pago

Há duas partes diferentes na expiração:

1. **Aplicação imediata do plano efetivo:** as regras locais calculam o plano pela conta titular, status, início, vencimento e estado do plano. No primeiro pedido feito a partir de `expiresAt`, a autorização usa o Básico mesmo que a conta estivesse desconectada. Os limites configurados para listas de cidades atendidas, especialidades, cursos, qualificações e certificações já são aplicados nas gravações do perfil profissional; cidades atendidas também são limitadas no perfil empresarial. Outros limites precisam ser conectados ao módulo correspondente antes de serem considerados protegidos.
2. **Registro persistente do evento de expiração:** uma execução em segundo plano é necessária para gravar o evento `expired` no histórico mesmo se nenhuma pessoa voltar à plataforma. Cloud Functions agendadas usam Cloud Scheduler e dependem do plano Blaze; essa opção não será ativada neste escopo. A documentação do Firebase descreve esse requisito em [funções agendadas](https://firebase.google.com/docs/functions/schedule-functions) e [planos de preço](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans).

Como alternativa sem faturamento Firebase, avaliar um workflow agendado do GitHub Actions para consultar concessões vencidas e registrar o evento de forma idempotente. Ele usaria uma credencial de serviço guardada como segredo do repositório, nunca no cliente ou no código. Essa alternativa é de melhor esforço: o GitHub informa que execuções agendadas podem atrasar ou ser descartadas em períodos de carga; em repositórios públicos podem ser desativadas após 60 dias sem atividade e executam apenas no branch padrão ([eventos `schedule`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows), [indisponibilidade de schedules](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows)). Logo, a autorização expira no horário exato, mas a linha de histórico e a mudança do status persistido podem ser registradas depois. Nenhum workflow é criado nesta atualização.

O workflow futuro deve reler a assinatura na transação e confirmar que `status`, `expiresAt` e versão continuam iguais antes de marcá-la como vencida. O ID do evento deve ser determinístico para evitar duplicação. Uma renovação concorrente ou posterior ao vencimento não pode ser sobrescrita por uma execução atrasada.

## Preservação de dados e limites

Mudanças de plano nunca removem perfis, cidades, especialidades, cursos, qualificações, certificados, empresas, membros, chamados, candidaturas ou histórico de atividade. Após o vencimento, os limites configurados no plano Básico são aplicados nas próximas gravações das listas atualmente conectadas: valores acima do limite podem permanecer intactos ou ser reduzidos, mas não aumentados/substituídos mantendo o excesso. Ao voltar a um plano compatível, os dados preservados tornam a ficar utilizáveis. Limites de volume para membros, chamados, candidaturas e consultas ainda precisam de contadores protegidos e integração nas regras antes de serem oferecidos como controles efetivos.

A interface pode ocultar ações indisponíveis para orientar o usuário, mas não é a barreira de segurança. Regras Firestore e operações confiáveis no backend devem validar acesso e limites. Ver [security.md](security.md).

## Stack consolidada

A plataforma usa Next.js App Router, React, TypeScript e Firebase JavaScript SDK cliente, conforme a estrutura técnica existente e a decisão do proprietário. O projeto Firebase web app existente é reutilizado. Não usamos Firebase Admin SDK no cliente. A hospedagem de produção ainda depende de escolha/configuração operacional; a decisão de stack de aplicação não está pendente.

Não habilitar billing nem serviços pagos como condição para desenvolver a base. Serviços cuja disponibilidade ou cota exigir plano pago devem permanecer desativados ou ser substituídos por fluxo gratuito de melhor esforço, com limites e riscos documentados.
## Impactos em módulos futuros

- Perfis e cidades atendidas precisam consultar o plano individual no momento de uma nova gravação.
- Chamados e candidaturas precisam verificar a conta titular e o limite correspondente antes da operação.
- Administração de empresas e membros precisa conferir a permissão do usuário na empresa, além do plano empresarial.
- Pesquisas, indicadores, divulgação e ferramentas avançadas precisam declarar uma chave de funcionalidade e uma estratégia de limite antes de serem liberados.
- Consultas administrativas de contas e vencimentos devem ser paginadas; índices compostos para as consultas implementadas já estão declarados localmente e ainda precisam ser publicados.

## Escopo funcional da plataforma

A plataforma atende relações B2P (empresa e profissional) e B2B (empresas contratantes, prestadoras, integradoras e parceiras). O início operacional é regional no Rio Grande do Sul — com foco em Bagé, Pelotas, Santana do Livramento e municípios próximos — e os identificadores e consultas devem permitir expansão nacional. O nome comercial permanece provisório.

| Domínio | Escopo previsto |
| --- | --- |
| Diretório | Pesquisa pública/privada de profissionais e empresas por localização, especialidade, categoria, serviço, disponibilidade e tipo de fornecedor, conforme preferências de visibilidade. |
| Perfis | Cadastro profissional sem fotografia obrigatória; especialidades, experiência, qualificações, certificados, disponibilidade, viagens, ferramentas e cidades atendidas. |
| Empresas e membros | Perfil da empresa, contatos e localidades; um usuário pode atuar em várias empresas com papéis distintos. |
| Chamados | Publicação e moderação de oportunidades com localidade, prazos, requisitos, quantidade e tipo de fornecedor: profissional, empresa ou ambos. |
| Candidaturas | Interesse de profissionais e empresas em chamados compatíveis, com status e histórico de transições. |
| Distribuição | Fila administrativa de candidatos compatíveis, com prioridade local, motivos explicáveis, situação do contato e histórico. A primeira versão não exige mapa avançado. |
| Administração | Contas, aprovação/suspensão/bloqueio, cadastros, catálogo geográfico e de especialidades, chamados, candidaturas, planos, notificações, denúncias, estatísticas e auditoria. |
| Notificações | Notificações internas em Firestore como base funcional; push com Firebase Cloud Messaging é opcional e depende de backend seguro. |
| Contato assistido | Mensagem personalizada por link oficial `wa.me`; o administrador inicia cada contato manualmente. Não há disparo automático, robôs ou alegação de entrega/leitura. |

O estado da conta (ativa, suspensa ou bloqueada), a associação de um membro a uma empresa e a concessão de plano são controles distintos. O vencimento de plano não desativa a conta. Uma suspensão administrativa da conta não apaga seus dados nem é equivalente ao rebaixamento comercial para o Básico.

## Localização e distribuição

Usar códigos IBGE como referência normalizada de estado e município, para evitar duplicação de nomes e suportar expansão nacional. Uma cidade próxima não é prova de disponibilidade: a distribuição só pode considerar atendimento quando a cidade foi informada explicitamente ou quando o profissional/empresa aceitou deslocamento. A classificação do resultado deve conservar os motivos e, se a lógica mudar, a versão do critério usado. O mapa disponível no scaffold atual é uma visualização geográfica baseada em dados públicos do IBGE; não mede cobertura de pesquisa ou compatibilidade de candidatos.

## Notificações e WhatsApp

Notificações internas registram eventos e ficam disponíveis mesmo sem push. A central acompanha as mudanças do Firestore em tempo real. Preferências granulares e push ainda não estão implementados. Tokens de dispositivo e credenciais de envio devem ser privados. O envio push deve acontecer por backend confiável; avaliar uma alternativa gratuita somente após validar integração, limites de execução e proteção dos segredos. A ferramenta WhatsApp apenas abre um link `wa.me` preparado após consentimento explícito e escolha do destinatário pelo administrador; registrar preparação e início do contato sem inferir entrega ou leitura.

## Fluxos e experiência

As telas futuras devem ser responsivas em dispositivos móveis e desktop. O cadastro e a candidatura funcionam sem fotografia; usar iniciais ou avatar padrão. O diretório consulta apenas campos publicados conforme preferências. Chamados aceitam candidatura individual, empresarial ou ambas, e bloqueiam candidaturas que não correspondam ao tipo aceito, ao prazo ou aos requisitos aplicáveis.

Estados da conta (ativa, suspensa ou bloqueada), estados de chamado/candidatura e estado da concessão de plano pertencem a domínios diferentes. A aplicação deve permitir controle administrativo sem confundir a suspensão da conta com o vencimento comercial do plano.



