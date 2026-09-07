-- Several timestamp columns were left as bare camelCase ("createdAt"/"updatedAt")
-- while every other column in the schema follows the snake_case DB convention
-- (@map). Rename rather than drop+recreate to preserve existing data.

ALTER TABLE "countries" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "countries" RENAME COLUMN "updatedAt" TO "updated_at";

ALTER TABLE "regions" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "regions" RENAME COLUMN "updatedAt" TO "updated_at";

ALTER TABLE "cities" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "cities" RENAME COLUMN "updatedAt" TO "updated_at";

ALTER TABLE "branches" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "branches" RENAME COLUMN "updatedAt" TO "updated_at";

ALTER TABLE "users" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "users" RENAME COLUMN "updatedAt" TO "updated_at";

ALTER TABLE "sessions" RENAME COLUMN "createdAt" TO "created_at";

ALTER TABLE "roles" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "roles" RENAME COLUMN "updatedAt" TO "updated_at";

ALTER TABLE "user_roles" RENAME COLUMN "createdAt" TO "created_at";

ALTER TABLE "audit_logs" RENAME COLUMN "createdAt" TO "created_at";
