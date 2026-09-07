-- Postgres unique indexes treat NULL as distinct, so the compound unique
-- (user_id, role_id, branch_id) does not prevent duplicate *global* role
-- grants where branch_id IS NULL (e.g. two SUPER_ADMIN rows for the same user).
-- A partial unique index closes that gap for the global-scope case.
CREATE UNIQUE INDEX "user_roles_global_unique" ON "user_roles" ("user_id", "role_id") WHERE "branch_id" IS NULL;
