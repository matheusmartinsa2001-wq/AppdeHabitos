# Decisões Arquiteturais — App de Hábitos

ADR simplificado. Toda decisão arquitetural relevante é registrada aqui — **nunca só na conversa**. Formato: data, contexto, decisão, justificativa, impacto.

---

## 2026-11-25 — Documentação como fonte de verdade do projeto

**Contexto**: o projeto nasce com a mesma organização do Vivo Team Management (`CLAUDE.md` + `docs/`), para não depender do histórico de conversa entre sessões.

**Decisão**: o fluxo descrito em `CLAUDE.md` (ler documentação → identificar estado → implementar → atualizar documentação → aguardar aprovação) é obrigatório para toda tarefa.

**Impacto**: toda decisão tomada na conversa com o usuário precisa ser registrada aqui ou no documento correspondente antes de a tarefa ser considerada concluída.

---

## 2026-11-25 — Stack herdada do Vivo Team Management como proposta (não confirmada)

**Contexto**: a estrutura de pastas foi copiada do projeto Vivo Team Management (`backend/` NestJS + Prisma + Postgres, `frontend/` React + Vite + Tailwind, Docker Compose). O usuário ainda não confirmou a stack para este app.

**Decisão**: `[A DEFINIR]` — por ora, a stack de `CLAUDE.md` é só uma proposta. Confirmar ou trocar na Etapa 2 do `docs/roadmap.md`, depois da conversa de requisitos (ex.: um app mobile pode pedir outra stack no frontend).

**Impacto**: nenhum código deve ser escrito antes dessa confirmação.

---

## 2026-11-25 — App será um PWA, hospedado em planos gratuitos

**Contexto**: o usuário quer usar o app no iPhone dele, mas desenvolve no Windows e não tem Mac. Sem Mac não dá para compilar nem publicar um app nativo de iOS.

**Decisão** (do usuário, 2026-11-25): o app será um **PWA** (Progressive Web App), instalado no iPhone pelo Safari → "Compartilhar" → "Adicionar à Tela de Início". Hospedagem nos planos gratuitos:

| Peça | Opções |
|---|---|
| Frontend (estático) | Vercel, Netlify ou Cloudflare Pages |
| Backend (API) | Render ou Koyeb |
| Banco Postgres | Neon ou Supabase |

A escolha exata de cada provedor fica para a etapa de deploy.

**Justificativa**: o PWA roda no iPhone sem Mac, sem conta paga da Apple e sem loja de apps. Também funciona no navegador do computador. Os planos gratuitos bastam para o uso pessoal.

**Impacto**:
- O frontend React + Vite ganha manifest e service worker (ex.: `vite-plugin-pwa`) na etapa de estrutura inicial. Precisa ser mobile primeiro e funcionar em modo tela cheia (`display: standalone`), com ícones e cor de tema.
- Frontend e backend ficam em **origens diferentes** (ex.: `*.vercel.app` e `*.onrender.com`). Por isso, CORS e o cookie de refresh (se houver login) precisam de `SameSite=None; Secure`. O Safari no iOS pode bloquear cookie de terceiros, então isso tem que ser testado no iPhone de verdade. Se der problema, a alternativa é repassar `/api` pelo provedor do frontend (rewrite). Domínio próprio ficou fora depois da regra de tudo gratuito.
- Planos gratuitos de backend podem **"dormir"** depois de um tempo sem uso: a primeira requisição pode demorar dezenas de segundos. O frontend precisa mostrar um carregamento claro nesse caso.
- Lembretes por **notificação push** em PWA no iPhone exigem iOS 16.4+ e o app instalado na tela de início. Isso vai pesar quando decidirmos sobre lembretes (`docs/regras-negocio.md`).
- O Docker continua sendo o ambiente de **desenvolvimento local**. Em produção, cada provedor faz o próprio build.
- Os limites de cada plano gratuito (horas, armazenamento, pausa do banco) serão conferidos na hora de escolher o provedor, porque mudam com frequência.

---

## 2026-11-25 — Uso pessoal, um usuário só; primeiro módulo é Água

**Contexto**: o usuário definiu o público e a primeira funcionalidade.

