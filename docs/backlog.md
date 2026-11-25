# Backlog — App de Hábitos

Manter sempre atualizado. Ao concluir uma feature, mover para "Concluído" e atualizar `docs/changelog.md` no mesmo momento.

## Concluído

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

## Em andamento

- **Etapa 6 — Primeiro deploy e teste no iPhone**: plano proposto ao usuário em 2026-11-25, aguardando decisões (proxy de `/api` e repositório no GitHub).

## Próximas funcionalidades

- **Módulo Água** (Etapas 7–10 do roadmap): meta diária, lembretes por horário com mL e alerta, "quanto falta" para a meta, acompanhamento macro dos dias.

## Bugs

Nenhum bug em aberto no momento.

## Melhorias técnicas (não bloqueantes, sem prioridade definida)

- **Service worker não confirmado no navegador embutido do Claude**: o `sw.js` é gerado e servido corretamente (200, `application/javascript`, JavaScript válido), mas o navegador embutido recusa registrar service workers ("unknown error occurred when fetching the script"). Confirmar a instalação do PWA no iPhone na Etapa 6.
- **`npm audit` do frontend**: 4 avisos moderados em `minimatch`, dependência de build do `vite-plugin-pwa`/workbox. Afeta só o build, não o app no celular. A correção sugerida (`--force`) rebaixaria o plugin para a 1.x. Rever quando sair versão nova.
- **Paleta e ícone provisórios** (azul-petróleo com gota d'água): definir com o usuário.

- Etapa 9 (push): o backend gratuito "dorme" e pode atrasar ou perder o disparo dos lembretes. Resolvido na Etapa 2 com um cron externo gratuito a cada minuto. Na Etapa 9, medir o atraso real no iPhone.
- Decidir se o projeto vai para um repositório git (local e/ou remoto) — não criar remoto nem fazer push sem perguntar.
