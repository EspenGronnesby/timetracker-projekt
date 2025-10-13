import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation helpers
const isValidCoordinate = (lat: number, lng: number): boolean => {
  return typeof lat === 'number' && typeof lng === 'number' &&
         lat >= -90 && lat <= 90 &&
         lng >= -180 && lng <= 180;
};

const isValidLocationString = (location: string): boolean => {
  return typeof location === 'string' && 
         location.length > 0 && 
         location.length < 500 &&
         !/[<>{}]/.test(location); // Basic injection prevention
};

const validateLocation = (location: any): boolean => {
  if (typeof location === 'string') {
    return isValidLocationString(location);
  }
  if (location && typeof location === 'object' && 'lat' in location && 'lng' in location) {
    return isValidCoordinate(location.lat, location.lng);
  }
  return false;
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
      console.error('[Config Error] Google Maps API key not configured');
      throw new Error('Location service unavailable');
    }

    // Validate locations
    if (!startLocation || !endLocation) {
      throw new Error('Start and end locations are required');
    }

    if (!validateLocation(startLocation) || !validateLocation(endLocation)) {
      console.error('[Validation Error] Invalid location format provided');
      throw new Error('Invalid location format');
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
    console.error('[Error] calculate-driving-distance:', error);
    
    // Map errors to generic client messages
    let clientMessage = 'An error occurred while calculating distance';
    if (error instanceof Error) {
      if (error.message.includes('Location service unavailable') || 
          error.message.includes('Invalid location format') ||
          error.message.includes('Start and end locations are required')) {
        clientMessage = error.message;
      }
    }
    
    return new Response(JSON.stringify({ error: clientMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
