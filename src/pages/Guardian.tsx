import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { Avatar, Badge, Field, Modal, Notice, Select, Spinner } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { friendlyError, timeAgo } from '../lib/format';
import { RELATIONSHIPS } from '../lib/constants';
import type { Conversation, Profile, WaliLink } from '../lib/types';

type ConvRow = Conversation & { a: Profile | null; b: Profile | null };

const CONV_SELECT =
  '*, a:profiles!conversations_user_a_fkey(*), b:profiles!conversations_user_b_fkey(*)';

export default function Guardian() {
  const { userId, profile, refreshProfile } = useAuth();

  const [myWalis, setMyWalis] = useState<WaliLink[]>([]);
  const [wardLinks, setWardLinks] = useState<WaliLink[]>([]);
  const [wardConvs, setWardConvs] = useState<ConvRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  const [code, setCode] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRelation, setNewRelation] = useState('');
  const [newApprove, setNewApprove] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const [{ data: mine }, { data: wards }] = await Promise.all([
      supabase.from('wali_links').select('*').eq('ward_id', userId),
      supabase.from('wali_links').select('*').eq('wali_user_id', userId).eq('status', 'active'),
    ]);

    const wardList = (wards as WaliLink[]) ?? [];
    setMyWalis((mine as WaliLink[]) ?? []);
    setWardLinks(wardList);

    if (wardList.length > 0) {
      const wardIds = wardList.map((w) => w.ward_id);
      const { data: convs } = await supabase
        .from('conversations')
        .select(CONV_SELECT)
        .or(`user_a.in.(${wardIds.join(',')}),user_b.in.(${wardIds.join(',')})`)
        .order('created_at', { ascending: false });
      setWardConvs((convs as unknown as ConvRow[]) ?? []);
    } else {
      setWardConvs([]);
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function acceptInvite() {
    setBusy(true);
    setError('');
    setOk('');
    const { error: rpcError } = await supabase.rpc('accept_wali_invite', {
      p_code: code.trim(),
    });
    setBusy(false);
    if (rpcError) {
      setError(friendlyError(rpcError));
      return;
    }
    setCode('');
    setOk('You are now an active guardian on that account.');
    void load();
  }

  async function addWali() {
    if (!userId) return;
    setBusy(true);
    setError('');
    const { error: insertError } = await supabase.from('wali_links').insert({
      ward_id: userId,
      wali_name: newName.trim(),
      wali_email: newEmail.trim(),
      relationship: newRelation,
      must_approve_chat: newApprove,
      can_read_messages: true,
    });
    if (!insertError) {
      await supabase.from('profiles').update({ wali_required: true }).eq('id', userId);
      await refreshProfile();
    }
    setBusy(false);
    if (insertError) {
      setError(friendlyError(insertError));
      return;
    }
    setShowAdd(false);
    setNewName('');
    setNewEmail('');
    setNewRelation('');
    void load();
  }

  async function revoke(link: WaliLink) {
    setBusy(true);
    setError('');
    const { error: rpcError } = await supabase.rpc('revoke_wali', { p_link: link.id });
    setBusy(false);
    if (rpcError) setError(friendlyError(rpcError));
    await refreshProfile();
    void load();
  }

  // Only the guardian himself can change his oversight level — a ward cannot
  // quietly switch off the supervision she asked for.
  async function setApproval(link: WaliLink, value: boolean) {
    const { error: updateError } = await supabase
      .from('wali_links')
      .update({ must_approve_chat: value })
      .eq('id', link.id);
    if (updateError) setError(friendlyError(updateError));
    void load();
  }

  async function approveConversation(convId: string) {
    setBusy(true);
    const { error: rpcError } = await supabase.rpc('wali_approve_conversation', {
      p_conv: convId,
    });
    setBusy(false);
    if (rpcError) setError(friendlyError(rpcError));
    else setOk('Conversation approved.');
    void load();
  }

  async function closeConversation(convId: string) {
    setBusy(true);
    const { error: rpcError } = await supabase.rpc('close_conversation', {
      p_conv: convId,
      p_reason: 'closed by guardian',
    });
    setBusy(false);
    if (rpcError) setError(friendlyError(rpcError));
    void load();
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
      <h1 style={{ fontSize: 24, marginBottom: 6 }}>Guardian</h1>
      <p className="muted small" style={{ marginBottom: 18 }}>
        Manage the guardian on your own account, or oversee an account where you are the wali.
      </p>

      {error ? <Notice tone="error">{error}</Notice> : null}
      {ok ? <Notice tone="ok">{ok}</Notice> : null}

      {/* ---------------- My guardian ---------------- */}
      {!profile ? null : (
        <>
      <div className="section-title">My guardian</div>

      {myWalis.filter((w) => w.status !== 'revoked').length === 0 ? (
        <div className="card">
          <p className="small muted" style={{ marginBottom: 14 }}>
            No guardian is linked to your account. Adding one means he can see who has expressed
            interest in you and read your conversations.
          </p>
          <button className="btn btn-gold" onClick={() => setShowAdd(true)}>
            Add a guardian
          </button>
        </div>
      ) : (
        <div className="stack">
          {myWalis
            .filter((w) => w.status !== 'revoked')
            .map((w) => (
              <div className="card" key={w.id}>
                <div className="row-between" style={{ marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{w.wali_name}</div>
                    <div className="tiny muted">
                      {w.relationship} · {w.wali_email}
                    </div>
                  </div>
                  <Badge tone={w.status === 'active' ? 'verified' : 'warn'}>
                    {w.status === 'active' ? 'Active' : 'Invited'}
                  </Badge>
                </div>

                {w.status === 'invited' ? (
                  <Notice tone="gold">
                    Send this code to {w.wali_name}. He creates his own NikkahPure account and
                    enters it under Guardian → “I am a guardian”.
                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 20,
                        letterSpacing: 3,
                        fontWeight: 700,
                        wordBreak: 'break-all',
                      }}
                    >
                      {w.invite_code}
                    </div>
                  </Notice>
                ) : null}

                <p className="small muted" style={{ marginTop: 12 }}>
                  {w.must_approve_chat
                    ? 'He must approve before any conversation opens.'
                    : 'He can read your conversations, but they open without waiting for him.'}
                  {' '}Only he can change this.
                </p>

                <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => revoke(w)}>
                  Remove guardian
                </button>
              </div>
            ))}
          <button className="btn btn-outline btn-sm" onClick={() => setShowAdd(true)}>
            Add another guardian
          </button>
        </div>
      )}
        </>
      )}

      {/* ---------------- I am a guardian ---------------- */}
      <div className="section-title">I am a guardian</div>

      <div className="card">
        <p className="small muted" style={{ marginBottom: 12 }}>
          Enter the code your ward sent you to link her account to yours.
        </p>
        <div className="row" style={{ gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Field label="Guardian code" value={code} onChange={setCode} placeholder="e.g. 4f9a2c…" />
          </div>
          <button
            className="btn btn-primary"
            style={{ marginBottom: 14 }}
            disabled={!code.trim() || busy}
            onClick={acceptInvite}
          >
            Link
          </button>
        </div>
      </div>

      {wardLinks.length > 0 ? (
        <>
          <div className="section-title">My oversight settings</div>
          <div className="stack">
            {wardLinks.map((w) => (
              <div className="card" key={w.id}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>
                  Guardian ({w.relationship.toLowerCase()}) · linked {timeAgo(w.accepted_at ?? w.created_at)}
                </div>
                <label className="checkline">
                  <input
                    type="checkbox"
                    checked={w.must_approve_chat}
                    onChange={(e) => setApproval(w, e.target.checked)}
                  />
                  <span className="small">
                    Conversations must wait for my approval before they open
                  </span>
                </label>
                <label className="checkline">
                  <input
                    type="checkbox"
                    checked={w.can_read_messages}
                    onChange={async (e) => {
                      const { error: updateError } = await supabase
                        .from('wali_links')
                        .update({ can_read_messages: e.target.checked })
                        .eq('id', w.id);
                      if (updateError) setError(friendlyError(updateError));
                      void load();
                    }}
                  />
                  <span className="small">I can read the conversations</span>
                </label>
                <button className="btn btn-outline btn-sm" disabled={busy} onClick={() => revoke(w)}>
                  Step down as guardian
                </button>
              </div>
            ))}
          </div>

          <div className="section-title">Under my care</div>
          {wardConvs.length === 0 ? (
            <div className="card">
              <p className="small muted">
                No conversations yet on the accounts you supervise. You will see every accepted
                interest here, and can approve or close it.
              </p>
            </div>
          ) : (
            <div className="stack">
              {wardConvs.map((c) => {
                const wardIds = wardLinks.map((w) => w.ward_id);
                const wardIsA = wardIds.includes(c.user_a);
                const ward = wardIsA ? c.a : c.b;
                const suitor = wardIsA ? c.b : c.a;
                const suitorName = suitor?.full_name ?? 'This member';
                const suitorId = suitor?.id ?? (wardIsA ? c.user_b : c.user_a);
                return (
                  <div className="card" key={c.id}>
                    <div className="row-between" style={{ marginBottom: 10 }}>
                      <div className="row">
                        <Avatar name={suitorName} id={suitorId} size={44} />
                        <div>
                          <div style={{ fontWeight: 700 }}>{suitorName}</div>
                          <div className="tiny muted">
                            with {ward?.full_name.split(' ')[0] ?? 'your ward'} ·{' '}
                            {timeAgo(c.last_message_at ?? c.created_at)}
                          </div>
                        </div>
                      </div>
                      <Badge
                        tone={
                          c.status === 'open'
                            ? 'verified'
                            : c.status === 'awaiting_wali'
                              ? 'warn'
                              : 'plain'
                        }
                      >
                        {c.status === 'awaiting_wali' ? 'Needs approval' : c.status}
                      </Badge>
                    </div>

                    <div className="row wrap" style={{ gap: 8 }}>
                      {suitor ? (
                        <Link to={`/profile/${suitor.id}`} className="btn btn-outline btn-sm">
                          View their profile
                        </Link>
                      ) : null}
                      {wardLinks.some(
                        (w) => w.ward_id === (wardIsA ? c.user_a : c.user_b) && w.can_read_messages
                      ) ? (
                        <Link to={`/messages/${c.id}`} className="btn btn-outline btn-sm">
                          Read conversation
                        </Link>
                      ) : (
                        <span className="tiny muted">
                          Message reading is switched off in your settings above
                        </span>
                      )}
                      {c.status === 'awaiting_wali' ? (
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={busy}
                          onClick={() => approveConversation(c.id)}
                        >
                          Approve
                        </button>
                      ) : null}
                      {c.status !== 'closed' ? (
                        <button
                          className="btn btn-danger btn-sm"
                          disabled={busy}
                          onClick={() => closeConversation(c.id)}
                        >
                          Close
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : null}

      {!profile?.onboarding_done ? (
        <div style={{ marginTop: 18 }}>
          <Notice tone="gold">
            You have not finished your own profile. You can act as a guardian without one, or{' '}
            <Link to="/onboarding">complete your profile</Link> to browse.
          </Notice>
        </div>
      ) : null}

      {showAdd ? (
        <Modal title="Add a guardian" onClose={() => setShowAdd(false)}>
          <Field label="Guardian's name" value={newName} onChange={setNewName} />
          <Field
            label="Guardian's email"
            type="email"
            value={newEmail}
            onChange={setNewEmail}
            hint="You will get a code to send him. He creates his own account to accept."
          />
          <Select
            label="Relationship"
            value={newRelation}
            onChange={setNewRelation}
            options={RELATIONSHIPS}
          />
          <label className="checkline">
            <input
              type="checkbox"
              checked={newApprove}
              onChange={(e) => setNewApprove(e.target.checked)}
            />
            <span className="small">He must approve before a conversation opens</span>
          </label>
          <button
            className="btn btn-gold btn-block"
            disabled={busy || newName.trim().length < 2 || !newEmail.includes('@') || !newRelation}
            onClick={addWali}
          >
            {busy ? 'Saving…' : 'Create guardian invite'}
          </button>
        </Modal>
      ) : null}
    </Layout>
  );
}
