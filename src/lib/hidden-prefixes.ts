/**
 * Route prefixes that 404 for anyone without a staff session — see
 * proxy.ts's HIDDEN_PREFIXES gate for the actual enforcement. Pulled out to
 * its own module so robots.ts can tell crawlers to skip the same paths
 * without importing proxy.ts itself (which pulls in the full Auth.js setup)
 * and without a second hand-maintained copy of the list drifting from it.
 */
export const HIDDEN_PREFIXES = ["/admin", "/pos", "/kitchen", "/rider", "/super-admin", "/account", "/login"];
