import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '../../lib/api';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { useI18n } from '../../lib/i18n';
import { formatDate } from '../../lib/utils';

const initialReview = { pronunciation: 3, fluency: 3, vocabulary: 3, taskAchievement: 3, feedback: '' };

export function SpeakingReviewQueue() {
  const { direction, locale, t } = useI18n();
  const client = useQueryClient();
  const queue = useQuery({ queryKey: ['admin-speaking-reviews'], queryFn: apiClient.adminSpeakingReviews });
  const [selected, setSelected] = useState<string | null>(null);
  const [review, setReview] = useState(initialReview);
  const submit = useMutation({ mutationFn: () => apiClient.reviewAdminSpeaking({ id: selected!, review }), onSuccess: () => { setSelected(null); setReview(initialReview); client.invalidateQueries({ queryKey: ['admin-speaking-reviews'] }); } });
  const item = queue.data?.submissions.find((entry) => entry.id === selected);
  const scoreLabels = { pronunciation: t('pronunciation'), fluency: t('fluency'), vocabulary: t('vocabulary'), taskAchievement: t('taskAchievement') };
  if (item) return <Card dir={direction}><h2 className="text-xl font-black">{t('reviewTitle', { name: item.learnerName })}</h2><p className="mt-1 text-sm text-muted" dir="ltr">{item.title} · {item.level}</p><audio className="mt-4 w-full" controls crossOrigin="use-credentials" src={apiClient.adminSpeakingAudioUrl(item.id)} /><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{(['pronunciation', 'fluency', 'vocabulary', 'taskAchievement'] as const).map((key) => <label key={key} className="text-sm font-bold">{scoreLabels[key]}<Input className="mt-2" type="number" min={0} max={5} step={0.5} value={review[key]} onChange={(event) => setReview({ ...review, [key]: Number(event.target.value) })} /></label>)}</div><label className="mt-4 block text-sm font-bold">{t('pedagogicalFeedback')}<Textarea className="mt-2 min-h-28" value={review.feedback} onChange={(event) => setReview({ ...review, feedback: event.target.value })} /></label>{submit.error && <p className="mt-3 text-sm text-red-600">{submit.error.message}</p>}<div className="mt-4 flex gap-3"><Button disabled={review.feedback.length < 10 || submit.isPending} onClick={() => submit.mutate()}>{t('publishCorrection')}</Button><Button variant="secondary" onClick={() => setSelected(null)}>{t('cancel')}</Button></div></Card>;
  return <Card dir={direction}><h2 className="text-xl font-black">{t('reviewQueue')}</h2><p className="mt-1 text-sm text-muted">{t('reviewHelp')}</p><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-start text-sm"><thead className="text-muted"><tr><th className="py-2">{t('learner')}</th><th>{t('topicLabel')}</th><th>{t('date')}</th><th>{t('fieldStatus')}</th><th>{t('action')}</th></tr></thead><tbody>{queue.data?.submissions.map((entry) => <tr className="border-t border-border" key={entry.id}><td className="py-3">{entry.learnerName}</td><td className="font-bold" dir="ltr">{entry.title}</td><td>{formatDate(entry.createdAt, locale)}</td><td>{entry.status === 'reviewed' ? t('reviewedStatus') : t('toReviewStatus')}</td><td><Button variant="secondary" onClick={() => { setSelected(entry.id); if (entry.feedback) setReview({ pronunciation: entry.feedback.pronunciation, fluency: entry.feedback.fluency, vocabulary: entry.feedback.vocabulary, taskAchievement: entry.feedback.taskAchievement, feedback: entry.feedback.feedback }); }}>{t('openReview')}</Button></td></tr>)}</tbody></table></div></Card>;
}
