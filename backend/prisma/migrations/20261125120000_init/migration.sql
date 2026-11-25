-- CreateEnum
CREATE TYPE "WaterIntakeSource" AS ENUM ('REMINDER', 'MANUAL');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_goal_changes" (
    "id" UUID NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "goalMl" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "water_goal_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_reminders" (
    "id" UUID NOT NULL,
    "minuteOfDay" INTEGER NOT NULL,
    "amountMl" INTEGER NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "water_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_intakes" (
    "id" UUID NOT NULL,
    "day" DATE NOT NULL,
    "amountMl" INTEGER NOT NULL,
    "source" "WaterIntakeSource" NOT NULL,
    "reminderId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "water_intakes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_reminder_dispatches" (
    "id" UUID NOT NULL,
    "reminderId" UUID NOT NULL,
    "day" DATE NOT NULL,
    "sentAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "water_reminder_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "water_goal_changes_effectiveFrom_key" ON "water_goal_changes"("effectiveFrom");

-- CreateIndex
CREATE INDEX "water_intakes_day_idx" ON "water_intakes"("day");

-- CreateIndex
CREATE UNIQUE INDEX "water_reminder_dispatches_reminderId_day_key" ON "water_reminder_dispatches"("reminderId", "day");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_intakes" ADD CONSTRAINT "water_intakes_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "water_reminders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_reminder_dispatches" ADD CONSTRAINT "water_reminder_dispatches_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "water_reminders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ==================== SQL bruto (regras que o Prisma não expressa) ====================
-- Ver docs/banco.md → "Regras de integridade no banco".

-- Meta e quantidades positivas; horário válido.
ALTER TABLE "water_goal_changes" ADD CONSTRAINT "water_goal_changes_goalMl_positive" CHECK ("goalMl" > 0);
ALTER TABLE "water_reminders" ADD CONSTRAINT "water_reminders_amountMl_positive" CHECK ("amountMl" > 0);
ALTER TABLE "water_reminders" ADD CONSTRAINT "water_reminders_minuteOfDay_range" CHECK ("minuteOfDay" BETWEEN 0 AND 1439);
ALTER TABLE "water_intakes" ADD CONSTRAINT "water_intakes_amountMl_positive" CHECK ("amountMl" > 0);

-- Registro de lembrete exige o lembrete; registro livre não aponta para lembrete.
ALTER TABLE "water_intakes" ADD CONSTRAINT "water_intakes_source_matches_reminder" CHECK (
  ("source" = 'REMINDER' AND "reminderId" IS NOT NULL) OR
  ("source" = 'MANUAL' AND "reminderId" IS NULL)
);

-- Dois lembretes ativos não podem ter o mesmo horário.
CREATE UNIQUE INDEX "water_reminders_active_minute_key" ON "water_reminders"("minuteOfDay") WHERE "deletedAt" IS NULL;

-- Cada lembrete é confirmado no máximo uma vez por dia.
CREATE UNIQUE INDEX "water_intakes_reminder_day_key" ON "water_intakes"("day", "reminderId") WHERE "reminderId" IS NOT NULL;
