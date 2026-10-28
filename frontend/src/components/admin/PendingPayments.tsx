import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { formatDate, formatMad } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useI18n } from '../../lib/i18n';

type PendingPayment = {
  payment: { id: string; amountMad: number; createdAt: string; proofObjectKey: string | null; proofFileName: string | null };
  plan: { name: string };
  user: { email: string; displayName: string };
};

export function PendingPayments() {
  const { direction, locale, t } = useI18n();
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
    <Card dir={direction}>
      <h2 className="text-xl font-bold">{t('pendingPayments')}</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-start text-sm">
          <thead className="text-muted">
            <tr>
              <th className="py-2">{t('users')}</th>
              <th>{t('plan')}</th>
              <th>{t('amount')}</th>
              <th>{t('requestedAt')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {((payments.data?.payments as PendingPayment[] | undefined) ?? []).map((row) => (
              <tr key={row.payment.id} className="border-t border-border">
                <td className="py-3">{row.user.email}</td>
                <td>{row.plan.name}</td>
                 <td>{formatMad(row.payment.amountMad, locale)}</td>
                 <td>{formatDate(row.payment.createdAt, locale)}</td>
                <td className="flex gap-2 py-2">
                  {row.payment.proofObjectKey ? <a className="inline-flex min-h-10 items-center rounded-xl border border-border px-3 font-bold text-accent" href={apiClient.paymentProofUrl(row.payment.id)} target="_blank" rel="noreferrer">{t('viewProof')}</a> : <span className="self-center text-xs text-muted">{t('noProof')}</span>}
                  <Button
                    disabled={!row.payment.proofObjectKey}
                    onClick={() => {
                       if (window.confirm(t('approveQuestion', { plan: row.plan.name, email: row.user.email }))) approve.mutate(row.payment.id);
                    }}
                  >
                     {t('approve')}
                  </Button>
                   <Button variant="danger" onClick={() => { const reason = window.prompt(t('rejectionReason')); if (reason?.trim()) reject.mutate({ id: row.payment.id, reason: reason.trim() }); }}>
                     {t('reject')}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(approve.error || reject.error) && <p className="mt-3 text-sm text-red-600">{approve.error?.message ?? reject.error?.message}</p>}
    </Card>
  );
}
