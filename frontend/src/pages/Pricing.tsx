import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Footer } from '../components/layout/Footer';
import { Navbar } from '../components/layout/Navbar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { apiClient } from '../lib/api';
import { formatMad } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';

export function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const plans = useQuery({ queryKey: ['plans'], queryFn: apiClient.plans });
  const createPayment = useMutation({
    mutationFn: apiClient.createPayment,
    onSuccess: (data) => {
      window.location.href = data.whatsappUrl;
    },
  });

  return (
    <div className="min-h-screen bg-bg" dir="ltr">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-3xl font-bold">Choisis ton pack</h1>
        <p className="mt-2 text-muted">Paiement manuel seulement: WhatsApp + virement CIH.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {plans.data?.plans.map((plan) => (
            <Card key={plan.id} className="flex flex-col">
              <h2 className="text-xl font-bold">{plan.name}</h2>
              <p className="mt-3 text-3xl font-bold">{formatMad(plan.priceMad)}</p>
              <p className="mt-2 text-sm text-muted">{plan.durationDays} jour(s)</p>
              <p className="mt-1 text-sm text-muted">{plan.aiCreditsPerDay} correction(s) IA / jour</p>
              <Button
                className="mt-6"
                disabled={plan.id === 'trial' || createPayment.isPending}
                onClick={() => {
                  if (!user) {
                    navigate('/login');
                    return;
                  }
                  createPayment.mutate(plan.id);
                }}
              >
                {plan.id === 'trial' ? 'Inclus à l’inscription' : 'Payer via WhatsApp'}
              </Button>
            </Card>
          ))}
        </div>
        {!user && (
          <p className="mt-6 text-sm text-muted">
            Déjà décidé? <Link className="font-semibold text-accent" to="/register">Crée ton compte</Link> puis choisis un pack.
          </p>
        )}
      </main>
      <Footer />
    </div>
  );
}
