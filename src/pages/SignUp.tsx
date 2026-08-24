import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Field, Notice, Select } from '../components/ui';
import { supabase } from '../lib/supabase';
import { ageFromDob, friendlyError, isAdult } from '../lib/format';

export default function SignUp() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [intent, setIntent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const dobEntered = dob.length === 10;
  const adult = dobEntered && isAdult(dob);
  const ready =
    fullName.trim().length >= 2 &&
    email.includes('@') &&
    password.length >= 8 &&
    adult &&
    (gender === 'male' || gender === 'female') &&
    agreed &&
    intent;

  async function submit(e: { preventDefault: () => void }) {
    e.preventDefault();
    setError('');
    if (!adult) {
      setError('NikkahPure is for adults seeking marriage. You must be 18 or over.');
      return;
    }
    setBusy(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          date_of_birth: dob,
          gender,
        },
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    });
    setBusy(false);

    if (signUpError) {
      setError(friendlyError(signUpError));
      return;
    }
    if (data.session) {
      navigate('/onboarding', { replace: true });
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <Layout narrow>
        <h1 style={{ fontSize: 26, marginBottom: 14 }}>Check your email</h1>
        <Notice tone="ok">
          We sent a confirmation link to <strong>{email}</strong>. Open it to activate your
          account, then come back and sign in.
        </Notice>
        <p style={{ marginTop: 18 }}>
          <Link to="/signin">Back to sign in</Link>
        </p>
      </Layout>
    );
  }

  return (
    <Layout narrow>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>Create your account</h1>
      <p className="muted small" style={{ marginBottom: 20 }}>
        Free, and open only to adults intending marriage.
      </p>

      <form onSubmit={submit} className="card">
        <Field label="Full name" value={fullName} onChange={setFullName} autoComplete="name" />
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
          autoComplete="new-password"
          hint="At least 8 characters."
        />
        <Field
          label="Date of birth"
          type="date"
          value={dob}
          onChange={setDob}
          hint="Used to verify you are 18 or over. Your exact date is never shown to others."
        />
        {dobEntered && !adult ? (
          <div style={{ marginBottom: 14 }}>
            <Notice tone="error">
              You must be 18 or over to use NikkahPure. You are currently {ageFromDob(dob)}.
            </Notice>
          </div>
        ) : null}

        <Select
          label="I am"
          value={gender}
          onChange={setGender}
          options={['male', 'female']}
          placeholder="Select…"
        />

        <label className="checkline">
          <input
            type="checkbox"
            checked={intent}
            onChange={(e) => setIntent(e.target.checked)}
          />
          <span className="small">
            I am joining with a sincere intention of marriage, and everything I share about
            myself will be truthful.
          </span>
        </label>

        <label className="checkline">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <span className="small">
            I am 18 or over and I accept the <Link to="/terms">Terms</Link>,{' '}
            <Link to="/privacy">Privacy Policy</Link> and{' '}
            <Link to="/guidelines">Community Guidelines</Link>.
          </span>
        </label>

        {error ? (
          <div style={{ marginBottom: 14 }}>
            <Notice tone="error">{error}</Notice>
          </div>
        ) : null}

        <button className="btn btn-gold btn-block" disabled={!ready || busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="small muted center" style={{ marginTop: 18 }}>
        Already registered? <Link to="/signin">Sign in</Link>
      </p>
    </Layout>
  );
}
