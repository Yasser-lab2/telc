import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { apiClient } from '../lib/api';
import { formatDate, formatMad } from '../lib/utils';

export function Payment() {
  const queryClient = useQueryClient();
  const payments = useQuery({ queryKey: ['my-payments'], queryFn: apiClient.myPayments });
  const upload = useMutation({ mutationFn: ({ id, file }: { id: string; file: File }) => apiClient.uploadPaymentProof(id, file), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-payments'] }) });
  return (
    <div className="min-h-screen bg-bg" dir="ltr">
      <Navbar />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-3xl font-bold">Paiement manuel</h1>
        <p className="mt-2 text-muted">Choisis un pack, ouvre WhatsApp, fais le virement CIH et envoie le Payment ID.</p>
        <Link to="/pricing" className="mt-5 inline-block">
          <Button>Choisir un pack</Button>
        </Link>
        <Card className="mt-8">
          <h2 className="text-xl font-bold">Mes demandes</h2>
          <div className="mt-4 space-y-3">
            {payments.data?.payments.map((payment: Record<string, unknown>) => {
              const row = payment as { id: string; amountMad: number; status: string; createdAt: string; hasProof: boolean; proofFileName?: string; rejectionReason?: string; plan?: { name: string }; events?: Array<{ id: string; status: string; note?: string; createdAt: string }> };
              return (
                <div key={row.id} className="rounded-xl border border-border bg-white p-4 text-sm">
                  <div className="font-semibold">{row.plan?.name ?? 'Pack'} - {formatMad(row.amountMad)}</div>
                  <div className="text-muted">Status: {row.status} · {formatDate(row.createdAt)}</div>
                  <div className="text-muted">Payment ID: {row.id}</div>
                  {row.rejectionReason && <p className="mt-2 rounded-lg bg-red-50 p-2 text-red-700">Motif: {row.rejectionReason}</p>}
                  {row.status === 'pending' && <label className="mt-3 inline-flex cursor-pointer items-center rounded-xl border border-border px-4 py-2 font-bold text-accent hover:border-accent/40"><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => { const file = event.target.files?.[0]; if (file) upload.mutate({ id: row.id, file }); }} />{upload.isPending ? 'Envoi…' : row.hasProof ? `Remplacer la preuve${row.proofFileName ? ` (${row.proofFileName})` : ''}` : 'Ajouter la preuve de paiement'}</label>}
                  {row.events?.length ? <ol className="mt-4 border-l-2 border-border pl-4">{row.events.slice().reverse().map((event) => <li key={event.id} className="mb-3"><p className="font-bold capitalize">{event.status.replace('_', ' ')}</p><p className="text-xs text-muted">{formatDate(event.createdAt)}{event.note ? ` · ${event.note}` : ''}</p></li>)}</ol> : null}
                </div>
              );
            })}
          </div>
          {upload.error && <p className="mt-3 text-sm text-red-600">{upload.error.message}</p>}
        </Card>
      </main>
    </div>
  );
}
