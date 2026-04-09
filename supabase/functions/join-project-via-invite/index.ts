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
    // Auth client to verify user
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Service role client for DB operations (bypasses RLS)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { inviteCode } = await req.json();

    // Validate invite code format
    if (!inviteCode || typeof inviteCode !== 'string') {
      console.error('[Validation Error] Missing or invalid invite code type');
      throw new Error('Invalid invite code format');
    }
    
    const trimmedCode = inviteCode.trim();
    if (trimmedCode.length < 6 || trimmedCode.length > 36) {
      console.error('[Validation Error] Invite code length out of bounds');
      throw new Error('Invalid invite code format');
    }
    
    if (!/^[a-zA-Z0-9-]+$/.test(trimmedCode)) {
      console.error('[Validation Error] Invite code contains invalid characters');
      throw new Error('Invalid invite code format');
    }

    console.log(`[Invite Join] Processing for user: ${user.id}`);

    // Find the invite
    const { data: invite, error: inviteError } = await supabaseClient
      .from('project_invites')
      .select('*, projects(id, name)')
      .eq('invite_code', trimmedCode)
      .single();

    if (inviteError || !invite) {
      console.error('[Invite Lookup Error]', inviteError);
      throw new Error('Invalid or expired invite code');
    }

    // Comprehensive logging for audit trail
    console.log('[Invite Join Attempt]', {
      user_id: user.id,
      project_id: invite.project_id,
      invite_id: invite.id,
      invite_creator: invite.created_by,
      current_use_count: invite.use_count,
      max_uses: invite.max_uses,
      timestamp: new Date().toISOString()
    });

    // Check if invite has expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      console.warn('[Invite Expired]', { invite_id: invite.id, user_id: user.id });
      throw new Error('Invalid or expired invite code');
    }

    // Check if invite has reached maximum uses
    if (invite.max_uses && invite.use_count >= invite.max_uses) {
      console.warn('[Invite Max Uses Reached]', { invite_id: invite.id, user_id: user.id });
      throw new Error('Invalid or expired invite code');
    }

    // Verify the invite was created by a valid project owner
    const { data: inviteCreator, error: creatorError } = await supabaseClient
      .from('project_members')
      .select('role')
      .eq('project_id', invite.project_id)
      .eq('user_id', invite.created_by)
      .maybeSingle();

    if (creatorError || !inviteCreator || inviteCreator.role !== 'owner') {
      console.error('[Invalid Invite Creator]', { 
        invite_id: invite.id, 
        creator_id: invite.created_by,
        error: creatorError 
      });
      throw new Error('Invalid invite');
    }

    // Check if user is already a member
    const { data: existingMember } = await supabaseClient
      .from('project_members')
      .select('id')
      .eq('project_id', invite.project_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingMember) {
      console.info('[Already Member]', { user_id: user.id, project_id: invite.project_id });
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

    // Add user as project member (using service role to bypass RLS)
    const { error: memberError } = await supabaseClient
      .from('project_members')
      .insert({
        project_id: invite.project_id,
        user_id: user.id,
        role: 'member',
      });

    if (memberError) {
      console.error('[Member Insert Error]', memberError);
      throw new Error('Failed to join project');
    }

    // Log successful join for audit
    console.log('[Successful Join]', {
      user_id: user.id,
      project_id: invite.project_id,
      invite_id: invite.id,
      timestamp: new Date().toISOString()
    });

    // Increment use count
    const { error: updateError } = await supabaseClient
      .from('project_invites')
      .update({ use_count: invite.use_count + 1 })
      .eq('id', invite.id);

    if (updateError) {
      console.error('[Invite Count Update Error]', updateError);
    }

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
    console.error('[Error] join-project-via-invite:', error);
    
    // Map errors to generic client messages to prevent enumeration
    let clientMessage = 'Unable to join project';
    let statusCode = 400;
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid invite code format') ||
          error.message.includes('Invalid or expired invite code') ||
          error.message.includes('Invalid invite') ||
          error.message.includes('Unauthorized')) {
        clientMessage = error.message;
      } else if (error.message.includes('Failed to join project')) {
        clientMessage = error.message;
        statusCode = 500;
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