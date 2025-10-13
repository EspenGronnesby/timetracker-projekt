import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      console.error('[Auth Error] No authenticated user');
      throw new Error('Unauthorized');
    }

    console.log('[Admin Verification] Checking admin status for user:', user.id);

    // Server-side admin check using the security definer function
    const { data: isAdmin, error: roleError } = await supabaseClient
      .rpc('is_admin', { _user_id: user.id });

    if (roleError) {
      console.error('[Role Check Error]', roleError);
      throw new Error('Failed to verify admin status');
    }

    if (!isAdmin) {
      console.warn('[Authorization Error] Non-admin attempted to access admin endpoint', { user_id: user.id });
      throw new Error('Not authorized');
    }

    console.log('[Admin Verified] Fetching users for admin:', user.id);

    // Get user's organization
    const { data: userOrg, error: orgError } = await supabaseClient
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (orgError || !userOrg) {
      console.error('[Organization Error]', orgError);
      throw new Error('Organization not found');
    }

    // Get all users in the same organization
    const { data: orgUsers, error: usersError } = await supabaseClient
      .from('user_organizations')
      .select('user_id')
      .eq('organization_id', userOrg.organization_id);

    if (usersError) {
      console.error('[Users Fetch Error]', usersError);
      throw new Error('Failed to fetch organization users');
    }

    const userIds = orgUsers.map(u => u.user_id);

    // Get profiles for these users
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('*')
      .in('id', userIds);

    if (profilesError) {
      console.error('[Profiles Fetch Error]', profilesError);
      throw new Error('Failed to fetch user profiles');
    }

    // Get roles for these users
    const { data: roles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', userIds);

    if (rolesError) {
      console.error('[Roles Fetch Error]', rolesError);
      throw new Error('Failed to fetch user roles');
    }

    // Combine profiles with roles
    const usersWithRoles = profiles.map(profile => {
      const userRole = roles.find(r => r.user_id === profile.id);
      return {
        ...profile,
        role: userRole?.role || null
      };
    });

    console.log('[Success] Returning', usersWithRoles.length, 'users to admin');

    return new Response(
      JSON.stringify({ users: usersWithRoles }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[Error] admin-get-users:', error);
    
    let clientMessage = 'Failed to fetch users';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized') || error.message.includes('Not authorized')) {
        clientMessage = error.message;
        statusCode = 403;
      } else if (error.message.includes('Failed to verify admin status') ||
                 error.message.includes('Organization not found') ||
                 error.message.includes('Failed to fetch')) {
        clientMessage = error.message;
      }
    }
    
    return new Response(
      JSON.stringify({ error: clientMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode
      }
    );
  }
});
