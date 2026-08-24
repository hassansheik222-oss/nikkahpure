import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import Layout from '../components/Layout';
import { Badge, Notice, Spinner } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { friendlyError } from '../lib/format';
import type { VerificationRequest } from '../lib/types';

const MAX_BYTES = 6 * 1024 * 1024;

export default function Verification() {
  const { userId, profile, refreshProfile } = useAuth();
  const [request, setRequest] = useState<VerificationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [doc, setDoc] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from('verification_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setRequest((data as VerificationRequest) ?? null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  function pick(setter: (f: File | null) => void) {
    return (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null;
      if (file && file.size > MAX_BYTES) {
        setError('That file is larger than 6 MB. Please use a smaller photo.');
        return;
      }
      setError('');
      setter(file);
    };
  }

  async function submit() {
    if (!userId || !doc) return;
    setBusy(true);
    setError('');

    const stamp = Date.now();
    const docPath = `${userId}/id-${stamp}-${doc.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const { error: docError } = await supabase.storage
      .from('verification')
      .upload(docPath, doc, { upsert: true });
    if (docError) {
      setBusy(false);
      setError(friendlyError(docError));
      return;
    }

    let selfiePath: string | null = null;
    if (selfie) {
      selfiePath = `${userId}/selfie-${stamp}-${selfie.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const { error: selfieError } = await supabase.storage
        .from('verification')
        .upload(selfiePath, selfie, { upsert: true });
      if (selfieError) {
        setBusy(false);
        setError(friendlyError(selfieError));
        return;
      }
    }

    const { data, error: insertError } = await supabase
      .from('verification_requests')
      .insert({ user_id: userId, document_path: docPath, selfie_path: selfiePath })
      .select()
      .single();

    if (!insertError) {
      // The badge itself is set by a moderator with the service role — a user
      // cannot write their own verification status, by design.
      await refreshProfile();
      setRequest(data as VerificationRequest);
      setOk('Submitted. Verification is usually reviewed within 48 hours.');
    } else {
      setError(friendlyError(insertError));
    }
    setBusy(false);
  }

  if (loading) {
    return (
      <Layout back="/settings">
        <Spinner />
      </Layout>
    );
  }

  return (
    <Layout back="/settings" narrow>
      <h1 style={{ fontSize: 24, marginBottom: 6 }}>Identity verification</h1>
      <p className="muted small" style={{ marginBottom: 16 }}>
        Verification confirms you are a real adult and stops fake profiles. Verified members are
        shown a verified badge and appear in verified-only searches.
      </p>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row-between">
          <span className="small">Current status</span>
          <Badge
            tone={
              profile?.verification === 'verified'
                ? 'verified'
                : request?.status === 'pending'
                  ? 'warn'
                  : 'plain'
            }
          >
            {profile?.verification === 'verified'
              ? 'verified'
              : request?.status === 'pending'
                ? 'awaiting review'
                : (profile?.verification ?? 'unverified')}
          </Badge>
        </div>
      </div>

      {profile?.verification === 'verified' ? (
        <Notice tone="ok">
          Your identity is verified. Nothing further is needed.
        </Notice>
      ) : request && request.status === 'pending' ? (
        <Notice tone="gold">
          Your documents are with our moderators. You will see the badge on your profile once
          approved.
        </Notice>
      ) : (
        <div className="card">
          <p className="small muted" style={{ marginBottom: 16 }}>
            Upload a government-issued photo ID showing your date of birth. Documents are stored
            in a private bucket only you and our reviewers can reach, and are deleted after
            review.
          </p>

          <label className="field">
            <span className="label">Photo ID (required)</span>
            <input type="file" accept="image/*,.pdf" onChange={pick(setDoc)} />
          </label>

          <label className="field">
            <span className="label">Selfie holding the ID (recommended)</span>
            <input type="file" accept="image/*" capture="user" onChange={pick(setSelfie)} />
          </label>

          {error ? (
            <div style={{ marginBottom: 14 }}>
              <Notice tone="error">{error}</Notice>
            </div>
          ) : null}
          {ok ? (
            <div style={{ marginBottom: 14 }}>
              <Notice tone="ok">{ok}</Notice>
            </div>
          ) : null}

          <button className="btn btn-gold btn-block" disabled={!doc || busy} onClick={submit}>
            {busy ? 'Uploading…' : 'Submit for verification'}
          </button>
        </div>
      )}
    </Layout>
  );
}
