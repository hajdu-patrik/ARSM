/** i18next setup: only the active language bundle is on the start-up path; the other one loads on
 * the first switch. The language is the saved `preferred-language`, else Hungarian. */

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { logError } from './devLog';
import type { en } from './locales/en';
import type { hu } from './locales/hu';
import { readStorage, writeStorage } from './safeStorage';

/** Languages the app ships translations for. */
export type AppLanguage = 'hu' | 'en';

/** The merged translation bundle of one language. */
type LocaleBundle = typeof en | typeof hu;

/** Local storage key of the saved language preference. */
const LANGUAGE_STORAGE_KEY = 'preferred-language';

/** Language used when no preference is saved. */
const DEFAULT_LANGUAGE: AppLanguage = 'hu';

/** i18next namespace that holds the merged bundle. */
const TRANSLATION_NAMESPACE = 'translation';

/** Dynamic imports keep each bundle in its own chunk, fetched only when its language is needed. */
const bundleLoaders: Record<AppLanguage, () => Promise<LocaleBundle>> = {
  en: () => import('./locales/en').then((localeModule) => localeModule.en),
  hu: () => import('./locales/hu').then((localeModule) => localeModule.hu),
};

/** Saved language preference, or Hungarian when nothing usable is stored. */
function resolveInitialLanguage(): AppLanguage {
  const saved = readStorage('local', LANGUAGE_STORAGE_KEY);
  return saved !== null && saved.toLowerCase().startsWith('en') ? 'en' : DEFAULT_LANGUAGE;
}

/** Loads the active language bundle, then initializes i18next with that bundle only. */
async function initializeI18n(): Promise<void> {
  const language = resolveInitialLanguage();
  const bundle = await bundleLoaders[language]();

  await i18next.use(initReactI18next).init({
    resources: { [language]: { [TRANSLATION_NAMESPACE]: bundle } },
    lng: language,
    fallbackLng: false,
    interpolation: {
      escapeValue: false,
    },
  });
}

/** Resolves once i18next holds the active language bundle; the app renders only after it. */
export const i18nReady: Promise<void> = initializeI18n();

/** Adds the bundle of a language to i18next on first use. */
async function ensureBundle(language: AppLanguage): Promise<void> {
  if (i18next.hasResourceBundle(language, TRANSLATION_NAMESPACE)) {
    return;
  }

  const bundle = await bundleLoaders[language]();
  i18next.addResourceBundle(language, TRANSLATION_NAMESPACE, bundle, true, true);
}

/** Id of the newest switch request; an older request that finishes later is dropped. */
let latestSwitchId = 0;

/** Switches the UI language: loads its bundle on demand, applies it, then saves the choice. */
export async function changeAppLanguage(language: AppLanguage): Promise<void> {
  latestSwitchId += 1;
  const switchId = latestSwitchId;

  await i18nReady;

  try {
    await ensureBundle(language);
  } catch (error) {
    logError('i18n', error);
    return;
  }

  if (switchId !== latestSwitchId) {
    return;
  }

  await i18next.changeLanguage(language);
  writeStorage('local', LANGUAGE_STORAGE_KEY, language);
}

export default i18next;
