import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  BookOpen,
  Boxes,
  Truck,
  Megaphone,
  Users,
  BarChart3,
  LifeBuoy,
  FileBarChart,
  type LucideIcon,
} from "lucide-react";
import { ROLES, type RoleName } from "@/modules/roles/roles";

/**
 * Which top-level app a role's primary work happens in. This is deliberately
 * role-based (not derived from fine-grained permissions) because several
 * operational roles hold narrow read grants (e.g. FRONT_DESK can read
 * products/customers so the POS can look them up) that were never meant to
 * unlock the back-office admin pages those reads also happen to gate.
 * Within the "admin" surface, the actual sidebar items ARE permission-driven
 * (see NAV_ITEMS below) so BRANCH_MANAGER sees less than SUPER_ADMIN without
 * any per-role list to maintain.
 */
export type Surface = "admin" | "pos" | "kitchen" | "rider" | "none";

const ADMIN_SURFACE_ROLES: ReadonlySet<RoleName> = new Set([
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.BRANCH_MANAGER,
  ROLES.FINANCE,
  ROLES.MARKETING,
  ROLES.CUSTOMER_SUPPORT,
]);

const POS_SURFACE_ROLES: ReadonlySet<RoleName> = new Set([ROLES.FRONT_DESK, ROLES.CASHIER]);
const KITCHEN_SURFACE_ROLES: ReadonlySet<RoleName> = new Set([ROLES.KITCHEN_MANAGER, ROLES.KITCHEN_STAFF]);
const RIDER_SURFACE_ROLES: ReadonlySet<RoleName> = new Set([ROLES.RIDER]);

export function resolvePrimarySurface(roleNames: string[]): Surface {
  const roles = new Set(roleNames);
  if ([...roles].some((r) => ADMIN_SURFACE_ROLES.has(r as RoleName))) return "admin";
  if ([...roles].some((r) => POS_SURFACE_ROLES.has(r as RoleName))) return "pos";
  if ([...roles].some((r) => KITCHEN_SURFACE_ROLES.has(r as RoleName))) return "kitchen";
  if ([...roles].some((r) => RIDER_SURFACE_ROLES.has(r as RoleName))) return "rider";
  return "none";
}

export function surfaceHomeHref(surface: Surface): string {
  switch (surface) {
    case "pos":
      return "/pos";
    case "kitchen":
      return "/kitchen";
    case "rider":
      return "/rider";
    default:
      return "/admin";
  }
}

interface NavPermission {
  resource: string;
  action: string;
}

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Visible if the profile holds ANY of these grants (branch-scoped counts). */
  anyOf: NavPermission[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, anyOf: [] },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList, anyOf: [{ resource: "orders", action: "read" }] },
  { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed, anyOf: [{ resource: "products", action: "read" }] },
  { href: "/admin/recipes", label: "Recipes", icon: BookOpen, anyOf: [{ resource: "recipes", action: "read" }] },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes, anyOf: [{ resource: "inventory", action: "read" }] },
  { href: "/admin/delivery", label: "Delivery", icon: Truck, anyOf: [{ resource: "delivery", action: "read" }] },
  {
    href: "/admin/marketing",
    label: "Marketing",
    icon: Megaphone,
    anyOf: [
      { resource: "marketing", action: "read" },
      { resource: "promotions", action: "read" },
      { resource: "loyalty", action: "read" },
    ],
  },
  { href: "/admin/customers", label: "Customers", icon: Users, anyOf: [{ resource: "customers", action: "read" }] },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, anyOf: [{ resource: "analytics", action: "read" }] },
  {
    href: "/admin/support",
    label: "Support",
    icon: LifeBuoy,
    anyOf: [
      { resource: "support", action: "read" },
      { resource: "reviews", action: "read" },
      { resource: "notifications", action: "read" },
    ],
  },
  {
    href: "/admin/reports",
    label: "Reports",
    icon: FileBarChart,
    anyOf: [
      { resource: "analytics", action: "export" },
      { resource: "inventory", action: "read" },
      { resource: "support", action: "read" },
      { resource: "reviews", action: "read" },
    ],
  },
];

/**
 * Which nav item hrefs a profile should see. Takes a plain predicate instead
 * of importing hasAnyPermission/AccessProfile directly, so this module stays
 * free of server-only (Prisma-backed) imports — it's shared as-is with the
 * client-side DashboardShell, which resolves each href back to its icon
 * from its own NAV_ITEMS import (icon components can't cross the server/
 * client boundary as props).
 */
export function visibleNavHrefs(hasAny: (resource: string, action: string) => boolean): string[] {
  return NAV_ITEMS.filter((item) => item.anyOf.length === 0 || item.anyOf.some((p) => hasAny(p.resource, p.action))).map(
    (item) => item.href
  );
}
