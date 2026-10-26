import React, { useState, useCallback } from "react";
import {
  Droplets,
  Sprout,
  CloudRain,
  Sun,
  Wind,
  Thermometer,
  Calendar,
  MapPin,
  AlertCircle,
  CheckCircle,
  Calculator,
  Clock,
  Leaf,
  Gauge,
  RefreshCw,
  Loader2,
  Cloud,
  CloudSun,
  CloudDrizzle,
  Info,
  ChevronDown,
  ChevronUp,
  Droplet,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────

type CropType = "wheat" | "rice" | "corn" | "vegetables" | "fruits";
type SoilType = "sandy" | "loamy" | "clay";
type GrowthStage = "initial" | "development" | "mid" | "late";

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  et0: number;
  description: string;
  icon: string;
  date: string;
}

interface IrrigationRecommendation {
  waterRequirement: number;
  irrigationDuration: number;
  frequency: number;
  nextIrrigation: string;
  waterSavings: number;
  efficiency: number;
  explanation: string[];
}

interface WeatherForecastDay {
  date: string;
  temperatureMax: number;
  temperatureMin: number;
  precipitation: number;
  et0: number;
  windSpeed: number;
  humidity: number;
}

interface LocationCoordinates {
  latitude: number;
  longitude: number;
  name: string;
}

// ─── Crop and Soil Constants ──────────────────────────────────────────────

const CROP_COEFFICIENTS: Record<CropType, Record<GrowthStage, number>> = {
  wheat: { initial: 0.3, development: 0.7, mid: 1.15, late: 0.4 },
  rice: { initial: 1.05, development: 1.1, mid: 1.2, late: 0.9 },
  corn: { initial: 0.3, development: 0.8, mid: 1.2, late: 0.6 },
  vegetables: { initial: 0.6, development: 0.9, mid: 1.05, late: 0.85 },
  fruits: { initial: 0.45, development: 0.7, mid: 0.95, late: 0.75 },
};

const SOIL_FACTORS: Record<SoilType, number> = {
  sandy: 0.7,
  loamy: 1,
  clay: 1.2,
};

const SOIL_WATER_HOLDING: Record<SoilType, number> = {
  sandy: 60,
  loamy: 140,
  clay: 180,
};

const CROP_NAMES: Record<CropType, string> = {
  wheat: "Wheat",
  rice: "Rice",
  corn: "Corn",
  vegetables: "Vegetables",
  fruits: "Fruit trees",
};

const SOIL_NAMES: Record<SoilType, string> = {
  sandy: "Sandy",
  loamy: "Loamy",
  clay: "Clay",
};

const STAGE_NAMES: Record<GrowthStage, string> = {
  initial: "Initial growth",
  development: "Development",
  mid: "Mid-season",
  late: "Late-season",
};

// ─── Theme-Aware Classes ───────────────────────────────────────────────────

const cardClass =
  "rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors sm:p-6";

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-sm placeholder:text-muted-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50";

const selectClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30";

const labelClass =
  "mb-2 block text-sm font-medium text-foreground";

const headingClass = "font-semibold text-foreground";

const mutedClass = "text-sm text-muted-foreground";

const optionClass = "bg-background text-foreground";

const subCardClass =
  "rounded-xl border border-border bg-background p-4 transition-colors";

const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60";

// ─── Weather Utilities ─────────────────────────────────────────────────────

function getWeatherDescription(code: number): string {
  if (code === 0) return "Clear sky";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code <= 48) return "Foggy";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain showers";
  if (code <= 86) return "Snow showers";
  if (code <= 99) return "Thunderstorms";
  return "Unknown conditions";
}

function getWeatherIcon(code: number): string {
  if (code === 0) return "sun";
  if (code <= 2) return "cloud-sun";
  if (code <= 3) return "cloud";
  if (code <= 48) return "cloud";
  if (code <= 67) return "cloud-rain";
  if (code <= 77) return "cloud";
  if (code <= 82) return "cloud-drizzle";
  return "cloud";
}

