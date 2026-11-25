# Banco de Dados — App de Hábitos

PostgreSQL 16 (Neon, plano gratuito, em produção; container do Docker em desenvolvimento). O schema ficará em `backend/prisma/schema.prisma`. Este documento resume entidades, relacionamentos e regras de integridade. Sempre atualizar quando o schema mudar.

> Modelagem aprovada na Etapa 3 (2026-11-25). Schema em `backend/prisma/schema.prisma` desde a Etapa 4.

## Migrations aplicadas

| Migration | O que faz |
|---|---|
| `20261125130000_refresh_token_hash_unique` | `refresh_tokens.tokenHash` passa a ser único (busca do token pelo hash, Etapa 5) |
| `20261125120000_init` | Cria as 7 tabelas, o enum `WaterIntakeSource`, as FKs e, em SQL bruto, os `CHECK` (valores positivos, horário 0..1439, `source` × `reminderId`) e os índices únicos parciais (lembrete ativo por horário; confirmação por lembrete e dia) |

## Diagrama

```mermaid
erDiagram
    users ||--o{ refresh_tokens : "sessões"
    users ||--o{ push_subscriptions : "aparelhos"
    water_reminders ||--o{ water_intakes : "confirmado em"
    water_reminders ||--o{ water_reminder_dispatches : "notificado em"

    users {
        uuid id PK
        text passwordHash
        timestamptz createdAt
    }
    refresh_tokens {
        uuid id PK
        uuid userId FK
        text tokenHash
        timestamptz expiresAt
        timestamptz revokedAt "nulo = válido"
        timestamptz createdAt
    }
    push_subscriptions {
        uuid id PK
        uuid userId FK
        text endpoint UK
        text p256dh
        text auth
        timestamptz createdAt
    }
    water_goal_changes {
        uuid id PK
        date effectiveFrom UK "dia em Brasília"
        int goalMl
        timestamptz createdAt
    }
    water_reminders {
        uuid id PK
        int minuteOfDay "0..1439, horário de Brasília"
        int amountMl
        timestamptz deletedAt "nulo = ativo"
        timestamptz createdAt
    }
    water_intakes {
        uuid id PK
        date day "dia em Brasília"
        int amountMl
        enum source "REMINDER | MANUAL"
        uuid reminderId FK "só quando source = REMINDER"
        timestamptz createdAt
    }
    water_reminder_dispatches {
        uuid id PK
        uuid reminderId FK
        date day
        timestamptz sentAt
    }
```

## Entidades

### Acesso

- **`users`**: uma linha só, criada **no boot do backend** (`AccountBootstrapService`) com o hash bcrypt da senha lida de variável de ambiente (`ADMIN_PASSWORD`). Não há e-mail nem nome de usuário. O login é só pela senha.
- **`refresh_tokens`**: guarda o hash SHA-256 do refresh token opaco (nunca o valor), com rotação a cada uso. `tokenHash` é único. Logout ou rotação preenchem `revokedAt`.
- **`push_subscriptions`**: uma linha por aparelho ou navegador que aceitou notificações (dados do Web Push). `endpoint` é único. Se o serviço de push responder que a inscrição expirou (404/410), a linha é apagada.

### Módulo Água

- **`water_goal_changes`**: histórico da meta diária. **A meta de um dia D é a da linha com o maior `effectiveFrom` ≤ D.** Mudar a meta cria uma linha com `effectiveFrom` = hoje. Se já existe uma linha para hoje, ela é atualizada (único por `effectiveFrom`). Assim, dias passados nunca mudam de meta.
- **`water_reminders`**: lembretes, iguais todos os dias.
  - O horário é guardado como minuto do dia (ex.: 08:30 = 510), no horário de Brasília.
  - Excluir um lembrete é exclusão lógica (`deletedAt`), para não quebrar os registros antigos que apontam para ele.
  - A soma de `amountMl` dos lembretes ativos é comparada com a meta para mostrar o aviso de "não vai bater a meta". Isso é calculado, não guardado.
- **`water_intakes`**: cada registro do que foi bebido.
  - `day` é o dia em Brasília em que o registro foi feito, e a quantidade fica gravada no próprio registro. Se o lembrete mudar de quantidade depois, o histórico não muda.
  - `source = REMINDER` exige `reminderId`; `source = MANUAL` exige `reminderId` nulo.
  - Só é possível criar ou apagar registros com `day` = hoje. Essa regra fica no service, e o banco não aceita `day` futuro.
- **`water_reminder_dispatches`**: marca que a notificação de um lembrete foi enviada num dia. O único (`reminderId`, `day`) garante **uma notificação só por lembrete por dia**, mesmo que o cron chame o backend várias vezes ou duas chamadas se cruzem.

### Valores calculados (não guardados)

- **Total do dia** = soma de `water_intakes.amountMl` do dia.
- **Quanto falta** = max(0, meta do dia − total do dia).
- **Meta batida** = total ≥ meta do dia.
- **Calendário, sequência e percentual do mês**: agregação por `day` cruzada com a meta de cada dia. Não há tabela de resumo, porque o volume de um único usuário é pequeno.

## Regras de integridade no banco

| Regra | Como |
|---|---|
| Uma meta por dia de vigência | `UNIQUE (effectiveFrom)` em `water_goal_changes` |
| Meta e quantidades positivas | `CHECK (goalMl > 0)`, `CHECK (amountMl > 0)` (SQL bruto na migration) |
| Horário válido | `CHECK (minuteOfDay BETWEEN 0 AND 1439)` |
| Não ter dois lembretes ativos no mesmo horário | índice único parcial em `minuteOfDay WHERE deletedAt IS NULL` (SQL bruto) |
| Lembrete confirmado uma vez por dia | índice único parcial em (`day`, `reminderId`) `WHERE reminderId IS NOT NULL` (SQL bruto) |
| `source` coerente com `reminderId` | `CHECK` na migration |
| Uma notificação por lembrete por dia | `UNIQUE (reminderId, day)` em `water_reminder_dispatches` |

## Enums

| Enum | Valores |
|---|---|
| `WaterIntakeSource` | `REMINDER` (confirmou um lembrete), `MANUAL` (registro livre) |

## Convenções do schema

- Tabelas em `snake_case` via `@@map`, models em `PascalCase`, enums em `SCREAMING_SNAKE_CASE`.
- Ids `uuid`.
- Instantes em `timestamptz`. "Dias" de negócio em `date`, já convertidos para o dia de Brasília pelo backend.
- Regras que o Prisma não expressa (índice único parcial, `CHECK`) vão em SQL bruto dentro da migration.

## Rodando migrations

```bash
# aplicar migrations pendentes (produção/CI)
npx prisma migrate deploy

# criar uma nova migration a partir de mudanças no schema.prisma (dev)
npx prisma migrate dev --name <nome>

# rodar o seed (idempotente)
npx prisma db seed
```
