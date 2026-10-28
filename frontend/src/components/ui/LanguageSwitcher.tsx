import { isLocale, localeOptions, useI18n } from '../../lib/i18n';
import { Select } from './Select';

export function LanguageSwitcher() {
  const { locale, direction, setLocale, t } = useI18n();
  return <Select value={locale} direction={direction} ariaLabel={t('language')} options={localeOptions} onValueChange={(value) => { if (isLocale(value)) setLocale(value); }} />;
}
