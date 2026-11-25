# Deploy — App de Hábitos

Decisão em `docs/decisoes.md` (2026-11-25, "App será um PWA"): o app é um PWA, usado no iPhone pelo Safari → "Adicionar à Tela de Início", e fica hospedado em planos gratuitos. **Regra do projeto: nada pago, nem como sugestão.**

## Onde cada peça roda

```
iPhone (PWA na tela de início) / navegador do PC
        │  https://<frontend>
        ▼
Frontend estático (React + Vite + service worker)
  Vercel | Netlify | Cloudflare Pages        ← [A DEFINIR qual]
        │  https://<backend>/api
        ▼
Backend NestJS
  Render | Koyeb                             ← [A DEFINIR qual]
        │  DATABASE_URL (TLS)
        ▼
PostgreSQL gerenciado
  Neon (plano gratuito)

Cron externo gratuito (ex.: cron-job.org)
  └─ a cada minuto → POST <backend>/api/... (endpoint protegido por segredo)
     acorda o backend e dispara os lembretes do horário
```

## Pontos de atenção (registrados na decisão)

- **Origens diferentes**: CORS só para a URL do frontend. O cookie de refresh, se houver login, precisa de `SameSite=None; Secure`. Testar no Safari do iPhone. Alternativa gratuita: rewrite de `/api` no provedor do frontend, para tudo ficar na mesma origem (domínio próprio está fora, por ser pago).
- **Backend que "dorme"**: a primeira requisição depois de um tempo parado pode levar dezenas de segundos. O frontend precisa mostrar carregamento.
- **HTTPS é obrigatório** para o service worker e a instalação do PWA. Os três provedores de frontend já dão HTTPS.
- **Segredos** só nas variáveis de ambiente de cada provedor, nunca no repositório. O repositório guarda um `.env.example`. Variáveis do backend:
  - `DATABASE_URL`, `FRONTEND_URL` (URL pública do app, para o CORS) e `NODE_ENV=production`;
  - `JWT_ACCESS_SECRET` (aleatório, 32+ caracteres), `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `BCRYPT_SALT_ROUNDS`;
  - `ADMIN_PASSWORD` (senha do app; trocar = mudar e reiniciar);
  - `TRUST_PROXY_HOPS` (1 atrás do proxy do provedor).
- **Migrations**: `prisma migrate deploy` no start/build do backend.
- **Backup do banco**: `[A DEFINIR]`, conforme o que o plano gratuito do provedor escolhido oferece.
- **Repositório git**: os provedores costumam publicar a partir de um repositório no GitHub. Criar o repositório remoto só com autorização do usuário.

## Passo a passo

`[A DEFINIR]`: escrito na etapa de deploy, depois de escolher os provedores e testar a instalação no iPhone.

## Desenvolvimento local

Docker Compose (`postgres`, `backend`, `frontend`), igual ao Vivo Team Management:

1. Copiar `backend/.env.example` → `backend/.env` e `frontend/.env.example` → `frontend/.env`.
2. `docker compose up -d --build` na raiz.
3. App em http://localhost:5174, API em http://localhost:3001/api (Swagger em `/api/docs`), Postgres em `localhost:5433`. Para testar o PWA no iPhone durante o desenvolvimento, é preciso abrir o app por HTTPS, por exemplo com um deploy de preview ou um túnel. `[A DEFINIR]` na Etapa 4.
