
import { apiFetch } from "@/lib/api";
import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  TrendingUp,
  Target,
  Calendar,
  Brain,
  BarChart3,
  Loader2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

interface PriceData {
  day: number;
  date: string;
  price: number;
}

interface MarketAnalysis {
  crop: string;
  predictedPrice: number;
  factors: string[];
}

interface PredictionResponse {
  prediction: {
    crop: string;
    days: number;
    currency: string;
    unit: string;
    estimateOnly: boolean;
    forecast: {
      day: number;
      price: number;
    }[];
    factors: string[];
  };
}

const cropOptions = [
  { value: "wheat", label: "Wheat" },
  { value: "rice", label: "Rice" },
  { value: "cotton", label: "Cotton" },
  { value: "maize", label: "Maize" },
  { value: "soybean", label: "Soybean" },
  { value: "onion", label: "Onion" },
  { value: "tomato", label: "Tomato" },
];

const predictionPeriods = [7, 15, 30, 60, 90];

const selectClassName =
  "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export const MarketPricePredictor = () => {
  const [selectedCrop, setSelectedCrop] = useState("wheat");
  const [predictionDays, setPredictionDays] = useState("30");
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const runAnalysis = async () => {
    if (isAnalyzing) return;

    setIsAnalyzing(true);
    setErrorMessage("");
    setAnalysis(null);
    setPriceData([]);

    try {
      const response = (await apiFetch(
        "/api/ai/predict-market-price",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            crop: selectedCrop,
            days: Number(predictionDays),
          }),
        }
      )) as PredictionResponse;

      const result = response?.prediction;

      if (
        !result ||
        !Array.isArray(result.forecast) ||
        result.forecast.length === 0
      ) {
        throw new Error(
          "The prediction service returned no forecast. Please try again."
        );
      }

      const validForecast = result.forecast.filter(
        (point) =>
          Number.isFinite(point.day) &&
          Number.isFinite(point.price) &&
          point.day >= 1 &&
          point.day <= Number(predictionDays) &&
          point.price > 0
      );

      if (validForecast.length === 0) {
        throw new Error(
          "No valid prices were returned. Please try again."
        );
      }

      const data: PriceData[] = validForecast.map((point) => {
        const date = new Date();
        date.setDate(date.getDate() + point.day);

        return {
          day: point.day,
          date: date.toLocaleDateString(),
          price: Math.round(point.price),
        };
      });

      const average =
        data.reduce((sum, point) => sum + point.price, 0) /
        data.length;

      const cropLabel =
        cropOptions.find((crop) => crop.value === selectedCrop)?.label ??
        selectedCrop;

      setPriceData(data);
      setAnalysis({
        crop: cropLabel,
        predictedPrice: Math.round(average),
        factors: Array.isArray(result.factors)
          ? result.factors.filter(
              (factor): factor is string =>
                typeof factor === "string"
            )
          : [],
      });
    } catch (error) {
      console.error("Market price prediction failed:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to generate a price estimate. Please try again."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card className="w-full min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          AI Market Price Predictor
        </CardTitle>

        <p className="text-sm text-muted-foreground">
          Generate AI-based crop price estimates for up to 90 days.
        </p>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="predictor" className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-3">
            <TabsTrigger value="predictor">
              Price Predictor
            </TabsTrigger>
            <TabsTrigger value="analysis">
              Market Analysis
            </TabsTrigger>
            <TabsTrigger value="insights">
              AI Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="predictor" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="min-w-0 space-y-2">
                <label
                  htmlFor="market-crop"
                  className="text-sm font-medium text-foreground"
                >
                  Select Crop
                </label>

                <select
                  id="market-crop"
                  className={selectClassName}
                  value={selectedCrop}
                  disabled={isAnalyzing}
                  onChange={(event) =>
                    setSelectedCrop(event.target.value)
                  }
                >
                  {cropOptions.map((crop) => (
                    <option key={crop.value} value={crop.value}>
                      {crop.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-0 space-y-2">
                <label
                  htmlFor="market-period"
                  className="text-sm font-medium text-foreground"
                >
                  Prediction Period
                </label>

                <select
                  id="market-period"
                  className={selectClassName}
                  value={predictionDays}
                  disabled={isAnalyzing}
                  onChange={(event) =>
                    setPredictionDays(event.target.value)
                  }
                >
                  {predictionPeriods.map((days) => (
                    <option key={days} value={days}>
                      {days} Days
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  className="w-full"
                  onClick={runAnalysis}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Predict Prices
                    </>
                  )}
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Select your crop and forecast period, then click
              {" "}Predict Prices. Changing either input will not
              automatically generate another prediction.
            </p>

            {isAnalyzing && (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="font-medium">
                    Generating your crop price estimate...
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Gemini is preparing the forecast. This may take a
                    little time.
                  </p>
                </CardContent>
              </Card>
            )}

            {errorMessage && !isAnalyzing && (
              <Card className="border-destructive/50">
                <CardContent className="flex items-start gap-3 p-4">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />

                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="font-medium">
                      Prediction failed
                    </p>
                    <p className="break-words text-sm text-muted-foreground">
                      {errorMessage}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={runAnalysis}
                    >
                      Try Again
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {analysis && !isAnalyzing && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold">
                    {analysis.crop} Price Forecast
                  </h3>

                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    AI Estimate
                  </span>
                </div>

                <Card>
                  <CardContent className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Target className="h-4 w-4" />
                        Estimated Average Price
                      </div>
                      <p className="text-2xl font-bold">
                        ₹{analysis.predictedPrice.toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Per quintal
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Forecast Period
                      </div>
                      <p className="text-2xl font-bold">
                        {predictionDays} days
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {priceData.length} forecast points
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Predicted Price Trend
                    </CardTitle>
                  </CardHeader>

                  <CardContent>
                    <div className="h-72 w-full min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={priceData}
                          margin={{
                            top: 10,
                            right: 12,
                            left: 12,
                            bottom: 10,
                          }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(var(--border))"
                          />

                          <XAxis
                            dataKey="day"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 12 }}
                            tickFormatter={(day) => `Day ${day}`}
                          />

                          <YAxis
                            width={75}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) =>
                              `₹${Number(value).toLocaleString("en-IN")}`
                            }
                          />

                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--background))",
                              borderColor: "hsl(var(--border))",
                              borderRadius: "8px",
                              color: "hsl(var(--foreground))",
                            }}
                            labelFormatter={(day) => `Day ${day}`}
                            formatter={(value) => [
                              `₹${Number(value).toLocaleString("en-IN")}`,
                              "Estimated price per quintal",
                            ]}
                          />

                          <Line
                            type="monotone"
                            dataKey="price"
                            name="Estimated price"
                            stroke="hsl(var(--primary))"
                            strokeWidth={3}
                            dot={{
                              r: 4,
                              fill: "hsl(var(--primary))",
                            }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <p className="mt-3 text-center text-xs text-muted-foreground">
                      Forecast day versus estimated price in ₹ per quintal.
                    </p>
                  </CardContent>
                </Card>

                <p className="text-sm text-amber-700 dark:text-amber-400">
                  These are AI-generated estimates, not verified live
                  mandi prices. Check actual local market prices before
                  making selling decisions.
                </p>
              </div>
            )}

            {!analysis && !isAnalyzing && !errorMessage && (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                  <TrendingUp className="h-10 w-10 text-muted-foreground" />
                  <p className="font-medium">
                    Ready to forecast crop prices?
                  </p>
                  <p className="max-w-md text-sm text-muted-foreground">
                    Choose a crop and prediction period above, then
                    click Predict Prices to generate your estimate.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analysis" className="mt-6 space-y-4">
            {analysis ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Market Price Estimate</CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Selected crop: {analysis.crop}
                    </p>

                    <p className="text-2xl font-bold">
                      ₹{analysis.predictedPrice.toLocaleString("en-IN")}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      Estimated average per quintal over the next{" "}
                      {predictionDays} days.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Factors Mentioned by Gemini</CardTitle>
                  </CardHeader>

                  <CardContent>
                    {analysis.factors.length > 0 ? (
                      <ul className="list-disc space-y-2 pl-5">
                        {analysis.factors.map((factor, index) => (
                          <li key={index} className="text-sm">
                            {factor}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No factors were returned.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <p className="text-sm text-amber-700 dark:text-amber-400">
                  AI estimate only. No live price verification or
                  prediction accuracy measurement is available here.
                </p>
              </>
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  Generate a prediction from the Price Predictor tab
                  to see market analysis.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="insights" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  About AI Price Estimates
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Farm Intellect uses Google Gemini through your backend
                  to generate estimated future prices for the selected crop.
                </p>

                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    Supports wheat, rice, cotton, maize, soybean,
                    onion, and tomato.
                  </li>
                  <li>
                    Supports forecast periods of 7, 15, 30, 60,
                    and 90 days.
                  </li>
                  <li>
                    Displays an estimated price trend and factors
                    that may influence prices.
                  </li>
                  <li>
                    Calls the prediction API only when you click
                    Predict Prices.
                  </li>
                </ul>

                <p className="font-medium text-amber-700 dark:text-amber-400">
                  Important: AI-generated forecasts are not verified
                  live mandi prices, guaranteed outcomes, or measured
                  prediction accuracy. Use actual market data when
                  making agricultural selling decisions.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
