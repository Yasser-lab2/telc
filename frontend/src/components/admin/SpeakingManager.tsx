import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '../../lib/api';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { useI18n } from '../../lib/i18n';

type Form = { title: string; level: 'B1' | 'B2'; description: string; instructions: string; durationMinutes: number; status: 'draft' | 'published' };
const blank = (): Form => ({ title: '', level: 'B1', description: '', instructions: '', durationMinutes: 3, status: 'draft' });

export function SpeakingManager() {
  const { direction, t } = useI18n();
  const client = useQueryClient();
  const list = useQuery({ queryKey: ['admin-speaking'], queryFn: apiClient.adminSpeaking });
  const [form, setForm] = useState<Form>(blank);
  const [selected, setSelected] = useState<string | null>(null);
  const refresh = () => client.invalidateQueries({ queryKey: ['admin-speaking'] });
  const save = useMutation({ mutationFn: async () => { if (selected) await apiClient.updateAdminSpeaking({ id: selected, payload: form }); else await apiClient.createAdminSpeaking(form); }, onSuccess: () => { setSelected(null); setForm(blank()); refresh(); } });
  const archive = useMutation({ mutationFn: apiClient.archiveAdminSpeaking, onSuccess: refresh });
  function edit(id: string) { const item = list.data?.prompts.find((entry) => entry.id === id); if (!item) return; setSelected(id); setForm({ title: item.title, level: item.level, description: item.description ?? '', instructions: item.instructions ?? '', durationMinutes: item.durationMinutes ?? 3, status: item.status === 'published' ? 'published' : 'draft' }); }
  const statusLabel = (status: string) => status === 'published' ? t('publishedStatus') : status === 'archived' ? t('archivedStatus') : t('draftStatus');
  return <div className="space-y-6" dir={direction}>
    <Card><div className="flex justify-between gap-3"><div><h2 className="text-xl font-black">{selected ? t('editSpeakingTopic') : t('newSpeakingTopic')}</h2><p className="mt-1 text-sm text-muted">{t('speakingHelp')}</p></div>{selected && <Button variant="secondary" onClick={() => { setSelected(null); setForm(blank()); }}>{t('cancel')}</Button>}</div><div className="mt-5 grid gap-4 md:grid-cols-3"><Field label={t('fieldTitle')}><Input dir="ltr" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field><Field label={t('fieldLevel')}><select className="field" value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value as 'B1' | 'B2' })}><option>B1</option><option>B2</option></select></Field><Field label={t('recommendedDuration')}><Input type="number" min={1} max={30} value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: Number(event.target.value) })} /></Field></div><Field label={t('shortDescription')}><Input dir="ltr" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field><Field label={t('instruction')}><Textarea dir="ltr" className="min-h-32" value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} /></Field><Field label={t('fieldStatus')}><select className="field max-w-52" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as 'draft' | 'published' })}><option value="draft">{t('draftStatus')}</option><option value="published">{t('publishedStatus')}</option></select></Field>{save.error && <p className="mt-3 text-sm text-red-600">{save.error.message}</p>}<Button className="mt-5" disabled={form.title.length < 3 || form.instructions.length < 10 || save.isPending} onClick={() => save.mutate()}>{save.isPending ? `${t('save')}…` : selected ? t('save') : t('createTopic')}</Button></Card>
    <Card><h2 className="text-xl font-black">{t('speakingTopics')}</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[640px] text-start text-sm"><thead className="text-muted"><tr><th className="py-2">{t('fieldTitle')}</th><th>{t('fieldLevel')}</th><th>{t('duration')}</th><th>{t('fieldStatus')}</th><th>{t('actions')}</th></tr></thead><tbody>{list.data?.prompts.map((item) => <tr className="border-t border-border" key={item.id}><td className="py-3 font-bold" dir="ltr">{item.title}</td><td dir="ltr">{item.level}</td><td>{t('minutes', { count: item.durationMinutes ?? 3 })}</td><td>{statusLabel(item.status)}</td><td className="flex gap-2 py-2"><Button variant="secondary" onClick={() => edit(item.id)}>{t('edit')}</Button>{item.status !== 'archived' && <Button variant="danger" onClick={() => { if (window.confirm(t('archiveConfirm', { title: item.title }))) archive.mutate(item.id); }}>{t('archive')}</Button>}</td></tr>)}</tbody></table></div></Card>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="mt-4 block text-sm font-bold">{label}<div className="mt-2">{children}</div></label>; }
