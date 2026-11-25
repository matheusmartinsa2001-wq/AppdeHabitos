# Changelog — App de Hábitos

Registro resumido de cada entrega. Mais recente no topo.

---

## 2026-11-25 — Etapa 3: proposta de modelagem do banco

**Tipo**: Documentação

- `docs/banco.md` com as tabelas, o diagrama e as regras de integridade: acesso (`users`, `refresh_tokens`, `push_subscriptions`) e Água (`water_goal_changes`, `water_reminders`, `water_intakes`, `water_reminder_dispatches`). Sem schema nem migration ainda.

---

## 2026-11-25 — Etapa 7: Água, meta diária e lembretes

**Tipo**: Backend + frontend

- **API** (`/api/water`, módulo `water`):
  - `GET settings`;
  - `PUT goal` (vale a partir de hoje em Brasília; uma linha por dia de vigência);
  - `POST`/`PATCH`/`DELETE reminders` (horário `HH:MM`, 50–2.000 mL; sem horário repetido, com 409 e mensagem; exclusão lógica).
- **Tela `/agua/configuracao`**:
  - meta com sugestão de 4.000 mL antes da primeira;
  - lembretes em ordem de horário, com edição na própria linha e exclusão com confirmação;
  - soma × meta com o aviso amarelo de quanto falta;
  - atalho "Água → Configurar" na tela inicial.
- **Testes**: backend com 33 unitários e 25 ponta a ponta; frontend com 28.
- **Ajuste pedido pelo usuário no iPhone**: os campos de horário e mL do novo lembrete se sobrepunham no Safari. Agora ficam em grade de colunas fixas, com rótulo visível acima de cada um, e o campo de mL perdeu o "mL" repetido.
- **Verificado no navegador** (tamanho de celular): salvar a meta, adicionar lembretes, horário repetido recusado, excluir com confirmação, aviso da soma atualizado.

---

## 2026-11-25 — Etapa 6: app no ar e testado no iPhone

**Tipo**: Infra

- No ar, tudo no plano gratuito:
  - app: https://appde-habitos.vercel.app (Vercel);
  - backend: https://appdehabitos.onrender.com (Render, Docker);
  - banco: Postgres no Neon.
- Conferido daqui:
  - o health passa pela Vercel até o banco;
  - senha errada é recusada;
  - o Swagger fica fechado em produção;
  - o manifest e o service worker são servidos.
- **Testado pelo usuário no iPhone**, tudo como esperado:
  - login pelo Safari;
  - "Adicionar à Tela de Início" abre o app em tela cheia;
  - a sessão continua depois de fechar e reabrir o app, o que confirma o cookie com o repasse de `/api`;
  - "Sair" funciona.
- Mensagem de erro das variáveis de ambiente mais clara: mostra o nome da variável e a regra, nunca o valor.

---

## 2026-11-25 — Etapa 6: preparo do deploy

**Tipo**: Infra + backend

- `frontend/vercel.json`: a Vercel repassa `/api/*` ao backend no Render e serve o app como SPA. `sw.js` e `index.html` vão sem cache.
- `frontend/.env.production`: o build de produção chama a API em `/api`.
- Cookie de sessão `SameSite=Lax` (com `Secure` em produção), já que app e API ficam no mesmo site.
- Repositório git criado e enviado ao GitHub privado do usuário. `.gitattributes` com fim de linha LF.
- `docs/deploy.md` com o passo a passo para Neon, Render, Vercel e o teste no iPhone.

---

## 2026-11-25 — Etapa 5 aprovada

**Tipo**: Documentação

- O usuário aprovou a Etapa 5 e o prazo de sessão de 30 dias desde o último uso.

---

## 2026-11-25 — Etapa 5: login com senha

**Tipo**: Backend + frontend + banco

- **Conta única** (`auth/account-bootstrap.service.ts`): ao subir, o backend cria a conta com o hash bcrypt de `ADMIN_PASSWORD`. Se a variável mudar, atualiza o hash e encerra as sessões abertas. A senha nunca é gravada.
- **API**:
  - `POST /api/auth/login` (só `password`; 5 tentativas por minuto);
  - `POST /api/auth/refresh` (refresh token opaco e rotativo em cookie httpOnly; reuso de token já trocado encerra todas as sessões);
  - `POST /api/auth/logout`.
  - `JwtAuthGuard` global: toda rota nova exige login, exceto as `@Public()` (health e auth).
- **Banco**: migration `20261125130000_refresh_token_hash_unique` (`refresh_tokens.tokenHash` único).
- **App**:
  - tela de senha (`/login`) e sessão restaurada ao abrir o app;
  - access token só em memória, com renovação automática em 401;
  - "Sair" na tela inicial provisória;
  - servidor fora do ar mostra "Não foi possível conectar" + "Tentar novamente", em vez de mandar para o login.