**Decisão** (do usuário): o app é só para ele, para acompanhamento pessoal. Não haverá cadastro de pessoas, papéis nem compartilhamento. O primeiro módulo é **Água**: lembretes por horário com quantidade em mL, alerta nesses horários, "quanto falta" para a meta diária e visão macro dos dias que bateram ou não a meta.

**Impacto**: não haverá RBAC nem cadastro de pessoas, que eram o padrão do Vivo. Continua em aberto se haverá uma senha de proteção, porque o app fica publicado na internet. Os detalhes do módulo estão em `docs/regras-negocio.md`, com as perguntas que ainda faltam responder.

---

## 2026-11-25 — Regras do módulo Água e senha de acesso

**Contexto**: respostas do usuário às perguntas do levantamento do módulo Água.

**Decisão** (do usuário):
- A meta diária é um valor separado dos lembretes. O app avisa quando a soma dos lembretes não alcança a meta.
- O registro é feito confirmando o lembrete ou de forma livre. Dias passados não podem ser alterados.
- Os lembretes são iguais todos os dias, com uma notificação por horário, sem repetir.
- A meta é batida quando o total é maior ou igual à meta. O dia vira à meia-noite no horário de Brasília. Cada dia guarda a meta que valia nele.
- Visão macro: calendário do mês em verde e vermelho, sequência e percentual.
- O app tem senha de acesso.

**Justificativa**: guardar a meta de cada dia evita que uma mudança de meta reescreva o histórico. Proibir alterações em dias passados mantém o histórico confiável.

**Impacto**:
- Uma conta única é criada pelo seed, com o hash bcrypt de uma senha lida de variável de ambiente (ex.: `ADMIN_PASSWORD` no `backend/.env`, que não é versionado). **A senha nunca vai para docs, código ou git.**
- A Etapa 5 do roadmap passa a ser "Login com senha".
- As notificações push exigem Web Push (VAPID) e um job que dispara nos horários. O backend gratuito que "dorme" pode atrasar ou perder disparos, e isso precisa ser resolvido na arquitetura da Etapa 9.

---

## 2026-11-25 — Etapa 2: proposta de stack (aguardando escolha do usuário)

**Contexto**: o usuário aprovou a Etapa 1 e disse que a stack não precisa ser igual à do Vivo. O ponto mais delicado do app é **disparar o push na hora exata de cada lembrete**. O backend gratuito do Render/Koyeb "dorme" quando fica parado e não roda job agendado enquanto dorme.

**Opções apresentadas**:

1. **(Recomendada) Mesma base do Vivo + "despertador" externo**:
   - NestJS + Prisma + Postgres (Neon) e React + Vite + Tailwind + `vite-plugin-pwa`.
   - Os lembretes são disparados por um cron gratuito externo (ex.: cron-job.org) que chama a cada minuto um endpoint protegido do backend. O backend acorda e envia os pushes que estão no horário.
   - Prós: o usuário já conhece a stack, e os padrões e testes de `docs/padroes.md` se aproveitam inteiros.
   - Contra: se o backend estava dormindo, o push pode chegar com cerca de 1 minuto de atraso. Também depende de mais um serviço externo.
2. **Cloudflare inteira**:
   - Pages (frontend) + Workers (API) + D1 (SQLite) + Cron Triggers.
   - Prós: o Worker não dorme e o cron do próprio Cloudflare dispara no minuto certo. Tudo fica num provedor só.
   - Contra: a stack é nova para o usuário (sem NestJS, SQLite no lugar de Postgres), e boa parte dos padrões herdados do Vivo precisa ser refeita.
3. **Supabase como backend**:
   - Postgres + Edge Functions + `pg_cron` e o frontend React PWA.
   - Prós: menos código de servidor.
   - Contra: a regra de negócio fica espalhada entre funções e SQL, o que foge da arquitetura em camadas do projeto. Além disso, o projeto gratuito do Supabase é pausado depois de um período sem uso.

