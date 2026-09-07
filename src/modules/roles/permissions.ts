/**
 * Canonical permission catalog. Permissions are persisted as data (see prisma/seed.ts)
 * so new roles or grants never require a migration — but the *vocabulary* of
 * resource.action strings used across the app lives here as the single source of truth,
 * so services and UI guards can reference PERMISSIONS.orders.read instead of raw strings.
 */

export type PermissionAction =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "cancel"
  | "refund"
  | "adjust"
  | "transfer"
  | "assign"
  | "export"
  | "moderate";

export interface PermissionDefinition {
  resource: string;
  action: PermissionAction;
  description: string;
}

function perm(resource: string, action: PermissionAction, description: string): PermissionDefinition {
  return { resource, action, description };
}

export const PERMISSION_CATALOG: PermissionDefinition[] = [
  // Identity & access
  perm("users", "read", "View staff/user accounts"),
  perm("users", "create", "Create staff/user accounts"),
  perm("users", "update", "Edit staff/user accounts"),
  perm("users", "delete", "Deactivate staff/user accounts"),
  perm("roles", "read", "View roles and their permissions"),
  perm("roles", "create", "Create roles"),
  perm("roles", "update", "Edit roles or their permissions"),
  perm("roles", "delete", "Delete roles"),
  perm("roles", "assign", "Assign roles to users"),

  // Branches
  perm("branches", "read", "View branch records"),
  perm("branches", "create", "Create new branches"),
  perm("branches", "update", "Edit branch details, hours, settings"),
  perm("branches", "delete", "Deactivate a branch"),

  // Orders
  perm("orders", "read", "View orders"),
  perm("orders", "create", "Create orders"),
  perm("orders", "update", "Update order details/status"),
  perm("orders", "cancel", "Cancel an order"),
  perm("orders", "refund", "Refund an order"),

  // Catalog
  perm("products", "read", "View products/menu"),
  perm("products", "create", "Create products"),
  perm("products", "update", "Edit products"),
  perm("products", "delete", "Remove products"),
  perm("categories", "read", "View categories"),
  perm("categories", "create", "Create categories"),
  perm("categories", "update", "Edit categories"),
  perm("categories", "delete", "Remove categories"),

  // Inventory
  perm("inventory", "read", "View stock levels"),
  perm("inventory", "adjust", "Adjust stock counts"),
  perm("inventory", "transfer", "Transfer stock between branches"),

  // Kitchen
  perm("kitchen", "read", "View kitchen display / stations"),
  perm("kitchen", "update", "Update kitchen order/station state"),

  // Delivery & riders
  perm("delivery", "read", "View deliveries"),
  perm("delivery", "update", "Update delivery status"),
  perm("delivery", "assign", "Assign a delivery to a rider"),
  perm("riders", "read", "View riders"),
  perm("riders", "create", "Create rider accounts"),
  perm("riders", "update", "Edit rider accounts"),

  // Payments
  perm("payments", "read", "View payment transactions"),
  perm("payments", "create", "Initiate/collect a payment"),
  perm("payments", "refund", "Issue payment refunds"),

  // Marketing / promotions / loyalty
  perm("promotions", "read", "View promotions"),
  perm("promotions", "create", "Create promotions"),
  perm("promotions", "update", "Edit promotions"),
  perm("promotions", "delete", "Remove promotions"),
  perm("marketing", "read", "View marketing campaigns"),
  perm("marketing", "create", "Create marketing campaigns"),
  perm("marketing", "update", "Edit marketing campaigns"),
  perm("marketing", "delete", "Remove marketing campaigns"),
  perm("loyalty", "read", "View loyalty configuration/accounts"),
  perm("loyalty", "update", "Edit loyalty rules"),

  // Analytics & audit
  perm("analytics", "read", "View analytics dashboards"),
  perm("analytics", "export", "Export analytics/reports"),
  perm("audit", "read", "View audit logs"),

  // Customers & support
  perm("customers", "read", "View customer records"),
  perm("customers", "create", "Create customer records"),
  perm("customers", "update", "Edit customer records"),
  perm("support", "read", "View support tickets"),
  perm("support", "update", "Update/resolve support tickets"),
  perm("reviews", "read", "View reviews"),
  perm("reviews", "moderate", "Moderate/hide reviews"),

  // Settings
  perm("settings", "read", "View system settings"),
  perm("settings", "update", "Edit system settings"),
];

export function permissionKey(resource: string, action: string): string {
  return `${resource}.${action}`;
}
