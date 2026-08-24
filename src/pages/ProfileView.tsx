import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { Avatar, Badge, Modal, Notice, Spinner, Select } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ageFromDob, friendlyError } from '../lib/format';
import { REPORT_REASONS } from '../lib/constants';
import { signedPhotoUrl } from '../lib/photos';
import type { Interest, Profile } from '../lib/types';

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="row-between" style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
      <span className="tiny muted" style={{ letterSpacing: 0.6, textTransform: 'uppercase' }}>
        {label}
      </span>
      <span className="small" style={{ textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export default function ProfileView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userId, profile: me } = useAuth();

  const [person, setPerson] = useState<Profile | null>(null);
  const [interest, setInterest] = useState<Interest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [showInterest, setShowInterest] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [blockedByMe, setBlockedByMe] = useState(false);

  useEffect(() => {
    if (!id || !userId) return;
    let cancelled = false;
    void supabase
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', userId)
      .eq('blocked_id', id)
      .then(({ data }) => {
        if (!cancelled) setBlockedByMe((data ?? []).length > 0);
      });
    return () => {
      cancelled = true;
    };
  }, [id, userId]);

  async function unblockPerson() {
    if (!id || !userId) return;
    setBusy(true);
    await supabase.from('blocks').delete().eq('blocker_id', userId).eq('blocked_id', id);
    setBusy(false);
    setBlockedByMe(false);
    setOk('Unblocked. They can appear in your search again.');
  }

  // Only attempted for people whose photo may be released to matches; storage
  // policy is the real gate, so a refusal simply leaves the initials showing.
  useEffect(() => {
    let cancelled = false;
    if (person?.photo_path && person.photo_visibility !== 'wali_only') {
      void signedPhotoUrl(person.photo_path).then((url) => {
        if (!cancelled) setPhotoUrl(url);
      });
    } else {
      setPhotoUrl(null);
    }
    return () => {
      cancelled = true;
    };
  }, [person?.photo_path, person?.photo_visibility]);

  useEffect(() => {
    if (!id || !userId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const [{ data: p }, { data: i }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
        supabase
          .from('interests')
          .select('*')
          .or(
            `and(sender_id.eq.${userId},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${userId})`
          )
          .order('created_at', { ascending: false })
          .limit(1),
      ]);
      if (cancelled) return;
      setPerson((p as Profile) ?? null);
      setInterest(((i as Interest[]) ?? [])[0] ?? null);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [id, userId]);

  async function sendInterest() {
    if (!id || !userId) return;
    setBusy(true);
    setError('');
    const { data, error: insertError } = await supabase
      .from('interests')
      .insert({ sender_id: userId, receiver_id: id, note: note.trim() || null })
      .select()
      .single();
    setBusy(false);
    if (insertError) {
      setError(friendlyError(insertError));
      return;
    }
    setInterest(data as Interest);
    setShowInterest(false);
    setOk('Interest sent. They will be notified, and nothing further opens until they accept.');
  }

  async function submitReport() {
    if (!id || !userId || !reason) return;
    setBusy(true);
    const { error: reportError } = await supabase.from('reports').insert({
      reporter_id: userId,
      reported_id: id,
      reason,
      details: details.trim() || null,
    });
    setBusy(false);
    if (reportError) {
      setError(friendlyError(reportError));
      return;
    }
    setShowReport(false);
    setOk('Report submitted. Our moderators will review it.');
  }

  async function blockPerson() {
    if (!id || !userId) return;
    setBusy(true);
    const { error: blockError } = await supabase
      .from('blocks')
      .insert({ blocker_id: userId, blocked_id: id });
    setBusy(false);
    if (blockError) {
      setError(friendlyError(blockError));
      return;
    }
    navigate('/browse', { replace: true });
  }

  if (loading) {
    return (
      <Layout back="/browse">
        <Spinner />
      </Layout>
    );
  }

  if (!person) {
    return (
      <Layout back="/browse">
        <Notice tone="error">
          This profile is no longer available. It may have been deactivated, or contact between
          you has been blocked.
        </Notice>
      </Layout>
    );
  }

  const mineSent = interest?.sender_id === userId;
  const isSelf = person.id === userId;
  // A guardian browsing his ward's suitor has no profile of his own, so none
  // of the member actions apply to him.
  const canAct = !isSelf && Boolean(me?.onboarding_done);

  return (
    <Layout back="/browse" narrow>
      <div className="card fadein">
        <div className="row" style={{ marginBottom: 14 }}>
          <Avatar name={person.full_name} id={person.id} size={72} url={photoUrl} />
          <div>
            <h1 style={{ fontSize: 22 }}>
              {person.full_name.split(' ')[0]}, {ageFromDob(person.date_of_birth)}
            </h1>
            <p className="small muted">
              {[person.city, person.country].filter(Boolean).join(', ')}
            </p>
          </div>
        </div>

        <div className="row wrap" style={{ gap: 6, marginBottom: 16 }}>
          {person.verification === 'verified' ? (
            <Badge tone="verified">✓ ID verified</Badge>
          ) : (
            <Badge tone="warn">Not ID verified</Badge>
          )}
          {person.wali_required ? <Badge tone="gold">Wali involved</Badge> : null}
        </div>

        <p style={{ marginBottom: 18 }}>{person.bio}</p>

        <Row label="Sect" value={person.sect} />
        <Row label="Madhab" value={person.madhab} />
        <Row label="Prayer" value={person.prayer_level} />
        <Row label="Marital status" value={person.marital_status} />
        <Row label="Children" value={person.has_children ? 'Yes' : 'No'} />
        <Row label="Profession" value={person.profession} />
        <Row label="Education" value={person.education} />
        <Row label="Heritage" value={person.ethnicity} />
        <Row label="Languages" value={person.languages?.join(', ') || null} />
        <Row label="Values" value={person.core_values?.join(' · ') || null} />
        <Row label="Would relocate" value={person.willing_to_relocate ? 'Yes' : 'No'} />
      </div>

      {ok ? (
        <div style={{ marginTop: 14 }}>
          <Notice tone="ok">{ok}</Notice>
        </div>
      ) : null}
      {error ? (
        <div style={{ marginTop: 14 }}>
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}

      <div className="stack" style={{ marginTop: 16 }}>
        {!canAct ? (
          <Notice>
            {isSelf
              ? 'This is how your profile looks to others.'
              : 'You are viewing this profile as a guardian.'}
          </Notice>
        ) : blockedByMe ? (
          <>
            <Notice>
              You have blocked this person. Nothing can pass between you until you unblock
              them.
            </Notice>
            <button className="btn btn-outline btn-block" disabled={busy} onClick={unblockPerson}>
              Unblock
            </button>
          </>
        ) : !interest ? (
          <button className="btn btn-gold btn-block" onClick={() => setShowInterest(true)}>
            Express interest
          </button>
        ) : interest.status === 'pending' ? (
          <Notice tone="gold">
            {mineSent
              ? 'Your interest is awaiting their response.'
              : 'They have expressed interest in you — answer it from the Interests tab.'}
          </Notice>
        ) : interest.status === 'accepted' ? (
          <Notice tone="ok">Interest accepted. Find this conversation under Messages.</Notice>
        ) : (
          <Notice>This interest was declined. You cannot send another.</Notice>
        )}

        {!canAct || blockedByMe ? null : (
          <>
            <div className="row" style={{ gap: 10 }}>
              <button
                className="btn btn-outline btn-sm"
                style={{ flex: 1 }}
                onClick={() => setShowReport(true)}
              >
                Report
              </button>
              <button
                className="btn btn-danger btn-sm"
                style={{ flex: 1 }}
                disabled={busy}
                onClick={blockPerson}
              >
                Block
              </button>
            </div>
            <p className="tiny muted center">
              Blocking is immediate and mutual — you will not appear to each other again, and
              any conversation between you closes.
            </p>
          </>
        )}
      </div>

      {showInterest ? (
        <Modal title="Express interest" onClose={() => setShowInterest(false)}>
          <p className="small muted" style={{ marginBottom: 14 }}>
            Add a short, respectful note. If they have a wali, he will see this too.
          </p>
          <textarea
            value={note}
            maxLength={400}
            placeholder="Assalamu alaikum. I read your profile and felt we may be compatible…"
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            className="btn btn-gold btn-block"
            style={{ marginTop: 14 }}
            disabled={busy}
            onClick={sendInterest}
          >
            {busy ? 'Sending…' : 'Send interest'}
          </button>
        </Modal>
      ) : null}

      {showReport ? (
        <Modal title="Report this profile" onClose={() => setShowReport(false)}>
          <Select label="Reason" value={reason} onChange={setReason} options={REPORT_REASONS} />
          <textarea
            value={details}
            maxLength={1000}
            placeholder="Anything else our moderators should know (optional)"
            onChange={(e) => setDetails(e.target.value)}
          />
          <button
            className="btn btn-primary btn-block"
            style={{ marginTop: 14 }}
            disabled={!reason || busy}
            onClick={submitReport}
          >
            {busy ? 'Submitting…' : 'Submit report'}
          </button>
        </Modal>
      ) : null}
    </Layout>
  );
}
