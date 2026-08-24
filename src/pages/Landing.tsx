import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

const PILLARS = [
  {
    title: 'Every profile is age-verified',
    body: 'No account exists without a date of birth confirmed at 18 or over — enforced by the database itself, not just a checkbox. Government ID verification adds a second layer before a profile can be seen widely.',
  },
  {
    title: 'A wali is built in, not bolted on',
    body: 'A sister can link her father, brother or appointed guardian to her account. He is invited by code, sees who has expressed interest, and can be required to approve a conversation before a single message is sent.',
  },
  {
    title: 'Nothing opens without consent',
    body: 'No open inbox. No unsolicited messages. Contact only becomes possible after interest is expressed, accepted, and — where a wali is set — approved.',
  },
  {
    title: 'Photos stay private by default',
    body: 'Your photo is not public. It is released only to people you have matched with, or held for your wali alone, according to the setting you choose.',
  },
  {
    title: 'Transcripts your wali can actually read',
    body: 'Messages cannot be edited or deleted once sent. What your guardian sees is the real conversation — that is the point.',
  },
  {
    title: 'Report and block, always one tap away',
    body: 'Blocking is mutual and immediate: the conversation closes and neither of you appears to the other again.',
  },
];

export default function Landing() {
  return (
    <Layout>
      <section className="hero fadein">
        <h1>
          Marriage, <span>with your family beside you</span>
        </h1>
        <p>
          NikkahPure is a marriage platform for Muslims who want the process done properly —
          verified people, guardian involvement, and no private channel that opens without
          everyone's consent.
        </p>
        <div className="hero-actions">
          <Link to="/signup" className="btn btn-gold">
            Create an account
          </Link>
          <Link to="/signin" className="btn btn-outline">
            Sign in
          </Link>
        </div>
        <p className="tiny muted" style={{ marginTop: 18 }}>
          18+ only. Free to join.
        </p>
      </section>

      <div className="section-title">What makes this different</div>
      <div className="grid">
        {PILLARS.map((p) => (
          <div className="pillar" key={p.title}>
            <h3>{p.title}</h3>
            <p className="small muted">{p.body}</p>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 28 }}>
        <h3 style={{ fontSize: 18, marginBottom: 10 }}>How it works</h3>
        <ol className="small muted" style={{ paddingLeft: 18, display: 'grid', gap: 8 }}>
          <li>Create an account and confirm you are 18 or over.</li>
          <li>Build your profile — deen, background, and what you are looking for.</li>
          <li>Invite your wali with a private code, if a guardian will be involved.</li>
          <li>Browse profiles of the opposite gender only, filtered how you like.</li>
          <li>Express interest. Nothing else happens until it is accepted.</li>
          <li>Once accepted — and approved by the wali — a supervised conversation opens.</li>
        </ol>
      </div>

      <p className="tiny muted center" style={{ marginTop: 30 }}>
        <Link to="/privacy">Privacy</Link> · <Link to="/terms">Terms</Link> ·{' '}
        <Link to="/guidelines">Community guidelines</Link>
      </p>
    </Layout>
  );
}
