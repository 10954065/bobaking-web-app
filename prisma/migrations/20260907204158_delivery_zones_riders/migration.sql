-- CreateEnum
CREATE TYPE "RiderVehicleType" AS ENUM ('MOTORBIKE', 'BICYCLE', 'CAR', 'ON_FOOT');

-- CreateEnum
CREATE TYPE "RiderStatus" AS ENUM ('OFFLINE', 'AVAILABLE', 'ON_DELIVERY');

-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "default_delivery_fee" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "assigned_rider_id" TEXT,
ADD COLUMN     "delivery_zone_id" TEXT,
ADD COLUMN     "rider_assigned_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "delivery_zones" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "area_match" TEXT NOT NULL,
    "fee" DECIMAL(10,2) NOT NULL,
    "estimated_minutes" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rider_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "vehicle_type" "RiderVehicleType" NOT NULL DEFAULT 'MOTORBIKE',
    "plate_number" TEXT,
    "status" "RiderStatus" NOT NULL DEFAULT 'OFFLINE',
    "current_latitude" DECIMAL(10,7),
    "current_longitude" DECIMAL(10,7),
    "last_location_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rider_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "delivery_zones_branch_id_idx" ON "delivery_zones"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_zones_branch_id_area_match_key" ON "delivery_zones"("branch_id", "area_match");

-- CreateIndex
CREATE UNIQUE INDEX "rider_profiles_user_id_key" ON "rider_profiles"("user_id");

-- CreateIndex
CREATE INDEX "rider_profiles_branch_id_idx" ON "rider_profiles"("branch_id");

-- CreateIndex
CREATE INDEX "rider_profiles_status_idx" ON "rider_profiles"("status");

-- CreateIndex
CREATE INDEX "orders_assigned_rider_id_idx" ON "orders"("assigned_rider_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_zone_id_fkey" FOREIGN KEY ("delivery_zone_id") REFERENCES "delivery_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_assigned_rider_id_fkey" FOREIGN KEY ("assigned_rider_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_zones" ADD CONSTRAINT "delivery_zones_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rider_profiles" ADD CONSTRAINT "rider_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rider_profiles" ADD CONSTRAINT "rider_profiles_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
