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
      throw new Error('Unauthorized');
    }

    const { projectId } = await req.json();
    
    if (!projectId) {
      throw new Error('Project ID is required');
    }

    console.log(`Generating invite for project: ${projectId}`);

    // Verify user is project owner
    const { data: membership, error: membershipError } = await supabaseClient
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single();

    if (membershipError || membership?.role !== 'owner') {
      throw new Error('Only project owners can generate invites');
    }

    // Generate unique invite code
    const inviteCode = crypto.randomUUID().split('-')[0];

    // Create invite
    const { data: invite, error: inviteError } = await supabaseClient
      .from('project_invites')
      .insert({
        project_id: projectId,
        invite_code: inviteCode,
        created_by: user.id,
      })
      .select()
      .single();

    if (inviteError) throw inviteError;

    const inviteUrl = `${req.headers.get('origin')}/join/${inviteCode}`;

    console.log(`Invite created: ${inviteCode}`);

    return new Response(
      JSON.stringify({ 
        inviteCode,
        inviteUrl,
        invite 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error generating invite:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to generate invite'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});