**Decisão** (do usuário, 2026-11-25): **opção 1**, com a condição de que tudo seja gratuito. Escolhas:
- Backend NestJS + Prisma no Render ou Koyeb, plano gratuito.
- Banco Postgres no Neon, plano gratuito.
- Frontend React + Vite + Tailwind + `vite-plugin-pwa` na Vercel, Netlify ou Cloudflare Pages, plano gratuito.
- Disparo dos lembretes por um cron externo gratuito (ex.: cron-job.org) chamando a cada minuto um endpoint protegido por segredo.
- Push via Web Push padrão (chaves VAPID geradas localmente, biblioteca `web-push`), sem serviço pago.

O provedor exato de cada peça é escolhido na Etapa 6 (primeiro deploy).

---

## 2026-11-25 — Requisito do projeto: tudo gratuito

**Contexto**: o usuário pediu que esse requisito valha para o projeto inteiro.

**Decisão** (do usuário): **nenhum serviço, biblioteca, plano ou ferramenta pago**, nem mesmo como sugestão. Isso vale para hospedagem, banco, push, cron, domínio, monitoramento e qualquer dependência.

**Impacto**:
- Toda escolha de tecnologia usa só software livre/gratuito ou plano gratuito.
- Se um limite do plano gratuito for atingido, a solução precisa caber em outro plano gratuito ou em mudança de código, nunca em upgrade pago.
- Domínio próprio fica fora (usar os subdomínios gratuitos dos provedores). Isso reforça a atenção ao cookie entre domínios no Safari (`docs/deploy.md`).

---

## 2026-11-25 — Etapa 3: modelagem do banco

**Contexto**: modelagem proposta em `docs/banco.md`. Quatro dúvidas foram respondidas pelo usuário.

**Decisão**:
- O login é só por senha, sem e-mail ou usuário.
- A meta é guardada como histórico (`water_goal_changes`, com vigência por dia), e uma mudança vale já para hoje.
- A exclusão de lembrete é lógica.
- Cada lembrete é confirmado no máximo uma vez por dia, mesmo antes do horário, e não há dois lembretes ativos no mesmo horário.
- O envio de cada notificação fica registrado (`water_reminder_dispatches`, único por lembrete e dia).
- O calendário começa na primeira meta, e hoje aparece neutro.

**Justificativa**: as regras "uma vez só" (confirmação e notificação) ficam garantidas no próprio banco, com índices únicos. Assim, elas valem mesmo com chamadas repetidas do cron ou com cliques duplos. Os totais e o calendário são calculados, porque o volume de um único usuário é pequeno e evita dado duplicado.

**Impacto**: o schema e a migration da Etapa 4 seguem `docs/banco.md`, com SQL bruto para os `CHECK` e os índices parciais.

---

## 2026-11-25 — Etapa 4: decisões da estrutura inicial

**Contexto**: montagem do esqueleto do código.

**Decisão**:
- **Portas locais diferentes das do Vivo Team Management**: Postgres 5433, API 3001 e app 5174 no host. Assim, os dois projetos rodam ao mesmo tempo no PC do usuário. Dentro do Docker continuam 5432 e 3000.
- **Lockfiles gerados com o npm 10**: a máquina do usuário tem Node 24 / npm 11, e a imagem Docker usa Node 22 / npm 10. O `npm ci` da imagem recusava o lock do npm 11 ("Missing: chokidar ... from lock file"). Depois de instalar ou atualizar dependências, rodar `npx npm@10 install --package-lock-only` em `backend/` e `frontend/`.
- **Imagem do backend** reaproveita o `node_modules` do build e faz `npm prune --omit=dev`, em vez de um segundo `npm ci`.
- **`GET /api/health`** (público) confere API e banco. Serve para verificar o deploy e, mais tarde, como alvo simples para acordar o backend gratuito.
- **Seed da conta única fica para a Etapa 5** (login). A tabela `users` já existe, vazia.
- **Migration inicial gerada sem banco** (`prisma migrate diff --from-empty`), com SQL bruto acrescentado. Conferido depois com `prisma migrate diff --from-config-datasource`: nenhuma diferença entre o banco migrado e o schema.

**Impacto**: `docs/padroes.md` (dependências e testes) e `docs/arquitetura.md` atualizados.

---

## 2026-11-25 — Etapa 5: como funciona o login

**Contexto**: login só com senha, conta única, app e API em domínios diferentes em produção, planos gratuitos sem terminal.

