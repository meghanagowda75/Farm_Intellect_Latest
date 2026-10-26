import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Wind,
  Droplets,
  TrendingUp,
  RefreshCw,
  MapPin,
  Eye,
  Loader2,
  Brain,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { LocationSelector } from "@/components/ui/location-selector";
import { supabase } from "@/integrations/supabase/client";
import { apiFetch } from "@/lib/api";

type MarketPrice = {
  crop: string;
  market: string;
  minPrice?: number | null;
  maxPrice?: number | null;
  modalPrice?: number | null;
  unit?: string;
  date?: string;
  source?: string;
  region?: string | null;
  trend?: string | null;
};

type MarketResponse = {
  prices: MarketPrice[];
  source?: string;
  message?: string;
};

type ForecastPoint = {
  day: number;
  price: number;
};

type CropPrediction = {
  crop: string;
  days: number;
  currency: string;
  unit: string;
  estimateOnly: boolean;
  forecast: ForecastPoint[];
  factors: string[];
  trend: "Rising" | "Falling" | "Stable";
  recommendation: string;
};

type BatchPredictionResponse = {
  predictions: CropPrediction[];
  requestedCount?: number;
  returnedCount?: number;
  estimateOnly: boolean;
  source: string;
  message: string;
  error?: string;
};

const SUPPORTED_CROPS = [
  "wheat",
  "rice",
  "maize",
  "soybean",
  "onion",
  "cotton",
  "tomato",
];

const FORECAST_PERIODS = [7, 15, 30, 60, 90];

const dayName = (dt: number, idx: number) => {
  if (idx === 0) return "Today";

  return new Date(dt * 1000).toLocaleDateString("en-IN", {
    weekday: "short",
  });
};

const formatPrice = (value?: number | null) => {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return null;
  }

  return Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
};

