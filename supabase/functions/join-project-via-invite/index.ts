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

    const { inviteCode } = await req.json();
    
    if (!inviteCode) {
      throw new Error('Invite code is required');
    }

    console.log(`Processing invite: ${inviteCode} for user: ${user.id}`);

    // Find the invite
    const { data: invite, error: inviteError } = await supabaseClient
      .from('project_invites')
      .select('*, projects(id, name)')
      .eq('invite_code', inviteCode)
      .single();

    if (inviteError || !invite) {
      throw new Error('Invalid invite code');
    }

    // Check if expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      throw new Error('Invite has expired');
    }

    // Check if max uses reached
    if (invite.max_uses && invite.use_count >= invite.max_uses) {
      throw new Error('Invite has reached maximum uses');
    }

    // Check if user is already a member
    const { data: existingMember } = await supabaseClient
      .from('project_members')
      .select('id')
      .eq('project_id', invite.project_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingMember) {
      return new Response(
        JSON.stringify({ 
          message: 'Already a member',
          projectId: invite.project_id
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Add user as project member
    const { error: memberError } = await supabaseClient
      .from('project_members')
      .insert({
        project_id: invite.project_id,
        user_id: user.id,
        role: 'member',
      });

    if (memberError) throw memberError;

    // Increment use count
    const { error: updateError } = await supabaseClient
      .from('project_invites')
      .update({ use_count: invite.use_count + 1 })
      .eq('id', invite.id);

    if (updateError) throw updateError;

    console.log(`User ${user.id} joined project ${invite.project_id}`);

    return new Response(
      JSON.stringify({ 
        message: 'Successfully joined project',
        projectId: invite.project_id,
        projectName: invite.projects?.name
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error joining project:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to join project'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});