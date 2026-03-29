import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      login: {
        subtitle: 'Mechanic Portal',
        email: 'Email',
        phone: 'Phone',
        password: 'Password',
        submit: 'Login',
        loading: 'Logging in...',
        invalidCredentials: 'Invalid credentials provided',
        passwordIncorrect: 'Incorrect password.',
        identifierNotFound: 'Email or phone number does not exist.',
        serverError500: 'Internal server error (500). Please try again later.',
        databaseUnavailable: 'Database is currently unavailable.',
        error: 'Login failed. Please try again.',
        mechanicOnly: 'Only mechanics can access this portal',
      },
      layout: {
        logout: 'Logout',
        allRightsReserved: 'All rights reserved.',
      },
      dashboard: {
        title: 'Dashboard',
        welcome: 'Welcome',
        appointments: 'Appointments',
        vehicles: 'Vehicles',
        customers: 'Customers',
      },
      notFound: {
        pageNotFound: 'Page Not Found',
        redirectDashboard: 'Redirecting to Dashboard in {{seconds}} seconds...',
        redirectLogin: 'Redirecting to Login in {{seconds}} seconds...',
      },
    },
  },
  hu: {
    translation: {
      login: {
        subtitle: 'Szerviz Portál',
        email: 'E-mail',
        phone: 'Telefon',
        password: 'Jelszó',
        submit: 'Bejelentkezés',
        loading: 'Bejelentkezés...',
        invalidCredentials: 'Érvénytelen hitelesítési adatok',
        passwordIncorrect: 'Hibás jelszó.',
        identifierNotFound: 'Az e-mail cím vagy telefonszám nem létezik.',
        serverError500: 'Belső szerverhiba (500). Kérjük, próbálja újra később.',
        databaseUnavailable: 'Az adatbázis jelenleg nem érhető el.',
        error: 'A bejelentkezés sikertelen. Próbálja újra.',
        mechanicOnly: 'Csak szerelők férhetnek hozzá a portálhoz',
      },
      layout: {
        logout: 'Kijelentkezés',
        allRightsReserved: 'Minden jog fenntartva.',
      },
      dashboard: {
        title: 'Irányítópult',
        welcome: 'Üdvözöljük',
        appointments: 'Időpontok',
        vehicles: 'Járművek',
        customers: 'Ügyfelek',
      },
      notFound: {
        pageNotFound: 'Oldal nem található',
        redirectDashboard: 'Átirányítás az irányítópultra {{seconds}} másodperc múlva...',
        redirectLogin: 'Átirányítás a bejelentkezéshez {{seconds}} másodperc múlva...',
      },
    },
  },
};

const savedLang = localStorage.getItem('preferred-language') || undefined;

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    lng: savedLang,
    showSupportNotice: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18next;
