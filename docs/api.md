# API — App de Hábitos

Prefixo global: `/api`. Documentação interativa (Swagger): `/api/docs` — só fora de produção.

**Autenticação**: `Authorization: Bearer <accessToken>` em toda rota, exceto as marcadas `Público`. Sem token ou com token inválido: `401`.

Atualizar este documento sempre que um endpoint for criado, alterado ou removido.

## Convenções

- Respostas de erro seguem o formato do filtro global:
  ```json
  { "statusCode": 404, "timestamp": "...", "path": "/api/...", "message": "..." }
  ```
- Erro de validação (`400`): `message` é uma lista de frases em português, uma por problema.
- Paginação (`GET` de listagem): query params `page` (default 1), `limit` (default 20, máx. 100), `sortBy`, `sortOrder` (`asc`/`desc`), `search`. Resposta:
  ```json
  { "data": [...], "meta": { "total": 0, "page": 1, "limit": 20, "totalPages": 1 } }
  ```

---

## Auth (`/api/auth`)

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/auth/login` | Público (5 por minuto por IP) | Entra com a senha |
| POST | `/auth/refresh` | Público (cookie) | Renova a sessão (rotação do refresh token) |
| POST | `/auth/logout` | Público (cookie) | Encerra a sessão atual |

O refresh token vai **só** no cookie `refreshToken` (`httpOnly`, `path=/api/auth`, `SameSite=Lax`; `Secure` em produção), nunca no corpo.

### `POST /auth/login`

Corpo: `{ "password": "..." }` (texto, obrigatório, até 72 caracteres; espaços contam).

- `200`: `{ "accessToken": "..." }` e o cookie `refreshToken`.
- `401`: `"Senha incorreta"`.
- `400`: validação.
- `429`: excesso de tentativas.

### `POST /auth/refresh`

Sem corpo; usa o cookie.

- `200`: `{ "accessToken": "..." }` e um cookie novo (o anterior deixa de valer).
- `401` em cada um destes casos:
  - sem cookie;
  - token desconhecido ou expirado;
  - `"Sessão renovada há pouco, tente de novo"` (renovação simultânea; o app tenta de novo sozinho);
  - reuso de um token já trocado, que encerra todas as sessões.

### `POST /auth/logout`

- `204`: revoga o refresh token do cookie e apaga o cookie.

## Health (`/api/health`)

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/health` | Público | Confere se a API e o banco respondem |

### `GET /health`

`200`:
```json
{ "status": "ok", "database": "ok" }
```
`503` quando o banco não responde: `message: "Banco de dados indisponível"`.

<!-- Modelo por módulo:

## <Módulo> (`/api/<rota>`)

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/<rota>` | Autenticado | ... |

### `POST /<rota>`

Corpo, validações, respostas e erros.
-->
