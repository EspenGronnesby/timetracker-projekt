import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BrregOrganization {
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, type } = await req.json();
    console.log('Searching Brønnøysundregisteret:', { query, type });

    if (!query || !type) {
      throw new Error('Missing query or type parameter');
    }

    let url: string;
    
    if (type === 'number') {
      // Search by organization number (exact match)
      url = `https://data.brreg.no/enhetsregisteret/api/enheter/${encodeURIComponent(query)}`;
      console.log('Searching by org number:', url);
      
      const response = await fetch(url);
      
      if (response.status === 404) {
        return new Response(
          JSON.stringify({ results: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (!response.ok) {
        throw new Error(`Brreg API error: ${response.statusText}`);
      }

      const data: BrregOrganization = await response.json();
      
      return new Response(
        JSON.stringify({
          results: [{
            organisasjonsnummer: data.organisasjonsnummer,
            navn: data.navn,
            organisasjonsform: data.organisasjonsform?.beskrivelse || '',
            adresse: data.forretningsadresse ? 
              `${data.forretningsadresse.adresse.join(', ')}, ${data.forretningsadresse.postnummer} ${data.forretningsadresse.poststed}` 
              : ''
          }]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } else {
      // Search by name (partial match)
      url = `https://data.brreg.no/enhetsregisteret/api/enheter?navn=${encodeURIComponent(query)}&size=10`;
      console.log('Searching by name:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Brreg API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      const results = (data._embedded?.enheter || []).map((org: BrregOrganization) => ({
        organisasjonsnummer: org.organisasjonsnummer,
        navn: org.navn,
        organisasjonsform: org.organisasjonsform?.beskrivelse || '',
        adresse: org.forretningsadresse ? 
          `${org.forretningsadresse.adresse.join(', ')}, ${org.forretningsadresse.postnummer} ${org.forretningsadresse.poststed}` 
          : ''
      }));

      console.log(`Found ${results.length} organizations`);

      return new Response(
        JSON.stringify({ results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error searching Brønnøysundregisteret:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})
