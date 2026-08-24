import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { Avatar, Badge, Empty, Notice, Select, Spinner } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ageFromDob, friendlyError } from '../lib/format';
import { COUNTRIES, MADHABS, PRAYER_LEVELS, SECTS } from '../lib/constants';
import type { Profile } from '../lib/types';

export default function Browse() {
  const { profile, userId } = useAuth();
  const [rows, setRows] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [country, setCountry] = useState('');
  const [sect, setSect] = useState('');
  const [madhab, setMadhab] = useState('');
  const [prayer, setPrayer] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minAge, setMinAge] = useState(String(profile?.seeking_min_age ?? 18));
  const [maxAge, setMaxAge] = useState(String(profile?.seeking_max_age ?? 60));

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');

      // Your own row and the people you have blocked are both readable by you
      // through separate policies, so they must be filtered out here.
      const { data: blocks } = await supabase
        .from('blocks')
        .select('blocked_id')
        .eq('blocker_id', userId ?? '');
      const blocked = new Set(
        ((blocks as { blocked_id: string }[]) ?? []).map((b) => b.blocked_id)
      );

      // Age filter is applied as a date-of-birth window.
      const today = new Date();
      const oldest = new Date(today);
      oldest.setFullYear(today.getFullYear() - (Number(maxAge) || 99) - 1);
      const youngest = new Date(today);
      youngest.setFullYear(today.getFullYear() - (Number(minAge) || 18));

      let query = supabase
        .from('profiles')
        .select('*')
        // Your own row is readable by you, so it must be excluded explicitly.
        .neq('id', userId ?? '')
        .eq('onboarding_done', true)
        .eq('is_active', true)
        .gt('date_of_birth', oldest.toISOString().slice(0, 10))
        .lte('date_of_birth', youngest.toISOString().slice(0, 10))
        .order('last_seen_at', { ascending: false })
        .limit(60);

      if (country) query = query.eq('country', country);
      if (sect) query = query.eq('sect', sect);
      if (madhab) query = query.eq('madhab', madhab);
      if (prayer) query = query.eq('prayer_level', prayer);
      if (verifiedOnly) query = query.eq('verification', 'verified');

      const { data, error: queryError } = await query;
      if (cancelled) return;
      if (queryError) setError(friendlyError(queryError));
      setRows(((data as Profile[]) ?? []).filter((p) => !blocked.has(p.id)));
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [country, sect, madhab, prayer, verifiedOnly, minAge, maxAge, userId]);

  const heading = useMemo(
    () => (profile?.gender === 'female' ? 'Brothers' : 'Sisters'),
    [profile?.gender]
  );

  return (
    <Layout>
      <div className="row-between" style={{ marginBottom: 6 }}>
        <h1 style={{ fontSize: 24 }}>{heading}</h1>
        <button className="btn btn-outline btn-sm" onClick={() => setShowFilters((v) => !v)}>
          {showFilters ? 'Hide filters' : 'Filters'}
        </button>
      </div>
      <p className="muted small" style={{ marginBottom: 14 }}>
        You only ever see profiles of the opposite gender, and only people who have completed
        their profile.
      </p>

      {profile?.verification !== 'verified' ? (
        <div style={{ marginBottom: 14 }}>
          <Notice tone="gold">
            Your profile is not ID-verified yet. Verified members get noticeably more responses —{' '}
            <Link to="/verify">verify now</Link>.
          </Notice>
        </div>
      ) : null}

      {showFilters ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <Select label="Country" value={country} onChange={setCountry} options={COUNTRIES} placeholder="Anywhere" />
          <Select label="Sect" value={sect} onChange={setSect} options={SECTS} placeholder="Any" />
          <Select label="Madhab" value={madhab} onChange={setMadhab} options={MADHABS} placeholder="Any" />
          <Select label="Prayer" value={prayer} onChange={setPrayer} options={PRAYER_LEVELS} placeholder="Any" />
          <div className="row" style={{ gap: 12 }}>
            <label className="field" style={{ flex: 1 }}>
              <span className="label">Age from</span>
              <input
                type="number"
                value={minAge}
                min={18}
                onChange={(e) => setMinAge(e.target.value)}
              />
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span className="label">Age to</span>
              <input
                type="number"
                value={maxAge}
                max={99}
                onChange={(e) => setMaxAge(e.target.value)}
              />
            </label>
          </div>
          <label className="checkline">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
            />
            <span className="small">ID-verified profiles only</span>
          </label>
        </div>
      ) : null}

      {error ? <Notice tone="error">{error}</Notice> : null}

      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <Empty
          title="No profiles match yet"
          body="Try widening your filters. As the community grows, more profiles will appear here."
        />
      ) : (
        <div className="grid">
          {rows.map((p) => (
            <Link key={p.id} to={`/profile/${p.id}`} className="card card-hover" style={{ color: 'inherit' }}>
              <div className="row" style={{ marginBottom: 10 }}>
                <Avatar name={p.full_name} id={p.id} size={52} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>
                    {p.full_name.split(' ')[0]}, {ageFromDob(p.date_of_birth)}
                  </div>
                  <div className="tiny muted">
                    {[p.city, p.country].filter(Boolean).join(', ')}
                  </div>
                </div>
              </div>
              <div className="row wrap" style={{ gap: 6, marginBottom: 10 }}>
                {p.verification === 'verified' ? <Badge tone="verified">✓ ID verified</Badge> : null}
                {p.wali_required ? <Badge tone="gold">Wali involved</Badge> : null}
                {p.sect ? <Badge>{p.sect}</Badge> : null}
                {p.madhab ? <Badge>{p.madhab}</Badge> : null}
              </div>
              <p className="small muted" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {p.bio}
              </p>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
