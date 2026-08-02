/**
 * Permission hierarchy (highest → lowest):
 *   master > admin > host > user
 *
 * `master` is owner/dev and inherits every admin (and host-level) privilege.
 */

/** Church admin console + admin APIs: admin or master. */
export const isAdminRole = (
  role: string | null | undefined,
): role is "admin" | "master" => role === "admin" || role === "master";

/** Owner/dev surfaces only (usage, personal tools). */
export const isMasterRole = (
  role: string | null | undefined,
): role is "master" => role === "master";

/** Host-capable profiles (can be listed as study hosts): host, admin, or master. */
export const isHostCapableRole = (
  role: string | null | undefined,
): boolean => role === "host" || isAdminRole(role);
