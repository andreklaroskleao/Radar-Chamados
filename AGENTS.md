# Radar Comercial Regional — orientações para o Codex

- Este projeto começa do zero sobre uma estrutura inicial Next.js/React. A estrutura e os documentos anteriores não eram um aplicativo de produto que precise ser preservado.
- A stack escolhida é Next.js App Router, React e TypeScript, com Firebase JavaScript SDK cliente para Authentication e Firestore.
- O mapa geográfico está em /cobertura; usa limites públicos do IBGE e não representa métricas ou compatibilidade.
- Rode npm run dev para abrir o app. A rota /dev/setup existe somente em desenvolvimento.
- Ao alterar funcionalidades Firebase, atualize lib/firebase/dependencies.ts e README.md com uso, configuração, custo, regras e link oficial.
- Não alegue que o Console está configurado sem confirmação. A configuração web local não confirma provedor Authentication, banco, regras publicadas, índices ou domínios.
- Não use Firebase Admin SDK no frontend, não automatize ações no Console e não habilite billing, Storage, App Check ou serviços pagos sem autorização.
- Não exponha contato privado em diretórios. Mantenha dados públicos separados de dados privados, e valide titularidade/papéis nas regras.
- adminPermissions nunca pode ser escrita por um usuário do cliente. O primeiro administrador deve ser provisionado por processo confiável; nenhum usuário pode se promover.
- firestore.rules nega caminhos não definidos. Nunca publique regras abertas.

