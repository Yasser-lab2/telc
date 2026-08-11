import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient, type AdminLearningPayload } from '../../lib/api';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';

const blankQuestion = () => ({ prompt: '', explanation: '', correctCode: 'A', options: [{ code: 'A', label: '' }, { code: 'B', label: '' }, { code: 'C', label: '' }] });
const initialForm = (): AdminLearningPayload => ({ skill: 'writing', title: '', level: 'B1', status: 'draft', accessStatus: 'premium', difficulty: 'standard', durationMinutes: 30, context: '' });

export function LearningContentManager() {
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: ['admin-learning-content'], queryFn: apiClient.adminLearningContent });
  const analytics = useQuery({ queryKey: ['admin-content-analytics'], queryFn: apiClient.adminContentAnalytics });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<AdminLearningPayload>(initialForm);
  const [message, setMessage] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => selectedId ? apiClient.updateAdminLearningContent(selectedId, form) : apiClient.createAdminLearningContent(form),
    onSuccess: () => { setMessage('Contenu sauvegardé.'); setSelectedId(null); setForm(initialForm()); queryClient.invalidateQueries({ queryKey: ['admin-learning-content'] }); },
    onError: (error: Error) => setMessage(error.message),
  });
  const archive = useMutation({ mutationFn: apiClient.archiveAdminLearningContent, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-learning-content'] }) });

  async function edit(id: string) {
    const { item } = await apiClient.adminLearningDetail(id);
    setSelectedId(id); setMessage(null);
    if (item.skill === 'writing') setForm({ skill: 'writing', title: item.title, level: item.level, status: item.status === 'published' ? 'published' : 'draft', accessStatus: item.accessStatus, difficulty: item.difficulty, durationMinutes: item.durationMinutes ?? 30, context: item.instructions ?? '' });
    else {
      const metadata = (item.metadata ?? {}) as { maxPlays?: number };
      const section = item.sections[0];
      setForm({ skill: 'listening', title: item.title, level: item.level, status: item.status === 'published' ? 'published' : 'draft', accessStatus: item.accessStatus, difficulty: item.difficulty, durationMinutes: item.durationMinutes ?? 10, audioUrl: item.media.find((entry) => entry.role === 'primary_audio')?.asset.sourceUrl ?? '', transcript: section?.body ?? '', maxPlays: metadata.maxPlays ?? 2, questions: section?.questions.map((question) => ({ prompt: question.prompt, explanation: question.explanation ?? '', correctCode: question.options.find((option) => option.isCorrect)?.code ?? 'A', options: question.options.map((option) => ({ code: option.code, label: option.label })) })) ?? [blankQuestion()] });
    }
  }

  const valid = form.title.length >= 2 && (form.skill === 'writing' ? (form.context?.length ?? 0) >= 10 : Boolean(form.audioUrl && form.transcript && form.questions?.every((question) => question.prompt && question.options.every((option) => option.label))));
  return <div className="space-y-6">
    <Card><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">{selectedId ? 'Modifier le contenu' : 'Nouveau contenu'}</h2><p className="mt-1 text-sm text-muted">Formulaire pour Hören et Schreiben. Lesen conserve son éditeur JSON.</p></div>{selectedId && <Button variant="secondary" onClick={() => { setSelectedId(null); setForm(initialForm()); }}>Annuler</Button>}</div>
      <div className="mt-5 grid gap-4 md:grid-cols-3"><Field label="Compétence"><select disabled={Boolean(selectedId)} className="field" value={form.skill} onChange={(event) => setForm(event.target.value === 'writing' ? initialForm() : { ...initialForm(), skill: 'listening', durationMinutes: 10, audioUrl: '', transcript: '', maxPlays: 2, questions: [blankQuestion()] })}><option value="writing">Schreiben</option><option value="listening">Hören</option></select></Field><Field label="Titre"><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field><Field label="Niveau"><select className="field" value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value as 'B1' | 'B2' })}><option>B1</option><option>B2</option></select></Field><Field label="Statut"><select className="field" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as 'draft' | 'published' })}><option value="draft">Draft</option><option value="published">Published</option></select></Field><Field label="Accès"><select className="field" value={form.accessStatus} onChange={(event) => setForm({ ...form, accessStatus: event.target.value as 'free' | 'premium' })}><option value="premium">Premium</option><option value="free">Free</option></select></Field><Field label="Durée (minutes)"><Input type="number" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: Number(event.target.value) })} /></Field></div>
      {form.skill === 'writing' ? <Field label="Consigne"><Textarea className="mt-2 min-h-36" value={form.context} onChange={(event) => setForm({ ...form, context: event.target.value })} /></Field> : <ListeningFields form={form} setForm={setForm} />}
      {message && <p className={`mt-4 text-sm ${save.isError ? 'text-red-600' : 'text-muted'}`}>{message}</p>}<Button className="mt-5" disabled={!valid || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Sauvegarde…' : selectedId ? 'Enregistrer les modifications' : 'Créer le contenu'}</Button>
    </Card>
    <Card><h2 className="text-xl font-black">Contenus Hören & Schreiben</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="text-muted"><tr><th className="py-2">Titre</th><th>Compétence</th><th>Niveau</th><th>Statut</th><th>Accès</th><th>Actions</th></tr></thead><tbody>{list.data?.items.map((item) => <tr key={item.id} className="border-t border-border"><td className="py-3 font-bold">{item.title}</td><td>{item.skill}</td><td>{item.level}</td><td>{item.status}</td><td>{item.accessStatus}</td><td className="flex gap-2 py-2"><Button variant="secondary" onClick={() => void edit(item.id)}>Modifier</Button>{item.status !== 'archived' && <Button variant="danger" onClick={() => { if (confirm(`Archiver ${item.title} ?`)) archive.mutate(item.id); }}>Archiver</Button>}</td></tr>)}</tbody></table></div></Card>
    <Card><h2 className="text-xl font-black">Analytics des contenus</h2><p className="mt-1 text-sm text-muted">Données calculées depuis les tentatives réelles.</p><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="text-muted"><tr><th className="py-2">Contenu</th><th>Démarrées</th><th>Terminées</th><th>Abandonnées</th><th>Complétion</th><th>Score moyen</th></tr></thead><tbody>{analytics.data?.items.map((item) => <tr key={item.id} className="border-t border-border"><td className="py-3"><span className="font-bold">{item.title}</span><span className="ml-2 text-xs text-muted">{item.skill}</span></td><td>{item.starts}</td><td>{item.completions}</td><td>{item.abandonments}</td><td>{item.starts ? `${Math.round(item.completions / item.starts * 100)} %` : '—'}</td><td>{item.averageScore == null ? '—' : `${item.averageScore} %`}</td></tr>)}</tbody></table></div></Card>
  </div>;
}

