import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Footer } from '../components/layout/Footer';
import { Navbar } from '../components/layout/Navbar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { apiClient, type Plan } from '../lib/api';
import { formatMad } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';

export function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const plans = useQuery({ queryKey: ['plans'], queryFn: apiClient.plans });
  const createPayment = useMutation({
    mutationFn: apiClient.createPayment,
    onSuccess: (data: { paymentId: string; whatsappUrl: string }) => {
      window.location.href = data.whatsappUrl;
    },
  });

  return (
    <div className="app-canvas min-h-screen" dir="ltr">
      <Navbar />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="max-w-2xl"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-accent">Offres simples et transparentes</p><h1 className="mt-3 text-4xl font-black tracking-tight text-ink md:text-5xl">Choisissez votre durée de préparation.</h1><p className="mt-4 text-lg leading-8 text-muted">Paiement par virement CIH, suivi sur WhatsApp, puis activation après vérification.</p></div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.data?.plans.map((plan: Plan) => (
            <Card key={plan.id} className={`flex flex-col ${plan.id !== 'trial' ? 'hover:border-accent/40' : 'bg-bg/70'}`}>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-accent">{plan.id === 'trial' ? 'Découverte' : `${plan.durationDays} jours`}</p>
              <h2 className="mt-3 text-xl font-black text-ink">{plan.name}</h2>
              <p className="mt-5 text-3xl font-black text-ink">{formatMad(plan.priceMad)}</p>
              <div className="mt-5 space-y-3 border-t border-border pt-5 text-sm text-muted"><p>✓ Accès aux modules disponibles</p><p>✓ {plan.aiCreditsPerDay} correction(s) IA par jour</p><p>✓ Suivi de l’abonnement</p></div>
              <Button
                className="mt-7 w-full"
                disabled={plan.id === 'trial' || createPayment.isPending}
                onClick={() => {
                  if (!user) {
                    navigate('/login');
                    return;
                  }
                  createPayment.mutate(plan.id);
                }}
              >
                {plan.id === 'trial' ? 'Inclus à l’inscription' : 'Choisir cette offre'}
              </Button>
            </Card>
          ))}
        </div>
        {!user && (
          <p className="mt-8 text-sm text-muted">
            Déjà décidé? <Link className="font-semibold text-accent" to="/register">Crée ton compte</Link> puis choisis un pack.
          </p>
        )}
        <section className="mt-12 grid gap-4 rounded-2xl border border-border bg-surface p-6 md:grid-cols-3"><div><p className="font-black text-ink">1. Choisissez</p><p className="mt-2 text-sm text-muted">Sélectionnez l’offre adaptée.</p></div><div><p className="font-black text-ink">2. Effectuez le virement</p><p className="mt-2 text-sm text-muted">Les informations CIH sont envoyées dans WhatsApp.</p></div><div><p className="font-black text-ink">3. Accédez à la plateforme</p><p className="mt-2 text-sm text-muted">Un administrateur vérifie puis active votre accès.</p></div></section>
      </main>
      <Footer />
    </div>
  );
}