- **Testes**: backend com 21 unitários e 17 ponta a ponta; frontend com 17.
- **Verificado no navegador**: senha errada, senha certa, sessão mantida ao recarregar e "Sair".

---

## 2026-11-25 — Etapa 4: estrutura inicial do código

**Tipo**: Backend + frontend + infra (sem funcionalidade de negócio)

- **Backend** (`backend/`): NestJS 11 com:
  - configuração validada (`config/`);
  - filtro global de erros e mensagens de validação em português (`common/`);
  - Prisma 7 com adapter pg (`database/`);
  - rate limit global;
  - utilitário de "hoje" em Brasília (`common/utils/brasilia.ts`);
  - módulo `health` (`GET /api/health`, que confere o banco).
- **Banco**: `prisma/schema.prisma` conforme `docs/banco.md`. A migration `20261125120000_init` tem os `CHECK` e os índices únicos parciais em SQL bruto.
- **Frontend** (`frontend/`): React 19 + Vite + Tailwind v4 + `vite-plugin-pwa`, com:
  - manifest em português, `display: standalone`;
  - ícones provisórios e metatags do iPhone (`apple-touch-icon`, `viewport-fit=cover`);
  - tela provisória que confere a conexão com a API, com "Tentar novamente" e aviso de servidor "acordando".
- **Docker Compose** de desenvolvimento nas portas 5433 (Postgres), 3001 (API) e 5174 (app), para não colidir com o Vivo Team Management.
- **Testes**:
  - backend: 6 unitários (health, Brasília, mensagens);
  - ponta a ponta: 7 (health, formato de erro, tabelas e as regras de "uma vez só" garantidas pelo banco);
  - frontend: 2.
- Verificado: build, lint e testes passam; containers no ar; tela aberta no navegador em tamanho de celular. O service worker não pôde ser confirmado no navegador embutido (ver backlog).

---

## 2026-11-25 — Etapa 3: modelagem do banco aprovada

**Tipo**: Documentação

- O usuário aprovou `docs/banco.md`.

---

## 2026-11-25 — Etapa 2: stack confirmada, tudo gratuito

**Tipo**: Documentação

- O usuário escolheu a opção 1: base do Vivo (NestJS + Prisma + Postgres no Neon, React + Vite PWA) e um cron externo gratuito para disparar os lembretes.
- Novo requisito do projeto, registrado em `CLAUDE.md` e `docs/decisoes.md`: nada pago, nem como sugestão.

---

## 2026-11-25 — Etapa 1 (requisitos) aprovada

**Tipo**: Documentação

- O usuário aprovou as regras de `docs/regras-negocio.md`. A Etapa 2 (confirmação da stack) começou.

---

## 2026-11-25 — Regras do módulo Água definidas

**Tipo**: Documentação

- `docs/regras-negocio.md`: regras da meta, dos lembretes, do registro, do "bateu a meta" e da visão macro, além da senha de acesso. A senha não fica escrita em lugar nenhum; ela virá de variável de ambiente.
- Roadmap e backlog atualizados. Os 3 últimos pontos (onde aparece o aviso de meta, os botões de registro livre e desfazer um registro de hoje) foram confirmados pelo usuário.

---

## 2026-11-25 — Requisitos: uso pessoal e módulo Água

**Tipo**: Documentação

- `docs/regras-negocio.md` com o pedido do módulo Água (lembretes com mL, alerta, "quanto falta", visão macro) e as perguntas em aberto.
- `docs/roadmap.md` com a Fase 2 (Água, Etapas 7–10, divisão proposta). Etapa 1 em andamento.
- Nenhum código.

---

## 2026-11-25 — Decisão: PWA com hospedagem gratuita

**Tipo**: Documentação

- Registrada em `docs/decisoes.md` a decisão de fazer o app como PWA para o iPhone, hospedado em planos gratuitos (Vercel/Netlify/Cloudflare Pages, Render/Koyeb, Neon/Supabase).
- `docs/arquitetura.md`, `docs/deploy.md`, `docs/roadmap.md` e `CLAUDE.md` ajustados. O roadmap ganhou a Etapa 6, um primeiro deploy com teste de instalação no iPhone.
- Nenhum código.

---

## 2026-11-25 — Estrutura inicial do projeto

**Tipo**: Documentação / estrutura

- Pastas `backend/`, `frontend/`, `scripts/` (vazias, com `README.md` explicando o que vai em cada uma) e `docs/`.
- `CLAUDE.md` com stack proposta (a confirmar), princípios de arquitetura, convenções, fluxo de trabalho por etapas com aprovação e checklist de conclusão — adaptados do projeto Vivo Team Management.
- `docs/`: `arquitetura`, `regras-negocio`, `padroes`, `decisoes`, `roadmap`, `backlog`, `changelog`, `api`, `banco`, `deploy`, `prompts`. Tudo que depende da conversa de requisitos está marcado `[A DEFINIR]`.
- Nenhum código de funcionalidade e nenhuma regra de negócio definidos.