**Decisão**:
- **Conta criada no boot, não por seed**: o `AccountBootstrapService` sincroniza a conta com `ADMIN_PASSWORD` toda vez que o backend sobe. Ele cria a conta se ela não existir. Se a senha mudou, atualiza o hash e encerra as sessões. Sem a variável, não mexe em nada. Motivo: o Render/Koyeb gratuitos não dão terminal para rodar um seed. Trocar a senha é mudar a variável no painel e reiniciar.
- **Refresh token opaco** (32 bytes aleatórios), e não JWT como no Vivo. O banco guarda o SHA-256 (`tokenHash` único). A cada uso, o token é trocado. Reapresentar um token já trocado (fora de uma janela de 10 s para renovações simultâneas) encerra todas as sessões, porque pode ser um token vazado.
- **Duração** (confirmada pelo usuário): access token de 15 min, só em memória. A sessão dura 30 dias a partir do último uso, porque cada renovação estende o prazo. Ou seja, quem usa o app pelo menos uma vez por mês não precisa digitar a senha de novo.
- **Cookie**: `httpOnly`, `path=/api/auth`. Em produção usa `SameSite=None; Secure`, porque app e API ficam em domínios diferentes. Em desenvolvimento usa `SameSite=Lax` (localhost:5174 e :3001 são o mesmo "site", sem HTTPS). **Substituído na Etapa 6**: o cookie passou a ser `SameSite=Lax` com o repasse de `/api` pela Vercel.
- **Limite de login**: 5 tentativas por minuto por IP. Como a conta é única, não há limite por conta.
- **Mesma mensagem** ("Senha incorreta") com ou sem conta configurada.
- **No app**, "sem conexão" (servidor fora do ar ou acordando) é um estado diferente de "sem sessão": falha de rede não manda para o login.

