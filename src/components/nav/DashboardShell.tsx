"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X, LogOut, ChevronLeft, UtensilsCrossed } from "lucide-react";
import { NAV_ITEMS, type NavItem } from "@/lib/dashboard-nav";

interface DashboardShellProps {
  visibleHrefs: string[];
  userName: string;
  roleLabel: string;
  branchLabel: string;
  signOutAction: () => Promise<void>;
  children: ReactNode;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

function isActiveHref(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  active,
  collapsed,
  index,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  index: number;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25, ease: "easeOut" }}
    >
      <Link
        href={item.href}
        onClick={onNavigate}
        title={collapsed ? item.label : undefined}
        className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
          active
            ? "bg-orange-600/15 text-orange-400"
            : "text-stone-400 hover:bg-stone-800/70 hover:text-stone-100"
        }`}
      >
        {active && (
          <motion.span
            layoutId="active-nav-pill"
            className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-orange-500"
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
          />
        )}
        <Icon
          size={18}
          strokeWidth={2}
          className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${active ? "text-orange-400" : ""}`}
        />
        <span className={`whitespace-nowrap transition-all duration-200 ${collapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}>
          {item.label}
        </span>
      </Link>
    </motion.div>
  );
}

function SidebarContent({
  navItems,
  pathname,
  collapsed,
  userName,
  roleLabel,
  branchLabel,
  signOutAction,
  onNavigate,
}: {
  navItems: NavItem[];
  pathname: string;
  collapsed: boolean;
  userName: string;
  roleLabel: string;
  branchLabel: string;
  signOutAction: () => Promise<void>;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className={`flex items-center gap-2.5 px-4 py-5 ${collapsed ? "justify-center px-2" : ""}`}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white shadow-lg shadow-orange-900/30">
          <UtensilsCrossed size={18} strokeWidth={2.25} />
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">Flicks &amp; Licks</p>
            <p className="truncate text-sm font-medium text-stone-300">Operations</p>
          </div>
        )}
      </div>

      <nav className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {navItems.map((item, index) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActiveHref(pathname, item.href)}
            collapsed={collapsed}
            index={index}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <div className="border-t border-stone-800 p-3">
        <div className={`flex items-center gap-3 rounded-xl px-1.5 py-2 ${collapsed ? "justify-center" : ""}`}>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-stone-800 text-xs font-semibold text-stone-200">
            {initials(userName)}
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-stone-100">{userName}</p>
              <p className="truncate text-xs text-stone-500">
                {roleLabel} · {branchLabel}
              </p>
            </div>
          )}
          <form action={signOutAction}>
            <button
              type="submit"
              title="Sign out"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-red-950/50 hover:text-red-400"
            >
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function DashboardShell({ visibleHrefs, userName, roleLabel, branchLabel, signOutAction, children }: DashboardShellProps) {
  const pathname = usePathname();
  const navItems = NAV_ITEMS.filter((item) => visibleHrefs.includes(item.href));
  // Always starts expanded (matches the server-rendered markup) — not read
  // from localStorage on mount, which would create a client/server mismatch
  // on the very first hydration pass whenever a prior session left it collapsed.
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile drawer on navigation. This adjusts state during render
  // (React's documented alternative to an effect for "reset state when a
  // prop changes") instead of `useEffect(() => setMobileOpen(false), [pathname])`.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    if (mobileOpen) setMobileOpen(false);
  }

  function toggleCollapsed() {
    setCollapsed((prev) => !prev);
  }

  return (
    <div className="flex min-h-screen bg-stone-100 dark:bg-stone-950">
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 76 : 256 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="relative hidden shrink-0 border-r border-stone-800 bg-stone-950 lg:block"
      >
        <SidebarContent
          navItems={navItems}
          pathname={pathname}
          collapsed={collapsed}
          userName={userName}
          roleLabel={roleLabel}
          branchLabel={branchLabel}
          signOutAction={signOutAction}
        />
        <button
          onClick={toggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute top-6 -right-3 flex size-6 items-center justify-center rounded-full border border-stone-700 bg-stone-900 text-stone-400 shadow-md transition-colors hover:text-orange-400"
        >
          <motion.span animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.25 }}>
            <ChevronLeft size={14} />
          </motion.span>
        </button>
      </motion.aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-stone-800 bg-stone-950/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-orange-600 text-white">
            <UtensilsCrossed size={16} />
          </span>
          <p className="text-sm font-semibold text-stone-100">Flicks &amp; Licks</p>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="flex size-9 items-center justify-center rounded-lg text-stone-300 transition-colors hover:bg-stone-800"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 36 }}
              className="fixed inset-y-0 left-0 z-50 w-72 border-r border-stone-800 bg-stone-950 lg:hidden"
            >
              <div className="flex justify-end p-2">
                <button
                  onClick={() => setMobileOpen(false)}
                  className="flex size-9 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-800"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>
              <SidebarContent
                navItems={navItems}
                pathname={pathname}
                collapsed={false}
                userName={userName}
                roleLabel={roleLabel}
                branchLabel={branchLabel}
                signOutAction={signOutAction}
                onNavigate={() => setMobileOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="min-w-0 flex-1 pt-14 lg:pt-0">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
