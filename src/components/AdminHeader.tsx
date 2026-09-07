import Link from "next/link";
import { signOut } from "@/auth";

const NAV_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/menu", label: "Menu" },
  { href: "/admin/recipes", label: "Recipes" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/customers", label: "Customers" },
];

export function AdminHeader() {
  return (
    <header className="border-b border-stone-200 bg-white px-6 py-4 dark:border-stone-800 dark:bg-stone-900">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <div className="flex items-center gap-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">Flicks &amp; Licks</p>
            <h1 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Admin</h1>
          </div>
          <nav className="flex gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-50"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
