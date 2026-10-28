import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../lib/api';
import { useI18n, type Locale } from '../lib/i18n';
import { formatDate } from '../lib/utils';
import { useAuthStore } from '../store/authStore';

function describeDevice(userAgent: string | null, t: (key: string) => string) {
  if (!userAgent) return t('unknownDevice');
  if (/mobile|android|iphone|ipad/i.test(userAgent)) return t('mobileDevice');
  return t('desktopBrowser');
}

export function Profile() {
  const { user, subscription } = useAuth();
  const { locale, direction, setLocale, t } = useI18n();
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [profile, setProfile] = useState<{ displayName: string; niveau: 'B1' | 'B2' | 'B1_B2' }>({ displayName: '', niveau: 'B1' });
  const [deletePassword, setDeletePassword] = useState('');
  const [preferenceForm, setPreferenceForm] = useState({ locale: 'fr' as Locale, emailStudyReminders: true, emailProductUpdates: false, personalizedRecommendations: true });
  const syncedPreferenceUser = useRef<string | null>(null);
  const referral = useQuery({ queryKey: ['referral'], queryFn: apiClient.referral });
  const sessions = useQuery({ queryKey: ['account-sessions'], queryFn: apiClient.sessions });
  const preferences = useQuery({ queryKey: ['account-preferences'], queryFn: apiClient.preferences });
  const resend = useMutation({ mutationFn: apiClient.resendVerification });
  const updateProfile = useMutation({
    mutationFn: apiClient.updateProfile,
    onSuccess: ({ user: updatedUser }) => {
      setAuth(updatedUser, subscription);
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  useEffect(() => {
    if (user) setProfile({ displayName: user.displayName, niveau: user.niveau });
  }, [user?.displayName, user?.niveau]);

  useEffect(() => {
    if (preferences.data && user && syncedPreferenceUser.current !== user.id) {
      const serverPreferences = preferences.data.preferences;
      syncedPreferenceUser.current = user.id;
      setPreferenceForm(serverPreferences);
      if (serverPreferences.locale !== locale) setLocale(serverPreferences.locale);
    }
  }, [locale, preferences.data, setLocale, user]);

  function saveProfile(event: FormEvent) {
    event.preventDefault();
    updateProfile.mutate({ ...profile, displayName: profile.displayName.trim() });
  }

  const leaveAccount = () => {
    setAuth(null, null);
    queryClient.clear();
    window.location.assign('/login');
  };

  const revoke = useMutation({
    mutationFn: apiClient.revokeSession,
    onSuccess: (result) => {
      if (result.currentRevoked) leaveAccount();
      else queryClient.invalidateQueries({ queryKey: ['account-sessions'] });
    },
  });
  const revokeAll = useMutation({ mutationFn: apiClient.revokeAllSessions, onSuccess: leaveAccount });
  const exportAccount = useMutation({
    mutationFn: apiClient.exportAccount,
    onSuccess: (data) => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `telc-prep-data-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    },
  });
  const deleteAccount = useMutation({ mutationFn: apiClient.deleteAccount, onSuccess: leaveAccount });
  const savePreferences = useMutation({
    mutationFn: apiClient.updatePreferences,
    onSuccess: ({ preferences: saved }) => {
      setPreferenceForm(saved);
      setLocale(saved.locale);
      queryClient.setQueryData(['account-preferences'], { preferences: saved });
    },
  });

  return (
    <div className="space-y-6" dir={direction}>
      <Card>
        <h1 className="text-2xl font-bold">{t('profileAndSecurity')}</h1>
        <form className="mt-5" onSubmit={saveProfile}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold">{t('fullName')}
              <Input className="mt-2" required minLength={2} maxLength={80} autoComplete="name" value={profile.displayName} onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} />
            </label>
            <label className="block text-sm font-bold">{t('preparedLevel')}
              <select className="mt-2 min-h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" value={profile.niveau} onChange={(event) => setProfile({ ...profile, niveau: event.target.value as 'B1' | 'B2' | 'B1_B2' })}>
                <option value="B1">B1</option><option value="B2">B2</option><option value="B1_B2">B1 + B2</option>
              </select>
            </label>
          </div>
          <div className="mt-4"><p className="text-sm text-muted">{t('emailAddress')}</p><p className="font-bold">{user?.email}</p></div>
          <div className="mt-5 flex items-center gap-3">
            <Button disabled={updateProfile.isPending || profile.displayName.trim().length < 2}>{updateProfile.isPending ? `${t('save')}…` : t('saveProfile')}</Button>
            {updateProfile.isSuccess && <span className="text-sm font-bold text-green-700">{t('profileUpdated')}</span>}
          </div>
          {updateProfile.error && <p className="mt-3 text-sm text-red-600">{updateProfile.error.message}</p>}
        </form>

        <div className={`mt-5 rounded-xl border p-4 ${user?.emailVerified ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
          <p className={`font-bold ${user?.emailVerified ? 'text-green-800' : 'text-amber-900'}`}>
             {user?.emailVerified ? t('emailVerified') : t('emailNotVerified')}
          </p>
          {!user?.emailVerified && (
            <>
               <p className="mt-1 text-sm text-amber-800">{t('verifyEmailHelp')}</p>
               <Button className="mt-3" variant="secondary" disabled={resend.isPending} onClick={() => resend.mutate()}>
                 {resend.isPending ? t('sending') : t('resendLink')}
              </Button>
            </>
          )}
           {resend.isSuccess && <p className="mt-2 text-sm text-green-700">{t('verificationSent')}</p>}
           {resend.data?.devVerificationUrl && <a className="mt-2 block break-all text-sm font-bold text-accent underline" href={resend.data.devVerificationUrl}>{t('openDevLink')}</a>}
          {resend.error && <p className="mt-2 text-sm text-red-600">{resend.error.message}</p>}
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-bold">{t('activeSessions')}</h2>
        <p className="mt-1 text-sm text-muted">{t('activeSessionsHelp')}</p>
        {sessions.isLoading && <p className="mt-5 text-sm text-muted">{t('loading')}</p>}
        {sessions.error && <p className="mt-5 text-sm text-red-600">{sessions.error.message}</p>}
        <div className="mt-5 divide-y divide-border">
          {sessions.data?.sessions.map((session) => (
            <div key={session.id} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                 <p className="font-bold">{describeDevice(session.userAgent, t)} {session.current && <span className="ml-2 rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">{t('currentSession')}</span>}</p>
                  <p className="mt-1 text-xs text-muted">{t('signIn')}: {formatDate(session.createdAt, locale)} · {t('expires')}: {formatDate(session.expiresAt, locale)}</p>
               </div>
               <Button variant="secondary" disabled={revoke.isPending || revokeAll.isPending} onClick={() => revoke.mutate(session.id)}>{t('disconnect')}</Button>
            </div>
          ))}
        </div>
        {revoke.error && <p className="mt-3 text-sm text-red-600">{revoke.error.message}</p>}
        {Boolean(sessions.data?.sessions.length) && (
          <div className="mt-5 border-t border-border pt-5">
             <Button variant="danger" disabled={revokeAll.isPending} onClick={() => { if (window.confirm(t('disconnectAll') + ' ?')) revokeAll.mutate(); }}>
               {revokeAll.isPending ? `${t('disconnect')}…` : t('disconnectAll')}
            </Button>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-xl font-bold">{t('preferences')}</h2>
        <p className="mt-1 text-sm text-muted">{t('preferencesHelp')}</p>
        {preferences.isLoading ? <p className="mt-4 text-sm text-muted">{t('loading')}</p> : (
          <form className="mt-5 space-y-5" onSubmit={(event) => { event.preventDefault(); savePreferences.mutate(preferenceForm); }}>
             <label className="block rounded-xl border border-border bg-white p-4 text-sm font-bold">
               {t('language')}
               <select className="mt-2 min-h-11 w-full rounded-xl border border-border bg-white px-3 text-sm font-normal outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" value={preferenceForm.locale} onChange={(event) => setPreferenceForm({ ...preferenceForm, locale: event.target.value as Locale })}>
                 <option value="fr">Français</option><option value="en">English</option><option value="ar">العربية</option>
               </select>
             </label>
             <label className="flex items-start gap-3 rounded-xl border border-border bg-white p-4">
              <input className="mt-1 h-4 w-4 accent-accent" type="checkbox" checked={preferenceForm.emailStudyReminders} onChange={(event) => setPreferenceForm({ ...preferenceForm, emailStudyReminders: event.target.checked })} />
               <span><span className="block font-bold">{t('studyReminders')}</span><span className="text-sm text-muted">{t('studyRemindersHelp')}</span></span>
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-border bg-white p-4">
              <input className="mt-1 h-4 w-4 accent-accent" type="checkbox" checked={preferenceForm.emailProductUpdates} onChange={(event) => setPreferenceForm({ ...preferenceForm, emailProductUpdates: event.target.checked })} />
               <span><span className="block font-bold">{t('productUpdates')}</span><span className="text-sm text-muted">{t('productUpdatesHelp')}</span></span>
            </label>
             <label className="flex items-start gap-3 rounded-xl border border-border bg-white p-4"><input className="mt-1 h-4 w-4 accent-accent" type="checkbox" checked={preferenceForm.personalizedRecommendations} onChange={(event) => setPreferenceForm({ ...preferenceForm, personalizedRecommendations: event.target.checked })} /><span><span className="block font-bold">{t('personalizedRecommendations')}</span><span className="text-sm text-muted">{t('personalizedRecommendationsHelp')}</span></span></label>
            <div className="flex items-center gap-3">
               <Button disabled={savePreferences.isPending}>{savePreferences.isPending ? `${t('save')}…` : t('savePreferences')}</Button>
               {savePreferences.isSuccess && <span className="text-sm font-bold text-green-700">{t('preferencesSaved')}</span>}
            </div>
            {(preferences.error || savePreferences.error) && <p className="text-sm text-red-600">{(preferences.error ?? savePreferences.error)?.message}</p>}
          </form>
        )}
      </Card>

       <Card><h2 className="text-xl font-bold">{t('referral')}</h2><p className="mt-1 text-sm text-muted">{t('referralHelp')}</p>{referral.data && <div className="mt-4 rounded-xl bg-bg p-4"><p className="break-all font-mono text-sm">{referral.data.shareUrl}</p><Button className="mt-3" variant="secondary" onClick={() => navigator.clipboard.writeText(referral.data!.shareUrl)}>{t('copyLink')}</Button><p className="mt-3 text-xs text-muted">{referral.data.referrals.length} {t('referrals')}</p></div>}</Card>

      <Card>
        <h2 className="text-xl font-bold">{t('myData')}</h2>
        <p className="mt-1 text-sm text-muted">{t('myDataHelp')}</p>
        <Button className="mt-4" variant="secondary" disabled={exportAccount.isPending} onClick={() => exportAccount.mutate()}>
          {exportAccount.isPending ? t('preparing') : t('exportData')}
        </Button>
        {exportAccount.error && <p className="mt-3 text-sm text-red-600">{exportAccount.error.message}</p>}
      </Card>

      <Card className="border-red-200">
         <h2 className="text-xl font-bold text-red-700">{t('dangerZone')}</h2>
         <p className="mt-1 text-sm text-muted">{t('dangerHelp')}</p>
        {user?.role === 'admin' ? (
           <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{t('adminCannotDelete')}</p>
        ) : (
          <form className="mt-4 max-w-md" onSubmit={(event) => {
            event.preventDefault();
             if (window.confirm(t('irreversibleDelete'))) deleteAccount.mutate(deletePassword);
          }}>
             <label className="block text-sm font-bold">{t('confirmPassword')}
              <Input className="mt-2" required type="password" autoComplete="current-password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} />
            </label>
             <Button className="mt-4" variant="danger" disabled={deleteAccount.isPending || !deletePassword}>
               {deleteAccount.isPending ? t('deleting') : t('deleteAccount')}
            </Button>
          </form>
        )}
        {deleteAccount.error && <p className="mt-3 text-sm text-red-600">{deleteAccount.error.message}</p>}
      </Card>
    </div>
  );
}
