import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Avatar, Badge, Modal, Notice, Select, Spinner, TextArea } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ageFromDob, friendlyError } from '../lib/format';
import { removePhoto, signedPhotoUrl, uploadPhoto } from '../lib/photos';
import type { Profile } from '../lib/types';

export default function Settings() {
  const { profile, userId, refreshProfile, signOut, loading, recovering } = useAuth();
  const navigate = useNavigate();

  const [bio, setBio] = useState('');
  const [visibility, setVisibility] = useState('matches_only');
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState('');
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState<Profile[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);

  async function changePassword() {
    if (newPassword.length < 8) {
      setError('Choose a password of at least 8 characters.');
      return;
    }
    setBusy(true);
    setError('');
    const { error: pwError } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (pwError) {
      setError(friendlyError(pwError));
      return;
    }
    setNewPassword('');
    setPasswordSaved(true);
  }

  useEffect(() => {
    if (!profile) return;
    setBio(profile.bio ?? '');
    setVisibility(profile.photo_visibility);
    setActive(profile.is_active);
  }, [profile?.id]);

  useEffect(() => {
    let cancelled = false;
    void signedPhotoUrl(profile?.photo_path ?? null).then((url) => {
      if (!cancelled) setPhotoUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [profile?.photo_path]);

  async function changePhoto(file: File | null) {
    if (!file || !userId) return;
    if (file.size > 6 * 1024 * 1024) {
      setError('That image is larger than 6 MB. Please choose a smaller one.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      if (profile?.photo_path) await removePhoto(profile.photo_path);
      const path = await uploadPhoto(userId, file);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ photo_path: path })
        .eq('id', userId);
      if (updateError) throw updateError;
      await refreshProfile();
      setOk('Photo updated.');
    } catch (err) {
      setError(friendlyError(err));
    }
    setUploading(false);
  }

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', userId)
      .then(async ({ data }) => {
        const ids = (data ?? []).map((b: { blocked_id: string }) => b.blocked_id);
        if (ids.length === 0) {
          setBlocked([]);
          return;
        }
        const { data: people } = await supabase.from('profiles').select('*').in('id', ids);
        setBlocked((people as Profile[]) ?? []);
      });
  }, [userId]);

  async function save() {
    if (!userId) return;
    setBusy(true);
    setError('');
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ bio: bio.trim(), photo_visibility: visibility, is_active: active })
      .eq('id', userId);
    setBusy(false);
    if (updateError) {
      setError(friendlyError(updateError));
      return;
    }
    await refreshProfile();
    setOk('Saved.');
  }

  async function unblock(id: string) {
    if (!userId) return;
    await supabase.from('blocks').delete().eq('blocker_id', userId).eq('blocked_id', id);
    setBlocked((prev) => prev.filter((p) => p.id !== id));
  }

  async function deleteAccount() {
    if (!userId) return;
    setBusy(true);
    setError('');
    // Deactivate immediately so the profile disappears from every search, then
    // ask the backend function to erase the auth user and all related rows.
    await supabase.from('profiles').update({ is_active: false }).eq('id', userId);
    const { error: fnError } = await supabase.functions.invoke('delete-account');
    setBusy(false);
    if (fnError) {
      setError(
        'Your profile has been hidden, but full deletion could not be completed automatically. Email support and it will be erased within 30 days.'
      );
      return;
    }
    await signOut();
    navigate('/', { replace: true });
  }

  if (loading) {
    return (
      <Layout>
        <Spinner />
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Account</h1>

      {profile ? (
        <div className="card">
          <div className="row" style={{ marginBottom: 12 }}>
            <Avatar name={profile.full_name} id={profile.id} size={56} url={photoUrl} />
            <div>
              <div style={{ fontWeight: 700 }}>
                {profile.full_name}, {ageFromDob(profile.date_of_birth)}
              </div>
              <div className="tiny muted">
                {[profile.city, profile.country].filter(Boolean).join(', ')}
              </div>
            </div>
          </div>
          <div className="row wrap" style={{ gap: 6 }}>
            <Badge tone={profile.verification === 'verified' ? 'verified' : 'warn'}>
              {profile.verification === 'verified' ? '✓ ID verified' : 'Not verified'}
            </Badge>
            {profile.wali_required ? <Badge tone="gold">Wali involved</Badge> : null}
          </div>
          <div className="row wrap" style={{ gap: 8, marginTop: 14 }}>
            <Link to="/verify" className="btn btn-outline btn-sm">
              Verification
            </Link>
            <Link to="/onboarding" className="btn btn-outline btn-sm">
              Edit full profile
            </Link>
            <Link to="/guardian" className="btn btn-outline btn-sm">
              Guardian settings
            </Link>
          </div>
        </div>
      ) : (
        <Notice tone="gold">
          You have not created a profile yet. <Link to="/onboarding">Start here</Link> — or keep
          using the account as a guardian only.
        </Notice>
      )}

      {profile ? (
        <>
          <div className="section-title">Profile</div>
          <div className="card">
            <label className="field">
              <span className="label">Your photo</span>
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => changePhoto(e.target.files?.[0] ?? null)}
              />
              <span className="tiny muted">
                Kept private. Released only according to the setting below — never public, never
                indexed by search engines.
              </span>
            </label>

            <TextArea label="About you" value={bio} onChange={setBio} />
            <label className="field">
              <span className="label">Who may see my photo</span>
              <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
                <option value="matches_only">
                  People I have matched with, and my guardian
                </option>
                <option value="wali_only">My guardian only</option>
              </select>
            </label>
            <label className="checkline">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              <span className="small">
                My profile is visible in search (uncheck to pause your account)
              </span>
            </label>

            {error ? <Notice tone="error">{error}</Notice> : null}
            {ok ? <Notice tone="ok">{ok}</Notice> : null}

            <button
              className="btn btn-primary btn-block"
              style={{ marginTop: 12 }}
              disabled={busy}
              onClick={save}
            >
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </>
      ) : null}

      <div className="section-title">Password</div>
      <div className="card">
        {recovering ? (
          <div style={{ marginBottom: 12 }}>
            <Notice tone="gold">
              You followed a password reset link. Set a new password below.
            </Notice>
          </div>
        ) : null}
        <label className="field">
          <span className="label">New password</span>
          <input
            type="password"
            value={newPassword}
            autoComplete="new-password"
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <span className="tiny muted">At least 8 characters.</span>
        </label>
        {passwordSaved ? <Notice tone="ok">Password updated.</Notice> : null}
        <button
          className="btn btn-outline btn-block"
          style={{ marginTop: 10 }}
          disabled={busy || newPassword.length < 8}
          onClick={changePassword}
        >
          Update password
        </button>
      </div>

      <div className="section-title">Blocked people</div>
      {blocked.length === 0 ? (
        <div className="card">
          <p className="small muted">You have not blocked anyone.</p>
        </div>
      ) : (
        <div className="stack">
          {blocked.map((p) => (
            <div className="card row-between" key={p.id}>
              <span className="small">{p.full_name}</span>
              <button className="btn btn-outline btn-sm" onClick={() => unblock(p.id)}>
                Unblock
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="section-title">Safety and legal</div>
      <div className="card stack">
        <Link to="/guidelines">Community guidelines</Link>
        <Link to="/privacy">Privacy policy</Link>
        <Link to="/terms">Terms of use</Link>
      </div>

      <div className="section-title">Session</div>
      <div className="card stack">
        <button className="btn btn-outline" onClick={() => void signOut()}>
          Sign out
        </button>
        <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
          Delete my account
        </button>
        <p className="tiny muted">
          Deleting removes your profile, photos, interests and messages permanently. This cannot
          be undone.
        </p>
      </div>

      {confirmDelete ? (
        <Modal title="Delete your account?" onClose={() => setConfirmDelete(false)}>
          <p className="small" style={{ marginBottom: 16 }}>
            Your profile, photos, verification documents, interests and conversations will be
            permanently erased. Anyone you were speaking with will no longer see the
            conversation. This cannot be undone.
          </p>
          <button className="btn btn-danger btn-block" disabled={busy} onClick={deleteAccount}>
            {busy ? 'Deleting…' : 'Yes, delete everything'}
          </button>
          <button
            className="btn btn-outline btn-block"
            style={{ marginTop: 10 }}
            onClick={() => setConfirmDelete(false)}
          >
            Keep my account
          </button>
        </Modal>
      ) : null}
    </Layout>
  );
}
