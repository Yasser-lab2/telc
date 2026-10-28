import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useI18n } from '../lib/i18n';

type State = { failed: boolean; reference: string };

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false, reference: '' };

  static getDerivedStateFromError(): State {
    return { failed: true, reference: crypto.randomUUID() };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ui_render_error', { reference: this.state.reference, name: error.name, message: error.message, componentStack: info.componentStack });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <ErrorFallback reference={this.state.reference} />;
  }
}

function ErrorFallback({ reference }: { reference: string }) {
  const { direction, t } = useI18n();
  return <main dir={direction} className="grid min-h-screen place-items-center bg-bg px-4"><div className="max-w-lg rounded-2xl border border-border bg-surface p-8 text-center shadow-sm"><p className="text-xs font-black uppercase tracking-[0.16em] text-accent">{t('unexpectedError')}</p><h1 className="mt-3 text-3xl font-black">{t('pageCouldNotDisplay')}</h1><p className="mt-3 text-sm leading-6 text-muted">{t('reloadPage')} <strong>{reference}</strong></p><button type="button" className="mt-6 min-h-11 rounded-xl bg-accent px-5 text-sm font-black text-white" onClick={() => window.location.assign('/')}>{t('backHome')}</button></div></main>;
}
