import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/** Keeps <html lang> and the document title in sync with the active language. */
export function useLanguageSync(): void {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const apply = () => {
      document.documentElement.lang = i18n.resolvedLanguage ?? 'pt-BR';
      document.title = t('brand.name');
    };
    apply();
    i18n.on('languageChanged', apply);
    return () => {
      i18n.off('languageChanged', apply);
    };
  }, [i18n, t]);
}
