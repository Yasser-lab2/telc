import { useI18n } from '../../lib/i18n';

export function LoadingSpinner() {
  const { t } = useI18n();
  return <div className="p-8 text-center text-muted">{t('loading')}</div>;
}
