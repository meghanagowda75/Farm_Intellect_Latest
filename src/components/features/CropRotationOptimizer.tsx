import { useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  RotateCcw,
  Shuffle,
  Target,
  TrendingUp,
  Leaf,
  MapPin,
  Clock,
  Zap,
  Award,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface CropRotationPlan {
  year: number;
  season: string;
  primaryCrop: string;
  companion?: string;
  benefits: string[];
  expectedYield: string;
  soilHealth: number;
  profitability: number;
}

interface IntercroppingCombination {
  mainCrop: string;
  companionCrop: string;
  compatibility: number;
  benefits: string[];
  spacing: string;
  yieldIncrease: number;
  difficulty: "Easy" | "Medium" | "Hard";
}

interface RotationResponse {
  rotationPlan: CropRotationPlan[];
  intercroppingOptions: IntercroppingCombination[];
  summary?: string;
}

const crops = [
  "wheat",
  "rice",
  "maize",
  "soybean",
  "chickpea",
  "cotton",
  "mustard",
  "sugarcane",
  "ragi",
  "groundnut",
  "pigeon pea",
  "sorghum",
];

const inputClass =
  "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const selectClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function score(value: unknown, fallback = 50): number {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.max(0, Math.min(100, Math.round(parsed)))
    : fallback;
}

function normalizeResponse(
  data: unknown,
  years: number,
): RotationResponse {
  if (!isRecord(data) || !Array.isArray(data.rotationPlan)) {
    throw new Error("Gemini returned an invalid crop rotation plan.");
  }

  const rotationPlan: CropRotationPlan[] = data.rotationPlan.map(
    (item, index) => {
      if (
        !isRecord(item) ||
        typeof item.primaryCrop !== "string"
      ) {
        throw new Error("Gemini returned an invalid crop entry.");
      }

      return {
        year: Math.min(
          years,
          Math.max(1, Number(item.year) || index + 1),
        ),
        season: String(item.season || "Season not specified"),
        primaryCrop: item.primaryCrop,
        companion:
          typeof item.companion === "string"
            ? item.companion
            : undefined,
        benefits: Array.isArray(item.benefits)
          ? item.benefits.filter(
            (benefit): benefit is string =>
              typeof benefit === "string",
          )
          : [],
        expectedYield:
          typeof item.expectedYield === "string"
            ? item.expectedYield
            : "Not estimated",
        soilHealth: score(item.soilHealth),
        profitability: score(item.profitability),
      };
    },
  );

  if (rotationPlan.length === 0) {
    throw new Error("Gemini did not generate any rotation entries.");
  }

  const intercroppingOptions: IntercroppingCombination[] =
    Array.isArray(data.intercroppingOptions)
      ? data.intercroppingOptions
        .filter(isRecord)
        .map((item) => {
          const difficulty = String(item.difficulty);

          return {
            mainCrop: String(item.mainCrop || "Unspecified"),
            companionCrop: String(
              item.companionCrop || "Unspecified",
            ),
            compatibility: score(item.compatibility),
            benefits: Array.isArray(item.benefits)
              ? item.benefits.filter(
                (benefit): benefit is string =>
                  typeof benefit === "string",
              )
              : [],
            spacing: String(
              item.spacing || "Confirm locally",
            ),
            yieldIncrease: score(item.yieldIncrease, 0),
            difficulty:
              difficulty === "Easy" ||
                difficulty === "Hard"
                ? difficulty
                : "Medium",
          };
        })
      : [];

  return {
    rotationPlan,
    intercroppingOptions,
    summary:
      typeof data.summary === "string"
        ? data.summary
        : undefined,
  };
}

function getErrorMessage(data: unknown, status: number): string {
  if (isRecord(data) && typeof data.error === "string") {
    return data.error;
  }

  if (status === 404) {
    return "The crop rotation API route was not found. Add the backend route shown below and restart the backend.";
  }

  if (status === 429) {
    return "Gemini API quota or rate limit exceeded. Check your Gemini API quota and try again later.";
  }

  return `Request failed (${status}). Check your backend and Gemini API configuration.`;
}

