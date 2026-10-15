-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "firstRespondedAt" TIMESTAMP(3),
ADD COLUMN     "resolutionDueAt" TIMESTAMP(3),
ADD COLUMN     "responseDueAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Ticket_slaId_idx" ON "Ticket"("slaId");

-- CreateIndex
CREATE INDEX "Ticket_responseDueAt_idx" ON "Ticket"("responseDueAt");

-- CreateIndex
CREATE INDEX "Ticket_resolutionDueAt_idx" ON "Ticket"("resolutionDueAt");
