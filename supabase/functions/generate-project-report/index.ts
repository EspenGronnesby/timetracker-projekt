import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Step 1: Authenticate the caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create anon client with user's JWT for auth check
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (!user || authError) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const body = await req.json();
    const { 
      projectId, 
      includeCustomerInfo = true,
      includeTimeStats = true,
      includeDriveStats = true,
      includeMaterialCosts = true,
      includeAiAnalysis = true
    } = body;

    // Validate projectId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!projectId || typeof projectId !== 'string' || !uuidRegex.test(projectId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid project identifier' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate boolean flags
    const booleanFlags = { includeCustomerInfo, includeTimeStats, includeDriveStats, includeMaterialCosts, includeAiAnalysis };
    for (const [key, val] of Object.entries(booleanFlags)) {
      if (typeof val !== 'boolean') {
        return new Response(
          JSON.stringify({ error: 'Invalid request parameters' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    }

    // Step 2: Verify project membership
    const { data: member } = await supabaseAuth
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Use service role client for data fetching
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch project data
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError) {
      console.error('[Database Error] Project fetch failed');
      throw new Error('Project not found');
    }

    // Fetch time entries
    const { data: timeEntries, error: timeError } = await supabase
      .from('time_entries')
      .select('*')
      .eq('project_id', projectId)
      .order('start_time', { ascending: false });

    if (timeError) throw new Error('Could not fetch time entries');

    // Fetch drive entries
    const { data: driveEntries, error: driveError } = await supabase
      .from('drive_entries')
      .select('*')
      .eq('project_id', projectId)
      .order('start_time', { ascending: false });

    if (driveError) throw new Error('Could not fetch drive entries');

    // Fetch materials
    const { data: materials, error: materialsError } = await supabase
      .from('materials')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (materialsError) throw new Error('Could not fetch materials');

    // Calculate statistics
    const totalSeconds = timeEntries.reduce((sum, entry) => sum + (entry.duration_seconds || 0), 0);
    const totalHours = (totalSeconds / 3600).toFixed(2);
    const totalKm = driveEntries.reduce((sum, entry) => sum + (entry.kilometers || 0), 0);
    const totalMaterialCost = materials.reduce((sum, mat) => sum + Number(mat.total_price), 0);

    // Group by user
    const timeByUser = timeEntries.reduce((acc: any, entry) => {
      const userName = entry.user_name;
      if (!acc[userName]) acc[userName] = 0;
      acc[userName] += entry.duration_seconds || 0;
      return acc;
    }, {});

    const driveByUser = driveEntries.reduce((acc: any, entry) => {
      const userName = entry.user_name;
      if (!acc[userName]) acc[userName] = 0;
      acc[userName] += entry.kilometers || 0;
      return acc;
    }, {});

    // Build AI prompt
    let prompt = `Du er en profesjonell prosjektanalytiker. Basert på følgende data fra prosjektet "${project.name}", generer en detaljert rapport på norsk.\n\n`;

    if (includeCustomerInfo) {
      prompt += `**Kundeinformasjon:**\n`;
      prompt += `- Navn: ${project.customer_name}\n`;
      if (project.customer_address) prompt += `- Adresse: ${project.customer_address}\n`;
      if (project.customer_phone) prompt += `- Telefon: ${project.customer_phone}\n`;
      if (project.customer_email) prompt += `- E-post: ${project.customer_email}\n`;
      if (project.contract_number) prompt += `- Kontraktnummer: ${project.contract_number}\n`;
      prompt += `\n`;
    }

    if (includeTimeStats) {
      prompt += `**Tidsdata:**\n`;
      prompt += `- Total tid: ${totalHours} timer (${timeEntries.length} tidsposter)\n`;
      prompt += `- Fordeling per person:\n`;
      Object.entries(timeByUser).forEach(([name, seconds]: [string, any]) => {
        prompt += `  - ${name}: ${(seconds / 3600).toFixed(2)} timer\n`;
      });
      prompt += `\n`;
    }

    if (includeDriveStats) {
      prompt += `**Kjøredata:**\n`;
      prompt += `- Total kjørelengde: ${totalKm} km (${driveEntries.length} kjøreturer)\n`;
      prompt += `- Fordeling per person:\n`;
      Object.entries(driveByUser).forEach(([name, km]: [string, any]) => {
        prompt += `  - ${name}: ${km} km\n`;
      });
      prompt += `\n`;
    }

    if (includeMaterialCosts) {
      prompt += `**Materialer:**\n`;
      prompt += `- Totalkostnad: ${totalMaterialCost.toFixed(2)} kr (${materials.length} materialposter)\n`;
      if (materials.length > 0) {
        prompt += `- Topp 5 materialer:\n`;
        materials.slice(0, 5).forEach(mat => {
          prompt += `  - ${mat.name}: ${mat.quantity} stk à ${mat.unit_price} kr = ${mat.total_price} kr\n`;
        });
      }
      prompt += `\n`;
    }

    if (includeAiAnalysis) {
      prompt += `**Analyseoppgave:**\n`;
      prompt += `Generer en profesjonell rapport med følgende seksjoner:\n`;
      prompt += `1. **Sammendrag** (2-3 setninger om prosjektets status og omfang)\n`;
      prompt += `2. **Detaljert oversikt** (beskriv aktivitetene basert på dataene)\n`;
      prompt += `3. **Kostnadsanalyse** (sammenlign tid, kjøring og materialkostnader)\n`;
      prompt += `4. **Mønstre og effektivitet** (identifiser eventuelle mønstre eller ineffektivitet)\n`;
      prompt += `5. **Anbefalinger** (konkrete forbedringsforslag basert på dataene)\n\n`;
      prompt += `Skriv rapporten i et profesjonelt format med markdown-formatering.`;
    } else {
      prompt += `Oppsummer dataene ovenfor i et klart og profesjonelt format med markdown-formatering.`;
    }

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Du er en profesjonell prosjektanalytiker som genererer detaljerte rapporter på norsk.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      console.error('[AI Service Error]', aiResponse.status);
      throw new Error('Report generation service temporarily unavailable');
    }

    const aiData = await aiResponse.json();
    const generatedReport = aiData.choices[0].message.content;

    return new Response(
      JSON.stringify({ 
        report: generatedReport,
        projectName: project.name,
        generatedAt: new Date().toISOString()
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[Error] generate-project-report');
    
    let clientMessage = 'Failed to generate report';
    if (error instanceof Error) {
      const safeMessages = [
        'Invalid project identifier',
        'Invalid request parameters',
        'Project not found',
        'Report generation service temporarily unavailable',
        'LOVABLE_API_KEY is not configured'
      ];
      if (safeMessages.includes(error.message)) {
        clientMessage = error.message;
      }
    }
    
    return new Response(
      JSON.stringify({ error: clientMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
