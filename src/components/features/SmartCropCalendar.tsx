import { useEffect, useMemo, useState } from "react";
import { apiBaseUrl } from "@/lib/api";

type WeatherCondition = {
  main: string;
  description: string;
  icon: string;
};

type CurrentWeather = {
  name: string;
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    temp_min: number;
    temp_max: number;
  };
  weather: WeatherCondition[];
  wind?: {
    speed: number;
  };
};

type ForecastItem = {
  dt: number;
  dt_txt: string;
  main: {
    temp: number;
    humidity: number;
  };
  weather: WeatherCondition[];
};

type WeatherData = {
  current: CurrentWeather;
  forecast: {
    list: ForecastItem[];
  };
};

type CropPlan = {
  crop: string;
  season: string;
  sowing: string;
  duration: string;
  advice: string;
};

const DEFAULT_CITY = "Chik Ballapur";

const cropPlans: CropPlan[] = [
  {
    crop: "Ragi",
    season: "Kharif",
    sowing: "June – August",
    duration: "100–120 days",
    advice: "Check soil moisture before sowing and avoid waterlogging.",
  },
  {
    crop: "Maize",
    season: "Kharif",
    sowing: "June – July",
    duration: "90–120 days",
    advice: "Ensure proper drainage and monitor rainfall during early growth.",
  },
  {
    crop: "Groundnut",
    season: "Kharif",
    sowing: "June – July",
    duration: "100–120 days",
    advice: "Use well-drained soil and avoid excessive irrigation.",
  },
  {
    crop: "Paddy",
    season: "Kharif",
    sowing: "June – August",
    duration: "120–150 days",
    advice: "Maintain suitable field water levels and monitor heavy rainfall.",
  },
  {
    crop: "Ragi",
    season: "Rabi",
    sowing: "September – October",
    duration: "100–120 days",
    advice: "Check soil moisture and plan irrigation during dry periods.",
  },
  {
    crop: "Maize",
    season: "Rabi",
    sowing: "October – November",
    duration: "90–120 days",
    advice: "Plan irrigation based on soil moisture and crop growth.",
  },
  {
    crop: "Groundnut",
    season: "Summer",
    sowing: "January – February",
    duration: "100–120 days",
    advice: "Provide timely irrigation and protect seedlings from heat stress.",
  },
  {
    crop: "Vegetables",
    season: "All seasons",
    sowing: "Depends on variety",
    duration: "45–120 days",
    advice: "Choose varieties suitable for the local climate and season.",
  },
];

const seasons = ["All", "Kharif", "Rabi", "Summer", "All seasons"];

const formatTemperature = (value: number) => `${Math.round(value)}°C`;

const formatDate = (value: string) => {
  const datePart = value.split(" ")[0];
  const [year, month, day] = datePart.split("-").map(Number);

  if (!year || !month || !day) return value;

  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
};

const getWeatherEndpoint = (city: string) => {
  const baseUrl = apiBaseUrl.replace(/\/+$/, "");

  const endpoint = baseUrl.endsWith("/api")
    ? `${baseUrl}/weather`
    : `${baseUrl}/api/weather`;

  const query = new URLSearchParams({
    city,
    _: String(Date.now()),
  });

  return `${endpoint}?${query.toString()}`;
};

