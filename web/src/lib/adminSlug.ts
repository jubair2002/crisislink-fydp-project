import 'server-only';

/**
 * Server-only accessor for the admin URL slug.
 *
 * The slug lives in `ADMIN_SLUG` (no `NEXT_PUBLIC_` prefix on purpose) so it
 * never gets bundled into client JavaScript. Only server components, server
 * actions, route handlers, and the proxy may import this module.
 */
export const getAdminSlug = (): string => {
  const slug = process.env.ADMIN_SLUG?.trim();
  if (!slug) {
    throw new Error(
      'ADMIN_SLUG is not configured. Set it in .env.local (without NEXT_PUBLIC_ prefix).',
    );
  }
  return slug;
};

/** Build a path under the admin tree, e.g. `adminPath('/users') → /<slug>/users`. */
export const adminPath = (suffix: string = ''): string => {
  const base = `/${getAdminSlug()}`;
  if (!suffix) return base;
  return suffix.startsWith('/') ? `${base}${suffix}` : `${base}/${suffix}`;
};
