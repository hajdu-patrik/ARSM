/**
 * Route-aware SEO manager. Updates document title, meta description,
 * robots directives, Open Graph, Twitter Card tags, canonical URL,
 * and `html[lang]` attribute on every route/language change.
 * @module SeoManager
 */
import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/** Per-route SEO configuration resolved from the current path and language. */
type SeoConfig = {
  /** Localized page title (displayed before the `| ARSM` suffix). */
  pageTitle: string;
  /** Meta description content. */
  description: string;
  /** Robots directive override. Defaults to `'index, follow'` when omitted. */
  robots?: string;
};

/** Application name appended to every page title. */
const APP_NAME = 'ARSM';

/**
 * Retrieves an existing `<meta>` tag or creates one if it does not exist.
 * Appends the new element to `<head>` when created.
 */
function getOrCreateMeta(name: 'description' | 'robots' | 'og:title' | 'og:description' | 'og:type' | 'og:locale' | 'twitter:card' | 'twitter:title' | 'twitter:description', attribute: 'name' | 'property' = 'name') {
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

/** Normalizes a route pathname for canonical URL generation. `/scheduler` and `/dashboard` map to `/`. */
function normalizeCanonicalPath(pathname: string) {
  if (pathname === '/scheduler' || pathname === '/dashboard') {
    return '/';
  }

  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

/** Retrieves the existing `<link rel="canonical">` or creates one in `<head>`. */
function getOrCreateCanonical() {
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

/** Renderless component that manages all SEO-related `<head>` tags based on the current route and language. */
export function SeoManager() {
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const config = useMemo<SeoConfig>(() => {
    const path = location.pathname;

    if (path === '/login') {
      return {
        pageTitle: t('login.submit'),
        description: t('login.subtitle'),
        robots: 'noindex, nofollow',
      };
    }

    if (path === '/' || path === '/scheduler' || path === '/dashboard') {
      return {
        pageTitle: t('nav.scheduler'),
        description: t('scheduler.plannerSpace'),
      };
    }

    if (path === '/tools') {
      return {
        pageTitle: t('tools.pageTitle'),
        description: t('tools.comingSoonDescription'),
      };
    }

    if (path === '/inventory') {
      return {
        pageTitle: t('inventory.pageTitle'),
        description: t('inventory.comingSoonDescription'),
      };
    }

    if (path === '/settings') {
      return {
        pageTitle: t('settings.title'),
        description: t('settings.personalInfo'),
      };
    }

    if (path === '/admin/register') {
      return {
        pageTitle: t('admin.pageTitle'),
        description: t('admin.registerMechanic'),
        robots: 'noindex, nofollow',
      };
    }

    return {
      pageTitle: t('notFound.pageNotFound'),
      description: t('notFound.subtitle'),
      robots: 'noindex, nofollow',
    };
  }, [i18n.language, location.pathname, t]);

  useEffect(() => {
    const fullTitle = `${config.pageTitle} | ${APP_NAME}`;
    const locale = i18n.resolvedLanguage?.startsWith('hu') ? 'hu_HU' : 'en_US';
    const htmlLang = i18n.resolvedLanguage?.startsWith('hu') ? 'hu' : 'en';
    const canonicalPath = normalizeCanonicalPath(location.pathname);
    const canonicalUrl = `${globalThis.location.origin}${canonicalPath}`;

    document.title = fullTitle;
    document.documentElement.lang = htmlLang;

    getOrCreateMeta('description').content = config.description;
    getOrCreateMeta('robots').content = config.robots ?? 'index, follow';

    getOrCreateMeta('og:title', 'property').content = fullTitle;
    getOrCreateMeta('og:description', 'property').content = config.description;
    getOrCreateMeta('og:type', 'property').content = 'website';
    getOrCreateMeta('og:locale', 'property').content = locale;

    getOrCreateMeta('twitter:card').content = 'summary';
    getOrCreateMeta('twitter:title').content = fullTitle;
    getOrCreateMeta('twitter:description').content = config.description;

    getOrCreateCanonical().href = canonicalUrl;
  }, [config.description, config.pageTitle, config.robots, i18n.resolvedLanguage, location.pathname]);

  return null;
}
