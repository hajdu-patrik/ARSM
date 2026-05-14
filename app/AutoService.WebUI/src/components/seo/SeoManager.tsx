/**
 * Route-aware SEO manager. Updates document title, meta description,
 * robots directives, Open Graph, Twitter Card tags, canonical URL,
 * structured JSON-LD data, and `html[lang]` attribute on every route/language change.
 * @module SeoManager
 */
import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  APP_NAME,
  DEFAULT_SOCIAL_IMAGE_PATH,
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

/** Renderless component that manages all SEO-related `<head>` tags based on the current route and language. */
export function SeoManager() {
  const location = useLocation();
  const { t: translate, i18n } = useTranslation();

  const config = useMemo<SeoConfig>(() => {
    const path = normalizeCanonicalPath(location.pathname);

    if (path === '/login') {
      return {
        pageTitle: translate('seo.pages.login.title'),
        description: translate('seo.pages.login.description'),
        robots: NOINDEX_ROBOTS,
        canonicalPath: '/login',
        socialImagePath: DEFAULT_SOCIAL_IMAGE_PATH,
      };
    }

    if (path === '/') {
      return {
        pageTitle: translate('seo.pages.scheduler.title'),
        description: translate('seo.pages.scheduler.description'),
        robots: NOINDEX_ROBOTS,
        canonicalPath: '/',
        socialImagePath: DEFAULT_SOCIAL_IMAGE_PATH,
      };
    }

    if (path === '/customers') {
      return {
        pageTitle: translate('seo.pages.customers.title'),
        description: translate('seo.pages.customers.description'),
        robots: NOINDEX_ROBOTS,
        canonicalPath: '/customers',
        socialImagePath: DEFAULT_SOCIAL_IMAGE_PATH,
      };
    }

    if (path === '/settings') {
      return {
        pageTitle: translate('seo.pages.settings.title'),
        description: translate('seo.pages.settings.description'),
        robots: NOINDEX_ROBOTS,
        canonicalPath: '/settings',
        socialImagePath: DEFAULT_SOCIAL_IMAGE_PATH,
      };
    }

    if (path === '/admin/register') {
      return {
        pageTitle: translate('seo.pages.adminRegister.title'),
        description: translate('seo.pages.adminRegister.description'),
        robots: NOINDEX_ROBOTS,
        canonicalPath: '/admin/register',
        socialImagePath: DEFAULT_SOCIAL_IMAGE_PATH,
      };
    }

    if (path === '/500') {
      return {
        pageTitle: translate('seo.pages.serverError.title'),
        description: translate('seo.pages.serverError.description'),
        robots: NOINDEX_ROBOTS,
        canonicalPath: '/500',
        socialImagePath: DEFAULT_SOCIAL_IMAGE_PATH,
      };
    }

    return {
      pageTitle: translate('seo.pages.notFound.title'),
      description: translate('seo.pages.notFound.description'),
      robots: NOINDEX_ROBOTS,
      canonicalPath: '/404',
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
      socialImageUrl,
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
