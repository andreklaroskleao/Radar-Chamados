export type SetupState = 'manual' | 'not-used';
export type FirebaseSetupItem = {
  id: string; name: string; state: SetupState; usage: string; purpose: string;
  features: string[]; instructions: string[]; cost: string; security: string;
  consoleUrl?: string; consoleLabel?: string; sourceLabel?: string;
};
const project = 'https://console.firebase.google.com/project/radarcomercial2705';
export const firebaseSetupItems: FirebaseSetupItem[] = [
  {
    id: 'authentication', name: 'Firebase Authentication', state: 'manual',
    usage: 'SDK integrado no cliente web para cadastro, login e recuperação de senha com e-mail e senha. A habilitação do provedor no Console ainda precisa de confirmação.',
    purpose: 'Gerencia identidade e sessão para áreas pessoais, empresariais e administrativas.',
    features: ['Cadastro com criação do documento de usuário e perfil profissional', 'Login e encerramento de sessão', 'Recuperação de senha', 'Acesso protegido por UID'],
    instructions: ['No projeto Firebase existente, confira se o provedor E-mail/senha está habilitado.', 'Confirme os domínios autorizados para os ambientes locais e de produção.', 'Não crie outro projeto nem habilite autenticação por telefone.'],
    cost: 'Este app usa somente autenticação por e-mail/senha. Não habilita SMS, billing nem outros provedores; consulte as condições atuais do projeto antes de ampliar.',
    security: 'O cliente usa a configuração pública web. Papéis administrativos vêm de adminPermissions e nunca podem ser criados pelo próprio usuário.',
    consoleUrl: `${project}/authentication/providers`, consoleLabel: 'Conferir provedores de login'
  },
  {
    id: 'firestore', name: 'Cloud Firestore', state: 'manual',
    usage: 'SDK integrado aos perfis profissionais, dados privados, empresas/membros, diretórios, oportunidades/candidaturas, denúncias, notificações, distribuição, planos e concessões.',
    purpose: 'Persistência funcional do produto, separando projeções públicas de dados privados.',
    features: ['Perfis e ambientes empresariais', 'Diretórios moderados', 'Chamados e candidaturas', 'Denúncias e notificações', 'Distribuição e contato assistido', 'Catálogo de planos e histórico administrativo'],
    instructions: ['Confirme se uma base já existe no projeto radarcomercial2705.', 'Não crie outro projeto. Se a base Firestore não existir, a localização precisa ser escolhida pelo proprietário antes da criação.', 'As regras locais foram implementadas; publicação e estado da base ainda não foram confirmados.'],
    cost: 'Há cotas e condições gratuitas, mas leituras, gravações, armazenamento, índices e tráfego podem gerar custos conforme uso/plano. Esta implementação não ativa billing.',
    security: 'Regras locais limitam leituras por visibilidade, UID, associação empresarial e permissão administrativa. Não use SDK Admin no navegador.',
    consoleUrl: `${project}/firestore/data`, consoleLabel: 'Conferir banco Firestore',
    sourceLabel: 'SDK integrado no app. Banco existente e regras publicadas não confirmados.'
  },
  {
    id: 'firestore-rules', name: 'Regras de segurança do Firestore', state: 'manual',
    usage: 'O arquivo local implementa controles para usuários, perfis públicos/privados, empresas, membros, chamados, candidaturas, planos e administração.',
    purpose: 'Aplica autorização no banco, além dos controles visuais da interface.',
    features: ['Dados privados limitados ao titular ou membros autorizados', 'Moderação e concessões somente por administradores', 'Sem autoelevação administrativa'],
    instructions: ['Revise firestore.rules e compare com as coleções do projeto.', 'Publique as regras pelo fluxo autorizado do projeto depois de validar em um ambiente seguro.', 'Não abra acesso global e não considere estas regras implantadas até confirmar no Console.'],
    cost: 'A execução de regras não tem tarifa separada, mas consultas autorizadas consomem operações Firestore.',
    security: 'Regras negam por padrão caminhos não explicitamente definidos. Firestore não filtra campos privados dentro de um documento; por isso o app os mantém em coleções separadas.',
    consoleUrl: `${project}/firestore/rules`, consoleLabel: 'Conferir regras publicadas',
    sourceLabel: 'Políticas implementadas localmente; implantação não confirmada.'
  },
  {
    id: 'firestore-indexes', name: 'Índices do Firestore', state: 'manual',
    usage: 'As consultas atuais usam filtros simples e limite de resultados. Não foi adicionado índice composto preventivo.',
    purpose: 'Atende filtros combinados quando as consultas reais exigirem.',
    features: ['Diretório moderado', 'Membros por usuário/estado', 'Oportunidades publicadas'],
    instructions: ['Mantenha firestore.indexes.json sincronizado se uma consulta solicitar índice.', 'Confira custo de armazenamento antes de criar índices adicionais.'],
    cost: 'Índices consomem armazenamento; não foram adicionados índices compostos nesta implementação.',
    security: 'Índices não substituem regras. A consulta também precisa estar limitada aos documentos que o usuário pode ler.',
    consoleUrl: `${project}/firestore/indexes`, consoleLabel: 'Conferir índices'
  },
  {
    id: 'authorized-domains', name: 'Domínios autorizados', state: 'manual',
    usage: 'Necessários para completar o login web em cada host usado.',
    purpose: 'Restringe os hosts que podem iniciar fluxos de autenticação.',
    features: ['Desenvolvimento local', 'Host de produção escolhido pelo proprietário'],
    instructions: ['Confira localhost e o domínio de produção na lista do projeto existente.', 'Adicione somente hosts controlados pelo Radar.'],
    cost: 'Cadastrar um domínio não habilita billing.',
    security: 'Não use domínios de terceiros ou hosts de teste sem necessidade.',
    consoleUrl: `${project}/authentication/settings`, consoleLabel: 'Conferir domínios'
  },
  {
    id: 'app-check', name: 'Firebase App Check', state: 'not-used',
    usage: 'Não é usado nesta fase.', purpose: 'Proteção adicional opcional contra clientes automatizados.',
    features: ['Nenhuma funcionalidade depende de App Check'],
    instructions: ['Nenhuma ação necessária. Reavaliar somente se houver necessidade concreta e sem habilitar enforcement antes de validar clientes.'],
    cost: 'Não inicializado. Cotas e condições dependem do provedor escolhido.',
    security: 'Não substitui Authentication nem regras Firestore.'
  },
  {
    id: 'storage', name: 'Firebase Storage', state: 'not-used',
    usage: 'Não é usado; a foto profissional é opcional e ainda não existe upload.',
    purpose: 'Armazenaria arquivos caso uma funcionalidade futura exija mídia.',
    features: ['Nenhuma funcionalidade atual'],
    instructions: ['Nenhuma ação necessária. Não habilitar bucket sem necessidade, regras e revisão de custo.'],
    cost: 'Não habilitado.',
    security: 'Uploads futuros exigem regras específicas e validação de tamanho/tipo.'
  }
];


