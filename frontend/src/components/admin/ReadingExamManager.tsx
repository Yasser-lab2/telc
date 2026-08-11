import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { apiClient, type ReadingExamListItem } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';

const template = {
  exam: {
    title: 'Alex und Cora',
    level: 'B1',
    durationMinutes: 90,
    scoreMax: 105,
    accessStatus: 'free',
    status: 'draft',
  },
  sections: [
    {
      code: 'teil1',
      title: 'Leseverstehen Teil 1',
      instructions: 'Lesen Sie die Überschriften und die Texte. Ordnen Sie zu.',
      mainText: '',
      exerciseType: 'matching_titles',
      extraData: {
        titles: [
          { code: 'A', text: 'Beispiel Titel A' },
          { code: 'B', text: 'Beispiel Titel B' },
        ],
      },
      questions: [
        {
          number: 1,
          text: 'Beispieltext 1',
          points: 5,
          answerType: 'letter_match',
          options: [
            { code: 'A', text: 'Beispiel Titel A', isCorrect: false },
            { code: 'B', text: 'Beispiel Titel B', isCorrect: true },
          ],
        },
      ],
    },
  ],
};

export function ReadingExamManager() {
  const queryClient = useQueryClient();
  const exams = useQuery({ queryKey: ['admin-reading-exams'], queryFn: apiClient.adminReadingExams });
  const [selected, setSelected] = useState<ReadingExamListItem | null>(null);
  const [form, setForm] = useState<{
    title: string;
    level: 'B1' | 'B2';
    durationMinutes: number;
    scoreMax: number;
    accessStatus: 'free' | 'premium';
  }>({ title: '', level: 'B1', durationMinutes: 90, scoreMax: 105, accessStatus: 'premium' });

  const create = useMutation({
    mutationFn: apiClient.createAdminReadingExam,
    onSuccess: (data: { exam: ReadingExamListItem }) => {
      setSelected(data.exam);
      setForm({
        title: data.exam.title,
        level: data.exam.level,
        durationMinutes: data.exam.durationMinutes,
        scoreMax: data.exam.scoreMax,
        accessStatus: data.exam.accessStatus,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-reading-exams'] });
    },
  });

  const publish = useMutation({
    mutationFn: apiClient.publishAdminReadingExam,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-reading-exams'] }),
  });
  const unpublish = useMutation({
    mutationFn: apiClient.unpublishAdminReadingExam,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-reading-exams'] }),
  });
  const remove = useMutation({
    mutationFn: apiClient.deleteAdminReadingExam,
    onSuccess: () => {
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ['admin-reading-exams'] });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-xl font-bold">Créer un examen Lesen</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <Input placeholder="Titre" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          <select className="min-h-10 rounded-md border border-border bg-white px-3 text-sm" value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value as 'B1' | 'B2' })}>
            <option value="B1">B1</option>
          </select>
          <Input type="number" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: Number(event.target.value) })} />
          <Input type="number" value={form.scoreMax} onChange={(event) => setForm({ ...form, scoreMax: Number(event.target.value) })} />
          <select
            className="min-h-10 rounded-md border border-border bg-white px-3 text-sm"
            value={form.accessStatus}
            onChange={(event) => setForm({ ...form, accessStatus: event.target.value as 'free' | 'premium' })}
          >
            <option value="premium">Premium</option>
            <option value="free">Free</option>
          </select>
        </div>
        {create.error && <p className="mt-3 text-sm text-red-600">{create.error.message}</p>}
        <Button className="mt-4" disabled={!form.title || create.isPending} onClick={() => create.mutate(form)}>
          Créer en draft
        </Button>
      </Card>

      <Card>
        <h2 className="text-xl font-bold">Examens Lesen</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="py-2">Titre</th>
                <th>Niveau</th>
                <th>Status</th>
                <th>Access</th>
                <th>Durée</th>
                <th>Créé</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(exams.data?.exams ?? []).map((exam: ReadingExamListItem) => (
                <tr key={exam.id} className="border-t border-border">
                  <td className="py-3">{exam.title}</td>
                  <td>{exam.level}</td>
                  <td>{exam.status}</td>
                  <td>{exam.accessStatus}</td>
                  <td>{exam.durationMinutes} min</td>
                  <td>{formatDate(exam.createdAt)}</td>
                  <td className="flex flex-wrap gap-2 py-2">
                    <Button variant="secondary" onClick={() => setSelected(exam)}>Edit</Button>
                    {exam.status === 'published' ? (
                      <Button variant="secondary" onClick={() => unpublish.mutate(exam.id)}>Unpublish</Button>
                    ) : (
                      <Button onClick={() => publish.mutate(exam.id)}>Publish</Button>
                    )}
                    <Button
                      variant="danger"
                      onClick={() => {
                        if (confirm(`Supprimer ${exam.title} ?`)) remove.mutate(exam.id);
                      }}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {selected && <ReadingJsonEditor exam={selected} />}
    </div>
  );
}

function ReadingJsonEditor({ exam }: { exam: ReadingExamListItem }) {
  const queryClient = useQueryClient();
  const detail = useQuery({ queryKey: ['admin-reading-exam', exam.id], queryFn: () => apiClient.readingExam(exam.id) });
  const initialJson = useMemo(() => JSON.stringify(template, null, 2), []);
  const [jsonText, setJsonText] = useState(initialJson);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (detail.data?.exam) {
      const existing = {
        exam: {
          title: detail.data.exam.title,
          level: detail.data.exam.level,
          durationMinutes: detail.data.exam.durationMinutes,
          scoreMax: detail.data.exam.scoreMax,
          accessStatus: detail.data.exam.accessStatus,
          status: detail.data.exam.status,
        },
        sections: detail.data.exam.sections.map((section: import('../../lib/api').ReadingSection) => ({
          code: section.sectionCode,
          title: section.title,
          instructions: section.instructions ?? '',
          mainText: section.mainText ?? '',
          exerciseType: section.exerciseType,
          extraData: section.extraData ?? {},
          questions: section.questions.map((question: import('../../lib/api').ReadingQuestion) => ({
            number: question.questionNumber,
            text: question.questionText,
            points: question.points,
            answerType: question.answerType,
            options: question.options.map((option: import('../../lib/api').ReadingOption) => ({
              code: option.code,
              text: option.text,
              isCorrect: Boolean(option.isCorrect),
              explanation: option.explanation ?? undefined,
            })),
          })),
        })),
      };
      setJsonText(JSON.stringify(existing.sections.length ? existing : { ...template, exam: existing.exam }, null, 2));
    }
  }, [detail.data?.exam]);

  const save = useMutation({
    mutationFn: async () => {
      const parsed = JSON.parse(jsonText) as unknown;
      return apiClient.saveAdminReadingContent(exam.id, parsed);
    },
    onSuccess: () => {
      setMessage('Contenu sauvegardé.');
      queryClient.invalidateQueries({ queryKey: ['admin-reading-exams'] });
      queryClient.invalidateQueries({ queryKey: ['admin-reading-exam', exam.id] });
    },
    onError: (error: Error) => setMessage(error.message),
  });

  return (
    <Card>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold">JSON editor: {exam.title}</h2>
          <p className="mt-1 text-sm text-muted">Colle un examen complet. Les drafts peuvent rester incomplets; publish exige une validation complète.</p>
        </div>
        <Button variant="secondary" onClick={() => setJsonText(JSON.stringify(template, null, 2))}>Voir template</Button>
      </div>
      <Textarea className="mt-4 min-h-[520px] font-mono text-xs" value={jsonText} onChange={(event) => setJsonText(event.target.value)} />
      {message && <p className="mt-3 text-sm text-muted">{message}</p>}
      {save.error && <p className="mt-3 text-sm text-red-600">{save.error.message}</p>}
      <Button className="mt-4" disabled={save.isPending} onClick={() => save.mutate()}>
        Sauvegarder JSON
      </Button>
    </Card>
  );
}
