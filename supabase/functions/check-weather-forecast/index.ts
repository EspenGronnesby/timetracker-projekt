import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeatherData {
  temperature: number;
  precipitation: number;
  windSpeed: number;
  weatherType: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[Weather Check] Starting weather forecast check');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch all users with weather notifications enabled
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, name, show_weather_notifications, weather_location')
      .eq('show_weather_widget', true)
      .eq('show_weather_notifications', true);

    if (profilesError) {
      console.error('[Weather Check] Error fetching profiles:', profilesError);
      throw profilesError;
    }

    if (!profiles || profiles.length === 0) {
      console.log('[Weather Check] No users with weather notifications enabled');
      return new Response(
        JSON.stringify({ message: 'No users to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Weather Check] Checking weather for ${profiles.length} users`);

    // Default location: Oslo, Norway
    const lat = 59.9139;
    const lon = 10.7522;

    // Fetch weather data from met.no
    const weatherUrl = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`;
    const weatherResponse = await fetch(weatherUrl, {
      headers: {
        'User-Agent': 'TimeTrackerApp/1.0',
      },
    });

    if (!weatherResponse.ok) {
      console.error('[Weather Check] Failed to fetch weather data');
      throw new Error('Failed to fetch weather data');
    }

    const weatherData = await weatherResponse.json();
    const timeseries = weatherData.properties.timeseries;

    if (!timeseries || timeseries.length === 0) {
      throw new Error('No weather data available');
    }

    // Find tomorrow's weather (approximately 24 hours ahead)
    const tomorrowIndex = timeseries.findIndex((entry: any) => {
      const entryTime = new Date(entry.time);
      const now = new Date();
      const hoursDiff = (entryTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursDiff >= 20 && hoursDiff <= 28;
    });

    const tomorrow = tomorrowIndex >= 0 ? timeseries[tomorrowIndex] : timeseries[Math.min(8, timeseries.length - 1)];
    const instant = tomorrow.data.instant.details;
    const next1h = tomorrow.data.next_1_hours;
    const next6h = tomorrow.data.next_6_hours;

    const weather: WeatherData = {
      temperature: instant.air_temperature || 0,
      precipitation: next1h?.details?.precipitation_amount || next6h?.details?.precipitation_amount || 0,
      windSpeed: instant.wind_speed || 0,
      weatherType: 'normal',
    };

    // Determine weather type and if notification is needed
    let needsNotification = false;
    let notificationTitle = '';
    let notificationMessage = '';

    // Check for bad weather conditions
    if (weather.windSpeed > 10) {
      needsNotification = true;
      weather.weatherType = 'storm';
      notificationTitle = '⛈️ Storm i morgen';
      notificationMessage = 'Det er meldt storm i morgen. Vurder å utsette utendørsarbeid.';
    } else if (weather.temperature < 0 && weather.precipitation > 0.5) {
      needsNotification = true;
      weather.weatherType = 'snow';
      notificationTitle = '❄️ Snø i morgen';
      notificationMessage = 'Det er meldt snø i morgen. Kjør forsiktig!';
    } else if (weather.precipitation > 1) {
      needsNotification = true;
      weather.weatherType = 'rain';
      notificationTitle = '🌧️ Regn i morgen';
      notificationMessage = 'Det er meldt regn i morgen. Husk regnklær!';
    }

    console.log('[Weather Check] Weather conditions:', weather);
    console.log('[Weather Check] Needs notification:', needsNotification);

    if (!needsNotification) {
      console.log('[Weather Check] No bad weather predicted, skipping notifications');
      return new Response(
        JSON.stringify({ message: 'No bad weather predicted' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create notifications for all users with weather alerts enabled
    const tomorrow_date = new Date();
    tomorrow_date.setDate(tomorrow_date.getDate() + 1);
    const tomorrowDateStr = tomorrow_date.toISOString().split('T')[0];

    let notificationsCreated = 0;
    let weatherRecordsCreated = 0;

    for (const profile of profiles) {
      // Check if we already created a notification for this user today
      const { data: existing, error: existingError } = await supabaseClient
        .from('weather_notifications')
        .select('id')
        .eq('user_id', profile.id)
        .eq('date', tomorrowDateStr)
        .eq('weather_type', weather.weatherType)
        .maybeSingle();

      if (existingError) {
        console.error('[Weather Check] Error checking existing notification:', existingError);
        continue;
      }

      if (existing) {
        console.log(`[Weather Check] Notification already exists for user ${profile.id}`);
        continue;
      }

      // Create weather record
      const { error: weatherError } = await supabaseClient
        .from('weather_notifications')
        .insert({
          user_id: profile.id,
          date: tomorrowDateStr,
          weather_type: weather.weatherType,
          temperature: weather.temperature,
          precipitation: weather.precipitation,
          wind_speed: weather.windSpeed,
          notified: true,
        });

      if (weatherError) {
        console.error('[Weather Check] Error creating weather record:', weatherError);
        continue;
      }

      weatherRecordsCreated++;

      // Create notification
      const { error: notificationError } = await supabaseClient
        .from('notifications')
        .insert({
          user_id: profile.id,
          title: notificationTitle,
          message: notificationMessage,
          type: 'weather_alert',
          metadata: {
            weather_type: weather.weatherType,
            temperature: weather.temperature,
            precipitation: weather.precipitation,
            wind_speed: weather.windSpeed,
          },
        });

      if (notificationError) {
        console.error('[Weather Check] Error creating notification:', notificationError);
        continue;
      }

      notificationsCreated++;
      console.log(`[Weather Check] Created notification for user ${profile.id} (${profile.name})`);
    }

    console.log(`[Weather Check] Created ${notificationsCreated} notifications and ${weatherRecordsCreated} weather records`);

    return new Response(
      JSON.stringify({
        success: true,
        notificationsCreated,
        weatherRecordsCreated,
        weatherType: weather.weatherType,
        message: notificationMessage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Weather Check Error]', error instanceof Error ? error.message : 'Unknown error');
    return new Response(
      JSON.stringify({ error: 'Failed to check weather forecast' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
