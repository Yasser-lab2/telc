import { Link } from 'react-router-dom';
import { useI18n } from '../../lib/i18n';

export function Footer() {
  const { t, direction } = useI18n();
  return (
    <footer dir={direction} className="border-t border-border bg-surface/60 px-4 py-8 text-center text-sm text-muted">
      <p><span className="font-bold text-ink">TELC Prep</span> · {t('footerDescription')}</p>
      <nav aria-label={t('legalInformation')} className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2">
        <Link className="hover:text-accent" to="/legal/terms">{t('terms')}</Link>
        <Link className="hover:text-accent" to="/legal/privacy">{t('privacy')}</Link>
        <Link className="hover:text-accent" to="/legal/refunds">{t('refunds')}</Link>
      </nav>
    </footer>
  );
}
