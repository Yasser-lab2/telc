import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { formatDate } from '../lib/utils';
import { useAuthStore } from '../store/authStore';

function describeDevice(userAgent: string | null) {
  if (!userAgent) return 'Appareil inconnu';
  if (/mobile|android|iphone|ipad/i.test(userAgent)) return 'Appareil mobile';
  return 'Navigateur sur ordinateur';
}

export function Profile() {
  const { user, subscription } = useAuth();
  const { setLocale } = useI18n();
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [profile, setProfile] = useState<{ displayName: string; niveau: 'B1' | 'B2' | 'B1_B2' }>({ displayName: '', niveau: 'B1' });
  const [deletePassword, setDeletePassword] = useState('');
  const [preferenceForm, setPreferenceForm] = useState({ locale: 'fr' as 'fr' | 'de', emailStudyReminders: true, emailProductUpdates: false, personalizedRecommendations: true });
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
    if (preferences.data) {
      setPreferenceForm(preferences.data.preferences);
      setLocale(preferences.data.preferences.locale);
    }
  }, [preferences.data, setLocale]);

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
    <div className="space-y-6">
      <Card>
        <h1 className="text-2xl font-bold">Profil et sécurité</h1>
        <form className="mt-5" onSubmit={saveProfile}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold">Nom complet
              <Input className="mt-2" required minLength={2} maxLength={80} autoComplete="name" value={profile.displayName} onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} />
            </label>
            <label className="block text-sm font-bold">Niveau préparé
              <select className="mt-2 min-h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" value={profile.niveau} onChange={(event) => setProfile({ ...profile, niveau: event.target.value as 'B1' | 'B2' | 'B1_B2' })}>
                <option value="B1">B1</option><option value="B2">B2</option><option value="B1_B2">B1 + B2</option>
              </select>
            </label>
          </div>
          <div className="mt-4"><p className="text-sm text-muted">Adresse e-mail</p><p className="font-bold">{user?.email}</p></div>
          <div className="mt-5 flex items-center gap-3">
            <Button disabled={updateProfile.isPending || profile.displayName.trim().length < 2}>{updateProfile.isPending ? 'Enregistrement…' : 'Enregistrer le profil'}</Button>
            {updateProfile.isSuccess && <span className="text-sm font-bold text-green-700">Profil mis à jour.</span>}
          </div>
          {updateProfile.error && <p className="mt-3 text-sm text-red-600">{updateProfile.error.message}</p>}
        </form>

        <div className={`mt-5 rounded-xl border p-4 ${user?.emailVerified ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
          <p className={`font-bold ${user?.emailVerified ? 'text-green-800' : 'text-amber-900'}`}>
            {user?.emailVerified ? 'Adresse e-mail vérifiée' : 'Adresse e-mail non vérifiée'}
          </p>
          {!user?.emailVerified && (
            <>
              <p className="mt-1 text-sm text-amber-800">Vérifiez votre adresse pour sécuriser votre compte et faciliter sa récupération.</p>
              <Button className="mt-3" variant="secondary" disabled={resend.isPending} onClick={() => resend.mutate()}>
                {resend.isPending ? 'Envoi…' : 'Renvoyer le lien'}
              </Button>
            </>
          )}
          {resend.isSuccess && <p className="mt-2 text-sm text-green-700">Le lien de vérification a été envoyé.</p>}
          {resend.data?.devVerificationUrl && <a className="mt-2 block break-all text-sm font-bold text-accent underline" href={resend.data.devVerificationUrl}>Ouvrir le lien de développement</a>}
          {resend.error && <p className="mt-2 text-sm text-red-600">{resend.error.message}</p>}
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-bold">Sessions actives</h2>
        <p className="mt-1 text-sm text-muted">Fermez les sessions que vous ne reconnaissez pas.</p>
        {sessions.isLoading && <p className="mt-5 text-sm text-muted">Chargement…</p>}
        {sessions.error && <p className="mt-5 text-sm text-red-600">{sessions.error.message}</p>}
        <div className="mt-5 divide-y divide-border">
          {sessions.data?.sessions.map((session) => (
            <div key={session.id} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold">{describeDevice(session.userAgent)} {session.current && <span className="ml-2 rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">Cette session</span>}</p>
                <p className="mt-1 text-xs text-muted">Connexion: {formatDate(session.createdAt)} · Expire: {formatDate(session.expiresAt)}</p>
              </div>
              <Button variant="secondary" disabled={revoke.isPending || revokeAll.isPending} onClick={() => revoke.mutate(session.id)}>Déconnecter</Button>
            </div>
          ))}
        </div>
        {revoke.error && <p className="mt-3 text-sm text-red-600">{revoke.error.message}</p>}
        {Boolean(sessions.data?.sessions.length) && (
          <div className="mt-5 border-t border-border pt-5">
            <Button variant="danger" disabled={revokeAll.isPending} onClick={() => { if (window.confirm('Déconnecter tous les appareils, y compris celui-ci ?')) revokeAll.mutate(); }}>
              {revokeAll.isPending ? 'Déconnexion…' : 'Déconnecter tous les appareils'}
            </Button>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-xl font-bold">Préférences</h2>
        <p className="mt-1 text-sm text-muted">Ces choix sont enregistrés dans votre compte et appliqués sur vos appareils.</p>
        {preferences.isLoading ? <p className="mt-4 text-sm text-muted">Chargement…</p> : (
          <form className="mt-5 space-y-5" onSubmit={(event) => { event.preventDefault(); savePreferences.mutate(preferenceForm); }}>
            <label className="block max-w-sm text-sm font-bold">Langue de l’interface
              <select className="mt-2 min-h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" value={preferenceForm.locale} onChange={(event) => setPreferenceForm({ ...preferenceForm, locale: event.target.value as 'fr' | 'de' })}>
                <option value="fr">Français</option><option value="de">Deutsch</option>
              </select>
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-border bg-white p-4">
              <input className="mt-1 h-4 w-4 accent-accent" type="checkbox" checked={preferenceForm.emailStudyReminders} onChange={(event) => setPreferenceForm({ ...preferenceForm, emailStudyReminders: event.target.checked })} />
              <span><span className="block font-bold">Rappels d’étude</span><span className="text-sm text-muted">Recevoir des rappels pour maintenir votre rythme de préparation.</span></span>
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-border bg-white p-4">
              <input className="mt-1 h-4 w-4 accent-accent" type="checkbox" checked={preferenceForm.emailProductUpdates} onChange={(event) => setPreferenceForm({ ...preferenceForm, emailProductUpdates: event.target.checked })} />
              <span><span className="block font-bold">Nouveautés du produit</span><span className="text-sm text-muted">Recevoir les annonces concernant les nouveaux exercices et fonctionnalités.</span></span>
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-border bg-white p-4"><input className="mt-1 h-4 w-4 accent-accent" type="checkbox" checked={preferenceForm.personalizedRecommendations} onChange={(event) => setPreferenceForm({ ...preferenceForm, personalizedRecommendations: event.target.checked })} /><span><span className="block font-bold">Recommandations personnalisées</span><span className="text-sm text-muted">Utiliser mes scores pour proposer la prochaine activité. Ce choix reste désactivable.</span></span></label>
            <div className="flex items-center gap-3">
              <Button disabled={savePreferences.isPending}>{savePreferences.isPending ? 'Enregistrement…' : 'Enregistrer les préférences'}</Button>
              {savePreferences.isSuccess && <span className="text-sm font-bold text-green-700">Préférences enregistrées.</span>}
            </div>
            {(preferences.error || savePreferences.error) && <p className="text-sm text-red-600">{(preferences.error ?? savePreferences.error)?.message}</p>}
          </form>
        )}
      </Card>

      <Card><h2 className="text-xl font-bold">Parrainage</h2><p className="mt-1 text-sm text-muted">Partagez ce lien. Aucun avantage financier n’est attribué automatiquement.</p>{referral.data && <div className="mt-4 rounded-xl bg-bg p-4"><p className="break-all font-mono text-sm">{referral.data.shareUrl}</p><Button className="mt-3" variant="secondary" onClick={() => navigator.clipboard.writeText(referral.data!.shareUrl)}>Copier le lien</Button><p className="mt-3 text-xs text-muted">{referral.data.referrals.length} inscription(s) attribuée(s)</p></div>}</Card>

      <Card>
        <h2 className="text-xl font-bold">Mes données</h2>
        <p className="mt-1 text-sm text-muted">Téléchargez une copie JSON de votre profil, vos abonnements, paiements, exercices, réponses et résultats.</p>
        <Button className="mt-4" variant="secondary" disabled={exportAccount.isPending} onClick={() => exportAccount.mutate()}>
          {exportAccount.isPending ? 'Préparation…' : 'Exporter mes données'}
        </Button>
        {exportAccount.error && <p className="mt-3 text-sm text-red-600">{exportAccount.error.message}</p>}
      </Card>

      <Card className="border-red-200">
        <h2 className="text-xl font-bold text-red-700">Zone dangereuse</h2>
        <p className="mt-1 text-sm text-muted">La suppression est définitive. Vos progrès, réponses, abonnements et paiements seront supprimés. Exportez vos données avant de continuer.</p>
        {user?.role === 'admin' ? (
          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Un compte administrateur ne peut pas être supprimé depuis cette page.</p>
        ) : (
          <form className="mt-4 max-w-md" onSubmit={(event) => {
            event.preventDefault();
            if (window.confirm('Cette action est irréversible. Supprimer définitivement votre compte ?')) deleteAccount.mutate(deletePassword);
          }}>
            <label className="block text-sm font-bold">Confirmez votre mot de passe
              <Input className="mt-2" required type="password" autoComplete="current-password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} />
            </label>
            <Button className="mt-4" variant="danger" disabled={deleteAccount.isPending || !deletePassword}>
              {deleteAccount.isPending ? 'Suppression…' : 'Supprimer définitivement mon compte'}
            </Button>
          </form>
        )}
        {deleteAccount.error && <p className="mt-3 text-sm text-red-600">{deleteAccount.error.message}</p>}
      </Card>
    </div>
  );
}
