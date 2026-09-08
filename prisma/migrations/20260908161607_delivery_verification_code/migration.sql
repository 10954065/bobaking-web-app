-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "delivery_code" TEXT,
ADD COLUMN     "delivery_code_verified_at" TIMESTAMP(3);
