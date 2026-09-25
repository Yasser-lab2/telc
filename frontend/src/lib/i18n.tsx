import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Locale = 'fr';

const messages = {
  fr: {
    pricing: 'Tarifs', dashboard: 'Aujourd’hui', login: 'Connexion', register: 'Créer un compte',
    logout: 'Déconnexion', reading: 'Lire', listening: 'Écouter', writing: 'Écrire', speaking: 'Parler', simulation: 'Simulation',
    profile: 'Profil', payment: 'Paiement', admin: 'Administration', menu: 'Menu', language: 'Langue', navigation: 'Navigation principale',
  },
} as const;

type MessageKey = keyof typeof messages.fr;
type I18nValue = { locale: Locale; setLocale: (locale: Locale) => void; t: (key: MessageKey) => string };

const I18nContext = createContext<I18nValue | null>(null);

function initialLocale(): Locale {
  return 'fr';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = 'ltr';
  }, [locale]);
  const value = useMemo<I18nValue>(() => ({
    locale,
    setLocale: (next) => {
      window.localStorage.setItem('telc-locale', next);
      document.documentElement.lang = next;
      document.documentElement.dir = 'ltr';
      setLocaleState(next);
    },
    t: (key) => messages[locale][key],
  }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}
