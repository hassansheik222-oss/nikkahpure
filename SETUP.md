# Setup

Everything here is on free tiers. Total cost to get the web app live: £0.

## 1. Create the Supabase project

1. Go to <https://supabase.com> → sign in with GitHub → **New project**.
2. Name it `nikkahpure`, pick the region closest to your users, and set a strong database password (save it somewhere).
3. Wait about two minutes for it to finish provisioning.

## 2. Create the database

1. In the Supabase dashboard, open **SQL Editor** → **New query**.
2. Paste the entire contents of `supabase/schema.sql`.
3. Click **Run**. It should finish with "Success. No rows returned."

This creates every table, all the row-level-security policies, the transactional functions, and the two private storage buckets. It is safe to run again later if you change the file.

## 3. Configure authentication

In **Authentication → Providers → Email**:

- Enable **Confirm email** (so an address must be real).
- Set **Minimum password length** to 8.

In **Authentication → URL Configuration**:

- **Site URL**: your Vercel URL, e.g. `https://nikkahpure.vercel.app`
- **Redirect URLs**: add `https://nikkahpure.vercel.app/**` and `http://localhost:5173/**`

## 4. Get your keys

**Project Settings → API**:

- `Project URL` → this is `VITE_SUPABASE_URL`
- `anon` `public` key → this is `VITE_SUPABASE_ANON_KEY`

The anon key is meant to be in the browser — row-level security is what protects your data. **Never** put the `service_role` key in this app.

## 5. Run it locally

```bash
npm install
cp .env.example .env.local     # then paste your two values in
npm run dev
```

Open <http://localhost:5173>.

## 6. Deploy the account-deletion function

Both app stores require in-app account deletion. The browser cannot do it alone, so it calls a small server function.

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase functions deploy delete-account
```

Until this is deployed, "Delete my account" hides the profile and shows a message instead of erasing it.

## 7. Test the whole flow

Create two accounts in two different browsers (or one normal window and one private window):

1. Sister signs up, completes onboarding, adds a guardian → copy the guardian code.
2. Third account (the guardian) signs up and goes to **Guardian → I am a guardian**, then pastes the code. He does not need a profile of his own.
3. Brother signs up, completes onboarding, finds her in Browse, expresses interest.
4. Sister accepts → the conversation shows **Awaiting wali**.
   *If her guardian has not accepted his invitation yet, accepting is refused with a message saying so. That is deliberate: it prevents a conversation nobody is able to approve.*
5. Guardian approves → both can now message. The guardian can read the transcript but has no message box, and his view labels who said what.
6. Try blocking — the conversation should close and the profile disappear from Browse.

Things that are *supposed* to fail, and are worth confirming:

- A user cannot set their own `verification` to `verified` — the column is not writable by them at all. Approve it in the table editor instead (below).
- Gender and date of birth cannot be changed after sign-up.
- A guardian cannot send a message as his ward.
- Nobody can set a conversation to `open` themselves to skip guardian approval.

If any step misbehaves, check the browser console; a row-level-security refusal shows as an empty result rather than an error.

## Moderation, day one

Reports land in the `reports` table and verification requests in `verification_requests`. Until you build an admin screen, review them in the Supabase **Table Editor**:

- To approve a verification: set the request's `status` to `verified`, then set that user's `profiles.verification` to `verified`.
- To suspend an account: set `profiles.is_suspended` to `true` — they disappear from search immediately.

Both stores expect reports to be actioned within 24 hours for a dating/matrimonial app. Check the table daily.
