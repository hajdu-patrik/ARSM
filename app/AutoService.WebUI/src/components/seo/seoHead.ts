import { APP_ROUTE_PATHS } from '../../router/appRoutes';

/** Per-route SEO configuration resolved from the current path and language. */
export type SeoConfig = {
  /** Localized page title displayed before the application suffix. */
  pageTitle: string;
  /** Meta description content. */
  description: string;
  /** Robots directive override for the current route. */
  robots: string;
  /** Canonical path segment used for canonical and social URLs. */
  canonicalPath: string;
  /** Social preview image path inside public assets. */
  socialImagePath: string;
};

/** Supported meta-tag keys that SeoManager owns and updates in `<head>`. */
type SeoMetaName =
  | 'application-name'
  | 'description'
  | 'robots'
  | 'googlebot'
  | 'og:title'
  | 'og:description'
  | 'og:type'
  | 'og:locale'
  | 'og:site_name'
  | 'og:image'
  | 'og:image:type'
  | 'og:image:width'
  | 'og:image:height'
  | 'og:image:alt'
  | 'og:url'
  | 'twitter:card'
  | 'twitter:title'
  | 'twitter:description'
  | 'twitter:image'
  | 'twitter:image:alt';

/** Selector attribute used to locate or create a specific `<meta>` element. */
type SeoMetaAttribute = 'name' | 'property';

/** Application name appended to every page title. */
export const APP_NAME = 'ARSM';

/** Default social preview image path served from public assets. */
export const DEFAULT_SOCIAL_IMAGE_PATH = '/og-image.png';

/** Intrinsic size and MIME type of the default social image, declared so unfurlers can
 * render a card without downloading the asset first. Keep in sync with the public file. */
export const DEFAULT_SOCIAL_IMAGE_TYPE = 'image/png';
export const DEFAULT_SOCIAL_IMAGE_WIDTH = '1200';
export const DEFAULT_SOCIAL_IMAGE_HEIGHT = '630';

/** Strict crawler directive used for authenticated application routes. */
export const NOINDEX_ROBOTS = 'noindex, nofollow, noarchive, nosnippet, max-image-preview:none, max-snippet:0, max-video-preview:0';

/** Retrieves an existing `<meta>` tag or creates one if it does not exist. */
export function getOrCreateMeta(name: SeoMetaName, attribute: SeoMetaAttribute = 'name') {
  const selector = `meta[${attribute}="${name}"]`;
  const existing = document.head.querySelector<HTMLMetaElement>(selector);

  if (existing) {
    return existing;
  }

  const meta = document.createElement('meta');
  meta.setAttribute(attribute, name);
  document.head.appendChild(meta);
  return meta;
}

/** Resolves canonical site origin from env config with a browser-origin fallback. */
export function resolveCanonicalSiteUrl(): string {
  const configuredUrl: unknown = import.meta.env.VITE_SITE_URL;

  if (typeof configuredUrl !== 'string' || configuredUrl.trim() === '') {
    return globalThis.location.origin;
  }

  try {
    return new URL(configuredUrl.trim()).origin;
  } catch {
    return globalThis.location.origin;
  }
}

/** Builds an absolute URL from a canonical origin and a route-relative path. */
export function buildAbsoluteUrl(siteUrl: string, path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${siteUrl}${normalizedPath}`;
}

/** Normalizes a route pathname for canonical URL generation. */
export function normalizeCanonicalPath(pathname: string) {
  if (pathname === APP_ROUTE_PATHS.schedulerAlias || pathname === APP_ROUTE_PATHS.dashboardAlias) {
    return APP_ROUTE_PATHS.scheduler;
  }

  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

/** Retrieves the existing `<link rel="canonical">` or creates one in `<head>`. */
export function getOrCreateCanonical() {
  const selector = 'link[rel="canonical"]';
  const existing = document.head.querySelector<HTMLLinkElement>(selector);

  if (existing) {
    return existing;
  }

  const link = document.createElement('link');
  link.setAttribute('rel', 'canonical');
  document.head.appendChild(link);
  return link;
}
