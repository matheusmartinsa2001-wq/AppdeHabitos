# Padrões Técnicos — App de Hábitos

Sempre que um padrão novo surgir durante o desenvolvimento, atualizar este documento no mesmo commit/entrega.

> Padrões herdados do projeto Vivo Team Management, válidos assim que a stack for confirmada (ver `docs/decisoes.md`). Padrões específicos deste app ficam `[A DEFINIR]`.

## Backend (NestJS)

### Estrutura de um módulo de domínio

```
<dominio>/
├── dto/
│   ├── create-<entidade>.dto.ts
│   ├── update-<entidade>.dto.ts      # normalmente PartialType(OmitType(CreateDto, [...]))
│   └── <entidade>-query.dto.ts       # extends PaginationQueryDto quando há listagem
├── <dominio>.controller.ts            # só orquestra: decorators HTTP, chama o service
├── <dominio>.service.ts               # regra de negócio, validações, orquestração de repositórios
├── <dominio>.repository.ts            # única camada que fala com o Prisma
└── <dominio>.module.ts
```

- **Controller nunca chama `PrismaService` diretamente** e nunca contém `if` de regra de negócio.
- **Repository nunca lança exceções de domínio** (`NotFoundException`, `ConflictException`) — isso é do Service. Repository só retorna `null`/lista vazia/lança erro do Prisma.
- Dado de outra tabela: consulta direta via `PrismaService` no próprio repository, sem importar o módulo vizinho (evita dependência circular).

### Combinando filtros Prisma (`WhereInput`)

Nunca espalhar (`...spread`) dois `Prisma.XWhereInput` no mesmo nível se ambos podem ter a mesma chave (`OR`/`AND`/`NOT`) — o segundo sobrescreve o primeiro em silêncio. Combinar com `AND: [cond1, cond2]`.

### Autorização

- Guards globais. Rota pública usa `@Public()` — toda rota nova é protegida por padrão.
- Usuário autenticado no controller: `@CurrentUser()`, nunca `req.user` manual.
- Autorização escopada a um recurso (ex.: "só o dono deste hábito") vai num helper no Service do domínio, chamado no início de cada operação. Se o frontend precisa saber se mostra um controle, expor o resultado num campo da resposta (ex.: `canEdit`).
- Modelo de permissões deste app: `[A DEFINIR]`.

### DTOs e validação

- Todo campo de entrada tem decorator do `class-validator` e `@ApiProperty()`/`@ApiPropertyOptional()`.
- DTOs de update com `PartialType(OmitType(...))` de `@nestjs/swagger` — nunca duplicar campos.
- Query DTOs de listagem estendem `common/dto/pagination-query.dto.ts`.
- **Query param booleano: sempre um decorator `@ToBoolean()`**, nunca `@Type(() => Boolean)` (`Boolean("false") === true`).
- Texto obrigatório: trim antes do `@IsNotEmpty()` (só espaços = vazio). Nunca em senha.
- Mensagens de validação em português (tradução centralizada no `ValidationPipe`).

### Tratamento de erros

- Nunca `try/catch` silencioso. Erros de negócio são exceções do NestJS lançadas no Service.
- Filtro global padroniza `{ statusCode, timestamp, path, message }`, loga `>= 500` e traduz erros conhecidos do Prisma (`P2002`, `P2025`, `P2003`).

### Datas e fuso horário

- **"Agora" sempre por injeção**: service que depende de "hoje" recebe `Clock` (`common/services/clock.service.ts`) e calcula o dia com `brasiliaNow(clock.now())`. Nos testes, passar um relógio fixo.

- **Crítico para um app de hábitos** ("fiz hoje?", sequências). Regra de fuso `[A DEFINIR]` na conversa de requisitos (fuso do usuário, fuso fixo ou configurável).
- Datas de calendário (sem hora) guardadas como data, não como instante.
- Nunca misturar métodos UTC e locais no mesmo cálculo de data.

### Dependências (npm)

- A máquina do usuário tem Node 24 / npm 11, e a imagem Docker usa Node 22 / npm 10. **Depois de instalar ou atualizar dependências, rodar `npx npm@10 install --package-lock-only`** em `backend/` e/ou `frontend/`. Sem isso, o `npm ci` do Docker recusa o lock. Ver `docs/decisoes.md` (Etapa 4).
- Só dependências gratuitas e de código aberto (regra do projeto).

### Migrations

- Regra de banco que o Prisma Schema não expressa (ex.: índice único parcial) vai em SQL bruto numa migration, nunca só documentada.

## Frontend (React)

### Estrutura de uma página de domínio

```
pages/<dominio>/
├── <Dominio>Page.tsx        # página principal
├── <Entidade>FormDialog.tsx # criar/editar (react-hook-form + zod)
└── <Outro>Dialog.tsx        # ações secundárias
```

- Um arquivo de serviço por domínio em `services/<dominio>Service.ts`; a página nunca chama `api.get(...)` direto.
- Tipos em `types/<dominio>.ts`, espelhando exatamente a resposta do backend.

### Visual (oficial desde o redesign do módulo Água, 2026-11-25)

- Calmo e minimalista, tema claro, fonte **Nunito** (`@fontsource/nunito`, embutida no build: abre sem internet), azul-petróleo **#0E7490**.
- Cores só pelas variáveis de `src/index.css` (`bg-primary`, `text-ink-2`, `bg-met`, `bg-warning-soft`...). O design de referência é o "Módulo Água · UX + visual novo" do Claude Design.
- Telas logadas dentro do `AppShell` (barra inferior flutuante Hoje · Histórico · Ajustes). Título da tela: rótulo pequeno + h1 de 34px.
- Cartões brancos com cantos de 24px sobre o fundo `--background`, botões principais de 52–64px de altura e áreas de toque de pelo menos 44px.
- Confirmação de ação: `useToast().showToast(texto, { onUndo })` (`components/ui/toast.tsx`), o aviso escuro acima da barra, com "Desfazer" quando dá para voltar atrás.
- Formulário de criar/editar: painel que sobe de baixo (ex.: `ReminderSheet`). O formulário interno tem `key` por abertura, para começar limpo sem `setState` em efeito.
- Animações respeitam "reduzir movimento" do sistema (`prefersReducedMotion`).

