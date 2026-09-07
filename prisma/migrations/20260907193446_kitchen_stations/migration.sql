-- CreateEnum
CREATE TYPE "OrderItemKitchenStatus" AS ENUM ('PENDING', 'PREPARING', 'READY');

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "kitchen_status" "OrderItemKitchenStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "ready_at" TIMESTAMP(3),
ADD COLUMN     "started_at" TIMESTAMP(3),
ADD COLUMN     "station_slug" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "station_slug" TEXT;

-- CreateTable
CREATE TABLE "kitchen_stations" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kitchen_stations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kitchen_stations_branch_id_slug_key" ON "kitchen_stations"("branch_id", "slug");

-- CreateIndex
CREATE INDEX "order_items_kitchen_status_idx" ON "order_items"("kitchen_status");

-- AddForeignKey
ALTER TABLE "kitchen_stations" ADD CONSTRAINT "kitchen_stations_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