export function SmartCropCalendar() {
  const [searchCity, setSearchCity] = useState(DEFAULT_CITY);
  const [requestedCity, setRequestedCity] = useState(DEFAULT_CITY);
  const [selectedSeason, setSelectedSeason] = useState("All");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const city = requestedCity.trim();

    if (!city) {
      setWeather(null);
      setWeatherError("Please enter a city name.");
      setWeatherLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const loadWeather = async () => {
      setWeatherLoading(true);
      setWeatherError("");

      try {
        const response = await fetch(getWeatherEndpoint(city), {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          let message = `Could not fetch weather for ${city}.`;

          try {
            const errorData = await response.json();
            message =
              errorData?.details?.message ||
              errorData?.error ||
              message;
          } catch {
            // Keep the default error message.
          }

          throw new Error(message);
        }

        const data: WeatherData = await response.json();

        if (
          !data?.current?.name ||
          !data.current.main ||
          !Array.isArray(data.current.weather) ||
          !Array.isArray(data?.forecast?.list)
        ) {
          throw new Error("The weather API returned an unexpected response.");
        }

        if (cancelled) return;

        setWeather(data);
        setWeatherError("");
      } catch (error) {
        if (cancelled || controller.signal.aborted) return;

        console.error("Weather fetch failed:", error);
        setWeather(null);
        setWeatherError(
          error instanceof Error
            ? error.message
            : "Unable to fetch weather data."
        );
      } finally {
        if (!cancelled) {
          setWeatherLoading(false);
        }
      }
    };

    void loadWeather();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [requestedCity, refreshKey]);

  const refreshWeather = () => {
    const city = searchCity.trim();

    if (!city) {
      setWeather(null);
      setWeatherError("Please enter a city name.");
      return;
    }

    setWeatherError("");
    setWeather(null);
    setRequestedCity(city);
    setWeatherLoading(true);
    setRefreshKey((previous) => previous + 1);
  };

  const filteredPlans = useMemo(() => {
    if (selectedSeason === "All") return cropPlans;

    return cropPlans.filter((plan) => plan.season === selectedSeason);
  }, [selectedSeason]);

  const dailyForecast = useMemo(() => {
    if (!weather?.forecast?.list) return [];

    const byDate = new Map<string, ForecastItem>();

    for (const item of weather.forecast.list) {
      const date = item.dt_txt?.split(" ")[0];

      if (date && !byDate.has(date)) {
        byDate.set(date, item);
      }
    }

    return Array.from(byDate.values()).slice(0, 5);
  }, [weather]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-bold">Smart Crop Calendar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Plan crop activities using seasonal guidance and current weather.
        </p>
      </header>

      <section className="rounded-xl border p-4">
        <label
          htmlFor="crop-location"
          className="mb-2 block text-sm font-medium"
        >
          Farming location
        </label>

        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            refreshWeather();
          }}
        >
          <input
            id="crop-location"
            type="text"
            value={searchCity}
            onChange={(event) => setSearchCity(event.target.value)}
            placeholder="Enter city name"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
          />

          <button
            type="submit"
            disabled={weatherLoading}
            className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {weatherLoading ? "Loading..." : "Refresh weather"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Live Weather</h2>
            <p className="text-sm text-muted-foreground">
              {weather?.current?.name || requestedCity}
            </p>
          </div>

          {weather?.current?.weather?.[0] && (
            <span className="rounded-full bg-muted px-3 py-1 text-sm capitalize">
              {weather.current.weather[0].description}
            </span>
          )}
        </div>

        {weatherLoading && (
          <p className="py-4 text-sm text-muted-foreground">
            Fetching weather for {requestedCity}...
          </p>
        )}

        {!weatherLoading && weatherError && (
          <div className="rounded-lg border border-destructive/40 p-4">
            <p className="font-medium">Could not fetch weather</p>
            <p className="mt-1 break-words text-sm text-muted-foreground">
              {weatherError}
            </p>

            <button
              type="button"
              onClick={refreshWeather}
              className="mt-3 rounded-lg border px-3 py-2 text-sm"
            >
              Try again
            </button>
          </div>
        )}

        {!weatherLoading && !weatherError && weather && (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm text-muted-foreground">Temperature</p>
                <p className="mt-1 text-2xl font-semibold">
                  {formatTemperature(weather.current.main.temp)}
                </p>
              </div>

              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm text-muted-foreground">Feels like</p>
                <p className="mt-1 text-2xl font-semibold">
                  {formatTemperature(weather.current.main.feels_like)}
                </p>
              </div>

              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm text-muted-foreground">Humidity</p>
                <p className="mt-1 text-2xl font-semibold">
                  {weather.current.main.humidity}%
                </p>
              </div>

              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm text-muted-foreground">Wind speed</p>
                <p className="mt-1 text-2xl font-semibold">
                  {weather.current.wind?.speed ?? "—"}
                  {weather.current.wind ? " m/s" : ""}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="mb-2 font-medium">Five-day forecast</h3>

              {dailyForecast.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {dailyForecast.map((item) => (
                    <article
                      key={item.dt}
                      className="rounded-lg border p-3"
                    >
                      <p className="text-sm font-medium">
                        {formatDate(item.dt_txt)}
                      </p>

                      <p className="mt-2 text-xl font-semibold">
                        {formatTemperature(item.main.temp)}
                      </p>

                      <p className="text-sm capitalize text-muted-foreground">
                        {item.weather?.[0]?.description || "Unavailable"}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        Humidity: {item.main.humidity}%
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Forecast information is unavailable.
                </p>
              )}
            </div>
          </>
        )}
      </section>

      <section className="rounded-xl border p-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Crop Planning Calendar</h2>
          <p className="text-sm text-muted-foreground">
            General sowing windows. Confirm dates with local agricultural guidance.
          </p>
        </div>

        <label
          htmlFor="crop-season"
          className="mb-2 block text-sm font-medium"
        >
          Filter by season
        </label>

        <select
          id="crop-season"
          value={selectedSeason}
          onChange={(event) => setSelectedSeason(event.target.value)}
          className="mb-4 w-full rounded-lg border bg-background px-3 py-2 sm:max-w-xs"
        >
          {seasons.map((season) => (
            <option key={season} value={season}>
              {season}
            </option>
          ))}
        </select>

        {filteredPlans.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredPlans.map((plan) => (
              <article
                key={`${plan.crop}-${plan.season}`}
                className="rounded-lg border p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold">{plan.crop}</h3>
                  <span className="rounded-full bg-muted px-2 py-1 text-xs">
                    {plan.season}
                  </span>
                </div>

                <dl className="mt-3 space-y-2 text-sm">
                  <div>
                    <dt className="inline text-muted-foreground">
                      Sowing window:{" "}
                    </dt>
                    <dd className="inline">{plan.sowing}</dd>
                  </div>

                  <div>
                    <dt className="inline text-muted-foreground">
                      Duration:{" "}
                    </dt>
                    <dd className="inline">{plan.duration}</dd>
                  </div>
                </dl>

                <p className="mt-3 text-sm text-muted-foreground">
                  {plan.advice}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No crop plans found for this season.
          </p>
        )}
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="text-lg font-semibold">Additional Field Data</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          NDVI, soil pH, and soil organic carbon are not displayed because
          this component does not currently fetch those measurements.
          Connect validated field or satellite data before using them for
          crop decisions.
        </p>
      </section>
    </div>
  );
}

export default SmartCropCalendar;