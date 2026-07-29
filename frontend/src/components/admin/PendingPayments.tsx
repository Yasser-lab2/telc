import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { formatDate, formatMad } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

type PendingPayment = {
  payment: { id: string; amountMad: number; createdAt: string };
  plan: { name: string };
  user: { email: string; displayName: string };
};

export function PendingPayments() {
  const queryClient = useQueryClient();
  const payments = useQuery({ queryKey: ['admin-payments'], queryFn: apiClient.adminPayments });
  const approve = useMutation({
    mutationFn: apiClient.approvePayment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-payments'] }),
  });
  const reject = useMutation({
    mutationFn: apiClient.rejectPayment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-payments'] }),
  });

  return (
    <Card>
      <h2 className="text-xl font-bold">Paiements en attente</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="py-2">Utilisateur</th>
              <th>Plan</th>
              <th>Montant</th>
              <th>Demandé le</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {((payments.data?.payments as PendingPayment[] | undefined) ?? []).map((row) => (
              <tr key={row.payment.id} className="border-t border-border">
                <td className="py-3">{row.user.email}</td>
                <td>{row.plan.name}</td>
                <td>{formatMad(row.payment.amountMad)}</td>
                <td>{formatDate(row.payment.createdAt)}</td>
                <td className="flex gap-2 py-2">
                  <Button
                    onClick={() => {
                      if (confirm(`Approuver ${row.plan.name} pour ${row.user.email} ?`)) approve.mutate(row.payment.id);
                    }}
                  >
                    Approve
                  </Button>
                  <Button variant="danger" onClick={() => reject.mutate(row.payment.id)}>
                    Reject
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
