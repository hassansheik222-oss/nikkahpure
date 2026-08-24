import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isConfigured } from '../lib/supabase';
import type { Profile } from '../lib/types';

interface AuthValue {
  session: Session | null;
  userId: string | null;
  profile: Profile | null;
  /** True until both the session AND the profile for it are known. */
  loading: boolean;
  recovering: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue>({
  session: null,
  userId: null,
  profile: null,
  loading: true,
  recovering: false,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessionKnown, setSessionKnown] = useState(false);
  const [profileKnown, setProfileKnown] = useState(false);
  const [recovering, setRecovering] = useState(false);

  async function loadProfile(uid: string | null) {
    if (!uid) {
      setProfile(null);
      setProfileKnown(true);
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    // A failed request must not wipe a profile we already have — otherwise a
    // dropped connection ejects the user into onboarding mid-session.
    if (error) {
      setProfileKnown(true);
      return;
    }
    setProfile((data as Profile) ?? null);
    setProfileKnown(true);

    if (data) {
      void supabase
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', uid);
    }
  }

  useEffect(() => {
    if (!isConfigured) {
      setSessionKnown(true);
      setProfileKnown(true);
      return;
    }

    let active = true;

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      setSessionKnown(true);
      await loadProfile(data.session?.user.id ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      setSessionKnown(true);
      setProfileKnown(false);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (event === 'SIGNED_OUT') setRecovering(false);

      // supabase-js holds an internal lock while this callback runs, so any
      // query made directly inside it can deadlock. Defer to the next tick.
      setTimeout(() => {
        if (!active) return;
        void loadProfile(next?.user.id ?? null);
      }, 0);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      userId: session?.user.id ?? null,
      profile,
      loading: !sessionKnown || !profileKnown,
      recovering,
      refreshProfile: () => loadProfile(session?.user.id ?? null),
      signOut: async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setSession(null);
        setProfileKnown(true);
      },
    }),
    [session, profile, sessionKnown, profileKnown, recovering]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
