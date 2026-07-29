import { addDays } from './time';

export const SESSION_COOKIE = 'session_id';

export function sessionExpiry() {
  return addDays(new Date(), 30);
}

export function secureCookieOptions(appUrl: string) {
  return {
    httpOnly: true,
    sameSite: 'Strict' as const,
    secure: appUrl.startsWith('https://'),
    path: '/',
  };
}