function formatDate(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getDateAfterDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

// ─── Live Weather API ──────────────────────────────────────────────────────

async function geocodeLocation(
  location: string,
): Promise<LocationCoordinates> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");

  url.searchParams.set("name", location);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error("Unable to search for this location.");
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error(
      `Location "${location}" was not found. Try entering a city name.`,
    );
  }

  const result = data.results[0];

  return {
    latitude: result.latitude,
    longitude: result.longitude,
    name: [result.name, result.admin1, result.country]
      .filter(Boolean)
      .join(", "),
  };
}

async function fetchCurrentWeather(
  latitude: number,
  longitude: number,
): Promise<WeatherData> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");

  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "current",
    [
      "temperature_2m",
      "relative_humidity_2m",
      "precipitation",
      "weather_code",
      "wind_speed_10m",
    ].join(","),
  );
  url.searchParams.set("daily", "et0_fao_evapotranspiration");
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set("timezone", "auto");

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error("Unable to retrieve current weather data.");
  }

  const data = await response.json();

  if (!data.current) {
    throw new Error("Current weather data is unavailable.");
  }

  const current = data.current;

  return {
    temperature: current.temperature_2m ?? 0,
    humidity: current.relative_humidity_2m ?? 0,
    windSpeed: current.wind_speed_10m ?? 0,
    precipitation: current.precipitation ?? 0,
    et0: data.daily?.et0_fao_evapotranspiration?.[0] ?? 0,
    description: getWeatherDescription(current.weather_code ?? 0),
    icon: getWeatherIcon(current.weather_code ?? 0),
    date: current.time?.split("T")[0] ?? getDateAfterDays(0),
  };
}

async function fetchWeatherForecast(
  latitude: number,
  longitude: number,
): Promise<WeatherForecastDay[]> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");

  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "daily",
    [
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
      "et0_fao_evapotranspiration",
      "wind_speed_10m_max",
      "relative_humidity_2m_mean",
    ].join(","),
  );
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("timezone", "auto");

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error("Unable to retrieve the weather forecast.");
  }

  const data = await response.json();

  if (!data.daily?.time) {
    throw new Error("Forecast data is unavailable.");
  }

  return data.daily.time.map((date: string, index: number) => ({
    date,
    temperatureMax: data.daily.temperature_2m_max?.[index] ?? 0,
    temperatureMin: data.daily.temperature_2m_min?.[index] ?? 0,
    precipitation: data.daily.precipitation_sum?.[index] ?? 0,
    et0: data.daily.et0_fao_evapotranspiration?.[index] ?? 0,
    windSpeed: data.daily.wind_speed_10m_max?.[index] ?? 0,
    humidity: data.daily.relative_humidity_2m_mean?.[index] ?? 0,
  }));
}

// ─── Irrigation Formula ────────────────────────────────────────────────────

function calculateRecommendation(
  crop: CropType,
  soil: SoilType,
  stage: GrowthStage,
  fieldSize: number,
  weather: WeatherData,
): IrrigationRecommendation {
  const kc = CROP_COEFFICIENTS[crop][stage];
  const et0 = Math.max(weather.et0, 0);
  const cropEvapotranspiration = et0 * kc;

  const effectiveRainfall = Math.min(
    weather.precipitation * 0.8,
    cropEvapotranspiration,
  );

  const netWaterRequirement = Math.max(
    0,
    cropEvapotranspiration - effectiveRainfall,
  );

  const soilFactor = SOIL_FACTORS[soil];
  const dailyWaterRequirement = netWaterRequirement * soilFactor;
  const waterRequirement = dailyWaterRequirement * fieldSize * 10;

  const soilHolding = SOIL_WATER_HOLDING[soil];

  const estimatedFrequency = Math.max(
    1,
    Math.round(soilHolding / Math.max(dailyWaterRequirement, 1)),
  );

  const frequency =
    soil === "sandy"
      ? Math.min(estimatedFrequency, 3)
      : soil === "clay"
        ? Math.max(estimatedFrequency, 3)
        : estimatedFrequency;

  const irrigationDuration = Math.max(
    0,
    Math.round((waterRequirement / 1000) / 2),
  );

  const efficiency =
    soil === "sandy" ? 75 : soil === "loamy" ? 85 : 90;

  const waterSavings = Math.max(
    0,
    Math.round((1 - efficiency / 100) * waterRequirement),
  );

  const nextIrrigation = new Date();
  nextIrrigation.setDate(nextIrrigation.getDate() + frequency);

  const explanation = [
    `Crop coefficient (Kc): ${kc.toFixed(2)} for ${CROP_NAMES[crop]} during ${STAGE_NAMES[stage]}.`,
    `Reference evapotranspiration (ET₀): ${et0.toFixed(2)} mm/day.`,
    `Estimated crop water use: ${cropEvapotranspiration.toFixed(2)} mm/day.`,
    `Effective rainfall deducted: ${effectiveRainfall.toFixed(2)} mm/day.`,
    `Soil adjustment: ${soilFactor.toFixed(2)} for ${SOIL_NAMES[soil].toLowerCase()} soil.`,
  ];

  return {
    waterRequirement,
    irrigationDuration,
    frequency,
    nextIrrigation: nextIrrigation.toLocaleDateString(),
    waterSavings,
    efficiency,
    explanation,
  };
}

