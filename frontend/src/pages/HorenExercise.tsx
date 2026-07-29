import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { AudioPlayer } from '../components/exercise/AudioPlayer';
import { ExerciseCard } from '../components/exercise/ExerciseCard';
import { Card } from '../components/ui/Card';
import { apiClient } from '../lib/api';

export function HorenExercise() {
  const { audioId = '' } = useParams();
  const audio = useQuery({ queryKey: ['horen', audioId], queryFn: () => apiClient.horenAudio(audioId) });
  if (!audio.data) return <p>Chargement...</p>;
  return (
    <div>
      <h1 className="text-3xl font-bold german" dir="ltr">{audio.data.audio.title}</h1>
      <Card className="mt-5">
        <AudioPlayer src={audio.data.audio.audioUrl} />
      </Card>
      <div className="mt-5">
        <ExerciseCard questions={audio.data.audio.questions} />
      </div>
    </div>
  );
}
