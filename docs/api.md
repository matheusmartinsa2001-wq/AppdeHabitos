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

## Água (`/api/water`)

Todas exigem login.

| Método | Rota | Descrição |
|---|---|---|
| GET | `/water/settings` | Meta de hoje, lembretes e a soma × meta |
| PUT | `/water/goal` | Define a meta diária (vale a partir de hoje) |
| POST | `/water/reminders` | Cria um lembrete |
| PATCH | `/water/reminders/:id` | Altera horário e/ou mL |
| DELETE | `/water/reminders/:id` | Exclui (exclusão lógica) |

### `GET /water/settings` e resposta de `PUT /water/goal`

```json
{
  "goalMl": 3000,
  "goalEffectiveFrom": "2026-11-25",
  "reminders": [
    { "id": "uuid", "time": "08:00", "amountMl": 1000 },
    { "id": "uuid", "time": "10:30", "amountMl": 1500 }
  ],
  "remindersTotalMl": 2500,
  "remindersShortfallMl": 500
}
```

- Antes da primeira meta, `goalMl`, `goalEffectiveFrom` e `remindersShortfallMl` são `null`.
- `remindersShortfallMl` é `0` quando os lembretes chegam à meta.
- A meta é a que vale **hoje** em Brasília. Os lembretes vêm em ordem de horário.

### `PUT /water/goal`

Corpo `{ "goalMl": 3000 }`, inteiro de 500 a 10.000.

- Grava com vigência a partir de hoje (Brasília). Mudar de novo no mesmo dia só atualiza.
- `400` fora dos limites.

### `POST /water/reminders` / `PATCH /water/reminders/:id`

Corpo `{ "time": "08:30", "amountMl": 500 }`. No `PATCH`, os dois campos são opcionais.

- `time`: `HH:MM`, horário de Brasília.
- `amountMl`: inteiro de 50 a 2.000.
- Respostas:
  - `201`/`200`: `{ "id", "time", "amountMl" }`;
  - `409`: `"Já existe um lembrete às 08:30"`;
  - `404`: `"Lembrete não encontrado"` (inexistente ou excluído);
  - `400`: validação, ou id que não é UUID.

### `DELETE /water/reminders/:id`

- `204` com exclusão lógica (`deletedAt`), que libera o horário.
- `404` se não existir.

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
