-- Add an unguessable per-order tracking token (existing rows backfilled
-- with a random value first, since orderNumber is sequential/guessable and
-- must not be the credential that gates the live-location feed).
ALTER TABLE "orders" ADD COLUMN "tracking_token" TEXT;

UPDATE "orders"
SET "tracking_token" = md5(random()::text || clock_timestamp()::text || "id")
WHERE "tracking_token" IS NULL;

ALTER TABLE "orders" ALTER COLUMN "tracking_token" SET NOT NULL;

CREATE UNIQUE INDEX "orders_tracking_token_key" ON "orders"("tracking_token");

-- CreateTable
CREATE TABLE "delivery_locations" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "rider_id" TEXT NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "heading" DECIMAL(5,1),
    "speed" DECIMAL(6,2),
    "accuracy" DECIMAL(7,1) NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_locations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "delivery_locations_order_id_key" ON "delivery_locations"("order_id");

CREATE INDEX "delivery_locations_rider_id_idx" ON "delivery_locations"("rider_id");

ALTER TABLE "delivery_locations" ADD CONSTRAINT "delivery_locations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "delivery_locations" ADD CONSTRAINT "delivery_locations_rider_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
