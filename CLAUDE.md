# CLAUDE.md — App de Hábitos

Este arquivo contém apenas informação **permanente** sobre o projeto. Para tudo que muda com frequência (estado atual, decisões, API, banco), veja `docs/`.

> **Toda nova sessão deve ler este arquivo + toda a pasta `docs/` antes de fazer qualquer alteração.** Use `docs/prompts.md` → "Revisão do projeto" como ponto de partida.

## O que é o projeto

Aplicação para **cadastro e acompanhamento de hábitos**. Requisitos completos em `docs/regras-negocio.md`.

> ⚠️ **Status: estrutura criada, requisitos ainda não definidos.** O público-alvo, as funcionalidades e as regras de negócio serão definidos em conversa com o usuário. Até lá, **nenhum código de funcionalidade deve ser escrito**. Os trechos marcados com `[A DEFINIR]` dependem dessa conversa.

## Stack

> **Confirmada pelo usuário em 2026-11-25** (`docs/decisoes.md`, Etapa 2): mesma base do Vivo Team Management, com tudo em planos gratuitos. **Já decidido (2026-11-25): o app é um PWA**, usado no iPhone pelo "Adicionar à Tela de Início" do Safari, e fica hospedado em planos gratuitos (ver `docs/decisoes.md` e `docs/deploy.md`). Uso **pessoal, um usuário só**, com login por senha (2026-11-25). A senha vem de variável de ambiente e nunca é escrita em arquivo versionado.

**Backend** — `backend/`
- NestJS + TypeScript, Node 22
- Prisma + `@prisma/adapter-pg` (Prisma 7 exige driver adapter explícito)
- PostgreSQL 16
- Autenticação: JWT (access token) + refresh token rotativo em cookie httpOnly, `bcrypt` *(só se o app tiver contas — a definir)*
- Validação: `class-validator` / `class-transformer`
- Docs: Swagger (`@nestjs/swagger`) em `/api/docs`
- Rate limiting: `@nestjs/throttler`

**Frontend** — `frontend/`
- React + TypeScript + Vite
- Tailwind CSS v4 (CSS-first, sem `tailwind.config.js`)
- Componentes no padrão shadcn/ui em `src/components/ui/` (atenção: a pasta do projeto tem espaços no nome, o que quebrou a CLI do `shadcn` no projeto Vivo — testar antes; se falhar, recriar os componentes manualmente)
- React Router, React Hook Form + Zod, Axios

**Infra**
- PWA: manifest + service worker no frontend (ex.: `vite-plugin-pwa`), mobile primeiro, testado no Safari do iPhone
- Desenvolvimento local: Docker + Docker Compose (`postgres`, `backend`, `frontend`/nginx), com o `docker-compose.yml` na raiz. Portas no host: 5433 (Postgres), 3001 (API), 5174 (app), diferentes das do Vivo
- `.claude/launch.json` configura o preview do frontend (`npm run dev`, porta 5174)
- Depois de mexer em dependências: `npx npm@10 install --package-lock-only` (ver `docs/padroes.md` → "Dependências")
- Produção em planos gratuitos: frontend na Vercel, Netlify ou Cloudflare Pages, backend no Render ou Koyeb, Postgres no Neon (provedor exato a escolher na Etapa 6). Ver `docs/deploy.md`
- Lembretes: cron externo gratuito (ex.: cron-job.org) chamando a cada minuto um endpoint protegido, e Web Push com chaves VAPID e a biblioteca `web-push`

## Arquitetura — princípios obrigatórios

Ver detalhes em `docs/arquitetura.md`. Resumo do que **nunca pode ser quebrado** (valem assim que o código começar a ser escrito):

