-- CreateIndex
CREATE INDEX "PhysicalItem_materialId_idx" ON "PhysicalItem"("materialId");

-- CreateIndex
CREATE INDEX "PhysicalItem_operationalUnitId_idx" ON "PhysicalItem"("operationalUnitId");

-- CreateIndex
CREATE INDEX "PhysicalItem_serviceOrderItemId_idx" ON "PhysicalItem"("serviceOrderItemId");

-- CreateIndex
CREATE INDEX "PhysicalItem_status_idx" ON "PhysicalItem"("status");

-- CreateIndex
CREATE INDEX "ServiceOrder_eventId_idx" ON "ServiceOrder"("eventId");

-- CreateIndex
CREATE INDEX "ServiceOrder_userId_idx" ON "ServiceOrder"("userId");

-- CreateIndex
CREATE INDEX "ServiceOrder_status_idx" ON "ServiceOrder"("status");

-- CreateIndex
CREATE INDEX "ServiceOrderItem_serviceOrderId_idx" ON "ServiceOrderItem"("serviceOrderId");

-- CreateIndex
CREATE INDEX "ServiceOrderItem_materialId_idx" ON "ServiceOrderItem"("materialId");

-- CreateIndex
CREATE INDEX "ServiceOrderItem_operationalUnitId_idx" ON "ServiceOrderItem"("operationalUnitId");

-- CreateIndex
CREATE INDEX "ServiceOrderItem_status_idx" ON "ServiceOrderItem"("status");
