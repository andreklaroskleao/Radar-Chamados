# Segurança — autorização de planos

O Firebase JavaScript SDK e as regras locais agora cobrem os fluxos iniciais de identidade, perfis, empresas, membros, chamados, candidaturas e administração. Os caminhos não definidos continuam negados por padrão. O status de publicação destas regras no Console não foi confirmado; revisar e publicar pelo processo autorizado antes de usar dados reais.

## Princípios

- A interface apenas comunica as permissões; a autorização real é aplicada no Firestore e em qualquer backend que execute operações privilegiadas.
- O plano efetivo é sempre calculado para o titular do recurso e considera início, vencimento e suspensão.
- As regras já consultam o plano efetivo pelo horário confiável do Firestore e aplicam limites configurados a cidades, especialidades, cursos, qualificações e certificações no perfil profissional, e a cidades atendidas no perfil empresarial. Recursos com contagem de uso ainda precisam de contadores protegidos e integração própria antes de serem anunciados como limitados por plano.
- A troca de plano nunca reduz a retenção, apaga ou reescreve os dados de negócio.
- Planos, permissões administrativas e dados permanentes têm coleções e regras separadas.

## Firestore Security Rules

Definir regras explícitas para cada caminho. Para recursos individuais, exigir autenticação e UID titular; para recursos de empresa, exigir associação ativa e permissão do membro. Para operações administrativas, conferir `adminPermissions/{uid}` provisionado por processo confiável. Impedir que usuários comuns leiam ou gravem concessões e histórico de terceiros, editem o próprio plano ou vencimento, mudem `adminPermissions` ou obtenham recursos exclusivos manipulando o cliente.

As regras devem impedir alterações de campos administrativos em documentos de perfil/empresa e evitar que uma gravação direta no Firestore ignore o limite. Uma validação visual de botão não é controle de segurança.

Usar o `request.time` do Firestore para validar `startsAt <= request.time < expiresAt`; para status diferente de ativo ou concessão vencida, só as permissões do plano Básico podem ser consideradas. As regras podem consultar documentos auxiliares, mas cada `get()`/`exists()` tem limites por requisição e pode gerar leituras faturáveis. Também não são filtros: as consultas devem garantir que todos os documentos retornados satisfaçam as regras. Ver [condições e limites de regras Firestore](https://firebase.google.com/docs/firestore/security/rules-conditions).

## Limites e operações confiáveis

A configuração de um limite só vale quando a chave correspondente está conectada às regras no ponto de gravação/uso. Hoje, `serviceCities`, `specialties`, `courses`, `qualifications` e `certifications` controlam listas do perfil individual; `serviceCities` controla a lista da empresa. Chaves sem integração não restringem operações. Contagens de uso devem usar uma operação transacional ou contador protegido que não possa ser falsificado pelo cliente. Quando uma operação usar Firebase Admin SDK ou outra biblioteca de servidor, lembrar que ela contorna Firestore Security Rules; o backend deve autenticar o usuário, verificar papel, titularidade, plano efetivo e limite antes da gravação ([documentação de regras](https://firebase.google.com/docs/firestore/security/rules-conditions)).

Leitura de dados existentes permanece submetida à titularidade e privacidade normal do recurso. Exceder um limite de plano não revoga a propriedade dos dados. Apenas novas operações protegidas ficam limitadas, e a reativação de um plano compatível devolve o acesso às funcionalidades.

## Administração e auditoria

- `adminPermissions` nunca pode ser escrita pelo usuário a quem se refere. Provisionar e revogar administradores por procedimento confiável; não permitir que o administrador comum conceda a si privilégios superiores.
- Cada ação administrativa inclui ator autenticado, conta/escopo, plano anterior e novo, horário de servidor, motivo e datas.
- Escrever concessão e histórico na mesma transação. Tornar eventos append-only para clientes e impedir edição/exclusão pelo painel.
- Para o processo de reconciliação externa, guardar a credencial em segredo do ambiente, conceder acesso mínimo possível e nunca enviá-la ao navegador. Como a Admin SDK ignora as regras Firestore, validar novamente a versão/vencimento esperado e tornar a operação idempotente.

## Proteção de dados

Mudanças e vencimentos não apagam nem arquivam dados de perfil, empresas, membros, cidades, especialidades, certificados, chamados, candidaturas ou atividades. Não configurar TTL para esses documentos. TTL exclui documentos e não implementa retorno a um plano; a disponibilidade dessa função também pode depender de billing ([documentação TTL](https://firebase.google.com/docs/firestore/ttl)).

## Publicação e custo

Não publicar regras permissivas, não habilitar faturamento, não vincular cartão, não inicializar serviços Firebase não aprovados e não adicionar credenciais administrativas ao frontend. A conta atual está no escopo de manter a infraestrutura sem obrigações pagas. As funções agendadas do Firebase exigem plano Blaze; se a necessidade de histórico automático estrito levar à escolha desse serviço, interromper a decisão e reavaliar custo/autorizações antes de ativá-lo. A alternativa GitHub Actions documentada é externa e sujeita a atrasos, falhas ou desativação; a autorização em tempo real não depende dela.

## Privacidade do diretório e perfis

Não servir documentos com campos privados por consultas públicas. Manter projeções públicas separadas dos documentos de endereço, contatos e outros dados privados, pois Security Rules não filtram campos individualmente. Publicar somente informações compatíveis com preferências de visibilidade e finalidade da busca. Não mostrar endereço residencial completo nem documentos pessoais. Fotografia é opcional; iniciais ou avatar padrão devem permitir cadastro e candidatura completos.

## Empresas, chamados e candidaturas

- Conferir participação e papel do usuário em cada empresa antes de acessar ou alterar dados empresariais; um usuário pode atuar em várias empresas.
- Somente a empresa titular ou administrador autorizado altera seus chamados e administra candidaturas recebidas.
- Validar tipo de fornecedor, requisitos e prazo antes de permitir candidatura.
- Definir transições permitidas por ator para chamados e candidaturas; não confiar em estado arbitrário enviado pelo cliente.
- Filas de compatibilidade e distribuição expõem apenas informação necessária. Proximidade não equivale a disponibilidade, consentimento para deslocamento ou autorização para exibir contato.
- Separar estado administrativo `active`, `suspended` ou `blocked` do status comercial do plano. Vencimento rebaixa permissões ao Básico e não desativa a conta.

## Notificações e contato assistido

Notificações internas são acessíveis apenas ao titular. Respeitar consentimento e preferências de push e permitir desativação/remoção de tokens por dispositivo. Tokens e credenciais de envio não podem ser públicos; push sai somente por backend confiável. Se essa integração exigir cobrança não autorizada, manter notificações internas e adiar push.

Para WhatsApp, usar links oficiais `wa.me`; não automatizar WhatsApp Web, não integrar APIs pagas ou não oficiais e não enviar disparos em massa. O perfil profissional ou empresarial precisa consentir explicitamente antes que o administrador possa preparar o contato. O administrador escolhe o destinatário e inicia cada contato manualmente. Registrar mensagem preparada e início do contato, sem alegar entrega ou leitura.

## Administração e trilha de auditoria

Aprovar/suspender/bloquear contas, editar cadastros, moderar chamados, gerenciar denúncias e alterar planos exige permissão administrativa explícita. O usuário não pode conceder essa permissão a si mesmo. Ações administrativas registram ator, alvo, horário do servidor e motivo quando aplicável. Suspender conta, empresa ou plano não apaga dados nem histórico.

