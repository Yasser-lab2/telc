import { useTheme } from '../../lib/theme';
import { useI18n } from '../../lib/i18n';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle shadow-sm"
      aria-label={dark ? t('lightMode') : t('darkMode')}
      title={dark ? t('light') : t('dark')}
      aria-pressed={dark}
    >
      <span aria-hidden="true" className="text-base leading-none">{dark ? '☀' : '☾'}</span>
      <span className="hidden sm:inline">{dark ? t('light') : t('dark')}</span>
    </button>
  );
}
