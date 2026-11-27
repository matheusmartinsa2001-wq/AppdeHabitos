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

## Água do dia (`/api/water`)

Todas exigem login. Só o dia de hoje (Brasília) pode ser alterado.

| Método | Rota | Descrição |
|---|---|---|
| GET | `/water/today` | Resumo de hoje |
| POST | `/water/reminders/:id/confirm` | "Tomei": registra hoje a quantidade do lembrete |
| POST | `/water/intakes` | Registro livre: `{ "amountMl": 300 }` (50 a 2.000) |
| DELETE | `/water/intakes/:id` | Desfaz um registro de hoje |

Todas respondem com o resumo de hoje (`200`, ou `201` no registro livre):

```json
{
  "day": "2026-11-25",
  "goalMl": 3000,
  "totalMl": 1300,
  "remainingMl": 1700,
  "goalReached": false,
  "remindersShortfallMl": 500,
  "reminders": [{ "id": "uuid", "time": "08:00", "amountMl": 1000, "intakeId": "uuid-ou-null" }],
  "intakes": [{ "id": "uuid", "time": "08:05", "amountMl": 1000, "source": "REMINDER", "reminderTime": "08:00" }]
}
```

- Sem meta, `goalMl`, `remainingMl`, `goalReached` e `remindersShortfallMl` são `null`.
- `goalReached` é verdadeiro quando o total é maior ou igual à meta.
- `intakes` vêm do mais recente para o mais antigo. `time` é a hora do registro em Brasília.
- Erros:
  - `409`: `"O lembrete das 08:00 já foi marcado hoje"`;
  - `409`: `"Registros de dias anteriores não podem ser alterados"`;
  - `404`: lembrete (inexistente ou excluído) ou registro não encontrado;
  - `400`: validação.

## Histórico da água (`/api/water/history`)

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/water/history?month=2026-11` | Login | Calendário do mês, sequência e percentual. Sem `month`, usa o mês atual (Brasília) |

```json
{
  "month": "2026-11",
  "days": [{ "day": "2026-11-24", "status": "met", "goalMl": 3000, "totalMl": 3100 }],
  "metDays": 4,
  "evaluatedDays": 5,
  "percent": 80,
  "currentStreak": 3,
  "firstDay": "2026-11-20",
  "canGoBack": true,
  "canGoForward": false
}
```

- `days` traz todos os dias do mês. `status`:
  - `met`: total maior ou igual à meta do dia;
  - `missed`: abaixo da meta;
  - `today`: hoje, em andamento;
  - `none`: antes da primeira meta ou no futuro.
- `percent` é `metDays/evaluatedDays` arredondado, ou `null` sem dias avaliados.
- `currentStreak` conta os dias seguidos até ontem, mais hoje se já bateu.
- `month` inválido: `400` "Mês precisa estar no formato AAAA-MM (ex.: 2026-11)".

## Notificações (`/api/push`)

Todas exigem login.

| Método | Rota | Descrição |
|---|---|---|
| GET | `/push/status` | `{ "enabled": true, "publicKey": "..." }`. `enabled: false` quando o servidor está sem chaves VAPID |
| POST | `/push/subscriptions` | Inscreve o aparelho (`PushSubscription.toJSON()`: `{ endpoint (https), keys: { p256dh, auth } }`). Mesmo endpoint de novo só atualiza. `204` |
| DELETE | `/push/subscriptions` | `{ "endpoint": "..." }`: cancela. `204` |
| POST | `/push/test` | Envia uma notificação de teste para todos os aparelhos: `{ sent, removed, failed }` (5 por minuto) |

Sem chaves VAPID, `subscriptions` e `test` devolvem `503` "Notificações não configuradas no servidor".

## Disparo dos lembretes (`/api/jobs`)

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/jobs/water-reminders` | Header `X-Cron-Secret` igual a `CRON_SECRET` (sem login) | Chamado a cada minuto pelo cron-job.org. Notifica os lembretes no horário (até 10 min de atraso), uma vez por lembrete por dia. Resposta: `{ "notified": ["08:00"] }`. Segredo ausente ou errado: `401` |

Fica fora do Swagger. O cron chama o Render direto (`https://appdehabitos.onrender.com/api/jobs/water-reminders`), não pela Vercel.

## Tarefas (`/api/tasks`) — Etapa 13

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/tasks` | As três listas de uma vez: `{ today, upcoming, overdue }`. Cada tarefa: `id`, `title`, `date` (`AAAA-MM-DD` ou `null`), `time` (`HH:MM` ou `null`), `done`, `completedToday` |
| `POST` | `/tasks` | Cria. Corpo: `title` (1–120), `date` opcional (hoje ou futura), `time` opcional (exige `date`) |
| `PATCH` | `/tasks/:id` | Edita título, data ou horário |
| `DELETE` | `/tasks/:id` | Exclui (lógica). A conclusão continua no histórico |
| `POST` | `/tasks/:id/complete` | Conclui hoje. `409` se já está concluída |
| `DELETE` | `/tasks/:id/complete` | Desfaz. `409` se a conclusão não foi hoje |

As respostas de escrita devolvem as três listas atualizadas, como `GET /tasks`.

### Recorrentes (Etapa 14)

- `POST /tasks` e `PATCH /tasks/:id` aceitam `repeat`: `null` (avulsa) ou uma lista de dias da semana, `0` (domingo) a `6` (sábado). Com `repeat`, `date` precisa ser `null`; `time` é opcional.
- Cada tarefa da resposta ganha `repeat` (`number[]` ou `null`).
- `GET /tasks` ganha `recurring`: todas as recorrentes ativas, para ver e editar. As ocorrências de hoje aparecem em `today`, como as outras tarefas.
- `complete` / `DELETE complete` de uma recorrente valem para a ocorrência de hoje; `409` se ela não cai hoje.

### Lembretes das tarefas (Etapa 15)

- `POST /jobs/water-reminders` (cron, `X-Cron-Secret`) dispara também os lembretes das tarefas. O endereço não mudou, para não mexer no cron-job.org. Resposta: `{ notified: string[], tasks: string[] }` (`tasks` = "HH:MM título" de cada tarefa avisada).

### Histórico das tarefas (Etapa 16)

`GET /tasks/history?month=AAAA-MM` (padrão: mês atual). Resposta: `month`, `days` (cada dia com `day`, `status` = `met` | `missed` | `empty` | `today` | `none`, `completed` = concluídas no dia, `planned` = `{ id, title, done }[]` do que era do dia), `metDays`, `evaluatedDays`, `percent`, `currentStreak`, `firstDay` (dia da primeira tarefa criada), `canGoBack`, `canGoForward`. `400` com mês inválido.

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