function ListeningFields({ form, setForm }: { form: AdminLearningPayload; setForm: (value: AdminLearningPayload) => void }) {
  const questions = form.questions ?? [blankQuestion()];
  return <div className="mt-5 space-y-4"><div className="grid gap-4 md:grid-cols-[1fr_180px]"><Field label="URL audio"><Input type="url" value={form.audioUrl} onChange={(event) => setForm({ ...form, audioUrl: event.target.value })} /></Field><Field label="Nombre d’écoutes"><Input type="number" min={1} max={10} value={form.maxPlays} onChange={(event) => setForm({ ...form, maxPlays: Number(event.target.value) })} /></Field></div><Field label="Transcription"><Textarea className="mt-2 min-h-28" value={form.transcript} onChange={(event) => setForm({ ...form, transcript: event.target.value })} /></Field>{questions.map((question, questionIndex) => <div key={questionIndex} className="rounded-xl border border-border bg-bg p-4"><div className="flex justify-between"><p className="font-black">Question {questionIndex + 1}</p>{questions.length > 1 && <button className="text-sm font-bold text-red-600" onClick={() => setForm({ ...form, questions: questions.filter((_, index) => index !== questionIndex) })}>Supprimer</button>}</div><Input className="mt-3" placeholder="Question" value={question.prompt} onChange={(event) => setForm({ ...form, questions: questions.map((item, index) => index === questionIndex ? { ...item, prompt: event.target.value } : item) })} /><div className="mt-3 grid gap-2 md:grid-cols-3">{question.options.map((option, optionIndex) => <label key={option.code} className="text-xs font-bold text-muted"><span className="flex items-center gap-2"><input type="radio" checked={question.correctCode === option.code} onChange={() => setForm({ ...form, questions: questions.map((item, index) => index === questionIndex ? { ...item, correctCode: option.code } : item) })} /> Correcte {option.code}</span><Input className="mt-2" value={option.label} onChange={(event) => setForm({ ...form, questions: questions.map((item, index) => index === questionIndex ? { ...item, options: item.options.map((entry, current) => current === optionIndex ? { ...entry, label: event.target.value } : entry) } : item) })} /></label>)}</div><Input className="mt-3" placeholder="Explication après correction" value={question.explanation} onChange={(event) => setForm({ ...form, questions: questions.map((item, index) => index === questionIndex ? { ...item, explanation: event.target.value } : item) })} /></div>)}<Button variant="secondary" onClick={() => setForm({ ...form, questions: [...questions, blankQuestion()] })}>Ajouter une question</Button></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="mt-4 block text-sm font-bold text-text">{label}<div className="mt-2">{children}</div></label>; }
