import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requestSchema = z.object({
  projectId: z.string().uuid('Invalid project ID format'),
  userId: z.string().uuid('Invalid user ID format').optional(),
});

Deno.serve(async (req) => {
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

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      console.error('[Validation Error] Invalid input format');
      return new Response(
        JSON.stringify({ error: 'Invalid request parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { projectId, userId } = validation.data;
    console.log('[Cost Calculation] Processing request for project');

    // Verify user has access to this project
    const { data: memberCheck, error: memberError } = await supabaseClient
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !memberCheck) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Pricing constants from Excel sheet
    const HOURLY_RATE = 650; // NOK per hour (standard rate)
    const KM_RATE = 10; // NOK per km
    const FREE_KM = 5; // First 5 km are free

    // Fetch time entries
    const timeQuery = supabaseClient
      .from('time_entries')
      .select('user_id, user_name, duration_seconds, start_time, end_time')
      .eq('project_id', projectId)
      .not('end_time', 'is', null);

    const myTimeQuery = userId 
      ? timeQuery.eq('user_id', userId)
      : timeQuery.eq('user_id', user.id);

    const allTimeQuery = supabaseClient
      .from('time_entries')
      .select('user_id, user_name, duration_seconds, start_time, end_time')
      .eq('project_id', projectId)
      .not('end_time', 'is', null);

    const [myTimeResult, allTimeResult] = await Promise.all([
      myTimeQuery,
      allTimeQuery,
    ]);

    if (myTimeResult.error) throw myTimeResult.error;
    if (allTimeResult.error) throw allTimeResult.error;

    // Calculate labor costs
    const myTotalSeconds = myTimeResult.data.reduce((sum, entry) => sum + entry.duration_seconds, 0);
    const myTotalHours = myTotalSeconds / 3600;
    const myLaborCost = myTotalHours * HOURLY_RATE;

    const allTotalSeconds = allTimeResult.data.reduce((sum, entry) => sum + entry.duration_seconds, 0);
    const allTotalHours = allTotalSeconds / 3600;
    const allLaborCost = allTotalHours * HOURLY_RATE;

    // Fetch drive entries
    const driveQuery = supabaseClient
      .from('drive_entries')
      .select('user_id, user_name, kilometers, start_time, end_time')
      .eq('project_id', projectId)
      .not('end_time', 'is', null)
      .not('kilometers', 'is', null);

    const myDriveQuery = userId
      ? driveQuery.eq('user_id', userId)
      : driveQuery.eq('user_id', user.id);

    const allDriveQuery = supabaseClient
      .from('drive_entries')
      .select('user_id, user_name, kilometers, start_time, end_time')
      .eq('project_id', projectId)
      .not('end_time', 'is', null)
      .not('kilometers', 'is', null);

    const [myDriveResult, allDriveResult] = await Promise.all([
      myDriveQuery,
      allDriveQuery,
    ]);

    if (myDriveResult.error) throw myDriveResult.error;
    if (allDriveResult.error) throw allDriveResult.error;

    // Calculate driving costs
    const myTotalKm = myDriveResult.data.reduce((sum, entry) => sum + (Number(entry.kilometers) || 0), 0);
    const myBillableKm = Math.max(0, myTotalKm - FREE_KM);
    const myDrivingCost = myBillableKm * KM_RATE;

    const allTotalKm = allDriveResult.data.reduce((sum, entry) => sum + (Number(entry.kilometers) || 0), 0);
    const allBillableKm = Math.max(0, allTotalKm - FREE_KM);
    const allDrivingCost = allBillableKm * KM_RATE;

    // Fetch materials
    const materialQuery = supabaseClient
      .from('materials')
      .select('user_id, user_name, name, quantity, unit_price, total_price, created_at')
      .eq('project_id', projectId);

    const myMaterialQuery = userId
      ? materialQuery.eq('user_id', userId)
      : materialQuery.eq('user_id', user.id);

    const allMaterialQuery = supabaseClient
      .from('materials')
      .select('user_id, user_name, name, quantity, unit_price, total_price, created_at')
      .eq('project_id', projectId);

    const [myMaterialResult, allMaterialResult] = await Promise.all([
      myMaterialQuery,
      allMaterialQuery,
    ]);

    if (myMaterialResult.error) throw myMaterialResult.error;
    if (allMaterialResult.error) throw allMaterialResult.error;

    // Calculate material costs
    const myMaterialsCost = myMaterialResult.data.reduce((sum, material) => sum + Number(material.total_price), 0);
    const allMaterialsCost = allMaterialResult.data.reduce((sum, material) => sum + Number(material.total_price), 0);

    // Calculate totals
    const myTotalCost = myLaborCost + myDrivingCost + myMaterialsCost;
    const allTotalCost = allLaborCost + allDrivingCost + allMaterialsCost;

    console.log('[Cost Calculation] Completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        myCosts: {
          labor: {
            hours: myTotalHours,
            rate: HOURLY_RATE,
            cost: myLaborCost,
          },
          driving: {
            totalKm: myTotalKm,
            billableKm: myBillableKm,
            freeKm: FREE_KM,
            rate: KM_RATE,
            cost: myDrivingCost,
          },
          materials: {
            cost: myMaterialsCost,
            items: myMaterialResult.data.length,
          },
          total: myTotalCost,
        },
        allCosts: {
          labor: {
            hours: allTotalHours,
            rate: HOURLY_RATE,
            cost: allLaborCost,
          },
          driving: {
            totalKm: allTotalKm,
            billableKm: allBillableKm,
            freeKm: FREE_KM,
            rate: KM_RATE,
            cost: allDrivingCost,
          },
          materials: {
            cost: allMaterialsCost,
            items: allMaterialResult.data.length,
          },
          total: allTotalCost,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Cost Calculation Error]', error instanceof Error ? error.message : 'Unknown error');
    return new Response(
      JSON.stringify({ error: 'Failed to calculate project cost' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
