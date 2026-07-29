import { createBrowserRouter, Navigate } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { useAuth } from './hooks/useAuth';
import { Admin } from './pages/Admin';
import { Dashboard } from './pages/Dashboard';
import { Home } from './pages/Home';
import { Horen } from './pages/Horen';
import { HorenExercise } from './pages/HorenExercise';
import { Lesen } from './pages/Lesen';
import { LesenExercise } from './pages/LesenExercise';
import { Login } from './pages/Login';
import { Payment } from './pages/Payment';
import { Pricing } from './pages/Pricing';
import { Profile } from './pages/Profile';
import { Register } from './pages/Register';
import { Schreiben } from './pages/Schreiben';
import { SchreibenEditor } from './pages/SchreibenEditor';
import { Simulation } from './pages/Simulation';

function ProtectedRoute({ children, requireSubscription = false }: { children: JSX.Element; requireSubscription?: boolean }) {
  const { user, subscription, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (requireSubscription && !subscription?.isActive) return <Navigate to="/pricing" replace />;
  return children;
}

function AdminRoute({ children }: { children: JSX.Element }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

export const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/pricing', element: <Pricing /> },
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  {
    path: '/payment',
    element: (
      <ProtectedRoute>
        <Payment />
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute requireSubscription>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'lesen', element: <Lesen /> },
      { path: 'lesen/:themeId', element: <LesenExercise /> },
      { path: 'horen', element: <Horen /> },
      { path: 'horen/:audioId', element: <HorenExercise /> },
      { path: 'schreiben', element: <Schreiben /> },
      { path: 'schreiben/:typeId', element: <SchreibenEditor /> },
      { path: 'simulation', element: <Simulation /> },
      { path: 'profile', element: <Profile /> },
    ],
  },
  {
    path: '/admin',
    element: (
      <AdminRoute>
        <Admin />
      </AdminRoute>
    ),
  },
]);
