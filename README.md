# Radar Comercial Regional

Plataforma em desenvolvimento do zero para conectar profissionais técnicos, empresas e oportunidades regionais. A estrutura inicial já existente era um scaffold Next.js e documentação; ela não representava um aplicativo anterior. O projeto agora avança sobre Next.js, TypeScript e o Firebase web app existente.

## Funcionalidades implementadas nesta etapa

- Cadastro e login por e-mail/senha, encerramento de sessão e recuperação de senha com Firebase Authentication.
- Criação de perfil profissional sem fotografia obrigatória, com especialidades, cursos, qualificações, certificações, experiência, município IBGE, áreas atendidas, disponibilidade, deslocamento, veículo/ferramentas e visibilidade.
- Armazenamento separado dos contatos privados e consentimento opcional para contato assistido por WhatsApp.
- Ambientes empresariais, associação de membros com conta ativa por UID, papéis de proprietário/gestor/membro e dados privados separados (CNPJ, endereço e contatos).
- Diretórios de profissionais e empresas, exibindo somente cadastros públicos aprovados.
- Publicação de oportunidades por empresas com categoria, especialidades, requisitos, certificações, experiência, vagas, remuneração, deslocamento e data prevista; aprovação administrativa, candidaturas individuais/empresariais e atualização de status.
- Administração para moderação, suspensão/bloqueio/reativação de contas e empresas, distribuição explicável, catálogo de planos/funcionalidades e concessões manuais com histórico. A cobrança não é processada pela plataforma.
- Notificações internas em tempo real para mudanças de conta e candidaturas, além de registro de contato assistido por link manual do WhatsApp somente quando a pessoa/empresa autorizou esse canal.
- Regras locais do Firestore para titularidade, privacidade, associação e permissão administrativa.
- Catálogo de municípios consultado no IBGE e normalizado por código oficial.

## Configuração e desenvolvimento

Requer Node.js 24.x. O arquivo .env.local existente já aponta para a configuração Firebase cliente informada para radarcomercial2705; os valores são públicos de configuração web. Não copie .env.example por cima do .env.local existente.

Execute na raiz deste projeto:

    npm.cmd ci
    npm.cmd run dev

Para conferir os tipos sem gerar arquivos JavaScript:

    npm.cmd run typecheck

O app usa as seis variáveis públicas NEXT_PUBLIC_FIREBASE_* listadas em .env.example. Não armazene service account JSON, chave privada, credenciais do Firebase Admin SDK, segredos OAuth ou tokens nesses arquivos nem no navegador. Nenhum desses segredos foi encontrado na configuração local inspecionada.

## Firebase existente

Esta aplicação reutiliza o projeto Firebase radarcomercial2705. Nenhum projeto novo foi criado. O código usa somente Firebase JavaScript SDK cliente; não usa Firebase Admin SDK.

A conexão real depende de o proprietário confirmar no projeto existente:

1. Habilitar o provedor Authentication E-mail/senha.
2. Confirmar se o Cloud Firestore já existe no projeto. Se não existir, escolher a localização com cuidado antes de criar a base. Não crie um projeto Firebase novo.
3. Publicar firestore.rules pelo processo autorizado e confirmar os domínios autorizados de Authentication.
4. Criar o primeiro documento adminPermissions/{UID} com enabled: true por processo confiável. O próprio app nunca concede esse papel. O UID aparece para a pessoa autenticada na rota /admin.

A existência de Authentication, do banco, das regras/índices implantados ou dos domínios no Console não foi confirmada por esta implementação local. Os índices compostos necessários às consultas atuais estão declarados em firestore.indexes.json.

## Controles de custo e segurança

Não habilitamos billing, planos pagos, Cloud Functions, Storage, App Check, envio SMS, pagamento ou serviço de terceiros pago. O cliente web contém somente a configuração pública do SDK. A chave API Firebase web não é segredo de servidor, mas deve permanecer restrita no Google Cloud às APIs e origens necessárias.

As regras separaram professionalProfiles de professionalPrivate, e companyProfiles de companyPrivate. Coleções públicas exigem visibilidade pública e aprovação. Contatos, CNPJ, endereço empresarial e consentimento de WhatsApp ficam em documentos privados. As regras calculam o plano efetivo pelo horário de servidor e aplicam limites configurados de cidades, especialidades, cursos, qualificações e certificações. adminPermissions é somente leitura pelo cliente, e os caminhos não definidos continuam negados por padrão. Regras locais não significam que as mesmas regras já foram implantadas no projeto.

As oportunidades consideram apenas municípios declarados. Proximidade não implica disponibilidade nem deslocamento. O contato empresarial privado não é exibido nos diretórios.

## Rotas

- / — apresentação da plataforma
- /cadastro, /entrar — autenticação
- /painel — seleção dos ambientes da conta
- /perfil — edição do perfil profissional
- /empresas, /empresas/nova, /empresas/[id] — diretório e ambientes empresariais
- /profissionais — diretório profissional
- /oportunidades, /oportunidades/[id] — chamados e candidaturas
- /admin — moderação, gestão de contas e concessões
- /admin/planos — catálogo e limites manuais
- /admin/distribuicao — fila de compatibilidade e contato assistido
- /notificacoes — central de notificações da conta
- /denunciar — envio de denúncia
- /admin/denuncias — fila administrativa de denúncias
- /cobertura — mapa geográfico baseado em dados públicos do IBGE
- /dev/setup — diagnóstico local de configuração Firebase, somente em desenvolvimento

## Arquitetura e roadmap

O produto segue a especificação e os documentos em docs/. A base funcional cobre identidade, perfis, empresas/membros, diretórios, oportunidades/candidaturas, moderação, denúncias, notificações, distribuição inicial, contato assistido e concessões de plano. As regras usam o plano vigente pelo horário do Firestore e aplicam limites configurados de cidades, especialidades, cursos, qualificações e certificações; cotas de volume ainda precisam de contadores protegidos. O roadmap continua com catálogo de categorias/especialidades, paginação, auditoria detalhada de transições, contadores para limites de uso e registro de vencimento em segundo plano. Serviços pagos e billing continuam excluídos.

Consulte arquitetura (docs/architecture.md), modelo de dados (docs/database.md), segurança (docs/security.md) e desenvolvimento (docs/development.md).





