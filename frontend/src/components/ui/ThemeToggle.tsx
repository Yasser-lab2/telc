import { useTheme } from '../../lib/theme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle shadow-sm"
      aria-label={dark ? 'Activer le mode clair' : 'Activer le mode sombre'}
      title={dark ? 'Mode clair' : 'Mode sombre'}
      aria-pressed={dark}
    >
      <span aria-hidden="true" className="text-base leading-none">{dark ? '☀' : '☾'}</span>
      <span className="hidden sm:inline">{dark ? 'Clair' : 'Sombre'}</span>
    </button>
  );
}
