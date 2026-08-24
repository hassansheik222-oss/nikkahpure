// Supabase Edge Function — permanent account deletion.
//
// Both Apple and Google require an in-app way to delete an account, not just
// deactivate it. The browser cannot do this itself (it would need the service
// role key), so the app calls this function with the user's own JWT.
//
// Deploy:
//   supabase functions deploy delete-account
//
// It needs no extra secrets: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are
// injected automatically in the Edge runtime.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '');
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Confirm the caller is who they say they are.
    const { data: userData, error: userError } = await admin.auth.getUser(jwt);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user.id;

    // Remove stored files first — deleting the auth user does not clear storage.
    for (const bucket of ['photos', 'verification']) {
      const { data: files } = await admin.storage.from(bucket).list(userId);
      if (files && files.length > 0) {
        await admin.storage
          .from(bucket)
          .remove(files.map((f: { name: string }) => `${userId}/${f.name}`));
      }
    }

    // Every table references profiles(id) with ON DELETE CASCADE, and profiles
    // references auth.users(id) with ON DELETE CASCADE — so this one call
    // erases the profile, interests, conversations, messages and reports.
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
