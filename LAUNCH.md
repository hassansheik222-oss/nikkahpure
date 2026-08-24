# Launch guide — web, Google Play, App Store

Do these in order. Steps 1–2 cost nothing. Steps 3 onward cost $25 once (Google) and $99 a year (Apple).

---

## Step 1: Push this code to GitHub

The repository currently holds the old static demo. Replacing it:

```bash
git clone https://github.com/hassansheik222-oss/nikkahpure.git
cd nikkahpure
git checkout -b v1-real-app
# copy every file from this project in, replacing the old public/ and src/
git add -A
git commit -m "Replace demo with real app: Supabase backend, wali oversight, verification"
git push -u origin v1-real-app
```

Open a pull request and merge to `main`, or push straight to `main` if you prefer. Keep the old commits — they are your history.

---

## Step 2: Deploy the web app on Vercel (free)

1. <https://vercel.com> → **Add New → Project** → import `hassansheik222-oss/nikkahpure`.
2. Framework preset: **Vite**. Build command `npm run build`, output directory `dist` (already set in `vercel.json`).
3. **Environment Variables** — add both, for Production *and* Preview:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. **Deploy.**
5. Go back to Supabase → **Authentication → URL Configuration** and set the Site URL to your new Vercel URL.

Every push to `main` now redeploys automatically.

### Custom domain

Buy `nikkahpure.com` (or similar) and add it in Vercel → **Settings → Domains**. Vercel issues the HTTPS certificate free. Do this *before* submitting to the stores — reviewers look at your support and privacy URLs, and a `.vercel.app` address reads as unfinished.

You now have a working, installable web app. On Android, Chrome will offer "Add to home screen"; on iPhone, Safari → Share → Add to Home Screen. Many people will never need the store version.

---

## Step 3: Register the developer accounts

| | Google Play | Apple |
|---|---|---|
| Cost | **$25, once** | **$99 per year** |
| Sign up | <https://play.google.com/console/signup> | <https://developer.apple.com/programs/> |
| Approval | 1–3 days | 1–7 days |
| Build machine | Any (Windows, Mac, Linux) | **Mac required**, or a cloud Mac service |

**Choose the account type carefully — it cannot be changed later.**

A **personal** Google Play account created today must run a closed test with **at least 12 testers opted in continuously for 14 days** before it can apply for production access. An **organization** account is exempt from that requirement. If you have (or can register) a business, an organization account saves you two weeks and a lot of chasing friends. Organization accounts need a D-U-N-S number for Apple too, which is free but takes a few days.

---

## Step 4: Wrap for the app stores with Capacitor

Capacitor puts your existing web build inside a native shell. One codebase, three platforms.

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npm run build
npx cap add android
npx cap add ios          # Mac only
npx cap sync
```

`capacitor.config.ts` is already in the repo. **Change `appId` before the first build** — `app.nikkahpure.mobile` is a placeholder and the id is permanent once released.

Icons: use `public/icon-1024.png` as the source. `npm install -D @capacitor/assets && npx capacitor-assets generate` produces every size both platforms need.

### Android build

```bash
npx cap open android      # opens Android Studio
```

In Android Studio: **Build → Generate Signed Bundle** → Android App Bundle (`.aab`). Create a new keystore and **back it up somewhere safe** — lose it and you can never update the app again.

### iOS build

```bash
npx cap open ios          # opens Xcode, Mac only
```

Set your team and bundle id, then **Product → Archive → Distribute App**. Without a Mac, use a cloud build service (Codemagic and Ionic Appflow both have free tiers) or borrow one for an afternoon.

---

## Step 5: What each store will demand

Both stores treat a marriage/matchmaking app as a dating app, which is the most heavily scrutinised category outside finance and health. Have all of this ready before you submit.

### Required in the app (already built)

- [x] 18+ only, enforced at sign-up and in the database
- [x] Report a profile
- [x] Block a user (mutual and immediate)
- [x] Delete your account from inside the app — Apple guideline 5.1.1(v)
- [x] Privacy policy and terms reachable without signing in (`/privacy`, `/terms`)
- [x] Community guidelines (`/guidelines`)

### Required from you

- **A monitored support email**, published in the app and on the store listing. Apple checks it.
- **Report response within 24 hours.** Check the `reports` table daily. Apple has removed apps for ignoring this.
- **A real privacy policy URL** on your own domain.
- **Age rating**: 18+ / Mature 17+. Answer the questionnaires honestly — under-rating a dating app is a fast rejection.
- **Google Play Data safety form**: declare that you collect name, email, date of birth, photos, ID documents and messages; that data is encrypted in transit; and that users can request deletion.
- **Apple privacy nutrition labels**: the same disclosures, entered in App Store Connect.
- **Demo account for reviewers.** Both stores require working credentials. Create two accounts (one brother, one sister) plus one guardian account, with the flow already part-way through, and put the logins in the review notes. Reviewers reject apps they cannot get past the sign-up screen of.

### The differentiation question

Apple guideline 4.3(b) says new dating apps are refused unless they offer "a meaningfully different or improved experience". Say plainly in your review notes what makes this different:

> NikkahPure is a matrimonial platform, not a dating app. Contact is impossible without mutual consent, and for a female member a nominated guardian (wali) is linked to the account, must approve a conversation before it opens, and can read the full transcript. Every member is age-verified at 18+, with government ID verification available. There is no swiping, no open messaging and no casual-dating functionality.

That paragraph is your best defence against a 4.3 rejection. It is also true of what is built here, which is the point.

### Store listing assets

- Screenshots: 6.7" iPhone and 6.5" iPhone for Apple; phone and 7"/10" tablet for Google. Take them from the running web app on a phone-sized window.
- Feature graphic for Google Play: 1024 × 500.
- Short description (80 characters) and full description (4000). Lead with guardian involvement and verification — that is what your audience searches for.

---

## Step 6: Timeline to expect

| | If all goes well |
|---|---|
| Web app live | today |
| Developer accounts approved | 1–7 days |
| Google Play closed test (personal account only) | 14 days |
| Google Play review | 1–7 days |
| Apple review | 1–3 days, but expect one rejection round |

Budget three to six weeks from today to being live on both stores. The web app can be earning you real users the whole time.

---

## What is still worth building

Nothing below blocks a launch, but each one matters as you grow:

1. **An admin screen** for reports and ID verification. Right now you review them in the Supabase table editor, which will not scale past a few hundred members.
2. **Push notifications** for a new interest or message — the single biggest driver of return visits. Capacitor + Firebase Cloud Messaging.
3. **Automated image moderation** on photo upload. Apple's guideline 1.2 asks for a filtering mechanism, not just reporting.
4. **Email notifications** to a guardian when a conversation needs his approval, so he does not have to keep checking.
5. **Rate limiting** on interests sent per day, to stop one person messaging everyone.