export const CropRotationOptimizer = () => {
  const [fieldSize, setFieldSize] = useState("2");
  const [soilType, setSoilType] = useState("loamy");
  const [climateZone, setClimateZone] = useState("tropical");
  const [currentCrop, setCurrentCrop] = useState("rice");
  const [planYears, setPlanYears] = useState("3");
  const [location, setLocation] = useState("Karnataka, India");

  const [rotationPlan, setRotationPlan] = useState<CropRotationPlan[]>([]);
  const [intercroppingOptions, setIntercroppingOptions] = useState<
    IntercroppingCombination[]
  >([]);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  async function generateRotationPlan() {
    const hectares = Number(fieldSize);
    const years = Number(planYears);

    if (!Number.isFinite(hectares) || hectares <= 0) {
      setError("Enter a valid field size greater than zero.");
      return;
    }

    if (!location.trim()) {
      setError("Enter your farming location.");
      return;
    }

    if (![2, 3, 4, 5].includes(years)) {
      setError("Select a planning period between 2 and 5 years.");
      return;
    }

    setIsGenerating(true);
    setError("");
    setSummary("");
    setRotationPlan([]);
    setIntercroppingOptions([]);

    try {
      const data: unknown = await apiFetch(
        "/api/ai/crop-rotation-plan",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            location: location.trim(),
            fieldSize: hectares,
            soilType,
            climateZone,
            currentCrop,
            planYears: years,
          }),
        },
      );

      const result = normalizeResponse(data, years);

      setRotationPlan(result.rotationPlan);
      setIntercroppingOptions(result.intercroppingOptions);
      setSummary(result.summary || "");
    } catch (err) {
      console.error("Crop rotation request failed:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate the plan. Please try again.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  const scoreColor = (value: number) =>
    value >= 80
      ? "text-emerald-600 dark:text-emerald-400"
      : value >= 60
        ? "text-amber-600 dark:text-amber-400"
        : "text-rose-600 dark:text-rose-400";

  const difficultyClass = (difficulty: string) => {
    if (difficulty === "Easy") {
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    }

    if (difficulty === "Hard") {
      return "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300";
    }

    return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  };

  const averageSoilScore = rotationPlan.length
    ? Math.round(
      rotationPlan.reduce(
        (total, item) => total + item.soilHealth,
        0,
      ) / rotationPlan.length,
    )
    : 0;

  return (
    <Card className="w-full overflow-hidden border-border bg-background text-foreground">
      <CardHeader className="border-b border-border bg-card">
        <CardTitle className="flex items-center gap-2 text-xl text-foreground">
          <RotateCcw className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          Crop Rotation & Intercropping Optimizer
        </CardTitle>

        <p className="text-sm text-muted-foreground">
          Generate crop rotation recommendations using Gemini AI
          based on your farm conditions.
        </p>
      </CardHeader>

      <CardContent className="p-4 md:p-6">
        <Tabs defaultValue="planner" className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-3 gap-1 border border-border bg-muted p-1">
            <TabsTrigger
              value="planner"
              className="text-xs text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm"
            >
              Rotation Planner
            </TabsTrigger>

            <TabsTrigger
              value="intercropping"
              className="text-xs text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm"
            >
              Intercropping
            </TabsTrigger>

            <TabsTrigger
              value="benefits"
              className="text-xs text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm"
            >
              Benefits
            </TabsTrigger>
          </TabsList>

          <TabsContent value="planner" className="mt-5 space-y-5">
            <section className="rounded-xl border border-border bg-card p-4 md:p-5">
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
                <Target className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Farm Details
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="fieldSize">Field Size (hectares)</Label>
                  <Input
                    id="fieldSize"
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={fieldSize}
                    onChange={(event) =>
                      setFieldSize(event.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="soilType">Soil Type</Label>
                  <select
                    id="soilType"
                    value={soilType}
                    onChange={(event) =>
                      setSoilType(event.target.value)
                    }
                    className={selectClass}
                  >
                    <option value="sandy">Sandy</option>
                    <option value="loamy">Loamy</option>
                    <option value="clay">Clay</option>
                    <option value="alluvial">Alluvial</option>
                    <option value="black">Black soil</option>
                    <option value="red">Red soil</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="climateZone">Climate Zone</Label>
                  <select
                    id="climateZone"
                    value={climateZone}
                    onChange={(event) =>
                      setClimateZone(event.target.value)
                    }
                    className={selectClass}
                  >
                    <option value="tropical">Tropical</option>
                    <option value="temperate">Temperate</option>
                    <option value="arid">Arid</option>
                    <option value="semi-arid">Semi-arid</option>
                    <option value="coastal">Coastal</option>
                    <option value="subtropical">Subtropical</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currentCrop">Current / Last Crop</Label>
                  <select
                    id="currentCrop"
                    value={currentCrop}
                    onChange={(event) =>
                      setCurrentCrop(event.target.value)
                    }
                    className={selectClass}
                  >
                    {crops.map((crop) => (
                      <option key={crop} value={crop}>
                        {crop.charAt(0).toUpperCase() + crop.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="planYears">Planning Period</Label>
                  <select
                    id="planYears"
                    value={planYears}
                    onChange={(event) =>
                      setPlanYears(event.target.value)
                    }
                    className={selectClass}
                  >
                    <option value="2">2 Years</option>
                    <option value="3">3 Years</option>
                    <option value="4">4 Years</option>
                    <option value="5">5 Years</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="farmLocation">Farming Location</Label>
                  <Input
                    id="farmLocation"
                    value={location}
                    onChange={(event) =>
                      setLocation(event.target.value)
                    }
                    placeholder="e.g. Mysuru, Karnataka"
                    className={inputClass}
                  />
                </div>
              </div>

              <Button
                type="button"
                onClick={generateRotationPlan}
                disabled={isGenerating}
                className="mt-5 w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating AI Plan...
                  </>
                ) : (
                  <>
                    <Target className="mr-2 h-4 w-4" />
                    Generate AI Rotation Plan
                  </>
                )}
              </Button>
            </section>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-destructive"
              >
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold">
                    Unable to generate plan
                  </p>
                  <p className="mt-1 break-words">{error}</p>
                </div>
              </div>
            )}

            {summary && (
              <section className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                <h3 className="mb-2 font-semibold text-foreground">
                  AI Planning Summary
                </h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  {summary}
                </p>
              </section>
            )}

            {rotationPlan.length > 0 && (
              <section className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">
                  Recommended Rotation Plan
                </h3>

                <p className="text-xs text-muted-foreground">
                  Scores and yield estimates are AI-generated
                  recommendations, not measured farm results. Verify
                  them with local agricultural experts.
                </p>

                {rotationPlan.map((plan, index) => (
                  <article
                    key={`${plan.year}-${plan.season}-${index}`}
                    className="space-y-4 rounded-xl border border-border bg-card p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">
                          Year {plan.year}
                        </Badge>

                        <Badge variant="outline">{plan.season}</Badge>

                        <h4 className="font-semibold capitalize text-foreground">
                          {plan.primaryCrop}
                        </h4>

                        {plan.companion && (
                          <Badge variant="outline">
                            + {plan.companion}
                          </Badge>
                        )}
                      </div>

                      <div className="flex gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Soil score
                          </p>
                          <p className={`font-semibold ${scoreColor(plan.soilHealth)}`}>
                            {plan.soilHealth}/100
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground">
                            Profitability score
                          </p>
                          <p className={`font-semibold ${scoreColor(plan.profitability)}`}>
                            {plan.profitability}/100
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <p className="mb-1 text-sm font-medium text-foreground">
                          Expected Yield
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {plan.expectedYield}
                        </p>
                      </div>

                      <div className="md:col-span-2">
                        <p className="mb-2 text-sm font-medium text-foreground">
                          Potential Benefits
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {plan.benefits.map((benefit, benefitIndex) => (
                            <Badge
                              key={`${benefit}-${benefitIndex}`}
                              variant="secondary"
                            >
                              {benefit}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Card className="border-border bg-card">
                    <CardContent className="p-4 text-center">
                      <Leaf className="mx-auto mb-2 h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                      <p className="text-sm text-muted-foreground">
                        Average estimated soil score
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {averageSoilScore}/100
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-border bg-card">
                    <CardContent className="p-4 text-center">
                      <Award className="mx-auto mb-2 h-6 w-6 text-sky-600 dark:text-sky-400" />
                      <p className="text-sm text-muted-foreground">
                        Rotation entries
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {rotationPlan.length}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </section>
            )}
          </TabsContent>

          <TabsContent value="intercropping" className="mt-5 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              AI Intercropping Recommendations
            </h3>

            {intercroppingOptions.length === 0 ? (
              <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
                Generate a rotation plan to see intercropping
                recommendations for your farm.
              </p>
            ) : (
              intercroppingOptions.map((item, index) => (
                <article
                  key={`${item.mainCrop}-${item.companionCrop}-${index}`}
                  className="space-y-4 rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold capitalize text-foreground">
                        {item.mainCrop}
                      </h4>
                      <Shuffle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <h4 className="font-semibold capitalize text-foreground">
                        {item.companionCrop}
                      </h4>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        {item.compatibility}/100 compatibility
                      </Badge>
                      <Badge
                        className={difficultyClass(item.difficulty)}
                        variant="outline"
                      >
                        {item.difficulty}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="mb-2 font-medium text-foreground">
                        Planting Details
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Spacing: {item.spacing}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Estimated yield effect: {item.yieldIncrease}%
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <p className="mb-2 font-medium text-foreground">
                        Potential Benefits
                      </p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {item.benefits.map((benefit, benefitIndex) => (
                          <div
                            key={`${benefit}-${benefitIndex}`}
                            className="flex items-start gap-2 text-sm text-muted-foreground"
                          >
                            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            {benefit}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              ))
            )}
          </TabsContent>

          <TabsContent value="benefits" className="mt-5 space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-lg">
                    Crop Rotation Benefits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    [Leaf, "Supports soil fertility and nutrient cycling"],
                    [Target, "Can interrupt some pest and disease cycles"],
                    [TrendingUp, "Diversifies production and farm income"],
                    [Zap, "May reduce unnecessary chemical inputs"],
                    [Clock, "Supports planning across growing seasons"],
                  ].map(([Icon, description]) => {
                    const BenefitIcon = Icon;
                    return (
                      <div
                        key={String(description)}
                        className="flex items-start gap-3"
                      >
                        <BenefitIcon className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        <p className="text-sm text-muted-foreground">
                          {String(description)}
                        </p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-lg">
                    Intercropping Advantages
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    [MapPin, "Can improve land-use efficiency"],
                    [Shuffle, "Diversifies production risk"],
                    [Award, "Can support biodiversity"],
                    [Clock, "May maintain ground cover for longer"],
                    [TrendingUp, "Can diversify harvest timing"],
                  ].map(([Icon, description]) => {
                    const BenefitIcon = Icon;
                    return (
                      <div
                        key={String(description)}
                        className="flex items-start gap-3"
                      >
                        <BenefitIcon className="mt-0.5 h-5 w-5 text-sky-600 dark:text-sky-400" />
                        <p className="text-sm text-muted-foreground">
                          {String(description)}
                        </p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg">
                  Planning Guidelines
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  • Rotate crops from different plant families when practical.
                </p>
                <p>
                  • Include suitable legumes where local growing conditions
                  support them.
                </p>
                <p>
                  • Consider water availability, planting windows, pests,
                  and market demand.
                </p>
                <p>
                  • Confirm fertilizer requirements, spacing, and yield
                  estimates with local agricultural guidance.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}