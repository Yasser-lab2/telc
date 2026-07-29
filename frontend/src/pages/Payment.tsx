import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { apiClient } from '../lib/api';
import { formatDate, formatMad } from '../lib/utils';

export function Payment() {
  const payments = useQuery({ queryKey: ['my-payments'], queryFn: apiClient.myPayments });
  return (
    <div className="min-h-screen bg-bg" dir="ltr">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-3xl font-bold">Paiement manuel</h1>
        <p className="mt-2 text-muted">Choisis un pack, ouvre WhatsApp, fais le virement CIH et envoie le Payment ID.</p>
        <Link to="/pricing" className="mt-5 inline-block">
          <Button>Choisir un pack</Button>
        </Link>
        <Card className="mt-8">
          <h2 className="text-xl font-bold">Mes demandes</h2>
          <div className="mt-4 space-y-3">
            {payments.data?.payments.map((payment) => {
              const row = payment as { id: string; amountMad: number; status: string; createdAt: string; plan?: { name: string } };
              return (
                <div key={row.id} className="rounded-md border border-border bg-white p-3 text-sm">
                  <div className="font-semibold">{row.plan?.name ?? 'Pack'} - {formatMad(row.amountMad)}</div>
                  <div className="text-muted">Status: {row.status} · {formatDate(row.createdAt)}</div>
                  <div className="text-muted">Payment ID: {row.id}</div>
                </div>
              );
            })}
          </div>
        </Card>
      </main>
    </div>
  );
}
