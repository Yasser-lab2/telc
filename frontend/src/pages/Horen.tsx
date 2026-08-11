import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { apiClient } from '../lib/api';

export function Horen() {
  const audios = useQuery({ queryKey: ['horen'], queryFn: apiClient.horen });
  return (
    <div>
      <h1 className="text-3xl font-bold">Hören</h1>
      <p className="mt-2 text-muted">Écoute l’audio puis réponds aux questions.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {audios.data?.audios.map((audio: { id: string; title: string; niveau: string; audioUrl: string }) => (
          <Link key={audio.id} to={`/dashboard/horen/${audio.id}`}>
            <Card className="h-full hover:border-accent">
              <p className="text-sm text-muted">{audio.niveau}</p>
              <h2 className="mt-2 text-xl font-bold german" dir="ltr">{audio.title}</h2>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
