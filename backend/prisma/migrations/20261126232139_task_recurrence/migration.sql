-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "repeatDays" SMALLINT;

-- CreateTable
CREATE TABLE "task_repeat_changes" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "repeatDays" SMALLINT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_repeat_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "task_repeat_changes_taskId_effectiveFrom_key" ON "task_repeat_changes"("taskId", "effectiveFrom");

-- AddForeignKey
ALTER TABLE "task_repeat_changes" ADD CONSTRAINT "task_repeat_changes_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ==================== SQL bruto (regras que o Prisma não expressa) ====================
-- Ver docs/banco.md → "Regras de integridade no banco".

-- Dias da semana como bits: domingo = 1 … sábado = 64 (pelo menos um dia).
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_repeatDays_range" CHECK ("repeatDays" BETWEEN 1 AND 127);
ALTER TABLE "task_repeat_changes" ADD CONSTRAINT "task_repeat_changes_repeatDays_range" CHECK ("repeatDays" BETWEEN 1 AND 127);

-- Recorrente não tem data.
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_recurring_without_date" CHECK ("repeatDays" IS NULL OR "dueDate" IS NULL);

-- Horário: com data (avulsa) ou com repetição (recorrente).
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_time_requires_date";
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_time_requires_date_or_repeat" CHECK ("dueMinuteOfDay" IS NULL OR "dueDate" IS NOT NULL OR "repeatDays" IS NOT NULL);
