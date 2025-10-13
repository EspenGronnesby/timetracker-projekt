import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate cron secret token for authentication
    const cronSecret = req.headers.get('X-Cron-Token');
    const expectedSecret = Deno.env.get('CRON_SECRET');
    
    if (!expectedSecret) {
      console.error('CRON_SECRET not configured');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (cronSecret !== expectedSecret) {
      console.warn('Unauthorized daily-summary attempt:', {
        timestamp: new Date().toISOString(),
        ip: req.headers.get('x-forwarded-for') || 'unknown'
      });
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayISO = today.toISOString().split('T')[0];

    console.log('Generating daily summaries for:', todayISO);

    // Idempotency check: prevent duplicate summaries for today
    const { data: existingSummaries, error: idempotencyError } = await supabaseClient
      .from('notifications')
      .select('id')
      .eq('type', 'daily_summary')
      .gte('created_at', todayISO + 'T00:00:00Z')
      .limit(1);

    if (idempotencyError) {
      console.error('Idempotency check failed:', idempotencyError);
      throw idempotencyError;
    }

    if (existingSummaries && existingSummaries.length > 0) {
      console.log('Daily summaries already sent today, skipping');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Summaries already sent today',
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all users with daily summary enabled
    const { data: preferences, error: prefsError } = await supabaseClient
      .from('notification_preferences')
      .select('user_id')
      .eq('daily_summary_enabled', true);

    if (prefsError) throw prefsError;

    console.log(`Found ${preferences?.length || 0} users with daily summary enabled`);

    for (const pref of preferences || []) {
      // Get today's time entries for this user
      const { data: timeEntries } = await supabaseClient
        .from('time_entries')
        .select('duration_seconds, project_id')
        .eq('user_id', pref.user_id)
        .gte('start_time', today.toISOString())
        .lt('start_time', tomorrow.toISOString());

      // Get today's drive entries for this user
      const { data: driveEntries } = await supabaseClient
        .from('drive_entries')
        .select('kilometers')
        .eq('user_id', pref.user_id)
        .gte('start_time', today.toISOString())
        .lt('start_time', tomorrow.toISOString());

      const totalHours = (timeEntries || []).reduce((sum, entry) => sum + entry.duration_seconds, 0) / 3600;
      const totalKm = (driveEntries || []).reduce((sum, entry) => sum + (entry.kilometers || 0), 0);
      const projectCount = new Set((timeEntries || []).map(e => e.project_id)).size;

      if (totalHours > 0 || totalKm > 0) {
        // Create notification
        await supabaseClient.from('notifications').insert({
          user_id: pref.user_id,
          type: 'daily_summary',
          title: 'Din daglige oppsummering',
          message: `I dag: ${totalHours.toFixed(1)}t, ${totalKm}km på ${projectCount} prosjekt${projectCount !== 1 ? 'er' : ''}`,
          metadata: { hours: totalHours, km: totalKm, projects: projectCount }
        });

        console.log(`Created summary for user ${pref.user_id}:`, { totalHours, totalKm, projectCount });
      }
    }

    console.log('Daily summary completed successfully:', {
      usersProcessed: preferences?.length || 0,
      timestamp: new Date().toISOString()
    });

    return new Response(JSON.stringify({ 
      success: true, 
      usersProcessed: preferences?.length || 0,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in daily-summary:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