- **Clean Architecture em camadas**: `Controller → Service → Repository → Prisma`. Regra de negócio nunca no Controller nem no Repository.
- **Um módulo por domínio** (lista de módulos `[A DEFINIR]` após a conversa de requisitos), cada um com `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts`, `dto/`.
- **Autorização centralizada**: guards globais (`APP_GUARD` em `app.module.ts`). Rota pública usa `@Public()`. **Nunca** reimplementar checagem de permissão dentro de um service de forma ad hoc. *(Modelo de permissões `[A DEFINIR]`.)*
- **DTOs de entrada sempre validados** com `class-validator`; `ValidationPipe` global com `whitelist: true, forbidNonWhitelisted: true`.
- **Nunca expor `passwordHash`** ou qualquer dado sensível nas respostas — sempre mapear para um DTO/response type explícito no service.
- **Erros tratados pelo filtro global** (`common/filters/http-exception.filter.ts`) — não usar `try/catch` genérico para esconder erros no controller.

## Convenções de código

- **Nomenclatura backend**: arquivos `kebab-case.ts`, classes `PascalCase`, tabelas do banco `snake_case` (via `@@map`), enums do Prisma em `SCREAMING_SNAKE_CASE`.
- **Nomenclatura frontend**: componentes `PascalCase.tsx`, hooks `useAlgumaCoisa.ts`, serviços `algumaCoisaService.ts` (camelCase).
- **Paleta visual**: `[A DEFINIR]` — registrar em `docs/padroes.md` quando for escolhida.
- **Idioma**: interface, mensagens de erro e nomes de campos de negócio em **português**; código (variáveis, funções, nomes técnicos) em **inglês**.
- Sempre rodar `npm run build`, `npm run lint` e `npm test` (backend e frontend) e `npm run test:e2e` (backend, com o Postgres do Docker no ar) antes de considerar uma tarefa concluída. Ver `docs/padroes.md` → "Testes".

## Fluxo obrigatório de desenvolvimento

1. Ler `CLAUDE.md` + toda a pasta `docs/`.
2. Identificar o estado atual em `docs/backlog.md` e `docs/roadmap.md`.
3. Implementar apenas o que foi pedido — não adiantar etapas futuras sem aprovação.
4. Rodar build + lint + testes (backend e frontend).
5. Testar no Docker (`docker compose up -d --build`) — nunca marcar algo como concluído sem testar.
6. Atualizar a documentação afetada (ver checklist abaixo).
7. Aguardar aprovação explícita do usuário antes de seguir para a próxima etapa.

## Checklist antes de concluir qualquer tarefa

- [ ] `npm run build`, `npm run lint` e `npm test` passam no backend e no frontend; `npm run test:e2e` passa no backend
- [ ] Regra de negócio nova ou alterada tem teste (unitário do service e, se envolve permissão/validação, ponta a ponta)
- [ ] Testado no Docker (containers sobem, fluxo testado no navegador quando é mudança de UI)
- [ ] `docs/changelog.md` atualizado com a entrega
- [ ] `docs/backlog.md` atualizado (mover item para "Concluído", registrar bugs/pendências novas)
- [ ] `docs/decisoes.md` atualizado, se alguma decisão arquitetural relevante foi tomada
- [ ] `docs/api.md` atualizado, se algum endpoint foi criado/alterado
- [ ] `docs/banco.md` atualizado, se o schema Prisma mudou (e migration foi criada)
- [ ] `docs/padroes.md` atualizado, se um padrão novo foi introduzido

## Regras obrigatórias (não negociáveis)

- **Tudo gratuito**: nunca usar nem sugerir serviço, plano, biblioteca ou ferramenta paga (hospedagem, banco, push, cron, domínio etc.). Ver `docs/decisoes.md` (2026-11-25).

- Nunca inventar requisitos, remover funcionalidades descritas ou alterar regras de negócio sem confirmação explícita do usuário.
- Nunca assumir comportamento ambíguo — perguntar antes de implementar.
- Sempre explicar decisões arquiteturais importantes antes de implementá-las.
- Seguir a ordem de etapas definida em `docs/roadmap.md`; não pular etapas.
- Ao final de cada etapa, aguardar aprovação explícita antes de continuar.
- Não fazer push nem criar repositório remoto sem perguntar ao usuário.
