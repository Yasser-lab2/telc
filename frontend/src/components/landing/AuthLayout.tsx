import type { ReactNode } from 'react';
import { useI18n } from '../../lib/i18n';
import './landing.css';
import { LandingHeader } from './LandingChrome';

type AuthLayoutProps = {
  active?: 'login' | 'register';
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

/** Shared Kolchi Klar shell for the account pages: red header, centered card, minimal footer. */
export function AuthLayout({ active, eyebrow, title, subtitle, children }: AuthLayoutProps) {
  const { direction } = useI18n();
  return (
    <div className="kk kk-auth" dir={direction}>
      <LandingHeader active={active} showPricing />
      <main id="main-content" tabIndex={-1} className="kk-auth-main" style={{ outline: 'none' }}>
        <div className="kk-auth-card">
          {eyebrow && <p className="kk-auth-eyebrow">{eyebrow}</p>}
          <h1 className="kk-auth-title serif">{title}</h1>
          {subtitle && <p className="kk-auth-sub">{subtitle}</p>}
          {children}
        </div>
      </main>
      <footer className="kk-auth-footer">© 2026 Kolchi Klar</footer>
    </div>
  );
}
