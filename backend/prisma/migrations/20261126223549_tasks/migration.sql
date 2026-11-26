-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "dueDate" DATE,
    "dueMinuteOfDay" INTEGER,
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_completions" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "day" DATE NOT NULL,
    "completedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_completions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tasks_dueDate_idx" ON "tasks"("dueDate");

-- CreateIndex
CREATE INDEX "task_completions_day_idx" ON "task_completions"("day");

-- CreateIndex
CREATE UNIQUE INDEX "task_completions_taskId_day_key" ON "task_completions"("taskId", "day");

-- AddForeignKey
ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ==================== SQL bruto (regras que o Prisma não expressa) ====================
-- Ver docs/banco.md → "Regras de integridade no banco".

-- Título não vazio (até 120, já pelo VARCHAR).
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_title_not_blank" CHECK (char_length(btrim("title")) > 0);

-- Horário válido e só com data.
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_dueMinuteOfDay_range" CHECK ("dueMinuteOfDay" BETWEEN 0 AND 1439);
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_time_requires_date" CHECK ("dueMinuteOfDay" IS NULL OR "dueDate" IS NOT NULL);
