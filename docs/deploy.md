# Deploy — App de Hábitos

Decisões em `docs/decisoes.md`: o app é um PWA ("App será um PWA"), usado no iPhone pelo Safari → "Adicionar à Tela de Início", e fica hospedado em planos gratuitos. Os provedores e o repasse de `/api` foram definidos na Etapa 6. **Regra do projeto: nada pago, nem como sugestão.**

Repositório: https://github.com/matheusmartinsa2001-wq/AppdeHabitos (privado, branch `main`). Os provedores publicam a partir dele a cada push.

## Onde cada peça roda

```
iPhone (PWA na tela de início) / navegador do PC
        │  https://<app>.vercel.app          ← tudo no mesmo site
        ▼
Vercel (plano gratuito)
  ├─ arquivos do app (React + Vite + service worker)
  └─ /api/*  ──repasse (rewrite, frontend/vercel.json)──┐
                                                        ▼
                                  Render (plano gratuito): backend NestJS (Docker)
                                        │  DATABASE_URL (TLS)
                                        ▼
                                  Neon (plano gratuito): PostgreSQL

Cron externo gratuito (Etapa 9, ex.: cron-job.org)
  └─ a cada minuto → endpoint protegido do backend: acorda e dispara os lembretes
```

## Pontos de atenção

- **Por que o repasse de `/api`**: o Safari do iPhone bloqueia cookies de outro site. Se o app chamasse `*.onrender.com` direto, o cookie da sessão seria bloqueado e a senha seria pedida sempre. Com a Vercel repassando `/api`, o navegador só vê o endereço do app, e o cookie é do mesmo site (`SameSite=Lax`).
- **Backend que "dorme"**: o Render gratuito desliga o serviço depois de um tempo sem uso. A primeira requisição depois disso pode levar dezenas de segundos, e o app mostra "Conectando… (pode levar alguns segundos)".
- **HTTPS é obrigatório** para o service worker e a instalação do PWA. A Vercel já dá HTTPS.
- **Segredos** só nas variáveis de ambiente do Render, nunca no repositório (ver a lista no passo 2).
- **Migrations**: rodam sozinhas a cada início do backend (`prisma migrate deploy` no `CMD` do Dockerfile).
- **Backup do banco**: `[A DEFINIR]`, conforme o que o plano gratuito do Neon oferece.

## Passo a passo (primeira vez)

Todas as contas são criadas pelo usuário, no plano gratuito. Pode entrar com a conta do GitHub em todas.

### 1. Neon (banco)

1. Criar a conta em neon.tech e um projeto (ex.: `app-de-habitos`), Postgres 16 ou mais novo. Região: **AWS US East (N. Virginia)**, perto do servidor do Render.
2. Em "Connect", copiar a connection string **direta** (desligar a opção "Connection pooling"). Ela começa com `postgresql://` e termina com `?sslmode=require`. Se vier `&channel_binding=require` no fim, apagar só esse trecho.
3. **Não colar essa string no chat**: ela contém a senha do banco. Ela vai direto no Render, no próximo passo.

### 2. Render (backend)

1. Criar a conta em render.com, ligada ao GitHub, e dar acesso ao repositório `AppdeHabitos`.
2. New → **Web Service** → escolher o repositório.
3. Configuração:
   - **Root Directory**: `backend`
   - **Runtime/Language**: Docker (o Render acha o `backend/Dockerfile`)
   - **Region**: Virginia (US East)
   - **Instance Type**: **Free**
   - **Health Check Path** (em "Advanced"): `/api/health`
4. Variáveis de ambiente (Environment):

   | Variável | Valor |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | a connection string do Neon (passo 1) |
   | `JWT_ACCESS_SECRET` | usar o botão **Generate** do Render (valor aleatório) |
   | `JWT_ACCESS_EXPIRES_IN` | `15m` |
   | `JWT_REFRESH_EXPIRES_IN` | `30d` |
   | `BCRYPT_SALT_ROUNDS` | `10` |
   | `ADMIN_PASSWORD` | a senha do app (mínimo 8 caracteres) |
   | `FRONTEND_URL` | por enquanto `https://exemplo.vercel.app`; trocar no passo 4 |
   | `TRUST_PROXY_HOPS` | `2` (Vercel + Render na frente do backend) |

5. Criar o serviço e esperar o deploy. Nos logs deve aparecer "Conta criada a partir de ADMIN_PASSWORD" e "Aplicação rodando".
6. Copiar o endereço do serviço (`https://<nome>.onrender.com`) e conferir `https://<nome>.onrender.com/api/health` no navegador: `{"status":"ok","database":"ok"}`.

### 3. Ligar o app ao backend

Trocar `ENDERECO-DO-BACKEND` em `frontend/vercel.json` pelo nome do serviço do Render e fazer push. O endereço não é segredo.

### 4. Vercel (app)

1. Criar a conta em vercel.com, ligada ao GitHub (plano Hobby, gratuito).
2. Add New → Project → importar `AppdeHabitos`.
3. **Root Directory**: `frontend`. Framework: Vite (detectado). Não precisa de variável de ambiente: o `frontend/.env.production` já aponta a API para `/api`.
4. Deploy. Copiar o endereço `https://<nome>.vercel.app`.
5. No Render, trocar `FRONTEND_URL` por esse endereço (o serviço reinicia sozinho).

### 5. Teste no iPhone

1. Abrir `https://<nome>.vercel.app` no **Safari**. Entrar com a senha.
2. Compartilhar → **Adicionar à Tela de Início**. Abrir pelo ícone: o app ocupa a tela inteira, sem a barra do Safari.
3. Fechar o app, abrir de novo: deve continuar conectado (cookie funcionando).
4. Testar "Sair" e entrar de novo.

## Atualizações depois do primeiro deploy

Cada push na branch `main` publica de novo no Render e na Vercel. As migrations novas rodam sozinhas quando o backend reinicia.

## Desenvolvimento local

Docker Compose (`postgres`, `backend`, `frontend`), igual ao Vivo Team Management:

1. Copiar `backend/.env.example` → `backend/.env` e `frontend/.env.example` → `frontend/.env`, e preencher.
2. `docker compose up -d --build` na raiz.
3. App em http://localhost:5174, API em http://localhost:3001/api (Swagger em `/api/docs`), Postgres em `localhost:5433`.

O PWA só instala por HTTPS. Para testar no iPhone, usar o deploy da Vercel: cada push gera um endereço de preview.
