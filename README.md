# NikkahPure

A verified, wali-supervised halal marriage app.

Live web app: React + Vite, hosted on Vercel.
Backend: Supabase (Postgres, Auth, Storage, Realtime) — free tier is enough to launch.
Mobile: the same build wrapped with Capacitor for Google Play and the App Store.

## What it does

- **18+ enforced in the database.** A profile row cannot exist with a date of birth under 18 — it is a `CHECK` constraint, not a checkbox.
- **Government ID verification.** Documents go to a private bucket, reviewed by a moderator, and the profile gets a verified badge.
- **Wali / guardian oversight.** A sister links her father, brother or appointed guardian by private code. He sees interests, can be required to approve before any conversation opens, reads the transcript, and can close it. He can never write in her name.
- **Opposite gender only.** Enforced by row-level security, not by a filter in the UI.
- **Consent-gated contact.** No open inbox. Interest → acceptance → (guardian approval) → conversation.
- **Private photos.** Released only to matches, or held for the guardian alone.
- **Immutable transcripts.** Messages cannot be edited or deleted, so what a guardian reads is what was said.
- **Report and block.** Blocking is mutual, immediate, and closes any shared conversation.
- **Account deletion.** Full erasure from inside the app, as both stores require.

## Repository layout

```
src/
  pages/         screens (landing, auth, onboarding, browse, profile, interests, chat, guardian, verification, settings, legal)
  components/    layout and shared UI
  context/       auth/session state
  lib/           supabase client, types, helpers
supabase/
  schema.sql     tables, row level security, RPCs, storage buckets — run this once
  functions/     edge function for permanent account deletion
```

## Getting it running

See **SETUP.md** for the database and local development, and **LAUNCH.md** for deploying to the web and publishing to the app stores.
