# Changelog

## 2026-11-12

### Fundação funcional inicial

- Confirmado que o Radar Comercial Regional começa do zero; o conteúdo anterior era scaffold Next.js e documentação, não um aplicativo legado.
- Mantido Next.js App Router, React e TypeScript.
- Integrado Firebase JavaScript SDK modular ao projeto Firebase web app existente, sem criar projeto.
- Implementados cadastro, login, recuperação de senha, sessão, perfil profissional, ambientes empresariais, equipe, diretórios, oportunidades e candidaturas.
- Implementado painel administrativo inicial para moderação e concessão manual de planos com histórico.
- Separados documentos públicos e dados privados de contato.
- Definidas regras locais Firestore com negação por padrão nos caminhos não implementados; publicação no projeto não confirmada.
- Documentados passos manuais pendentes do Console e a necessidade de provisionar o primeiro administrador por processo confiável.
- Não habilitado billing, Cloud Functions, Storage, App Check, SMS, pagamentos ou outro serviço pago.
- Implementados controles administrativos de suspensão/bloqueio de usuários e empresas, com bloqueio de operações novas e preservação dos dados.
- Adicionados catálogo de planos/funcionalidades, fila de compatibilidade explicável, denúncias, notificações internas e contato manual assistido por wa.me.
- Atualizado o README, registro de dependências Firebase e documentação para distinguir código local de estado remoto do Console.
- Concessões administrativas agora aceitam datas de Brasília, períodos de 30/90/180/365 dias, vencimento personalizado, trial/cortesia, suspensão, reativação e consulta de histórico por conta.
- Regras Firestore calculam o plano efetivo com `request.time`, retornam ao Básico sem tarefa em segundo plano e aplicam limites configurados de cidades, especialidades, cursos, qualificações e certificações sem apagar listas existentes.
- Adicionados consentimento explícito ao WhatsApp, dados empresariais privados de CNPJ/endereço/contatos, qualificações profissionais e campos completos de oportunidade.
- Notificações internas passaram a acompanhar atualizações do Firestore em tempo real; índices compostos das consultas atuais foram declarados localmente.
- Corrigidos o carregamento dos ambientes no painel e a importação do link de retorno no formulário de oportunidades.
- A gravação assíncrona do evento `expired` ainda não está implantada; o acesso retorna ao Básico pelo horário de servidor. As regras locais e índices ainda precisam ser publicados no projeto existente.


