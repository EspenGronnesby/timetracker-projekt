import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { startLocation, endLocation } = await req.json();
    const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('GOOGLE_MAPS_API_KEY not configured');
    }

    if (!startLocation || !endLocation) {
      throw new Error('Start and end locations are required');
    }

    console.log('Calculating distance:', { startLocation, endLocation });

    // Format locations for Google Maps API
    const origin = typeof startLocation === 'string' 
      ? startLocation 
      : `${startLocation.lat},${startLocation.lng}`;
    const destination = typeof endLocation === 'string'
      ? endLocation
      : `${endLocation.lat},${endLocation.lng}`;

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    console.log('Google Maps API response:', data.status);

    if (data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${data.status}`);
    }

    const route = data.routes[0];
    const leg = route.legs[0];
    
    const distanceKm = (leg.distance.value / 1000).toFixed(2);
    const durationMinutes = Math.round(leg.duration.value / 60);

    return new Response(JSON.stringify({
      distance_km: parseFloat(distanceKm),
      duration_minutes: durationMinutes,
      route_polyline: route.overview_polyline.points,
      start_address: leg.start_address,
      end_address: leg.end_address
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in calculate-driving-distance:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