const formatRecordDate = (value?: string) => {
  if (!value) return "Date not provided";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCropName = (crop: string) =>
  crop.charAt(0).toUpperCase() + crop.slice(1);

export const WeatherMarketAPI = () => {
  const { toast } = useToast();
  const { user } = useCurrentUser();

  const [weather, setWeather] = useState<any>(null);
  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>([]);
  const [marketMessage, setMarketMessage] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const [selectedCrops, setSelectedCrops] = useState<string[]>([
    "wheat",
    "rice",
    "maize",
  ]);
  const [forecastDays, setForecastDays] = useState<number>(7);
  const [predictions, setPredictions] = useState<CropPrediction[]>([]);
  const [predictionMessage, setPredictionMessage] = useState("");

  const fetchWeather = useCallback(async () => {
    if (!location.trim()) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("weather", {
        body: { city: location },
      });

      if (error || !data?.current || !data?.forecast?.list) {
        throw new Error("Could not fetch weather for this location.");
      }

      const cur = data.current;
      const fore = data.forecast;
      const dailyMap = new Map<string, any>();

      for (const item of fore.list) {
        const date = item.dt_txt.split(" ")[0];
        const hour = parseInt(item.dt_txt.split(" ")[1].split(":")[0], 10);

        if (
          !dailyMap.has(date) ||
          Math.abs(hour - 12) <
            Math.abs(
              parseInt(
                dailyMap.get(date).dt_txt.split(" ")[1].split(":")[0],
                10
              ) - 12
            )
        ) {
          dailyMap.set(date, item);
        }
      }

      const dailyForecasts = Array.from(dailyMap.values()).slice(0, 5);

      setWeather({
        location: `${cur.name}, ${cur.sys.country}`,
        temperature: Math.round(cur.main.temp),
        feelsLike: Math.round(cur.main.feels_like),
        condition: cur.weather?.[0]?.main || "Unknown",
        description: cur.weather?.[0]?.description || "Unknown",
        humidity: cur.main.humidity,
        windSpeed: Math.round((cur.wind?.speed || 0) * 3.6),
        visibility: cur.visibility
          ? (cur.visibility / 1000).toFixed(1)
          : "N/A",
        forecast: dailyForecasts.map((item: any, idx: number) => ({
          day: dayName(item.dt, idx),
          temp: `${Math.round(item.main.temp)}°C`,
          condition: item.weather?.[0]?.main || "Unknown",
          description: item.weather?.[0]?.description || "Unknown",
          humidity: item.main.humidity,
        })),
      });
    } catch (err: any) {
      toast({
        title: "Weather Error",
        description: err.message || "Could not fetch weather data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [location, toast]);

  const fetchMarketPrices = useCallback(async () => {
    if (!location.trim()) return;

    setPricesLoading(true);
    setMarketMessage("");

    try {
      const parts = location
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);

      const district = parts[0] || "";
      const state = parts.length > 1 ? parts[parts.length - 1] : "";

      const params = new URLSearchParams();

      if (district) params.set("district", district);
      if (state) params.set("state", state);

      const data = await apiFetch<MarketResponse>(
        `/api/market/prices?${params.toString()}`
      );

      const validPrices = Array.isArray(data?.prices)
        ? data.prices.filter(
            (item) =>
              item &&
              typeof item.crop === "string" &&
              typeof item.market === "string" &&
              formatPrice(item.modalPrice) !== null
          )
        : [];

      setMarketPrices(validPrices);
      setMarketMessage(
        data?.message ||
          (validPrices.length === 0
            ? "No mandi price records are available for this location."
            : "Prices are from stored mandi records. Check each record date.")
      );
    } catch (err: any) {
      console.error("Market prices error:", err);
      setMarketPrices([]);
      setMarketMessage(
        err?.status === 401
          ? "Please sign in again to view market prices."
          : "Market prices are temporarily unavailable. Please try again later."
      );
    } finally {
      setPricesLoading(false);
    }
  }, [location]);

  const predictMarketPrices = useCallback(async () => {
    if (selectedCrops.length === 0) {
      toast({
        title: "Select a crop",
        description: "Choose at least one crop to generate a prediction.",
        variant: "destructive",
      });
      return;
    }

    setPredictionLoading(true);
    setPredictionMessage("");
    setPredictions([]);

    try {
      const data = await apiFetch<BatchPredictionResponse>(
        "/api/ai/predict-market-prices-batch",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            crops: selectedCrops,
            days: forecastDays,
            location: location || "India",
          }),
        }
      );

      if (!Array.isArray(data?.predictions) || data.predictions.length === 0) {
        throw new Error(
          data?.message || "Gemini did not return any price predictions."
        );
      }

      setPredictions(data.predictions);
      setPredictionMessage(
        data.message ||
          "These are AI-generated estimates, not verified live mandi prices."
      );

      toast({
        title: "AI Prediction Complete",
        description: "Gemini generated the selected crop price estimates.",
      });
    } catch (err: any) {
      console.error("Gemini market prediction error:", err);

      const message =
        err?.status === 401
          ? "Please sign in again before requesting an AI prediction."
          : err?.message ||
            "Could not generate market predictions. Check the backend and Gemini API configuration.";

      setPredictionMessage(message);

      toast({
        title: "Prediction Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setPredictionLoading(false);
    }
  }, [selectedCrops, forecastDays, location, toast]);

  const toggleCrop = (crop: string) => {
    setSelectedCrops((current) => {
      if (current.includes(crop)) {
        return current.filter((item) => item !== crop);
      }

      if (current.length >= 7) {
        toast({
          title: "Maximum crops selected",
          description: "Select up to 7 crops for one prediction request.",
          variant: "destructive",
        });
        return current;
      }

      return [...current, crop];
    });
  };

  useEffect(() => {
    if (user?.location && !initialized) {
      setLocation(user.location);
      setInitialized(true);
    } else if (!initialized && !user?.location) {
      setLocation("Chandigarh, Punjab");
      setInitialized(true);
    }
  }, [user?.location, initialized]);

  useEffect(() => {
    if (location && initialized) {
      fetchWeather();
      fetchMarketPrices();
    }
  }, [location, initialized, fetchWeather, fetchMarketPrices]);

  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case "sun":
      case "sunny":
      case "clear":
        return <Sun className="h-8 w-8 text-yellow-500" />;

      case "rain":
      case "rainy":
      case "drizzle":
        return <CloudRain className="h-8 w-8 text-blue-500" />;

      case "snow":
        return <CloudSnow className="h-8 w-8 text-cyan-400" />;

      case "thunderstorm":
        return <CloudLightning className="h-8 w-8 text-purple-500" />;

      default:
        return <Cloud className="h-8 w-8 text-gray-500" />;
    }
  };

  const refreshData = async () => {
    const results = await Promise.allSettled([
      fetchWeather(),
      fetchMarketPrices(),
    ]);

    if (results.every((result) => result.status === "fulfilled")) {
      toast({
        title: "Refresh Complete",
        description:
          "Weather and market data refresh requests have finished. Check the market status below.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Weather & Market Data
            </div>

            <Button
              onClick={refreshData}
              variant="outline"
              size="sm"
              disabled={loading || pricesLoading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex-1">
              <LocationSelector
                value={location}
                onChange={setLocation}
                placeholder="Search your city..."
              />
            </div>

            <Button onClick={fetchWeather} disabled={loading}>
              {loading ? "Loading..." : "Update"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {weather && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Current Weather - {weather.location}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-muted/50 p-4 text-center">
                <div className="text-3xl font-bold">
                  {weather.temperature}°C
                </div>
                <div className="text-xs capitalize text-muted-foreground">
                  {weather.description}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Feels like {weather.feelsLike}°C
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-4 text-center">
                <Droplets className="mx-auto mb-1 h-5 w-5" />
                <div className="text-2xl font-bold">{weather.humidity}%</div>
                <div className="text-sm text-muted-foreground">Humidity</div>
              </div>

              <div className="rounded-lg bg-muted/50 p-4 text-center">
                <Wind className="mx-auto mb-1 h-5 w-5" />
                <div className="text-2xl font-bold">
                  {weather.windSpeed} km/h
                </div>
                <div className="text-sm text-muted-foreground">Wind Speed</div>
              </div>

              <div className="rounded-lg bg-muted/50 p-4 text-center">
                <Eye className="mx-auto mb-1 h-5 w-5" />
                <div className="text-2xl font-bold">
                  {weather.visibility} km
                </div>
                <div className="text-sm text-muted-foreground">Visibility</div>
              </div>
            </div>

            <div>
              <h4 className="mb-3 font-semibold">5-Day Forecast</h4>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {weather.forecast.map((day: any, index: number) => (
                  <div
                    key={`${day.day}-${index}`}
                    className="rounded-lg bg-muted/50 p-3 text-center"
                  >
                    <div className="text-sm font-medium">{day.day}</div>
                    <div className="my-2 flex justify-center">
                      {getWeatherIcon(day.condition)}
                    </div>
                    <div className="text-sm">{day.temp}</div>
                    <div className="text-xs text-muted-foreground">
                      {day.condition}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Mandi Market Prices
            {pricesLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            {marketPrices.map((item, index) => {
              const modalPrice = formatPrice(item.modalPrice);
              const minPrice = formatPrice(item.minPrice);
              const maxPrice = formatPrice(item.maxPrice);

              return (
                <div
                  key={`${item.crop}-${item.market}-${item.date || index}`}
                  className="flex flex-col gap-3 rounded-lg bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="font-semibold">{item.crop}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.market}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Recorded: {formatRecordDate(item.date)}
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-lg font-bold">₹{modalPrice}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.unit || "Unit not specified"}
                    </div>
                  </div>

                  {(minPrice !== null || maxPrice !== null) && (
                    <div className="text-left text-sm sm:text-right">
                      {minPrice !== null && (
                        <div className="text-muted-foreground">
                          Min: ₹{minPrice}
                        </div>
                      )}
                      {maxPrice !== null && (
                        <div className="text-muted-foreground">
                          Max: ₹{maxPrice}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {pricesLoading && marketPrices.length === 0 && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading market records...
              </div>
            )}

            {!pricesLoading && marketPrices.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {marketMessage || "No mandi price records are available."}
              </p>
            )}
          </div>

          <div className="mt-4 rounded-lg bg-muted/50 p-3">
            <p className="text-sm text-muted-foreground">
              Market prices are displayed from stored mandi records when
              available. Check the recorded date and source before making
              selling decisions. Prices are not guaranteed to be live.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Gemini AI Market Price Prediction
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Generate approximate price forecasts for selected crops using your
            existing backend Gemini integration.
          </p>
        </CardHeader>

        <CardContent className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Select crops (up to 7)
            </label>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SUPPORTED_CROPS.map((crop) => {
                const selected = selectedCrops.includes(crop);

                return (
                  <Button
                    key={crop}
                    type="button"
                    variant={selected ? "default" : "outline"}
                    className="justify-start capitalize"
                    onClick={() => toggleCrop(crop)}
                    aria-pressed={selected}
                  >
                    {selected ? "✓ " : ""}
                    {formatCropName(crop)}
                  </Button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="market-forecast-days"
              className="mb-2 block text-sm font-medium"
            >
              Forecast period
            </label>

            <select
              id="market-forecast-days"
              value={forecastDays}
              onChange={(event) =>
                setForecastDays(Number(event.target.value))
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {FORECAST_PERIODS.map((days) => (
                <option key={days} value={days}>
                  {days} days
                </option>
              ))}
            </select>
          </div>

          <Button
            onClick={predictMarketPrices}
            disabled={predictionLoading || selectedCrops.length === 0}
            className="w-full sm:w-auto"
          >
            {predictionLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating predictions...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Predict with Gemini AI
              </>
            )}
          </Button>

          {predictionMessage && (
            <p className="text-sm text-muted-foreground">
              {predictionMessage}
            </p>
          )}

          {predictionLoading && (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Gemini is generating illustrative price estimates. This may take
              a little time.
            </div>
          )}

          {predictions.map((prediction) => (
            <div
              key={`${prediction.crop}-${prediction.days}`}
              className="space-y-4 rounded-lg border p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold capitalize">
                    {formatCropName(prediction.crop)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {prediction.days}-day forecast · ₹ per quintal
                  </p>
                </div>

                <span className="w-fit rounded-full bg-muted px-3 py-1 text-xs font-medium">
                  AI estimate only
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4" />
                <span>
                  Trend: <strong>{prediction.trend}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                {prediction.forecast.map((point) => (
                  <div
                    key={`${prediction.crop}-${point.day}`}
                    className="rounded-md bg-muted/50 p-3"
                  >
                    <div className="text-xs text-muted-foreground">
                      Day {point.day}
                    </div>
                    <div className="mt-1 font-semibold">
                      ₹{formatPrice(point.price)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      per quintal
                    </div>
                  </div>
                ))}
              </div>

              {prediction.factors.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-semibold">
                    Possible influencing factors
                  </h4>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {prediction.factors.map((factor, index) => (
                      <li key={`${prediction.crop}-factor-${index}`}>
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {prediction.recommendation && (
                <div className="rounded-md bg-muted/50 p-3">
                  <h4 className="mb-1 text-sm font-semibold">
                    General guidance
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {prediction.recommendation}
                  </p>
                </div>
              )}
            </div>
          ))}

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="text-sm text-muted-foreground">
              These forecasts are generated by Gemini and are not verified live
              mandi prices or guaranteed future prices. Compare them with
              recent official mandi records and local market quotations before
              deciding when to sell. AI estimates can be inaccurate.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};