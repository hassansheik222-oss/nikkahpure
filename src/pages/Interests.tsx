import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Avatar, Badge, Empty, Notice, Spinner } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ageFromDob, friendlyError, timeAgo } from '../lib/format';
import type { Interest, Profile } from '../lib/types';

type InterestRow = Interest & {
  sender: Profile | null;
  receiver: Profile | null;
};

const SELECT =
  '*, sender:profiles!interests_sender_id_fkey(*), receiver:profiles!interests_receiver_id_fkey(*)';

export default function Interests() {
  const { userId, profile } = useAuth();
  const navigate = useNavigate();
  const [waliPending, setWaliPending] = useState(false);
  const [tab, setTab] = useState<'received' | 'sent'>('received');
  const [rows, setRows] = useState<InterestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const column = tab === 'received' ? 'receiver_id' : 'sender_id';
    const { data, error: queryError } = await supabase
      .from('interests')
      .select(SELECT)
      .eq(column, userId)
      .order('created_at', { ascending: false });
    if (queryError) setError(friendlyError(queryError));
    setRows((data as unknown as InterestRow[]) ?? []);
    setLoading(false);
  }, [userId, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  // If a guardian is required but has not yet accepted his invitation, no
  // interest can be accepted — say so here rather than failing at the tap.
  useEffect(() => {
    if (!userId || !profile?.wali_required) {
      setWaliPending(false);
      return;
    }
    let cancelled = false;
    void supabase
      .from('wali_links')
      .select('id')
      .eq('ward_id', userId)
      .eq('status', 'active')
      .then(({ data }) => {
        if (!cancelled) setWaliPending((data ?? []).length === 0);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, profile?.wali_required]);

  async function accept(row: InterestRow) {
    setBusyId(row.id);
    setError('');
    const { data, error: rpcError } = await supabase.rpc('accept_interest', {
      p_interest: row.id,
    });
    setBusyId('');
    if (rpcError) {
      setError(friendlyError(rpcError));
      return;
    }
    if (typeof data === 'string' && data.length > 0) navigate(`/messages/${data}`);
    else void load();
  }

  async function decline(row: InterestRow) {
    setBusyId(row.id);
    const { error: updateError } = await supabase
      .from('interests')
      .update({ status: 'declined', responded_at: new Date().toISOString() })
      .eq('id', row.id);
    setBusyId('');
    if (updateError) setError(friendlyError(updateError));
    void load();
  }

  async function withdraw(row: InterestRow) {
    setBusyId(row.id);
    const { error: rpcError } = await supabase.rpc('withdraw_interest', {
      p_interest: row.id,
    });
    setBusyId('');
    if (rpcError) setError(friendlyError(rpcError));
    void load();
  }

  return (
    <Layout>
      <h1 style={{ fontSize: 24, marginBottom: 14 }}>Interests</h1>

      <div className="row" style={{ gap: 8, marginBottom: 16 }}>
        <button
          className={tab === 'received' ? 'chip on' : 'chip'}
          onClick={() => setTab('received')}
        >
          Received
        </button>
        <button className={tab === 'sent' ? 'chip on' : 'chip'} onClick={() => setTab('sent')}>
          Sent
        </button>
      </div>

      {waliPending ? (
        <div style={{ marginBottom: 14 }}>
          <Notice tone="gold">
            Your guardian has not accepted his invitation yet, so you cannot accept an interest.
            Send him the code from the <Link to="/guardian">Guardian tab</Link>.
          </Notice>
        </div>
      ) : null}

      {error ? <Notice tone="error">{error}</Notice> : null}

      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <Empty
          title={tab === 'received' ? 'No interests yet' : 'You have not sent any interest'}
          body={
            tab === 'received'
              ? 'When someone expresses interest in you, it will appear here for you to accept or decline.'
              : 'Browse profiles and express interest — nothing opens until it is accepted.'
          }
        />
      ) : (
        <div className="stack">
          {rows.map((row) => {
            const other = tab === 'received' ? row.sender : row.receiver;
            const otherId = tab === 'received' ? row.sender_id : row.receiver_id;
            // Unreadable if they paused their account, were suspended, or
            // blocked contact. Keep the row, explain the gap.
            const label = other
              ? `${other.full_name.split(' ')[0]}, ${ageFromDob(other.date_of_birth)}`
              : 'Member unavailable';
            return (
              <div className="card" key={row.id}>
                <div className="row-between" style={{ marginBottom: 10 }}>
                  <Link
                    to={`/profile/${otherId}`}
                    className="row"
                    style={{ color: 'inherit', textDecoration: 'none' }}
                  >
                    <Avatar name={label} id={otherId} size={46} />
                    <div>
                      <div style={{ fontWeight: 700 }}>{label}</div>
                      <div className="tiny muted">
                        {other
                          ? [other.city, other.country].filter(Boolean).join(', ')
                          : 'Account paused or contact blocked'}{' '}
                        · {timeAgo(row.created_at)}
                      </div>
                    </div>
                  </Link>
                  {row.status !== 'pending' ? (
                    <Badge tone={row.status === 'accepted' ? 'verified' : 'plain'}>
                      {row.status}
                    </Badge>
                  ) : null}
                </div>

                {row.note ? (
                  <p className="small" style={{ marginBottom: 12, fontStyle: 'italic' }}>
                    “{row.note}”
                  </p>
                ) : null}

                {row.status === 'pending' && tab === 'received' ? (
                  <div className="row" style={{ gap: 10 }}>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                      disabled={busyId === row.id}
                      onClick={() => accept(row)}
                    >
                      Accept
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ flex: 1 }}
                      disabled={busyId === row.id}
                      onClick={() => decline(row)}
                    >
                      Decline
                    </button>
                  </div>
                ) : null}

                {row.status === 'pending' && tab === 'sent' ? (
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={busyId === row.id}
                    onClick={() => withdraw(row)}
                  >
                    Withdraw
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
