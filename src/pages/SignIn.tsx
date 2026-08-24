import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { Field, Notice } from '../components/ui';
import { supabase } from '../lib/supabase';
import { friendlyError } from '../lib/format';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  async function submit(e: { preventDefault: () => void }) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (signInError) setError(friendlyError(signInError));
  }

  async function resetPassword() {
    if (!email.includes('@')) {
      setError('Enter your email address first, then tap reset.');
      return;
    }
    setError('');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/settings`,
    });
    if (resetError) {
      setError(friendlyError(resetError));
      return;
    }
    setResetSent(true);
  }

  return (
    <Layout narrow>
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>Welcome back</h1>

      <form onSubmit={submit} className="card">
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />

        {error ? (
          <div style={{ marginBottom: 14 }}>
            <Notice tone="error">{error}</Notice>
          </div>
        ) : null}
        {resetSent ? (
          <div style={{ marginBottom: 14 }}>
            <Notice tone="ok">Password reset link sent. Check your email.</Notice>
          </div>
        ) : null}

        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <button
          type="button"
          className="btn-ghost small"
          style={{ marginTop: 10, width: '100%' }}
          onClick={resetPassword}
        >
          Forgot your password?
        </button>
      </form>

      <p className="small muted center" style={{ marginTop: 18 }}>
        New here? <Link to="/signup">Create an account</Link>
      </p>
    </Layout>
  );
}
