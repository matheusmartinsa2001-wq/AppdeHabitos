-- CreateTable
CREATE TABLE "task_reminder_dispatches" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "day" DATE NOT NULL,
    "sentAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_reminder_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "task_reminder_dispatches_taskId_day_key" ON "task_reminder_dispatches"("taskId", "day");

-- AddForeignKey
ALTER TABLE "task_reminder_dispatches" ADD CONSTRAINT "task_reminder_dispatches_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
