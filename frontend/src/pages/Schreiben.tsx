import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { apiClient } from '../lib/api';

export function Schreiben() {
  const types = useQuery({ queryKey: ['schreiben'], queryFn: apiClient.schreiben });
  return (
    <div>
      <h1 className="text-3xl font-bold">Schreiben</h1>
      <p className="mt-2 text-muted">Rédige une réponse et reçois une correction IA.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {types.data?.types.map((type: { id: string; title: string; niveau: string; context: string }) => (
          <Link key={type.id} to={`/dashboard/schreiben/${type.id}`}>
            <Card className="h-full hover:border-accent">
              <p className="text-sm text-muted">{type.niveau}</p>
              <h2 className="mt-2 text-xl font-bold german" dir="ltr">{type.title}</h2>
              <p className="mt-2 text-sm text-muted german" dir="ltr">{type.context}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
