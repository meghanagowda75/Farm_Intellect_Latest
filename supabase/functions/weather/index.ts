
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function mapWeatherCode(code: number): {
  main: string;
  description: string;
} {
  if (code === 0) return { main: "Clear", description: "clear sky" };
  if (code <= 3) return { main: "Clouds", description: "partly cloudy" };
  if (code === 45 || code === 48) {
    return { main: "Clouds", description: "fog" };
  }
  if (code >= 51 && code <= 57) {
    return { main: "Drizzle", description: "drizzle" };
  }
  if (
    (code >= 61 && code <= 67) ||
    (code >= 80 && code <= 82)
  ) {
    return { main: "Rain", description: "rain" };
  }
  if (
    (code >= 71 && code <= 77) ||
    (code >= 85 && code <= 86)
  ) {
    return { main: "Snow", description: "snow" };
  }
  if (code >= 95 && code <= 99) {
    return { main: "Thunderstorm", description: "thunderstorm" };
  }
  return { main: "Clear", description: "clear sky" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const jsonHeaders = {
    ...corsHeaders,
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };

  try {
    // Authenticate the request
    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: jsonHeaders },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase environment variables are missing");
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      },
    );

    const token = authHeader.slice("Bearer ".length);
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: jsonHeaders },
      );
    }

    // Read and validate city
    const body = await req.json();
    const city = typeof body.city === "string" ? body.city.trim() : "";

    if (!city) {
      return new Response(
        JSON.stringify({ error: "City is required" }),
        { status: 400, headers: jsonHeaders },
      );
    }

    // Step 1: Geocode the city
    const geoUrl =
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`;

    const geoRes = await fetch(geoUrl);

    if (!geoRes.ok) {
      throw new Error("Failed to fetch geocoding data");
    }

    const geoData = await geoRes.json();
    const place = geoData.results?.[0];

    if (!place) {
      return new Response(
        JSON.stringify({ error: "Location not found" }),
        { status: 404, headers: jsonHeaders },
      );
    }

    const lat = place.latitude;
    const lon = place.longitude;

    // Step 2: Fetch current weather and a 5-day forecast
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      current:
        "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
      daily:
        "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,relative_humidity_2m_mean",
      forecast_days: "5",
      timezone: "auto",
    });

    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
    );

    if (!weatherRes.ok) {
      throw new Error("Failed to fetch weather data");
    }

    const weatherData = await weatherRes.json();
    const current = weatherData.current;
    const daily = weatherData.daily;

    if (!current || !daily?.time) {
      throw new Error("Invalid weather data received");
    }

    // Step 3: Format current weather for the frontend
    const currentCondition = mapWeatherCode(current.weather_code);

    const cur = {
      name: place.name || city,
      sys: {
        country: place.country_code || "",
      },
      main: {
        temp: current.temperature_2m,
        feels_like: current.apparent_temperature,
        humidity: current.relative_humidity_2m,
        pressure: weatherData.current.pressure_msl ?? 0,
      },
      wind: {
        // Open-Meteo returns wind speed in km/h.
        // Convert to m/s for compatibility with the existing frontend.
        speed: current.wind_speed_10m / 3.6,
      },
      visibility: 0,
      weather: [currentCondition],
    };

    // Step 4: Format the 5-day forecast
    const forecastList = [];

    for (let i = 0; i < Math.min(5, daily.time.length); i++) {
      const condition = mapWeatherCode(daily.weather_code[i]);
      const maxTemp = daily.temperature_2m_max[i];
      const minTemp = daily.temperature_2m_min[i];

      forecastList.push({
        dt_txt: `${daily.time[i]} 12:00:00`,
        main: {
          temp: (maxTemp + minTemp) / 2,
          temp_min: minTemp,
          temp_max: maxTemp,
          humidity: daily.relative_humidity_2m_mean?.[i] ?? 0,
        },
        wind: {
          speed: (daily.wind_speed_10m_max?.[i] ?? 0) / 3.6,
        },
        rain: {
          "3h": daily.precipitation_sum?.[i] ?? 0,
        },
        weather: [condition],
      });
    }

    return new Response(
      JSON.stringify({
        current: cur,
        forecast: { list: forecastList },
      }),
      { status: 200, headers: jsonHeaders },
    );
  } catch (e) {
    console.error("Weather function error:", e);

    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      { status: 500, headers: jsonHeaders },
    );
  }
});