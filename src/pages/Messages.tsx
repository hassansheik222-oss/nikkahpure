import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { Avatar, Badge, Empty, Notice, Spinner } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { friendlyError, timeAgo } from '../lib/format';
import type { Conversation, Profile } from '../lib/types';

type ConversationRow = Conversation & {
  a: Profile | null;
  b: Profile | null;
};

const SELECT =
  '*, a:profiles!conversations_user_a_fkey(*), b:profiles!conversations_user_b_fkey(*)';

export default function Messages() {
  const { userId } = useAuth();
  const [rows, setRows] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function load() {
      const { data, error: queryError } = await supabase
        .from('conversations')
        .select(SELECT)
        .or(`user_a.eq.${userId},user_b.eq.${userId}`)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (queryError) setError(friendlyError(queryError));
      setRows((data as unknown as ConversationRow[]) ?? []);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <Layout>
      <h1 style={{ fontSize: 24, marginBottom: 6 }}>Messages</h1>
      <p className="muted small" style={{ marginBottom: 16 }}>
        A conversation exists only where interest was accepted. Where a wali is involved, he can
        read it.
      </p>

      {error ? <Notice tone="error">{error}</Notice> : null}

      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <Empty
          title="No conversations yet"
          body="Once an interest is accepted — and approved by a guardian where one is set — the conversation appears here."
        />
      ) : (
        <div className="stack">
          {rows.map((c) => {
            const other = c.user_a === userId ? c.b : c.a;
            // The profile becomes unreadable if they pause their account, are
            // suspended, or contact between you is blocked. The conversation
            // still exists, so show it rather than making it vanish.
            const otherId = c.user_a === userId ? c.user_b : c.user_a;
            const name = other?.full_name.split(' ')[0] ?? 'Member unavailable';
            return (
              <Link
                key={c.id}
                to={`/messages/${c.id}`}
                className="card card-hover row-between"
                style={{ color: 'inherit' }}
              >
                <div className="row">
                  <Avatar name={name} id={other?.id ?? otherId} size={46} />
                  <div>
                    <div style={{ fontWeight: 700 }}>{name}</div>
                    <div className="tiny muted">
                      {!other
                        ? 'This account is paused or contact is blocked'
                        : c.last_message_at
                          ? timeAgo(c.last_message_at)
                          : 'No messages yet'}
                    </div>
                  </div>
                </div>
                {c.status === 'awaiting_wali' ? (
                  <Badge tone="warn">Awaiting wali</Badge>
                ) : c.status === 'closed' ? (
                  <Badge>Closed</Badge>
                ) : (
                  <Badge tone="verified">Open</Badge>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
