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
  | 'og:image:alt'
  | 'og:url'
  | 'twitter:card'
  | 'twitter:title'
  | 'twitter:description'
  | 'twitter:image'
  | 'twitter:image:alt';

/** Selector attribute used to locate or create a specific `<meta>` element. */
type SeoMetaAttribute = 'name' | 'property';

/** Flexible schema.org node shape used by the JSON-LD graph payload. */
type JsonLdNode = Record<string, unknown>;

/** JSON-LD script payload injected into the document head. */
type JsonLdPayload = {
  '@context': 'https://schema.org';
  '@graph': JsonLdNode[];
};

/** Application name appended to every page title. */
export const APP_NAME = 'ARSM';

/** Default social preview image path served from public assets. */
export const DEFAULT_SOCIAL_IMAGE_PATH = '/AppLogoFrameBlack.webp';

/** Strict crawler directive used for authenticated application routes. */
export const NOINDEX_ROBOTS = 'noindex, nofollow, noarchive, nosnippet, max-image-preview:none, max-snippet:0, max-video-preview:0';

/** Stable script id for the managed JSON-LD `<script>` element. */
const JSON_LD_SCRIPT_ID = 'arsm-seo-jsonld';

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
export function resolveCanonicalSiteUrl() {
  const configuredUrl = import.meta.env.VITE_SITE_URL?.trim();

  if (!configuredUrl) {
    return globalThis.location.origin;
  }

  try {
    const parsed = new URL(configuredUrl);
    return parsed.origin;
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
  if (pathname === '/scheduler' || pathname === '/dashboard') {
    return '/';
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

/** Retrieves or creates the JSON-LD script node used for schema.org data. */
export function getOrCreateJsonLdScript() {
  const selector = `script#${JSON_LD_SCRIPT_ID}`;
  const existing = document.head.querySelector<HTMLScriptElement>(selector);

  if (existing) {
    return existing;
  }

  const script = document.createElement('script');
  script.id = JSON_LD_SCRIPT_ID;
  script.type = 'application/ld+json';
  document.head.appendChild(script);
  return script;
}

/** Builds schema.org JSON-LD payload for organization, website, app, and page entities. */
export function buildJsonLdPayload(params: {
  canonicalUrl: string;
  siteUrl: string;
  fullTitle: string;
  description: string;
  htmlLang: string;
  organizationName: string;
  socialImageUrl: string;
}) {
  const { canonicalUrl, siteUrl, fullTitle, description, htmlLang, organizationName, socialImageUrl } = params;

  const payload: JsonLdPayload = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteUrl}#organization`,
        name: organizationName,
        url: siteUrl,
        logo: socialImageUrl,
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}#website`,
        name: APP_NAME,
        url: siteUrl,
        inLanguage: htmlLang,
      },
      {
        '@type': 'WebApplication',
        '@id': `${siteUrl}#app`,
        name: APP_NAME,
        url: siteUrl,
        description,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web Browser',
        isAccessibleForFree: false,
        inLanguage: htmlLang,
      },
      {
        '@type': 'WebPage',
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: fullTitle,
        description,
        inLanguage: htmlLang,
        isPartOf: {
          '@id': `${siteUrl}#website`,
        },
      },
    ],
  };

  return payload;
}