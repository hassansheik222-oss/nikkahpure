import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { isConfigured } from './lib/supabase';
import Layout from './components/Layout';
import { Spinner, Notice } from './components/ui';

import Landing from './pages/Landing';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Onboarding from './pages/Onboarding';
import Browse from './pages/Browse';
import ProfileView from './pages/ProfileView';
import Interests from './pages/Interests';
import Messages from './pages/Messages';
import Conversation from './pages/Conversation';
import Guardian from './pages/Guardian';
import Verification from './pages/Verification';
import Settings from './pages/Settings';
import Legal from './pages/Legal';
import type { ReactElement } from 'react';

function SetupNeeded() {
  return (
    <Layout narrow>
      <h1 style={{ fontSize: 26, marginBottom: 14 }}>Almost there</h1>
      <Notice tone="gold">
        NikkahPure is deployed but not yet connected to its database. Add{' '}
        <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your
        hosting environment variables, then redeploy. Full instructions are in{' '}
        <code>SETUP.md</code> in the repository.
      </Notice>
    </Layout>
  );
}

/** Requires a signed-in user with a finished profile. */
function Private({ children }: { children: ReactElement }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Layout>
        <Spinner />
      </Layout>
    );
  }
  if (!session) return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  if (!profile?.onboarding_done) return <Navigate to="/onboarding" replace />;
  return children;
}

/**
 * Requires a signed-in user, but not a finished profile — used for resources
 * addressed by id, where row-level security is the real gate. A guardian has
 * an account with no profile of his own and must still reach his ward's
 * conversations.
 */
function SignedIn({ children }: { children: ReactElement }) {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <Layout>
        <Spinner />
      </Layout>
    );
  }
  if (!session) return <Navigate to="/signin" replace />;
  return children;
}

export default function App() {
  const { session, profile, loading } = useAuth();

  if (!isConfigured) return <SetupNeeded />;

  return (
    <Routes>
      <Route
        path="/"
        element={
          loading ? (
            <Layout>
              <Spinner />
            </Layout>
          ) : session ? (
            <Navigate to={profile?.onboarding_done ? '/browse' : '/onboarding'} replace />
          ) : (
            <Landing />
          )
        }
      />
      <Route path="/signin" element={session ? <Navigate to="/" replace /> : <SignIn />} />
      <Route path="/signup" element={session ? <Navigate to="/" replace /> : <SignUp />} />

      <Route
        path="/onboarding"
        element={
          <SignedIn>
            <Onboarding />
          </SignedIn>
        }
      />

      <Route
        path="/browse"
        element={
          <Private>
            <Browse />
          </Private>
        }
      />
      <Route
        path="/profile/:id"
        element={
          <SignedIn>
            <ProfileView />
          </SignedIn>
        }
      />
      <Route
        path="/interests"
        element={
          <Private>
            <Interests />
          </Private>
        }
      />
      <Route
        path="/messages"
        element={
          <Private>
            <Messages />
          </Private>
        }
      />
      <Route
        path="/messages/:id"
        element={
          <SignedIn>
            <Conversation />
          </SignedIn>
        }
      />
      <Route
        path="/guardian"
        element={
          <SignedIn>
            <Guardian />
          </SignedIn>
        }
      />
      <Route
        path="/verify"
        element={
          <Private>
            <Verification />
          </Private>
        }
      />
      <Route
        path="/settings"
        element={
          <SignedIn>
            <Settings />
          </SignedIn>
        }
      />

      <Route path="/privacy" element={<Legal doc="privacy" />} />
      <Route path="/terms" element={<Legal doc="terms" />} />
      <Route path="/guidelines" element={<Legal doc="guidelines" />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
