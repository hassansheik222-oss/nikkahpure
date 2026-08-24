import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { ChipGroup, Field, Notice, Select, TextArea } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { friendlyError, isAdult } from '../lib/format';
import {
  CORE_VALUES,
  COUNTRIES,
  EDUCATION_LEVELS,
  LANGUAGES,
  MADHABS,
  MARITAL_STATUSES,
  PRAYER_LEVELS,
  RELATIONSHIPS,
  SECTS,
} from '../lib/constants';

const STEPS = ['You', 'Deen', 'Background', 'About', 'Guardian'];

export default function Onboarding() {
  const navigate = useNavigate();
  const { session, profile, refreshProfile } = useAuth();
  const meta = (session?.user.user_metadata ?? {}) as Record<string, string>;

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');

  const [sect, setSect] = useState('');
  const [madhab, setMadhab] = useState('');
  const [prayer, setPrayer] = useState('');
  const [values, setValues] = useState<string[]>([]);

  const [ethnicity, setEthnicity] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [profession, setProfession] = useState('');
  const [education, setEducation] = useState('');
  const [marital, setMarital] = useState('');
  const [hasChildren, setHasChildren] = useState(false);
  const [relocate, setRelocate] = useState(false);

  const [bio, setBio] = useState('');
  const [minAge, setMinAge] = useState('22');
  const [maxAge, setMaxAge] = useState('40');

  const [alreadyHasWali, setAlreadyHasWali] = useState(false);
  const [wantsWali, setWantsWali] = useState(false);
  const [waliName, setWaliName] = useState('');
  const [waliEmail, setWaliEmail] = useState('');
  const [waliRelation, setWaliRelation] = useState('');
  const [mustApprove, setMustApprove] = useState(true);

  // Prefill from sign-up metadata, or from an existing profile. Every field
  // the save writes is restored here — otherwise editing the profile later
  // would silently blank whatever this form did not load.
  useEffect(() => {
    setFullName((v) => v || profile?.full_name || meta.full_name || '');
    setGender((v) => v || profile?.gender || meta.gender || '');
    setDob((v) => v || profile?.date_of_birth || meta.date_of_birth || '');
    if (!profile) return;
    setCity((v) => v || profile.city || '');
    setCountry((v) => v || profile.country || '');
    setSect((v) => v || profile.sect || '');
    setMadhab((v) => v || profile.madhab || '');
    setPrayer((v) => v || profile.prayer_level || '');
    setValues((v) => (v.length ? v : (profile.core_values ?? [])));
    setEthnicity((v) => v || profile.ethnicity || '');
    setLanguages((v) => (v.length ? v : (profile.languages ?? [])));
    setProfession((v) => v || profile.profession || '');
    setEducation((v) => v || profile.education || '');
    setMarital((v) => v || profile.marital_status || '');
    setHasChildren(Boolean(profile.has_children));
    setRelocate(Boolean(profile.willing_to_relocate));
    setBio((v) => v || profile.bio || '');
    setMinAge(String(profile.seeking_min_age ?? 22));
    setMaxAge(String(profile.seeking_max_age ?? 40));
    setWantsWali(profile.wali_required);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  // Only suggest a guardian for a new sister's profile — never override a
  // choice already saved.
  useEffect(() => {
    if (gender === 'female' && !profile) setWantsWali(true);
  }, [gender, profile]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    void supabase
      .from('wali_links')
      .select('id')
      .eq('ward_id', session.user.id)
      .in('status', ['invited', 'active'])
      .then(({ data }) => {
        if (!cancelled) setAlreadyHasWali((data ?? []).length > 0);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  const stepValid = useMemo(() => {
    if (step === 0) {
      return (
        fullName.trim().length >= 2 &&
        (gender === 'male' || gender === 'female') &&
        isAdult(dob) &&
        country.length > 0
      );
    }
    if (step === 1) return sect.length > 0 && prayer.length > 0;
    if (step === 2) return marital.length > 0;
    if (step === 3) return bio.trim().length >= 40;
    if (step === 4) {
      if (!wantsWali || alreadyHasWali) return true;
      return (
        waliName.trim().length >= 2 && waliEmail.includes('@') && waliRelation.length > 0
      );
    }
    return true;
  }, [
    alreadyHasWali,
    step,
    fullName,
    gender,
    dob,
    country,
    sect,
    prayer,
    marital,
    bio,
    wantsWali,
    waliName,
    waliEmail,
    waliRelation,
  ]);

  function toggle(list: string[], set: (v: string[]) => void, value: string) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function finish() {
    if (!session) return;
    setError('');
    setBusy(true);

    const payload = {
      id: session.user.id,
      full_name: fullName.trim(),
      gender,
      date_of_birth: dob,
      city: city.trim() || null,
      country,
      sect,
      madhab: madhab || null,
      prayer_level: prayer,
      ethnicity: ethnicity.trim() || null,
      languages,
      profession: profession.trim() || null,
      education: education || null,
      marital_status: marital,
      has_children: hasChildren,
      willing_to_relocate: relocate,
      bio: bio.trim(),
      core_values: values,
      seeking_min_age: Math.max(18, Number(minAge) || 18),
      seeking_max_age: Math.min(99, Number(maxAge) || 60),
      wali_required: wantsWali,
      onboarding_done: true,
    };

    // Gender and date of birth are set once, at sign-up, and are not writable
    // afterwards — the database refuses the columns outright.
    const { id: _id, gender: _gender, date_of_birth: _dob, ...editable } = payload;

    const { error: saveError } = profile
      ? await supabase.from('profiles').update(editable).eq('id', session.user.id)
      : await supabase.from('profiles').insert(payload);

    if (saveError) {
      setBusy(false);
      setError(friendlyError(saveError));
      return;
    }

    // Only invite a guardian the first time through. Editing the profile later
    // must not create a second guardian link with a second invite code.
    const needsFirstWali =
      wantsWali &&
      !alreadyHasWali &&
      waliName.trim().length > 1 &&
      waliEmail.includes('@');

    if (needsFirstWali) {
      const { error: waliError } = await supabase.from('wali_links').insert({
        ward_id: session.user.id,
        wali_name: waliName.trim(),
        wali_email: waliEmail.trim(),
        relationship: waliRelation,
        must_approve_chat: mustApprove,
        can_read_messages: true,
      });
      if (waliError) {
        setBusy(false);
        setError(friendlyError(waliError));
        return;
      }
    }

    await refreshProfile();
    setBusy(false);
    navigate(needsFirstWali ? '/guardian' : '/browse', { replace: true });
  }

  return (
    <Layout narrow title={`Step ${step + 1} of ${STEPS.length}`}>
      <div className="stepbar">
        {STEPS.map((s, i) => (
          <div key={s} className={i <= step ? 'on' : ''} />
        ))}
      </div>

      <h1 style={{ fontSize: 24, marginBottom: 4 }}>{STEPS[step]}</h1>
      <p className="muted small" style={{ marginBottom: 18 }}>
        {step === 0 && 'The basics. Your date of birth stays private.'}
        {step === 1 && 'Your practice. This is what most people filter on first.'}
        {step === 2 && 'Family, work and language — the practical side.'}
        {step === 3 && 'Write honestly. A vague profile gets ignored.'}
        {step === 4 && 'Involve a guardian if you want one in the process.'}
      </p>

      <div className="card">
        {step === 0 && (
          <>
            <Field label="Full name" value={fullName} onChange={setFullName} />
            <Select
              label="I am"
              value={gender}
              onChange={setGender}
              options={['male', 'female']}
            />
            <Field
              label="Date of birth"
              type="date"
              value={dob}
              onChange={setDob}
              hint="Others see your age only, never the date."
            />
            {dob && !isAdult(dob) ? (
              <Notice tone="error">You must be 18 or over to use NikkahPure.</Notice>
            ) : null}
            <Field label="City" value={city} onChange={setCity} />
            <Select label="Country" value={country} onChange={setCountry} options={COUNTRIES} />
          </>
        )}

        {step === 1 && (
          <>
            <Select label="Sect" value={sect} onChange={setSect} options={SECTS} />
            <Select label="Madhab" value={madhab} onChange={setMadhab} options={MADHABS} />
            <Select
              label="Prayer"
              value={prayer}
              onChange={setPrayer}
              options={PRAYER_LEVELS}
            />
            <ChipGroup
              label="Values that matter most"
              options={CORE_VALUES}
              selected={values}
              onToggle={(v) => toggle(values, setValues, v)}
            />
          </>
        )}

        {step === 2 && (
          <>
            <Field
              label="Ethnicity / heritage"
              value={ethnicity}
              onChange={setEthnicity}
              placeholder="e.g. Somali, Pakistani, Turkish"
            />
            <ChipGroup
              label="Languages"
              options={LANGUAGES}
              selected={languages}
              onToggle={(v) => toggle(languages, setLanguages, v)}
            />
            <Field label="Profession" value={profession} onChange={setProfession} />
            <Select
              label="Education"
              value={education}
              onChange={setEducation}
              options={EDUCATION_LEVELS}
            />
            <Select
              label="Marital status"
              value={marital}
              onChange={setMarital}
              options={MARITAL_STATUSES}
            />
            <label className="checkline">
              <input
                type="checkbox"
                checked={hasChildren}
                onChange={(e) => setHasChildren(e.target.checked)}
              />
              <span className="small">I have children</span>
            </label>
            <label className="checkline">
              <input
                type="checkbox"
                checked={relocate}
                onChange={(e) => setRelocate(e.target.checked)}
              />
              <span className="small">I am willing to relocate for marriage</span>
            </label>
          </>
        )}

        {step === 3 && (
          <>
            <TextArea
              label="About you"
              value={bio}
              onChange={setBio}
              placeholder="Your deen, your character, your family, and what you are looking for in a spouse."
            />
            {bio.trim().length < 40 ? (
              <p className="tiny muted" style={{ marginBottom: 12 }}>
                Write at least 40 characters.
              </p>
            ) : null}
            <div className="row" style={{ gap: 12 }}>
              <Field label="Age from" type="number" value={minAge} onChange={setMinAge} />
              <Field label="Age to" type="number" value={maxAge} onChange={setMaxAge} />
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <label className="checkline">
              <input
                type="checkbox"
                checked={wantsWali}
                onChange={(e) => setWantsWali(e.target.checked)}
              />
              <span className="small">
                Involve a wali / guardian in my account
                {gender === 'female' ? ' (recommended)' : ''}
              </span>
            </label>

            {wantsWali && alreadyHasWali ? (
              <Notice tone="gold">
                A guardian is already linked to your account. Manage him — or add another —
                from the Guardian tab.
              </Notice>
            ) : wantsWali ? (
              <>
                <Field label="Guardian's name" value={waliName} onChange={setWaliName} />
                <Field
                  label="Guardian's email"
                  type="email"
                  value={waliEmail}
                  onChange={setWaliEmail}
                  hint="You will get a private code to send them. They create their own account to accept."
                />
                <Select
                  label="Relationship to you"
                  value={waliRelation}
                  onChange={setWaliRelation}
                  options={RELATIONSHIPS}
                />
                <label className="checkline">
                  <input
                    type="checkbox"
                    checked={mustApprove}
                    onChange={(e) => setMustApprove(e.target.checked)}
                  />
                  <span className="small">
                    My guardian must approve before any conversation opens
                  </span>
                </label>
                <Notice tone="gold">
                  Your guardian will be able to read conversations you have on NikkahPure. He
                  can never write as you, and he cannot see your password or your email inbox.
                </Notice>
              </>
            ) : (
              <Notice>
                You can add a guardian at any time from the Guardian tab.
              </Notice>
            )}
          </>
        )}

        {error ? (
          <div style={{ marginTop: 14 }}>
            <Notice tone="error">{error}</Notice>
          </div>
        ) : null}

        <div className="row" style={{ gap: 10, marginTop: 18 }}>
          {step > 0 ? (
            <button className="btn btn-outline" onClick={() => setStep(step - 1)}>
              Back
            </button>
          ) : null}
          {step < STEPS.length - 1 ? (
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={!stepValid}
              onClick={() => setStep(step + 1)}
            >
              Continue
            </button>
          ) : (
            <button
              className="btn btn-gold"
              style={{ flex: 1 }}
              disabled={!stepValid || busy}
              onClick={finish}
            >
              {busy ? 'Saving…' : 'Finish profile'}
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
}
