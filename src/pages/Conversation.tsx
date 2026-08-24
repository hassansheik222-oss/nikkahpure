import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { Avatar, Badge, Notice, Spinner } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { clockTime, friendlyError } from '../lib/format';
import type { Conversation as Conv, Message, Profile } from '../lib/types';

export default function Conversation() {
  const { id } = useParams();
  const { userId } = useAuth();

  const [conv, setConv] = useState<Conv | null>(null);
  const [people, setPeople] = useState<Record<string, Profile>>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [waliNames, setWaliNames] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const isParticipant = Boolean(
    conv && userId && (conv.user_a === userId || conv.user_b === userId)
  );
  const otherId = conv ? (conv.user_a === userId ? conv.user_b : conv.user_a) : null;
  const other = otherId ? people[otherId] : undefined;

  useEffect(() => {
    if (!id || !userId) return;
    let cancelled = false;

    // Reset everything: without this, navigating from one conversation to
    // another shows the previous transcript under the new id.
    setLoading(true);
    setError('');
    setConv(null);
    setPeople({});
    setMessages([]);
    setWaliNames([]);

    async function load() {
      const { data: c, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (cancelled) return;
      if (convError || !c) {
        setError(convError ? friendlyError(convError) : 'Conversation not found.');
        setLoading(false);
        return;
      }
      const conversation = c as Conv;
      setConv(conversation);

      const [{ data: profiles }, { data: msgs }, { data: walis }] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .in('id', [conversation.user_a, conversation.user_b]),
        supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', id)
          .order('created_at', { ascending: true }),
        supabase.rpc('conversation_walis', { p_conv: id }),
      ]);

      if (cancelled) return;

      const byId: Record<string, Profile> = {};
      for (const p of (profiles as Profile[]) ?? []) byId[p.id] = p;
      setPeople(byId);

      setMessages((live) => {
        // Keep anything realtime delivered while this was loading.
        const loaded = (msgs as Message[]) ?? [];
        const seen = new Set(loaded.map((m) => m.id));
        return [...loaded, ...live.filter((m) => !seen.has(m.id))];
      });

      setWaliNames(((walis as { wali_name: string }[]) ?? []).map((w) => w.wali_name));
      setLoading(false);
    }

    void load();

    const channel = supabase
      .channel(`conversation:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages((prev) =>
            prev.some((msg) => msg.id === incoming.id) ? prev : [...prev, incoming]
          );
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [id, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function send() {
    const body = draft.trim();
    if (!body || !id || !userId) return;
    setSending(true);
    setError('');
    const { data, error: insertError } = await supabase
      .from('messages')
      .insert({ conversation_id: id, sender_id: userId, body })
      .select()
      .single();
    setSending(false);
    if (insertError) {
      setError(friendlyError(insertError));
      return;
    }
    setDraft('');
    const sent = data as Message;
    setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
  }

  async function closeConversation() {
    if (!id) return;
    const { error: rpcError } = await supabase.rpc('close_conversation', {
      p_conv: id,
      p_reason: 'closed by participant',
    });
    if (rpcError) setError(friendlyError(rpcError));
    else setConv((c) => (c ? { ...c, status: 'closed' } : c));
  }

  if (loading) {
    return (
      <Layout back="/messages">
        <Spinner />
      </Layout>
    );
  }

  if (!conv) {
    return (
      <Layout back="/messages">
        <Notice tone="error">{error || 'Conversation not available.'}</Notice>
      </Layout>
    );
  }

  const supervised = waliNames.length > 0;
  const headerName = isParticipant
    ? (other?.full_name.split(' ')[0] ?? 'Conversation')
    : 'Guardian view';

  function nameFor(id: string): string {
    return people[id]?.full_name.split(' ')[0] ?? 'Member';
  }

  return (
    <Layout back={isParticipant ? '/messages' : '/guardian'} title={headerName}>
      {isParticipant && other ? (
        <div className="row-between" style={{ marginBottom: 12 }}>
          <Link
            to={`/profile/${other.id}`}
            className="row"
            style={{ color: 'inherit', textDecoration: 'none' }}
          >
            <Avatar name={other.full_name} id={other.id} size={40} />
            <div>
              <div style={{ fontWeight: 700 }}>{other.full_name.split(' ')[0]}</div>
              <div className="tiny muted">View full profile</div>
            </div>
          </Link>
          {conv.status === 'open' ? (
            <button className="btn btn-ghost small" onClick={closeConversation}>
              Close
            </button>
          ) : null}
        </div>
      ) : null}

      {!isParticipant ? (
        <div style={{ marginBottom: 10 }}>
          <Notice tone="gold">
            You are reading this as a guardian. {nameFor(conv.user_b)}'s messages are on the
            right, {nameFor(conv.user_a)}'s on the left. You cannot write here.
          </Notice>
        </div>
      ) : null}

      {supervised ? (
        <div style={{ marginBottom: 10 }}>
          <Notice tone="gold">
            This conversation is supervised. {waliNames.join(', ')} can read everything written
            here. Messages cannot be edited or deleted.
          </Notice>
        </div>
      ) : null}

      {conv.status === 'awaiting_wali' ? (
        <div style={{ marginBottom: 10 }}>
          <Notice tone="gold">
            Waiting for guardian approval before this conversation opens. Neither of you can
            send a message until then.
          </Notice>
        </div>
      ) : null}

      {conv.status === 'closed' ? (
        <div style={{ marginBottom: 10 }}>
          <Notice>
            This conversation is closed{conv.closed_reason ? ` (${conv.closed_reason})` : ''}.
            The transcript stays readable but no new messages can be sent.
          </Notice>
        </div>
      ) : null}

      <div className="chat-wrap">
        <div className="chat-scroll">
          {messages.length === 0 ? (
            <p className="small muted center" style={{ marginTop: 30 }}>
              No messages yet. Keep it respectful — assume a guardian is reading, because he
              probably is.
            </p>
          ) : (
            messages.map((m) => {
              // For a participant, "mine" is my own message. For a guardian,
              // the sides are fixed so he can tell who said what.
              const mine = isParticipant ? m.sender_id === userId : m.sender_id === conv.user_b;
              return (
                <div key={m.id} className={mine ? 'bubble bubble-me' : 'bubble bubble-them'}>
                  {!isParticipant ? (
                    <span className="tiny" style={{ display: 'block', opacity: 0.75 }}>
                      {nameFor(m.sender_id)}
                    </span>
                  ) : null}
                  {m.body}
                  <span className="bubble-time">{clockTime(m.created_at)}</span>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {error ? <Notice tone="error">{error}</Notice> : null}

        {conv.status === 'open' && isParticipant ? (
          <div className="chat-input">
            <input
              value={draft}
              placeholder="Write a message…"
              maxLength={4000}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <button
              className="btn btn-primary"
              disabled={sending || !draft.trim()}
              onClick={send}
            >
              Send
            </button>
          </div>
        ) : !isParticipant ? (
          <div style={{ paddingTop: 10 }}>
            <Badge tone="gold">Guardian view — read only</Badge>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
