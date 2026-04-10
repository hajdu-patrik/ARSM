import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

type SeoConfig = {
  description: string;
  robots?: string;
};

const APP_NAME = 'ARSM';

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

export function SeoManager() {
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const config = useMemo<SeoConfig>(() => {
    const path = location.pathname;

    if (path === '/login') {
      return {
        description: t('login.subtitle'),
        robots: 'noindex, nofollow',
      };
    }

    if (path === '/' || path === '/scheduler' || path === '/dashboard') {
      return {
        description: t('scheduler.plannerSpace'),
      };
    }

    if (path === '/tools') {
      return {
        description: t('tools.comingSoonDescription'),
      };
    }

    if (path === '/inventory') {
      return {
        description: t('inventory.comingSoonDescription'),
      };
    }

    if (path === '/settings') {
      return {
        description: t('settings.personalInfo'),
      };
    }

    if (path === '/admin/register') {
      return {
        description: t('admin.registerMechanic'),
        robots: 'noindex, nofollow',
      };
    }

    return {
      description: t('notFound.subtitle'),
      robots: 'noindex, nofollow',
    };
  }, [i18n.language, location.pathname, t]);

  useEffect(() => {
    const fullTitle = APP_NAME;
    const locale = i18n.resolvedLanguage?.startsWith('hu') ? 'hu_HU' : 'en_US';
    const htmlLang = i18n.resolvedLanguage?.startsWith('hu') ? 'hu' : 'en';
    const canonicalPath =
      location.pathname === '/scheduler' || location.pathname === '/dashboard'
        ? '/'
        : location.pathname;
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
  }, [config.description, config.robots, i18n.resolvedLanguage, location.pathname]);

  return null;
}
