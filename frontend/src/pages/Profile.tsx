import { Card } from '../components/ui/Card';
import { useAuth } from '../hooks/useAuth';

export function Profile() {
  const { user } = useAuth();
  return (
    <Card>
      <h1 className="text-2xl font-bold">Profil</h1>
      <p className="mt-2 text-muted">{user?.email}</p>
      <p className="mt-1 text-sm text-muted">Niveau: {user?.niveau}</p>
    </Card>
  );
}
