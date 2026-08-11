import { useState } from 'react';
import type { Question } from '../../lib/api';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export function ExerciseCard({ questions, onSubmit, isSubmitting = false }: { questions: Question[]; onSubmit?: (answers: Record<string, number>) => Promise<void>; isSubmitting?: boolean }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const score = questions.reduce((total, question) => total + (answers[question.id] === question.answerIndex ? 1 : 0), 0);

  return (
    <Card>
      <div className="space-y-5">
        {questions.map((question) => (
          <div key={question.id} className="german rounded-md border border-border bg-white p-4" dir="ltr">
            <p className="font-semibold">{question.prompt}</p>
            <div className="mt-3 grid gap-2">
              {question.options.map((option, index) => {
                const selected = answers[question.id] === index;
                const correct = submitted && question.answerIndex === index;
                const wrong = submitted && selected && !correct;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setAnswers((current) => ({ ...current, [question.id]: index }))}
                    className={`rounded-md border px-3 py-2 text-left text-sm ${
                      correct ? 'border-green-600 bg-green-50' : wrong ? 'border-red-600 bg-red-50' : selected ? 'border-accent' : 'border-border'
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between">
        <Button disabled={isSubmitting || Object.keys(answers).length !== questions.length} onClick={async () => {
          if (onSubmit) await onSubmit(answers);
          setSubmitted(true);
        }}>{isSubmitting ? 'Enregistrement…' : 'Corriger'}</Button>
        {submitted && <span className="font-semibold">Score: {score}/{questions.length}</span>}
      </div>
    </Card>
  );
}
