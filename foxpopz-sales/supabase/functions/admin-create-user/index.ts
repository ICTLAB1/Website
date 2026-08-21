// Supabase Edge Function: admin-create-user
//
// Lets an existing admin create a brand-new login (rep or admin) directly
// from inside the app, instead of going into the Supabase dashboard.
//
// Security model: this function runs with the SERVICE_ROLE_KEY (full admin
// power over auth), which must never be exposed to the browser. Every call
// is first verified to come from someone who is already an admin, checked
// against the database using their own request token — not just trusted
// blindly — so a non-admin calling this function gets rejected.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function randomPassword() {
  // 12 random characters, letters + digits — good enough for a temp
  // password the rep will use once then can change.
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    // Client scoped to the CALLER's own token — respects RLS, so this can
    // only ever see what the caller is allowed to see.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userErr } = await callerClient.auth.getUser()
    if (userErr || !user) {
      return json({ error: 'Not authenticated' }, 401)
    }

    const { data: callerProfile, error: profileErr } = await callerClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileErr || callerProfile?.role !== 'admin') {
      return json({ error: 'Only admins can add team members' }, 403)
    }

    const { email, full_name, phone, role } = await req.json()
    if (!email || !full_name || !['rep', 'manager', 'admin'].includes(role)) {
      return json({ error: 'email, full_name, and a valid role are required' }, 400)
    }

    // Privileged client — only used for the one action it needs to do.
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const password = randomPassword()
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    })

    if (createErr) {
      return json({ error: createErr.message }, 400)
    }

    // The database trigger auto-creates a profiles row with role='rep'.
    // Update it with the requested role and phone.
    const { error: updateErr } = await adminClient
      .from('profiles')
      .update({ full_name, phone: phone || null, role })
      .eq('id', created.user.id)

    if (updateErr) {
      return json({ error: updateErr.message }, 400)
    }

    return json({ email, password, role }, 200)
  } catch (err) {
    return json({ error: err.message || 'Unexpected error' }, 500)
  }
})

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
