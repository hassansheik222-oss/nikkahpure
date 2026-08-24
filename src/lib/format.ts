export function ageFromDob(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

export function isAdult(dob: string): boolean {
  if (!dob) return false;
  const age = ageFromDob(dob);
  return Number.isFinite(age) && age >= 18;
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

/** Deterministic accent colour so a profile always looks the same. */
export function colorFor(id: string): string {
  const palette = ['#1A7A4A', '#8B6914', '#2D5A3D', '#C9A84C', '#3A6B52', '#A07820'];
  let sum = 0;
  for (let i = 0; i < id.length; i += 1) sum += id.charCodeAt(i);
  return palette[sum % palette.length];
}

export function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function friendlyError(err: unknown): string {
  if (!err) return 'Something went wrong.';
  if (typeof err === 'string') return err;
  const message = (err as { message?: string }).message;
  if (!message) return 'Something went wrong.';
  if (message.includes('adult_only')) {
    return 'You must be at least 18 years old to use NikkahPure.';
  }
  if (message.includes('duplicate key') && message.includes('interests')) {
    return 'You have already expressed interest in this person.';
  }
  if (message.includes('Invalid login credentials')) {
    return 'That email and password combination is not recognised.';
  }
  if (message.includes('User already registered')) {
    return 'An account already exists for that email. Try signing in.';
  }
  return message;
}