### Componentes UI (padrão shadcn)

- Primitivos em `components/ui/`: `React.ComponentProps<'tag'>` estendido, `cn()` para classes, variantes com `class-variance-authority`.
- Cor sempre via variável CSS/Tailwind, nunca hex direto no componente.
- Paleta e identidade visual: `[A DEFINIR]`.

### Formulários

- Sempre `react-hook-form` + `zodResolver`, um schema Zod por formulário.
- Limites (`max`) iguais aos do backend; mensagens do zod em português.
- Erro de submissão da API exibido no formulário, nunca `alert()`.

### Service worker e notificações

- O service worker é `src/sw.ts` (estratégia `injectManifest` do `vite-plugin-pwa`), com tsconfig próprio (`tsconfig.sw.json`, lib WebWorker), fora do `tsconfig.app.json`.
- Pedir permissão de notificação **só dentro de um toque do usuário** (exigência do iPhone): `subscribeToPush` é chamado direto no `onClick`.
- No lint (`set-state-in-effect`), função de carregamento chamada no `useEffect` usa cadeia de promessas (`.then(setState)`), não `async` com `setState`.

### Sessão no frontend

- Access token só em memória (`services/api.ts`), nunca em `localStorage`. Renovação automática no interceptor; não implementar retry de 401 nas telas.
- `useAuth().status`: tratar `offline` (sem conexão) diferente de `anonymous` (sem sessão). Falha de rede nunca manda para o login.

### Estados de tela

- **Falha ao carregar ≠ vazio**: mostrar "Não foi possível carregar" + "Tentar novamente". Nunca transformar erro em lista vazia.
- Botão de ação que vai ao servidor fica desabilitado com spinner durante o envio (evita duplo envio).
- Toda escrita tem tratamento de erro com mensagem para o usuário; toda leitura tem `.catch()`.

### Layout responsivo

- **`<input type="time">` no Safari do iPhone** tem largura e altura próprias e transborda de um `flex`. Colocar em grade com coluna fixa (`grid-cols-[7.5rem_minmax(0,1fr)]`), com `h-11 min-w-0 appearance-none` no campo. Campo de hora não mostra placeholder no iPhone, então o rótulo fica visível acima.

- **Mobile primeiro** (PWA no iPhone, decisão de 2026-11-25). Respeitar a área segura do iPhone (`env(safe-area-inset-*)`, `viewport-fit=cover`) e áreas de toque de pelo menos 44px. Toda mudança de tela é verificada também no Safari do iPhone com o app instalado na tela de início.
- Para esconder/mostrar elementos entre breakpoints, preferir `hidden`/`md:flex` a `translate-x-*` (problema real no Tailwind v4 do projeto Vivo).

### Build e verificação

- Rodar `npm run build` e `npm run lint` no frontend e no backend antes de considerar uma mudança pronta.
- Mudança visual/de fluxo **sempre** verificada no navegador, nunca só pelo código.

## Testes

Três camadas automatizadas (configuradas na Etapa 4). Rodar as três antes de concluir uma tarefa. Não substituem a verificação no navegador para mudanças de tela.

| Camada | Comando | Onde fica | O que cobre |
|---|---|---|---|
| Unitários do backend | `cd backend && npm test` | `src/**/*.spec.ts` | Regras de negócio dos services e funções puras, sem banco |
| API ponta a ponta | `cd backend && npm run test:e2e` | `test/*.e2e-spec.ts` + `test/e2e/` | App inteiro (guards, pipes, filtro de erro) contra um Postgres de teste (`app_de_habitos_e2e`, porta 5433; precisa de `docker compose up -d postgres`) |
| Frontend | `cd frontend && npm test` | `src/**/*.test.ts(x)` | Utilitários e componentes com Testing Library |

- **Unitários**: instanciar o service direto (`new XService(repoFalso)`), repositórios `jest.fn()`. O teste descreve a regra de `docs/regras-negocio.md`, não a implementação.
- **Ponta a ponta**: banco próprio cujo nome **precisa** terminar em `_e2e`, recriado e migrado a cada rodada. O app sobe com o mesmo `configureApp` do `main.ts`.
- **Frontend**: Vitest + jsdom + Testing Library. Componentes com rota: `renderWithProviders(ui, { route, routes })` (`src/test/render.tsx`, data router em memória).
- **Cuidado com `beforeEach(() => mock.mockReset())` em uma linha**: o hook devolve a função mock, e o Vitest trata função devolvida como limpeza, chamando o mock depois do teste (um mock que rejeita quebra o teste). Sempre usar chaves: `beforeEach(() => { mock.mockReset() })`.
- Mock que rejeita: `mockImplementation(() => Promise.reject(erro))`.
- **E2E e o limite de login (5 por minuto)**: fazer o login uma vez no `beforeAll` e, entre os testes, limpar só as tabelas do módulo, em vez de chamar `resetDatabase` + `login` em cada teste.
- **Campos numéricos do formulário**: o valor do input é texto. O zod faz `regex` de dígitos, `transform(Number)` e `pipe(z.number().min().max())`, com mensagens em mL formatadas (`formatMl`). Para "hoje", `vi.useFakeTimers({ toFake: ['Date'] })` + `vi.setSystemTime(...)`. Fuso de teste fixo `[A DEFINIR]`.
