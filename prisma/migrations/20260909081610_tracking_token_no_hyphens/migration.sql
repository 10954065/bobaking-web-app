-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "tracking_token" SET DEFAULT replace(gen_random_uuid()::text, '-', '');
