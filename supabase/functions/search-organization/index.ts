import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Organization {
  organisasjonsnummer: string;
  navn: string;
  organisasjonsform?: {
    kode: string;
    beskrivelse: string;
  };
  forretningsadresse?: {
    adresse: string[];
    postnummer: string;
    poststed: string;
  };
}

interface BrregResponse {
  _embedded?: {
    enheter: Organization[];
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Søket må være minst 2 tegn' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Searching Brønnøysund for: ${query}`);

    // Search Brønnøysundregistrene API
    const brregUrl = `https://data.brreg.no/enhetsregisteret/api/enheter?navn=${encodeURIComponent(query)}&size=10`;
    
    const response = await fetch(brregUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Brønnøysund API error: ${response.status} ${response.statusText}`);
      throw new Error('Kunne ikke søke i Brønnøysundregistrene');
    }

    const data: BrregResponse = await response.json();
    
    const organizations = data._embedded?.enheter || [];
    
    console.log(`Found ${organizations.length} organizations`);

    // Transform to simpler format
    const results = organizations.map((org) => ({
      organizationNumber: org.organisasjonsnummer,
      name: org.navn,
      type: org.organisasjonsform?.beskrivelse || 'Ukjent',
      address: org.forretningsadresse ? 
        `${org.forretningsadresse.adresse.join(', ')}, ${org.forretningsadresse.postnummer} ${org.forretningsadresse.poststed}` : 
        null
    }));

    return new Response(
      JSON.stringify({ organizations: results }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in search-organization:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Det oppstod en feil ved søk';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        organizations: []
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
