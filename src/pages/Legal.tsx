import Layout from '../components/Layout';
import { Notice } from '../components/ui';

const CONTACT = 'support@nikkahpure.app';

function Privacy() {
  return (
    <>
      <h1 style={{ fontSize: 26, marginBottom: 10 }}>Privacy policy</h1>
      <p className="tiny muted" style={{ marginBottom: 18 }}>Last updated: 23 August 2026</p>

      <h3>What we collect</h3>
      <p>
        Account details (name, email, date of birth, gender), the profile information you choose
        to enter, photos you upload, identity documents you submit for verification, messages you
        send inside the app, and basic technical data such as your IP address and device type.
      </p>

      <h3>Why we collect it</h3>
      <p>
        To operate a matrimonial service: to show your profile to suitable members of the opposite
        gender, to confirm you are 18 or over, to let a guardian you nominate supervise your
        conversations, and to investigate reports of abuse.
      </p>

      <h3>Who can see what</h3>
      <p>
        Your date of birth is never shown to other members — only your age. Your photo is released
        according to the visibility setting you choose. A guardian you have linked and activated
        can read your conversations and see interests sent to you; that is the purpose of the
        feature and you control whether a guardian is linked at all. Our moderators can access
        reported content and verification documents.
      </p>

      <h3>Identity documents</h3>
      <p>
        Documents submitted for verification are held in a private storage bucket, used only to
        confirm your identity and age, and deleted after review.
      </p>

      <h3>Sharing</h3>
      <p>
        We do not sell personal data and we do not use it for advertising. Data is processed by
        our hosting and database providers solely to run the service.
      </p>

      <h3>Your rights</h3>
      <p>
        You can edit your profile at any time, pause your account, or delete it permanently from
        Account → Delete my account. Deletion erases your profile, photos, documents, interests
        and messages. You may also contact us at {CONTACT} to request a copy of your data.
      </p>

      <h3>Children</h3>
      <p>
        NikkahPure is strictly for adults aged 18 and over. Accounts cannot be created with a date
        of birth under 18, and any account found to belong to a minor is removed immediately.
      </p>

      <h3>Contact</h3>
      <p>{CONTACT}</p>
    </>
  );
}

function Terms() {
  return (
    <>
      <h1 style={{ fontSize: 26, marginBottom: 10 }}>Terms of use</h1>
      <p className="tiny muted" style={{ marginBottom: 18 }}>Last updated: 23 August 2026</p>

      <h3>Eligibility</h3>
      <p>
        You must be 18 or over, legally free to marry, and joining with a sincere intention of
        marriage. Accounts created by anyone under 18 are terminated without notice.
      </p>

      <h3>Honesty</h3>
      <p>
        Everything on your profile must be true — your age, marital status, whether you have
        children, and your photographs. Concealing an existing marriage from a prospective spouse
        or their guardian is grounds for permanent removal.
      </p>

      <h3>Conduct</h3>
      <p>
        No harassment, no sexual content, no immodest images, no requests for money, no
        proselytising of other members, and no contact outside the app before interest has been
        accepted. Where a guardian is linked, you accept that he can read your conversations.
      </p>

      <h3>Moderation</h3>
      <p>
        We may suspend or remove any account that breaches these terms or the community
        guidelines, and we cooperate with law enforcement where there is a credible risk of harm.
      </p>

      <h3>No guarantee</h3>
      <p>
        We verify what we reasonably can, but we cannot guarantee any member's identity, intent or
        suitability. Meet in public, involve your family, and use your own judgement.
      </p>

      <h3>Liability</h3>
      <p>
        The service is provided as-is. To the fullest extent permitted by law, we are not liable
        for the conduct of members or for any loss arising from your use of the service.
      </p>

      <h3>Contact</h3>
      <p>{CONTACT}</p>
    </>
  );
}

function Guidelines() {
  return (
    <>
      <h1 style={{ fontSize: 26, marginBottom: 10 }}>Community guidelines</h1>
      <p className="muted" style={{ marginBottom: 18 }}>
        NikkahPure exists so that marriage can be pursued with dignity. These rules are enforced.
      </p>

      <h3>Speak as though her wali is reading</h3>
      <p>Because he probably is. Keep conversation purposeful and modest.</p>

      <h3>Be truthful about yourself</h3>
      <p>Your age, your marital status, your children, your photographs — all of it.</p>

      <h3>No immodest images or language</h3>
      <p>Profiles or messages containing sexual content are removed on first report.</p>

      <h3>No money, ever</h3>
      <p>
        Nobody on this platform should ask you for money, gift cards, visa fees, or investment.
        Report it immediately.
      </p>

      <h3>Respect a decline</h3>
      <p>
        If someone declines your interest, that is the end of it. Repeated attempts to reach the
        same person will end your account.
      </p>

      <h3>Report anything wrong</h3>
      <p>
        Every profile and every conversation has a report option. Anyone appearing to be under 18
        should be reported immediately — we act on those within hours.
      </p>

      <div style={{ marginTop: 20 }}>
        <Notice tone="gold">
          Reports are reviewed by a human moderator. Serious breaches result in permanent removal
          and, where required, referral to the authorities.
        </Notice>
      </div>
    </>
  );
}

export default function Legal({ doc }: { doc: 'privacy' | 'terms' | 'guidelines' }) {
  return (
    <Layout narrow>
      <article className="card legal">
        {doc === 'privacy' ? <Privacy /> : doc === 'terms' ? <Terms /> : <Guidelines />}
      </article>
      <style>{`
        .legal h3 { font-size: 16px; margin: 20px 0 6px; color: var(--gold-light); }
        .legal p { font-size: 14px; color: var(--text-dim); }
      `}</style>
    </Layout>
  );
}
