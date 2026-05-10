-- CreateIndex
CREATE INDEX "Debt_status_idx" ON "Debt"("status");

-- CreateIndex
CREATE INDEX "GrabEntry_date_idx" ON "GrabEntry"("date");

-- CreateIndex
CREATE INDEX "PaymentCalendar_status_dueDate_idx" ON "PaymentCalendar"("status", "dueDate");
