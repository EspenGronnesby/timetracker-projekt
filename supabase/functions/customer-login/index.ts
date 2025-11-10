import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LoginRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email }: LoginRequest = await req.json();

    if (!email || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Ugyldig e-postadresse" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Customer login attempt for:", email);

    // Check if customer has completed projects
    const { data: projects, error: projectError } = await supabase
      .from("customer_projects_view")
      .select("*")
      .eq("customer_email", email.toLowerCase());

    if (projectError) {
      console.error("Error fetching projects:", projectError);
      return new Response(
        JSON.stringify({ error: "Kunne ikke hente prosjekter" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!projects || projects.length === 0) {
      return new Response(
        JSON.stringify({ error: "Ingen fullførte prosjekter funnet for denne e-postadressen" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create or update customer user
    const customerName = projects[0].customer_name || "Kunde";
    const { error: upsertError } = await supabase
      .from("customer_users")
      .upsert(
        {
          email: email.toLowerCase(),
          name: customerName,
          last_login: new Date().toISOString(),
        },
        { onConflict: "email" }
      );

    if (upsertError) {
      console.error("Error upserting customer:", upsertError);
    }

    console.log("Login successful for:", email, "Projects found:", projects.length);

    return new Response(
      JSON.stringify({
        success: true,
        customer: {
          email: email.toLowerCase(),
          name: customerName,
        },
        projectCount: projects.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in customer-login:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
