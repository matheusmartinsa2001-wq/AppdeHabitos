# Backlog — App de Hábitos

Manter sempre atualizado. Ao concluir uma feature, mover para "Concluído" e atualizar `docs/changelog.md` no mesmo momento.

## Concluído

- [x] **Etapa 12 — Escolha de módulo** (2026-11-26): tela inicial com Água e Tarefas, Água em `/agua` com "‹ Módulos", notificação abrindo `/agua`. Aprovada pelo usuário.
- [x] **Estrutura do projeto** (2026-11-25): pastas `backend/`, `frontend/`, `scripts/`, `docs/`, `CLAUDE.md` e documentação base com placeholders. Nenhum código de funcionalidade.
- [x] **Etapa 1 — Requisitos** (2026-11-25): uso pessoal, login com senha e regras do módulo Água, aprovados pelo usuário.
- [x] **Etapa 2 — Stack** (2026-11-25): base do Vivo em planos gratuitos + cron externo gratuito para os lembretes. Regra do projeto: tudo gratuito.
- [x] **Etapa 3 — Modelagem do banco** (2026-11-25): `docs/banco.md`, aprovada pelo usuário.
- [x] **Etapa 4 — Estrutura inicial do código** (2026-11-25):
  - backend NestJS com configuração validada, filtro global de erros, mensagens de validação em português, Prisma 7 com adapter pg, rate limit e `GET /api/health`;
  - schema Prisma e migration `init` com as regras de integridade em SQL bruto;
  - frontend React + Vite + Tailwind v4 + `vite-plugin-pwa` (manifest, service worker, ícones, metatags do iPhone) com uma tela provisória de conexão;
  - Docker Compose de desenvolvimento;
  - as três camadas de testes.
- [x] **Etapa 5 — Login com senha** (2026-11-25):
  - conta única criada ou atualizada no boot a partir de `ADMIN_PASSWORD`;
  - `POST /auth/login`, `/auth/refresh` (rotação, com detecção de reuso) e `/auth/logout`;
  - `JwtAuthGuard` global e limite de 5 tentativas de login por minuto;
  - tela de senha, sessão em memória com renovação automática, rotas protegidas e botão "Sair";
  - aviso de "sem conexão" diferente de "sem sessão".
- [x] **Redesign do módulo Água** (2026-11-25, aprovado em 2026-11-26), a partir do design "Módulo Água · UX + visual novo" (Claude Design):
  - paleta oficial e fonte Nunito;
  - barra inferior Hoje · Histórico · Ajustes;
  - Hoje com tanque animado, "Tomei" do lembrete da vez, linha "Seu dia" e aviso com Desfazer;
  - Histórico com o nível de cada dia;
  - Ajustes com meta −/+ 250 mL, painel de lembretes, chave de notificações e "Sair".
- [x] **Etapa 10 — Água: histórico** (2026-11-25): tela `/agua/historico` com:
  - calendário do mês em verde/vermelho (hoje neutro);
  - sequência atual e percentual de dias com a meta batida no mês;
  - navegação entre meses (do mês da primeira meta até o atual);
  - detalhe do dia ao tocar.
- [x] **Etapa 9 — Notificações dos lembretes** (2026-11-25): Web Push com chaves próprias, disparo pelo cron-job.org a cada minuto, uma notificação por lembrete por dia; testado no iPhone.
- [x] **Etapa 8 — Água do dia** (2026-11-25): tela inicial com:
  - total × meta, barra de progresso e "quanto falta";
  - "Tomei" nos lembretes;
  - registro livre (+200/+300/+500 e outro valor);
  - lista dos registros de hoje com "Desfazer";
  - aviso quando os lembretes não somam a meta.
- [x] **Etapa 7 — Água: meta e lembretes** (2026-11-25): tela `/agua/configuracao`, com:
  - meta diária com histórico por dia;
  - lembretes (criar, editar, excluir; sem horário repetido);
  - aviso quando os lembretes não somam a meta;
  - atalho "Água → Configurar" na tela inicial.
- [x] **Etapa 6 — Primeiro deploy** (2026-11-25):
  - app na Vercel (https://appde-habitos.vercel.app) com repasse de `/api` ao backend no Render (https://appdehabitos.onrender.com) e Postgres no Neon, tudo no plano gratuito;
  - testado no iPhone pelo usuário: login, instalação na tela de início em tela cheia, sessão mantida ao fechar e reabrir, "Sair".

## Em andamento

- **Módulo Tarefas — requisitos** (2026-11-26): cinco funções aprovadas (tarefas do dia, lembrete, recorrentes, Hoje/Próximas/Atrasadas, histórico). Respostas 1–6 dadas em 2026-11-26, incluindo a nova tela de escolha de módulo (Água / Tarefas) após o login. Detalhes aprovados em 2026-11-26.

## Próximas funcionalidades

- **Módulo Água** (Etapas 7–10 do roadmap): meta diária, lembretes por horário com mL e alerta, "quanto falta" para a meta, acompanhamento macro dos dias.

## Bugs

Nenhum bug em aberto no momento.

## Melhorias técnicas (não bloqueantes, sem prioridade definida)

- **Vibração da notificação**: o app não controla. No iPhone, som e vibração das notificações de apps da web seguem os ajustes do iOS (Ajustes → Notificações → Hábitos → Sons; Sons e Tátil), e o Safari ignora a opção `vibrate`. Orientação passada ao usuário em 2026-11-25.

- **Conferir `TRUST_PROXY_HOPS=2` em produção**: o limite de login deve contar por IP do aparelho, e não pelo IP da Vercel.
- **`npm audit` do frontend**: 4 avisos moderados em `minimatch`, dependência de build do `vite-plugin-pwa`/workbox. Afeta só o build, não o app no celular. A correção sugerida (`--force`) rebaixaria o plugin para a 1.x. Rever quando sair versão nova.
- **Ícone provisório** (gota d'água): a paleta virou oficial com o redesign; o ícone ainda é o provisório.
- **Sugestões do design fora das regras** (ficaram de fora, a pedido): recorde de dias seguidos no Histórico e "+ Adicionar lembrete sugerido" quando os lembretes não somam a meta. Incluir só se o usuário pedir.

- Etapa 9 (push): o backend gratuito "dorme" e pode atrasar ou perder o disparo dos lembretes. Resolvido na Etapa 2 com um cron externo gratuito a cada minuto. Na Etapa 9, medir o atraso real no iPhone.
- Decidir se o projeto vai para um repositório git (local e/ou remoto) — não criar remoto nem fazer push sem perguntar.
