
import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RefreshCw,
  Brain,
  TrendingUp,
  AlertCircle,
  Sprout,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ForecastPoint {
  day: number;
  price: number;
}

interface MandiPrice {
  crop: string;
  market: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  unit: string;
  factors: string[];
  forecast: ForecastPoint[];
  trend: string;
  recommendation: string;
}

interface BatchPredictionResponse {
  predictions?: {
    crop: string;
    forecast: ForecastPoint[];
    factors: string[];
    trend: string;
    recommendation: string;
  }[];
  estimateOnly?: boolean;
  currency?: string;
  unit?: string;
  error?: string;
}

const CROPS = [
  "wheat",
  "rice",
  "maize",
  "soybean",
  "onion",
  "cotton",
];

const CHART_COLORS = [
  "#f97316",
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#9333ea",
  "#0891b2",
];

const formatRupees = (value: number) =>
  `₹${Math.round(value).toLocaleString("en-IN")}`;

const capitalizeCrop = (crop: string) =>
  crop.charAt(0).toUpperCase() + crop.slice(1);

const MerchantMarketPrices = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [prices, setPrices] = useState<MandiPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { toast } = useToast();

  const user = { name: "Merchant User", role: "merchant" };

  const fetchPrices = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await apiFetch<BatchPredictionResponse>(
        "/api/ai/predict-market-prices-batch",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            crops: CROPS,
            days: 7,
          }),
        }
      );

      if (response?.error) {
        throw new Error(response.error);
      }

      if (!Array.isArray(response?.predictions)) {
        throw new Error(
          "The backend returned an invalid forecast response. Check the batch prediction endpoint."
        );
      }

      const results: MandiPrice[] = response.predictions
        .filter(
          (item) =>
            item &&
            CROPS.includes(item.crop?.toLowerCase()) &&
            Array.isArray(item.forecast)
        )
        .map((item) => {
          const forecast = item.forecast
            .map((point) => ({
              day: Number(point.day),
              price: Number(point.price),
            }))
            .filter(
              (point) =>
                Number.isInteger(point.day) &&
                point.day >= 1 &&
                point.day <= 7 &&
                Number.isFinite(point.price) &&
                point.price > 0
            )
            .sort((a, b) => a.day - b.day);

          const values = forecast.map((point) => point.price);

          const average =
            values.length > 0
              ? values.reduce((sum, value) => sum + value, 0) /
                values.length
              : 0;

          return {
            crop: capitalizeCrop(item.crop.toLowerCase()),
            market: "7-day AI estimate",
            minPrice:
              values.length > 0 ? Math.round(Math.min(...values)) : 0,
            maxPrice:
              values.length > 0 ? Math.round(Math.max(...values)) : 0,
            modalPrice: Math.round(average),
            unit: "₹ per quintal",
            factors: Array.isArray(item.factors)
              ? item.factors
                  .filter(
                    (factor): factor is string =>
                      typeof factor === "string"
                  )
                  .slice(0, 3)
              : [],
            forecast,
            trend:
              typeof item.trend === "string" && item.trend.trim()
                ? item.trend
                : "No trend summary was provided.",
            recommendation:
              typeof item.recommendation === "string" &&
              item.recommendation.trim()
                ? item.recommendation
                : "Compare local mandi prices and transport costs before making a selling decision.",
          };
        })
        .filter(
          (item) =>
            item.forecast.length > 0 &&
            item.modalPrice > 0
        );

      if (results.length === 0) {
        throw new Error(
          "Gemini did not return any usable crop forecasts. Please try again."
        );
      }

      setPrices(results);
      setLastUpdated(new Date());

      if (results.length < CROPS.length) {
        const missingCrops = CROPS.filter(
          (crop) =>
            !results.some(
              (item) => item.crop.toLowerCase() === crop
            )
        );

        setErrorMessage(
          `Forecasts loaded for ${results.length} of ${CROPS.length} crops. Missing: ${missingCrops.join(", ")}.`
        );
      }

      toast({
        title: "Market forecasts updated",
        description: `Received AI estimates for ${results.length} crops.`,
      });
    } catch (error) {
      console.error("Market price forecast failed:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Unable to load forecasts. Check the backend connection.";

      setErrorMessage(message);

      toast({
        title: "Unable to load market forecasts",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchPrices();
  }, [fetchPrices]);

  const chartData = Array.from({ length: 7 }, (_, index) => {
    const day = index + 1;

    const point: Record<string, string | number> = {
      day: `Day ${day}`,
    };

    prices.forEach((item) => {
      const forecastPoint = item.forecast.find(
        (forecast) => forecast.day === day
      );

      if (forecastPoint) {
        point[item.crop] = forecastPoint.price;
      }
    });

    return point;
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header
        user={user}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        notificationCount={3}
      />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole={user.role}
      />

      <main className="p-4 sm:p-6 md:ml-64">
        <div className="space-y-6">
          {/* Page heading */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gradient-saffron-navy sm:text-3xl md:text-4xl">
                📈 Market Price Analytics
              </h1>

              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Gemini-powered 7-day crop price estimates
              </p>

              {lastUpdated && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchPrices()}
              disabled={loading}
              className="self-start sm:self-auto"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${
                  loading ? "animate-spin" : ""
                }`}
              />
              {loading ? "Generating Forecast..." : "Refresh Forecast"}
            </Button>
          </div>

          {/* Loading progress and errors */}
          {loading && (
            <div
              className="rounded-lg border border-primary/20 bg-primary/5 p-4"
              role="status"
            >
              <div className="flex items-center gap-2 text-sm">
                <Brain className="h-5 w-5 shrink-0 text-primary" />
                <span>
                  Gemini is generating forecasts and crop-specific insights
                  for {CROPS.length} crops in one request.
                </span>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                The progress bar is an activity indicator, not a percentage
                of completed predictions.
              </p>
            </div>
          )}

          {errorMessage && (
            <div
              className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm"
              role="status"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <p>{errorMessage}</p>

                {!loading && prices.length === 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => void fetchPrices()}
                  >
                    Try Again
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Forecast chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                7-Day Market Price Forecast
              </CardTitle>
            </CardHeader>

            <CardContent>
              {loading && prices.length === 0 ? (
                <Skeleton className="h-80 w-full rounded-xl" />
              ) : prices.length === 0 ? (
                <div className="py-12 text-center">
                  <AlertCircle className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="font-medium">
                    No forecast data available.
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Use Refresh Forecast to try again.
                  </p>
                </div>
              ) : (
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{
                        top: 10,
                        right: 20,
                        left: 10,
                        bottom: 10,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />

                      <XAxis
                        dataKey="day"
                        tick={{
                          fill: "hsl(var(--muted-foreground))",
                        }}
                      />

                      <YAxis
                        width={85}
                        tickFormatter={(value) =>
                          formatRupees(Number(value))
                        }
                        tick={{
                          fill: "hsl(var(--muted-foreground))",
                        }}
                      />

                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "8px",
                          color: "hsl(var(--foreground))",
                        }}
                        formatter={(value) =>
                          formatRupees(Number(value))
                        }
                      />

                      <Legend />

                      {prices.map((item) => {
                        const colorIndex = CROPS.indexOf(
                          item.crop.toLowerCase()
                        );

                        return (
                          <Line
                            key={item.crop}
                            type="monotone"
                            dataKey={item.crop}
                            name={item.crop}
                            stroke={
                              CHART_COLORS[
                                colorIndex >= 0 ? colorIndex : 0
                              ]
                            }
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                            connectNulls
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {prices.length > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  AI-generated estimates in INR per quintal. These are not
                  verified live mandi prices and do not guarantee future
                  prices.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Crop price cards */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">
              Crop Price Estimates
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {loading && prices.length === 0
                ? CROPS.map((crop) => (
                    <Skeleton
                      key={crop}
                      className="h-40 rounded-xl"
                    />
                  ))
                : prices.map((item) => (
                    <Card
                      key={item.crop}
                      className="border-l-4 border-l-primary/40 transition-shadow hover:shadow-lg"
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Sprout className="h-5 w-5 text-primary" />
                          {item.crop}
                        </CardTitle>

                        <p className="text-sm text-muted-foreground">
                          {item.market}
                        </p>
                      </CardHeader>

                      <CardContent className="space-y-3">
                        <div>
                          <div className="text-2xl font-bold text-primary">
                            {formatRupees(item.modalPrice)}
                          </div>

                          <p className="text-xs text-muted-foreground">
                            Average estimated price per quintal
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="text-muted-foreground">
                            Min: {formatRupees(item.minPrice)}
                          </span>

                          <span className="text-muted-foreground">
                            Max: {formatRupees(item.maxPrice)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
            </div>
          </section>

          {/* Crop-specific insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Market Insights
              </CardTitle>

              <p className="text-sm text-muted-foreground">
                Estimated trends, factors to monitor, and practical
                considerations for each crop.
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              {loading && prices.length === 0 ? (
                <>
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </>
              ) : prices.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Insights will appear when a forecast is available.
                </p>
              ) : (
                prices.map((item) => (
                  <div
                    key={item.crop}
                    className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4"
                  >
                    <h3 className="text-lg font-semibold">
                      {item.crop}
                    </h3>

                    <div>
                      <p className="mb-1 flex items-center gap-2 text-sm font-semibold">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Estimated price trend
                      </p>

                      <p className="text-sm text-muted-foreground">
                        {item.trend}
                      </p>
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-semibold">
                        Factors to monitor
                      </p>

                      {item.factors.length > 0 ? (
                        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                          {item.factors.map((factor, index) => (
                            <li key={`${item.crop}-${index}`}>
                              {factor}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No specific factors were provided.
                        </p>
                      )}
                    </div>

                    <div className="rounded-lg border border-border bg-background p-3">
                      <p className="mb-1 flex items-center gap-2 text-sm font-semibold">
                        <Lightbulb className="h-4 w-4 text-primary" />
                        Practical guidance
                      </p>

                      <p className="text-sm text-muted-foreground">
                        {item.recommendation}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default MerchantMarketPrices;
