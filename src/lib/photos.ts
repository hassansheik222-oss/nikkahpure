import { supabase } from './supabase';

/**
 * Photos live in a private bucket. A signed URL is minted only when storage
 * policy allows the viewer to read that file — your own photo always, and a
 * match's photo once the conversation between you is open. Anywhere else this
 * returns null and the UI falls back to initials.
 */
export async function signedPhotoUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from('photos').createSignedUrl(path, 3600);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function uploadPhoto(userId: string, file: File): Promise<string> {
  const clean = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
  const path = `${userId}/photo-${Date.now()}-${clean}`;
  const { error } = await supabase.storage.from('photos').upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

export async function removePhoto(path: string): Promise<void> {
  await supabase.storage.from('photos').remove([path]);
}
