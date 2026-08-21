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
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { VerifyEmail } from './pages/VerifyEmail';
import { Legal } from './pages/Legal';
import { Speaking } from './pages/Speaking';

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
  if (!user.permissions.includes('admin.access')) return <Navigate to="/dashboard" replace />;
  return children;
}

export const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/pricing', element: <Pricing /> },
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  { path: '/forgot-password', element: <ForgotPassword /> },
  { path: '/reset-password', element: <ResetPassword /> },
  { path: '/verify-email', element: <VerifyEmail /> },
  { path: '/legal/:document', element: <Legal /> },
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
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <ProtectedRoute requireSubscription><Dashboard /></ProtectedRoute> },
      { path: 'lesen', element: <ProtectedRoute requireSubscription><Lesen /></ProtectedRoute> },
      { path: 'lesen/:themeId', element: <ProtectedRoute requireSubscription><LesenExercise /></ProtectedRoute> },
      { path: 'horen', element: <ProtectedRoute requireSubscription><Horen /></ProtectedRoute> },
      { path: 'horen/:audioId', element: <ProtectedRoute requireSubscription><HorenExercise /></ProtectedRoute> },
      { path: 'schreiben', element: <ProtectedRoute requireSubscription><Schreiben /></ProtectedRoute> },
      { path: 'schreiben/:typeId', element: <ProtectedRoute requireSubscription><SchreibenEditor /></ProtectedRoute> },
      { path: 'simulation', element: <ProtectedRoute requireSubscription><Simulation /></ProtectedRoute> },
      { path: 'speaking', element: <ProtectedRoute requireSubscription><Speaking /></ProtectedRoute> },
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