**Impacto**: novas variáveis `JWT_ACCESS_SECRET` (mínimo 32 caracteres), `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `BCRYPT_SALT_ROUNDS` e `ADMIN_PASSWORD` (ver `backend/.env.example` e `docs/deploy.md`).

---

## 2026-11-25 — Etapa 6: Vercel repassa /api ao Render; repositório no GitHub

**Contexto**: o Safari do iPhone bloqueia cookies de outro site (proteção contra rastreamento). Com o app em `*.vercel.app` e a API em `*.onrender.com`, o cookie de sessão (`SameSite=None`) seria descartado, e a senha seria pedida a cada abertura do app.

**Decisão** (aprovada pelo usuário):
- **Vercel repassa `/api/*` ao backend no Render** (`frontend/vercel.json`, rewrite). O app chama `/api` no próprio endereço (`frontend/.env.production`), então, para o navegador, tudo é um site só.
- O cookie de sessão passa a ser **`SameSite=Lax`** em todos os ambientes, com `Secure` em produção. Isso substitui o `SameSite=None` da Etapa 5.
- **Provedores fixados**: Vercel (app), Render (backend, Docker, região Virginia) e Neon (Postgres, AWS US East). A Cloudflare Pages ficou de fora porque não faz o repasse para um endereço externo de forma simples no plano gratuito.
- **`TRUST_PROXY_HOPS=2`** em produção (Vercel + proxy do Render). Ainda falta conferir que o limite de login conta por IP do aparelho.
- **Repositório privado** no GitHub do usuário (`matheusmartinsa2001-wq/AppdeHabitos`), branch `main`. Cada push publica no Render e na Vercel.
- `.gitattributes` com `eol=lf`, para o Docker e os provedores (Linux) receberem os arquivos com fim de linha Unix.

**Impacto**:
- Passo a passo em `docs/deploy.md`.
- `FRONTEND_URL` continua configurada (CORS), mas no uso normal o navegador nem faz requisição de outra origem.

---

## 2026-11-25 — Etapa 9: notificações dos lembretes

**Contexto**: enviar uma notificação no iPhone no horário de cada lembrete, sem nada pago. O backend gratuito do Render "dorme" e não roda job agendado sozinho. O Neon gratuito tem limite de horas de computação e também "dorme" sem uso.

**Decisão**:
- **Web Push padrão** com a biblioteca `web-push` (gratuita, código aberto) e chaves VAPID próprias (`VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`). O Apple Push é usado pelo próprio iPhone, sem conta de desenvolvedor.
- **Disparo por cron externo gratuito** (cron-job.org), a cada minuto, em `POST /api/jobs/water-reminders`, protegido pelo header `X-Cron-Secret` (`CRON_SECRET`, comparação em tempo constante). A chamada também mantém o Render acordado. Um serviço ligado o mês inteiro dá cerca de 744 h, abaixo das 750 h gratuitas do Render.
- **Banco só no horário**: os lembretes ficam em memória (`ReminderCache`, invalidado pelo `WaterService` a cada mudança e recarregado a cada 6 h). O cron de cada minuto só consulta o banco quando algum lembrete está no horário. Assim o Neon continua "dormindo" entre um lembrete e outro.
- **Uma vez por dia garantido no banco**: o envio primeiro "reserva" a linha em `water_reminder_dispatches` (único por lembrete+dia). Se outra chamada já reservou, não envia.
- **Janela de 10 minutos** depois do horário, para cobrir atraso do cron ou o servidor acordando. Depois disso, não envia (seria tarde demais).
- Lembrete já marcado como "tomei" antes do horário não é notificado.
- **Service worker próprio** (`frontend/src/sw.ts`, estratégia `injectManifest`), com precache, recebimento do push e abertura do app ao tocar na notificação.
- Inscrição expirada (404/410 do serviço de push) é apagada no envio seguinte.

**Impacto**:
- Novas variáveis no Render: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`. São opcionais: sem elas, o app funciona sem notificações.
- Conta gratuita no cron-job.org (passo a passo em `docs/deploy.md`).

---

## 2026-11-25 — Redesign do módulo Água a partir do Claude Design

**Contexto**: o usuário fez no Claude Design o protótipo "Módulo Água · UX + visual novo" (Hoje, Histórico, Ajustes) e pediu para implementá-lo. O conector do Claude Design não estava disponível na sessão, então o design chegou como o zip de handoff exportado pelo próprio usuário.

**Decisão**:
- O visual do protótipo vira o **visual oficial** do app: Nunito, azul-petróleo #0E7490, tema claro, tokens em `src/index.css`. A paleta, até então provisória, foi substituída.
- **Só frontend**: as regras e a API não mudaram. Tudo usa os endpoints existentes.
- Navegação por **barra inferior** (`AppShell`) no lugar de links soltos e "‹ voltar". As rotas continuam as mesmas (`/`, `/agua/historico`, `/agua/configuracao`).
- As duas "Sugestões" que o próprio design marca como fora das regras (recorde de sequência e lembrete sugerido para completar a meta) **ficaram de fora**. Ficam registradas no backlog e só entram se o usuário pedir.
- A fonte é embutida no build (`@fontsource/nunito`), e não carregada do Google Fonts: o PWA abre igual sem internet e não depende de serviço externo.

**Impacto**: padrões de tela novos em `docs/padroes.md` → "Visual". Os componentes antigos de formulário (`GoalForm`, `ReminderForm`, `ReminderItem`, `RemindersSummary`, `FreeIntakeForm`, `WaterProgress`) foram substituídos por `GoalCard`, `ReminderSheet`, `WaterTank`, `todayModel` e pelas telas novas.

---

## 2026-11-26 — Tela de escolha de módulo

**Contexto**: com o segundo módulo (Tarefas), a barra inferior Hoje · Histórico · Ajustes, que é toda da Água, não comporta outro módulo sem mexer na Água.

**Decisão** (do usuário): ao abrir o app aparece só a escolha de módulo (Água, Tarefas). Cada módulo tem a própria barra inferior. A Água continua exatamente como está; só o endereço da tela Hoje muda de `/` para `/agua`.

**Justificativa**: não altera o módulo Água e deixa espaço para novos módulos (cada um vira mais uma opção na escolha).

**Impacto**: rota `/` passa a ser a escolha de módulo; a notificação da Água (`url` do push) passa a abrir `/agua`. Tarefas ganha rotas próprias em `/tarefas`.

---

<!-- Modelo para novas decisões:

## AAAA-MM-DD — Título curto

**Contexto**:

**Decisão**:

**Justificativa**:

**Impacto**:

---
-->
