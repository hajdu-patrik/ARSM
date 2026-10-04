/** Route-aware SEO manager: updates title, meta description, robots, Open Graph,
 * Twitter Card, canonical URL, JSON-LD and `html[lang]` on every route/language change. */
import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  APP_NAME,
  DEFAULT_SOCIAL_IMAGE_HEIGHT,
  DEFAULT_SOCIAL_IMAGE_PATH,
  DEFAULT_SOCIAL_IMAGE_TYPE,
  DEFAULT_SOCIAL_IMAGE_WIDTH,
  NOINDEX_ROBOTS,
  buildAbsoluteUrl,
  buildJsonLdPayload,
  getOrCreateCanonical,
  getOrCreateJsonLdScript,
  getOrCreateMeta,
  normalizeCanonicalPath,
  resolveCanonicalSiteUrl,
  type SeoConfig,
} from './seoHead';

/** Translation keys of one route's page title and meta description. */
type RouteSeoKeys = { readonly title: string; readonly description: string };

/** Known routes by normalized path; their canonical path is the route itself. */
const ROUTE_SEO_KEYS: ReadonlyMap<string, RouteSeoKeys> = new Map([
  ['/login', { title: 'seo.pages.login.title', description: 'seo.pages.login.description' }],
  ['/', { title: 'seo.pages.scheduler.title', description: 'seo.pages.scheduler.description' }],
  ['/customers', { title: 'seo.pages.customers.title', description: 'seo.pages.customers.description' }],
  ['/quotes', { title: 'seo.pages.quotes.title', description: 'seo.pages.quotes.description' }],
  ['/inventory', { title: 'seo.pages.inventory.title', description: 'seo.pages.inventory.description' }],
  ['/company-results', { title: 'seo.pages.companyResults.title', description: 'seo.pages.companyResults.description' }],
  ['/settings', { title: 'seo.pages.settings.title', description: 'seo.pages.settings.description' }],
  ['/admin/register', { title: 'seo.pages.adminRegister.title', description: 'seo.pages.adminRegister.description' }],
  ['/500', { title: 'serverError.title', description: 'seo.pages.serverError.description' }],
]);

/** Keys and canonical path of every unknown route. */
const NOT_FOUND_SEO_KEYS: RouteSeoKeys = { title: 'seo.pages.notFound.title', description: 'seo.pages.notFound.description' };
const NOT_FOUND_CANONICAL_PATH = '/404';

/** Renderless component that manages all SEO-related `<head>` tags based on the current route and language. */
export function SeoManager() {
  const location = useLocation();
  const { t: translate, i18n } = useTranslation();

  const config = useMemo<SeoConfig>(() => {
    const path = normalizeCanonicalPath(location.pathname);
    const routeKeys = ROUTE_SEO_KEYS.get(path);
    const keys = routeKeys ?? NOT_FOUND_SEO_KEYS;

    return {
      pageTitle: translate(keys.title),
      description: translate(keys.description),
      robots: NOINDEX_ROBOTS,
      canonicalPath: routeKeys ? path : NOT_FOUND_CANONICAL_PATH,
      socialImagePath: DEFAULT_SOCIAL_IMAGE_PATH,
    };
  }, [location.pathname, translate]);

  useEffect(() => {
    const fullTitle = `${config.pageTitle} | ${APP_NAME}`;
    const locale = i18n.resolvedLanguage?.startsWith('hu') ? 'hu_HU' : 'en_US';
    const htmlLang = i18n.resolvedLanguage?.startsWith('hu') ? 'hu' : 'en';
    const siteUrl = resolveCanonicalSiteUrl();
    const canonicalUrl = buildAbsoluteUrl(siteUrl, config.canonicalPath);
    const socialImageUrl = buildAbsoluteUrl(siteUrl, config.socialImagePath);
    const socialImageAlt = translate('seo.socialImageAlt');
    const organizationName = translate('seo.organizationName');
    const jsonLdPayload = buildJsonLdPayload({
      canonicalUrl,
      siteUrl,
      fullTitle,
      description: config.description,
      htmlLang,
      organizationName,
    });

    document.title = fullTitle;
    document.documentElement.lang = htmlLang;

    getOrCreateMeta('application-name').content = APP_NAME;
    getOrCreateMeta('description').content = config.description;
    getOrCreateMeta('robots').content = config.robots;
    getOrCreateMeta('googlebot').content = config.robots;

    getOrCreateMeta('og:title', 'property').content = fullTitle;
    getOrCreateMeta('og:description', 'property').content = config.description;
    getOrCreateMeta('og:type', 'property').content = 'website';
    getOrCreateMeta('og:locale', 'property').content = locale;
    getOrCreateMeta('og:site_name', 'property').content = APP_NAME;
    getOrCreateMeta('og:image', 'property').content = socialImageUrl;
    getOrCreateMeta('og:image:type', 'property').content = DEFAULT_SOCIAL_IMAGE_TYPE;
    getOrCreateMeta('og:image:width', 'property').content = DEFAULT_SOCIAL_IMAGE_WIDTH;
    getOrCreateMeta('og:image:height', 'property').content = DEFAULT_SOCIAL_IMAGE_HEIGHT;
    getOrCreateMeta('og:image:alt', 'property').content = socialImageAlt;
    getOrCreateMeta('og:url', 'property').content = canonicalUrl;

    getOrCreateMeta('twitter:card').content = 'summary_large_image';
    getOrCreateMeta('twitter:title').content = fullTitle;
    getOrCreateMeta('twitter:description').content = config.description;
    getOrCreateMeta('twitter:image').content = socialImageUrl;
    getOrCreateMeta('twitter:image:alt').content = socialImageAlt;

    getOrCreateCanonical().href = canonicalUrl;

    getOrCreateJsonLdScript().textContent = JSON.stringify(jsonLdPayload);
  }, [config.canonicalPath, config.description, config.pageTitle, config.robots, config.socialImagePath, i18n.resolvedLanguage, translate]);

  return null;
}
