import type { ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const TABS = [
  { to: '/browse', label: 'Browse', icon: '⌕', needsProfile: true },
  { to: '/interests', label: 'Interests', icon: '✦', needsProfile: true },
  { to: '/messages', label: 'Messages', icon: '✉', needsProfile: true },
  { to: '/guardian', label: 'Guardian', icon: '⚖', needsProfile: false },
  { to: '/settings', label: 'Account', icon: '☰', needsProfile: false },
];

export default function Layout({
  children,
  narrow,
  title,
  back,
}: {
  children: ReactNode;
  narrow?: boolean;
  title?: string;
  back?: string;
}) {
  const { session, profile } = useAuth();
  const navigate = useNavigate();

  // A guardian-only account has no profile of its own; the browsing tabs would
  // only bounce him to onboarding, so they are not shown.
  const tabs = TABS.filter((t) => !t.needsProfile || profile?.onboarding_done);

  return (
    <div className="shell">
      <header className="topbar">
        {back ? (
          <button className="btn-ghost" onClick={() => navigate(back)}>
            ← Back
          </button>
        ) : (
          <Link to={session ? '/browse' : '/'} className="brand">
            Nikkah<span>Pure</span>
          </Link>
        )}
        {title ? <span className="small muted">{title}</span> : <span />}
      </header>

      <main className={narrow ? 'page page-narrow' : 'page'}>{children}</main>

      {session ? (
        <nav className="tabbar">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <span className="tab-icon">{t.icon}</span>
              {t.label}
            </NavLink>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
