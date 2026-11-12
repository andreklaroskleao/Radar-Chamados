# Desenvolvimento e operação — Radar Comercial Regional

## Estado de implementação

O produto está começando do zero sobre o scaffold inicial Next.js, React e TypeScript. Não havia aplicação anterior. O cliente usa o projeto Firebase existente e o SDK JavaScript modular.

A fundação implementada inclui Authentication por e-mail/senha, recuperação de senha, perfil profissional, contatos privados, diretório moderado, ambientes empresariais e membros, oportunidades, candidaturas, administração inicial e concessões manuais de planos. O arquivo local firestore.rules aplica autorização para esses caminhos e nega os demais por padrão.

A configuração local não confirma que o provedor esteja ligado no Console, que o Firestore exista, nem que as regras tenham sido publicadas. Nenhum projeto Firebase novo foi criado. Não ativar billing ou serviços pagos.

## Etapas do roadmap

### Entregue nesta etapa
1. Identidade: login, cadastro, recuperação e sessão Firebase.
2. Perfis: apresentação, especialidades, cursos/qualificações/certificações, experiência, disponibilidade, visibilidade, veículo/ferramentas, telefone e consentimento privados, municípios IBGE.
3. Empresas: criação do ambiente, equipe por UID com papéis, dados públicos, CNPJ/endereço/contatos privados e consentimento de WhatsApp.
4. Diretórios: listagem limitada de perfis/empresas públicos e aprovados.
5. Chamados e candidaturas: publicação por empresa com categoria, requisitos, certificações, experiência, vagas, remuneração, ajuda de deslocamento e data prevista; moderação administrativa, candidatura profissional/empresarial e estados básicos.
6. Administração: revisão de perfis, empresas e chamados; suspensão/bloqueio/reativação de contas e empresas; auditoria e notificações internas.
7. Planos: catálogo e limites configuráveis, concessões manuais/trial/cortesia, datas, suspensão/reativação, histórico append-only e retorno efetivo ao Básico pelo horário das regras. Os limites configurados de cidades, especialidades, cursos, qualificações e certificações protegem listas profissionais; cidades atendidas também são limitadas nas empresas.
8. Distribuição e contato assistido: prioridade por cidade/área declarada/deslocamento aceito, especialidades, certificações e experiência; motivos explicáveis; link wa.me manual apenas após consentimento, com registro sem confirmação de entrega.

### Próximas etapas funcionais
9. Catálogo administrável de categorias/especialidades e filtros paginados por UF/município, dimensionados para cotas atuais.
10. Denúncias, investigação e trilha detalhada de transições dos chamados e candidaturas. Suspensões já bloqueiam operações novas sem remover registros.
11. Distribuição mais refinada: incluir filtros paginados, visibilidade por chamada e auditoria de resultados em escala.
12. Ciclo de planos: integrar outras permissões configuradas; acrescentar contadores protegidos para limites de membros, chamados, candidaturas e consultas; oferecer prorrogação explícita; e registrar expirações de forma assíncrona idempotente sem billing.
13. Preferências granulares de notificações e trilha de auditoria da candidatura. Push FCM continua opcional e fica para depois de validar backend seguro e gratuito.
14. Expansão nacional após revisão de volume, regras, paginação, índices e custos.


## Firebase e operação local

Requer Node.js 24.x. Preserve o .env.local existente; ele já contém a configuração pública do cliente. Para instalar conforme o lockfile e iniciar o app:

    npm.cmd ci
    npm.cmd run dev

O Console do projeto existente ainda exige conferência humana: provedor e-mail/senha, banco Firestore, região da base, regras publicadas e domínios autorizados. Não crie outro projeto. Criar uma base Firestore é uma ação diferente de criar projeto e exige escolha de localização; se a base ainda não existir, confirme a localização com o proprietário antes de criá-la.

A rota admin usa a coleção adminPermissions/{UID}. O primeiro documento precisa ser provisionado por uma pessoa com acesso confiável ao projeto. O cliente não escreve essa coleção nem pode promover a própria conta.

## Política de planos, datas e custos

O plano não processa cobrança. O plano Básico é o fallback sem vencimento; concessões futuras, suspensas, vencidas ou vinculadas a um plano desativado retornam ao Básico pelo horário de servidor das regras. Esse rebaixamento efetivo não depende de a conta estar conectada e não apaga dados. Listas de cidades, especialidades, cursos, qualificações e certificações usam limites configuráveis no perfil profissional; cidades atendidas são limitadas no perfil empresarial. Outras funcionalidades não estão bloqueadas por limites até cada módulo declarar sua chave e regra. A interface administrativa registra concessões, renovações, suspensões e reativações no mesmo lote das alterações, mas não grava um evento de expiração em segundo plano.

Cloud Functions agendadas dependem de billing. Não serão ativadas nesta fase. A autorização retorna ao Básico no instante do vencimento pelas regras, mas a gravação posterior de um evento `expired` em histórico depende de uma rotina confiável externa, que ainda não foi implantada. Qualquer rotina futura é de melhor esforço e deve proteger credenciais em segredos do ambiente, validar versão/datas e ser idempotente. Não usar TTL para rebaixamento de planos.

Não ativar billing, Storage, App Check, SMS, API de pagamento ou provedor comercial. Revisar cota e preço antes de introduzir índices compostos ou serviços externos. Provedores de e-mail/senha e operações Firestore têm limites próprios, que variam conforme configuração e uso.

## Revisão antes de publicar

- Revise firestore.rules junto com as coleções e consultas.
- Confirme o projeto-alvo pela configuração pública sem exibir credenciais.
- Publique somente regras validadas pelo fluxo autorizado do projeto.
- Verifique domínios e provedor de Authentication no Console.
- Não suba .env.local, service-account JSON, chave privada, tokens nem credenciais Admin para o Git ou o navegador.
- Regras locais não indicam estado de publicação. Nunca descrever a integração remota como concluída sem confirmação.