// ─── Reusable Components ───────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string;
  unit?: string;
  icon: React.ReactNode;
  color: string;
  description?: string;
}

function StatCard({
  title,
  value,
  unit,
  icon,
  color,
  description,
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-colors">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{title}</p>
        <div className={`rounded-lg p-2 ${color}`}>{icon}</div>
      </div>

      <div className="flex flex-wrap items-baseline gap-1">
        <span className="text-2xl font-bold text-foreground">{value}</span>
        {unit && (
          <span className="text-sm text-muted-foreground">{unit}</span>
        )}
      </div>

      {description && (
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}

interface WeatherIconProps {
  icon: string;
  size?: number;
}

function WeatherIcon({ icon, size = 24 }: WeatherIconProps) {
  switch (icon) {
    case "sun":
      return <Sun size={size} className="text-amber-500 dark:text-amber-400" />;

    case "cloud-sun":
      return (
        <CloudSun size={size} className="text-amber-500 dark:text-amber-400" />
      );

    case "cloud-rain":
      return <CloudRain size={size} className="text-blue-600 dark:text-blue-400" />;

    case "cloud-drizzle":
      return (
        <CloudDrizzle size={size} className="text-blue-500 dark:text-blue-300" />
      );

    default:
      return <Cloud size={size} className="text-muted-foreground" />;
  }
}

// ─── Main Component ────────────────────────────────────────────────────────

export function SmartIrrigationCalculator() {
  const [cropType, setCropType] = useState<CropType>("wheat");
  const [soilType, setSoilType] = useState<SoilType>("loamy");
  const [currentStage, setCurrentStage] = useState<GrowthStage>("mid");

  const [fieldSize, setFieldSize] = useState("1");
  const [location, setLocation] = useState("");

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<WeatherForecastDay[]>([]);
  const [coordinates, setCoordinates] =
    useState<LocationCoordinates | null>(null);

  const [recommendation, setRecommendation] =
    useState<IrrigationRecommendation | null>(null);

  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<
    "calculator" | "weather" | "schedule"
  >("calculator");

  const [showDetails, setShowDetails] = useState(false);

  const handleInputChange = useCallback((updateInput: () => void) => {
    updateInput();
    setRecommendation(null);
    setError("");
  }, []);

  // ─── Weather Loading ────────────────────────────────────────────────────

  const loadWeather = useCallback(
    async (searchLocation?: string) => {
      const locationToSearch = (searchLocation ?? location).trim();

      if (!locationToSearch) {
        setError("Please enter a city or location.");
        return;
      }

      setIsLoadingWeather(true);
      setError("");
      setRecommendation(null);

      try {
        const geo = await geocodeLocation(locationToSearch);

        const [currentWeather, forecastData] = await Promise.all([
          fetchCurrentWeather(geo.latitude, geo.longitude),
          fetchWeatherForecast(geo.latitude, geo.longitude),
        ]);

        setCoordinates(geo);
        setLocation(geo.name);
        setWeather(currentWeather);
        setForecast(forecastData);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "An unexpected error occurred while loading weather.",
        );
      } finally {
        setIsLoadingWeather(false);
      }
    },
    [location],
  );

  // ─── Validation ─────────────────────────────────────────────────────────

  const validateInputs = (): boolean => {
    const size = Number(fieldSize);

    if (!Number.isFinite(size) || size <= 0) {
      setError("Please enter a valid field size greater than zero.");
      return false;
    }

    if (!weather) {
      setError(
        "Please load weather data for your location before calculating irrigation.",
      );
      return false;
    }

    return true;
  };

  // ─── Calculate Irrigation ────────────────────────────────────────────────

  const calculateIrrigation = () => {
    setError("");

    if (!validateInputs() || !weather) {
      return;
    }

    setIsCalculating(true);
    setRecommendation(null);

    try {
      const result = calculateRecommendation(
        cropType,
        soilType,
        currentStage,
        Number(fieldSize),
        weather,
      );

      setRecommendation(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to calculate irrigation requirements.",
      );
    } finally {
      setIsCalculating(false);
    }
  };

  // ─── Reset ───────────────────────────────────────────────────────────────

  const resetCalculator = () => {
    setCropType("wheat");
    setSoilType("loamy");
    setCurrentStage("mid");
    setFieldSize("1");
    setRecommendation(null);
    setError("");
    setShowDetails(false);
    setLocation("");
    setWeather(null);
    setForecast([]);
    setCoordinates(null);
    setActiveTab("calculator");
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-green-600 p-3 text-white shadow-lg">
                <Droplets size={30} />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Smart Irrigation Calculator
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Weather-informed irrigation planning for your crops
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={resetCalculator}
              className={secondaryButtonClass}
            >
              <RefreshCw size={16} />
              Reset calculator
            </button>
          </div>
        </header>

        {/* Tabs */}
        <nav
          aria-label="Irrigation calculator sections"
          className="mb-8 flex flex-wrap gap-2 rounded-xl border border-border bg-muted/60 p-2 shadow-sm"
        >
          <button
            type="button"
            onClick={() => setActiveTab("calculator")}
            aria-current={activeTab === "calculator" ? "page" : undefined}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeTab === "calculator"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
            }`}
          >
            <Calculator size={17} />
            Calculator
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("weather")}
            aria-current={activeTab === "weather" ? "page" : undefined}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeTab === "weather"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
            }`}
          >
            <CloudSun size={17} />
            Weather
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("schedule")}
            aria-current={activeTab === "schedule" ? "page" : undefined}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeTab === "schedule"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
            }`}
          >
            <Calendar size={17} />
            Irrigation schedule
          </button>
        </nav>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-destructive"
          >
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Calculator Tab */}
        {activeTab === "calculator" && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-1">
              {/* Field Inputs */}
              <section className={cardClass}>
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-lg bg-green-500/10 p-2 text-green-700 dark:text-green-400">
                    <Sprout size={22} />
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      Field information
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Enter your crop and field details
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label htmlFor="cropType" className={labelClass}>
                      Crop type
                    </label>

                    <select
                      id="cropType"
                      value={cropType}
                      onChange={(event) =>
                        handleInputChange(() =>
                          setCropType(event.target.value as CropType),
                        )
                      }
                      className={selectClass}
                    >
                      <option className={optionClass} value="wheat">Wheat</option>
                      <option className={optionClass} value="rice">Rice</option>
                      <option className={optionClass} value="corn">Corn</option>
                      <option className={optionClass} value="vegetables">Vegetables</option>
                      <option className={optionClass} value="fruits">Fruit trees</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="fieldSize" className={labelClass}>
                      Field size (hectares)
                    </label>

                    <input
                      id="fieldSize"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={fieldSize}
                      onChange={(event) =>
                        handleInputChange(() =>
                          setFieldSize(event.target.value),
                        )
                      }
                      placeholder="Enter field size"
                      className={inputClass}
                    />

                    <p className="mt-1 text-xs text-muted-foreground">
                      1 hectare = 10,000 square metres
                    </p>
                  </div>

                  <div>
                    <label htmlFor="soilType" className={labelClass}>
                      Soil type
                    </label>

                    <select
                      id="soilType"
                      value={soilType}
                      onChange={(event) =>
                        handleInputChange(() =>
                          setSoilType(event.target.value as SoilType),
                        )
                      }
                      className={selectClass}
                    >
                      <option className={optionClass} value="sandy">Sandy soil</option>
                      <option className={optionClass} value="loamy">Loamy soil</option>
                      <option className={optionClass} value="clay">Clay soil</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="growthStage" className={labelClass}>
                      Crop growth stage
                    </label>

                    <select
                      id="growthStage"
                      value={currentStage}
                      onChange={(event) =>
                        handleInputChange(() =>
                          setCurrentStage(event.target.value as GrowthStage),
                        )
                      }
                      className={selectClass}
                    >
                      <option className={optionClass} value="initial">Initial growth</option>
                      <option className={optionClass} value="development">Development</option>
                      <option className={optionClass} value="mid">Mid-season</option>
                      <option className={optionClass} value="late">Late-season</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Location and Weather */}
              <section className={cardClass}>
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-lg bg-blue-500/10 p-2 text-blue-700 dark:text-blue-400">
                    <MapPin size={22} />
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      Weather and location
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Use local weather for your calculation
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void loadWeather();
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label htmlFor="location" className={labelClass}>
                      City or location
                    </label>

                    <input
                      id="location"
                      type="text"
                      value={location}
                      onChange={(event) =>
                        handleInputChange(() =>
                          setLocation(event.target.value),
                        )
                      }
                      placeholder="e.g. Bengaluru, India"
                      className={inputClass}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoadingWeather}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-blue-500"
                  >
                    {isLoadingWeather ? (
                      <>
                        <Loader2 size={17} className="animate-spin" />
                        Loading weather...
                      </>
                    ) : (
                      <>
                        <CloudSun size={17} />
                        Load local weather
                      </>
                    )}
                  </button>
                </form>

                {coordinates && weather && (
                  <div className="mt-5 rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <CheckCircle size={18} className="text-green-600 dark:text-green-400" />
                      <p className="text-sm font-semibold text-foreground">
                        {coordinates.name}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <WeatherIcon icon={weather.icon} size={36} />

                      <div>
                        <p className="text-2xl font-bold text-foreground">
                          {weather.temperature.toFixed(1)}°C
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {weather.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {[
                        { label: "Humidity", value: `${weather.humidity}%` },
                        { label: "Wind speed", value: `${weather.windSpeed} km/h` },
                        { label: "Precipitation", value: `${weather.precipitation} mm` },
                        { label: "Reference ET₀", value: `${weather.et0.toFixed(2)} mm/day` },
                      ].map((item) => (
                        <div key={item.label} className={subCardClass}>
                          <p className="text-xs text-muted-foreground">{item.label}</p>
                          <p className="font-semibold text-foreground">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!weather && (
                  <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-200">
                    <Info size={17} className="mt-0.5 shrink-0" />
                    <p className="text-xs">
                      Load weather data before calculating your irrigation
                      recommendation.
                    </p>
                  </div>
                )}
              </section>

              <button
                type="button"
                onClick={calculateIrrigation}
                disabled={isCalculating || isLoadingWeather}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-4 font-semibold text-white shadow-md transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-green-500"
              >
                {isCalculating ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Calculator size={20} />
                    Calculate irrigation
                  </>
                )}
              </button>
            </div>

            {/* Results */}
            <div className="space-y-6 lg:col-span-2">
              {!recommendation ? (
                <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card p-8 text-center transition-colors">
                  <div className="mb-5 rounded-full bg-green-500/10 p-5 text-green-700 dark:text-green-400">
                    <Droplets size={42} />
                  </div>

                  <h2 className="text-xl font-semibold text-foreground">
                    Your irrigation recommendation
                  </h2>

                  <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                    Enter your field details, load current weather, and
                    calculate your irrigation requirements to see your
                    personalized results here.
                  </p>

                  <div className="mt-8 grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-border bg-background p-4">
                      <Sprout size={23} className="mx-auto mb-2 text-green-600 dark:text-green-400" />
                      <p className="text-sm font-medium text-foreground">Crop-specific</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Growth-stage adjustments
                      </p>
                    </div>

                    <div className="rounded-xl border border-border bg-background p-4">
                      <CloudRain size={23} className="mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                      <p className="text-sm font-medium text-foreground">Weather-aware</p>
                      <p className="mt-1 text-xs text-muted-foreground">Rainfall and ET₀</p>
                    </div>

                    <div className="rounded-xl border border-border bg-background p-4">
                      <Gauge size={23} className="mx-auto mb-2 text-purple-600 dark:text-purple-400" />
                      <p className="text-sm font-medium text-foreground">Soil-adjusted</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Soil water characteristics
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-green-500/30 bg-gradient-to-r from-green-700 to-emerald-700 p-6 text-white shadow-lg">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-100">
                          Estimated daily irrigation requirement
                        </p>

                        <div className="mt-2 flex flex-wrap items-baseline gap-2">
                          <span className="text-4xl font-bold">
                            {recommendation.waterRequirement.toLocaleString(
                              undefined,
                              { maximumFractionDigits: 1 },
                            )}
                          </span>
                          <span className="text-lg text-green-100">
                            litres/day
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-green-100">
                          {CROP_NAMES[cropType]} · {fieldSize} hectare(s) ·{" "}
                          {SOIL_NAMES[soilType]} soil
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-white/10 p-4">
                        <Droplets size={32} />
                        <p className="mt-2 text-sm text-green-50">
                          Estimated water demand
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <StatCard
                      title="Irrigation frequency"
                      value={String(recommendation.frequency)}
                      unit="day(s)"
                      icon={<Calendar size={20} />}
                      color="bg-blue-500/10 text-blue-700 dark:text-blue-300"
                      description="Estimated interval between irrigation events"
                    />

                    <StatCard
                      title="Estimated duration"
                      value={String(recommendation.irrigationDuration)}
                      unit="hours"
                      icon={<Clock size={20} />}
                      color="bg-purple-500/10 text-purple-700 dark:text-purple-300"
                      description="Approximate duration at the assumed flow rate"
                    />

                    <StatCard
                      title="Application efficiency"
                      value={String(recommendation.efficiency)}
                      unit="%"
                      icon={<Gauge size={20} />}
                      color="bg-green-500/10 text-green-700 dark:text-green-300"
                      description="Illustrative efficiency based on soil category"
                    />

                    <StatCard
                      title="Potential water loss"
                      value={recommendation.waterSavings.toLocaleString()}
                      unit="litres"
                      icon={<Droplet size={20} />}
                      color="bg-amber-500/10 text-amber-700 dark:text-amber-300"
                      description="Estimated losses at the assumed efficiency"
                    />
                  </div>

                  <section className={cardClass}>
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-green-500/10 p-2 text-green-700 dark:text-green-400">
                          <Calendar size={21} />
                        </div>

                        <div>
                          <h2 className={headingClass}>Next irrigation</h2>
                          <p className={mutedClass}>
                            Based on the estimated interval
                          </p>
                        </div>
                      </div>

                      <p className="text-right text-sm font-semibold text-green-700 dark:text-green-400">
                        {recommendation.nextIrrigation}
                      </p>
                    </div>

                    <div className={subCardClass}>
                      <p className="text-sm leading-6 text-muted-foreground">
                        This is an initial estimate. Check actual soil
                        moisture, crop condition, local weather, and
                        irrigation system output before applying water.
                      </p>
                    </div>
                  </section>

                  <section className={cardClass}>
                    <button
                      type="button"
                      onClick={() => setShowDetails((previous) => !previous)}
                      className="flex w-full items-center justify-between gap-4 text-left"
                      aria-expanded={showDetails}
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-500/10 p-2 text-blue-700 dark:text-blue-400">
                          <Info size={21} />
                        </div>

                        <div>
                          <h2 className={headingClass}>Calculation details</h2>
                          <p className={mutedClass}>
                            Review the values used for this estimate
                          </p>
                        </div>
                      </div>

                      {showDetails ? (
                        <ChevronUp size={20} className="text-muted-foreground" />
                      ) : (
                        <ChevronDown size={20} className="text-muted-foreground" />
                      )}
                    </button>

                    {showDetails && (
                      <div className="mt-5 space-y-3">
                        {recommendation.explanation.map((item, index) => (
                          <div
                            key={`${index}-${item}`}
                            className="flex items-start gap-3 rounded-lg border border-border bg-background p-3"
                          >
                            <CheckCircle
                              size={18}
                              className="mt-0.5 shrink-0 text-green-600 dark:text-green-400"
                            />
                            <p className="text-sm leading-6 text-muted-foreground">
                              {item}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          </div>
        )}

        {/* Weather Tab */}
        {activeTab === "weather" && (
          <div className="space-y-6">
            <section className={cardClass}>
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg bg-blue-500/10 p-2 text-blue-700 dark:text-blue-400">
                  <CloudSun size={24} />
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Local weather
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Current conditions and seven-day forecast
                  </p>
                </div>
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void loadWeather();
                }}
                className="mb-6 flex flex-col gap-3 sm:flex-row"
              >
                <input
                  type="text"
                  value={location}
                  onChange={(event) =>
                    handleInputChange(() => setLocation(event.target.value))
                  }
                  placeholder="Enter a city or location"
                  aria-label="City or location"
                  className={`${inputClass} min-w-0 flex-1 px-4 py-3`}
                />

                <button
                  type="submit"
                  disabled={isLoadingWeather}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-blue-500"
                >
                  {isLoadingWeather ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <RefreshCw size={18} />
                  )}
                  {isLoadingWeather ? "Loading..." : "Refresh weather"}
                </button>
              </form>

              {weather && coordinates ? (
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-6">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin size={16} />
                        {coordinates.name}
                      </p>

                      <p className="mt-3 text-4xl font-bold text-foreground">
                        {weather.temperature.toFixed(1)}°C
                      </p>

                      <p className="mt-1 text-muted-foreground">
                        {weather.description}
                      </p>

                      <p className="mt-2 text-xs text-muted-foreground">
                        Updated from the latest available forecast data
                      </p>
                    </div>

                    <WeatherIcon icon={weather.icon} size={72} />
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                      title="Humidity"
                      value={String(weather.humidity)}
                      unit="%"
                      icon={<Droplets size={20} />}
                      color="bg-blue-500/10 text-blue-700 dark:text-blue-300"
                    />

                    <StatCard
                      title="Wind speed"
                      value={weather.windSpeed.toFixed(1)}
                      unit="km/h"
                      icon={<Wind size={20} />}
                      color="bg-muted text-foreground"
                    />

                    <StatCard
                      title="Precipitation"
                      value={weather.precipitation.toFixed(1)}
                      unit="mm"
                      icon={<CloudRain size={20} />}
                      color="bg-sky-500/10 text-sky-700 dark:text-sky-300"
                    />

                    <StatCard
                      title="Reference ET₀"
                      value={weather.et0.toFixed(2)}
                      unit="mm/day"
                      icon={<Sun size={20} />}
                      color="bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-background p-8 text-center">
                  <CloudSun
                    size={40}
                    className="mx-auto mb-3 text-blue-600 dark:text-blue-400"
                  />

                  <p className="font-medium text-foreground">
                    No weather data loaded
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Enter a location above to retrieve weather data.
                  </p>
                </div>
              )}
            </section>

            {forecast.length > 0 && (
              <section className={cardClass}>
                <h2 className="mb-5 text-lg font-semibold text-foreground">
                  Seven-day forecast
                </h2>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                  {forecast.map((day) => (
                    <div
                      key={day.date}
                      className="rounded-xl border border-border bg-background p-4 transition-colors"
                    >
                      <p className="text-sm font-semibold text-foreground">
                        {formatDate(day.date)}
                      </p>

                      <div className="my-3 flex items-center gap-2">
                        <Thermometer size={19} className="text-amber-500 dark:text-amber-400" />

                        <div>
                          <p className="font-semibold text-foreground">
                            {day.temperatureMax.toFixed(0)}°
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Low {day.temperatureMin.toFixed(0)}°
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs text-muted-foreground">
                        <p className="flex items-center gap-2">
                          <CloudRain size={15} className="shrink-0 text-blue-600 dark:text-blue-400" />
                          {day.precipitation.toFixed(1)} mm rain
                        </p>

                        <p className="flex items-center gap-2">
                          <Sun size={15} className="shrink-0 text-amber-500 dark:text-amber-400" />
                          ET₀ {day.et0.toFixed(1)} mm
                        </p>

                        <p className="flex items-center gap-2">
                          <Wind size={15} className="shrink-0" />
                          {day.windSpeed.toFixed(0)} km/h
                        </p>

                        <p className="flex items-center gap-2">
                          <Droplets size={15} className="shrink-0 text-sky-600 dark:text-sky-400" />
                          {day.humidity.toFixed(0)}% humidity
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Irrigation Schedule Tab */}
        {activeTab === "schedule" && (
          <div className="space-y-6">
            <section className={cardClass}>
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg bg-purple-500/10 p-2 text-purple-700 dark:text-purple-400">
                  <Calendar size={24} />
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Irrigation schedule
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Plan your next irrigation events
                  </p>
                </div>
              </div>

              {!recommendation ? (
                <div className="rounded-xl border border-border bg-background p-8 text-center">
                  <Calendar
                    size={40}
                    className="mx-auto mb-3 text-purple-600 dark:text-purple-400"
                  />

                  <p className="font-medium text-foreground">
                    No irrigation schedule yet
                  </p>

                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                    Open the Calculator tab, load weather, enter your field
                    information, and calculate a recommendation to generate
                    an estimated irrigation schedule.
                  </p>

                  <button
                    type="button"
                    onClick={() => setActiveTab("calculator")}
                    className="mt-5 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 dark:hover:bg-green-500"
                  >
                    Go to calculator
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <StatCard
                      title="Next irrigation"
                      value={recommendation.nextIrrigation}
                      icon={<Calendar size={20} />}
                      color="bg-purple-500/10 text-purple-700 dark:text-purple-300"
                    />

                    <StatCard
                      title="Repeat interval"
                      value={String(recommendation.frequency)}
                      unit="days"
                      icon={<Clock size={20} />}
                      color="bg-blue-500/10 text-blue-700 dark:text-blue-300"
                    />

                    <StatCard
                      title="Daily water estimate"
                      value={recommendation.waterRequirement.toLocaleString(
                        undefined,
                        { maximumFractionDigits: 1 },
                      )}
                      unit="litres"
                      icon={<Droplets size={20} />}
                      color="bg-green-500/10 text-green-700 dark:text-green-300"
                    />
                  </div>

                  <h3 className="mb-4 font-semibold text-foreground">
                    Upcoming irrigation plan
                  </h3>

                  <div className="space-y-3">
                    {Array.from({ length: 5 }, (_, index) => {
                      const irrigationDate = new Date();

                      irrigationDate.setDate(
                        irrigationDate.getDate() +
                          recommendation.frequency * (index + 1),
                      );

                      const dateLabel = irrigationDate.toLocaleDateString(
                        undefined,
                        {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        },
                      );

                      return (
                        <div
                          key={index}
                          className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 transition-colors sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-blue-500/10 p-3 text-blue-700 dark:text-blue-300">
                              <Droplets size={21} />
                            </div>

                            <div>
                              <p className="font-medium text-foreground">
                                Irrigation event {index + 1}
                              </p>

                              <p className="text-sm text-muted-foreground">
                                {dateLabel}
                              </p>
                            </div>
                          </div>

                          <div className="text-left sm:text-right">
                            <p className="font-semibold text-foreground">
                              {recommendation.waterRequirement.toLocaleString(
                                undefined,
                                { maximumFractionDigits: 1 },
                              )}{" "}
                              litres
                            </p>

                            <p className="text-xs text-muted-foreground">
                              Estimated application
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-200">
                    <AlertCircle size={20} className="mt-0.5 shrink-0" />

                    <div>
                      <p className="font-semibold">Important scheduling note</p>

                      <p className="mt-1 text-sm leading-6">
                        This is a planning estimate, not an automated
                        irrigation controller. Check rainfall, soil moisture,
                        crop condition, and the forecast before each event.
                        Skip or adjust irrigation when the field already has
                        sufficient moisture.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-10 border-t border-border pt-6">
          <div className="flex flex-col gap-3 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground sm:justify-start">
              <Leaf size={17} className="text-green-600 dark:text-green-400" />
              <span>Smart Irrigation Calculator</span>
            </div>

            <p className="text-xs leading-5 text-muted-foreground">
              Estimates are for planning purposes. Actual irrigation
              requirements depend on local conditions, crop variety, soil
              moisture, and irrigation system performance.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}