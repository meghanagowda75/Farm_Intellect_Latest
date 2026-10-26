import { useState } from "react";
import { LottieAnimation, LOTTIE_URLS } from "@/components/ui/lottie-animation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { triggerLottieSuccess } from "@/components/ui/lottie-success-overlay";
import { apiFetch } from "@/lib/api";
import {
  Brain,
  Leaf,
  TrendingUp,
  Calendar,
  Droplets,
  MapPin,
  AlertTriangle,
  CheckCircle,
  X,
  ClipboardCheck,
  Sprout,
  IndianRupee,
} from "lucide-react";
import {
  getSoilParameterStatus,
  getFertilizerRecommendation,
} from "@/data/soilHealth";

interface CropRecommendation {
  id: string;
  crop: string;
  variety: string;
  confidence: number;
  expectedYield: string;
  profitEstimate: string;
  plantingWindow: string;
  waterRequirement: string;
  fertilizers: string[];
  riskFactors: string[];
  marketDemand: "high" | "medium" | "low";
  suitabilityScore: number;
}

interface SoilData {
  ph: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  organicCarbon: number;
  moisture: number;
}

interface FarmData {
  location: string;
  farmSize: string;
  soilType: string;
  irrigationMethod: string;
  previousCrop: string;
  budget: string;
  season: string;
}

interface BackendCropRecommendation {
  crop: string;
  confidence: number;
  suitability: number;
  expectedYield: string;
  profitEstimate: string;
  growthPeriod: string;
  riskLevel: string;
  reason: string;
  parameterScores?: Record<string, number>;
}

interface CropRecommendationResponse {
  recommendations: BackendCropRecommendation[];
  model?: {
    source?: string;
    name?: string;
    version?: string;
  };
}

interface SoilParameterConfig {
  displayLabel: string;
  field: keyof SoilData;
  unit: string;
  paramId: string;
  min: number;
  max: number;
  progressMax: number;
  step: number;
}

const clampPercentage = (value: number): number =>
  Math.max(0, Math.min(100, value));

const CropRecommendationEngine = () => {
  const [loading, setLoading] = useState(false);

  const [farmData, setFarmData] = useState<FarmData>({
    location: "",
    farmSize: "",
    soilType: "",
    irrigationMethod: "",
    previousCrop: "",
    budget: "",
    season: "rabi",
  });

  const [soilData, setSoilData] = useState<SoilData>({
    ph: 7.2,
    nitrogen: 280,
    phosphorus: 45,
    potassium: 320,
    organicCarbon: 0.8,
    moisture: 25,
  });

  const [recommendations, setRecommendations] = useState<
    CropRecommendation[]
  >([]);

  const [recommendationSource, setRecommendationSource] = useState("");

  // Store unique recommendation IDs instead of matching only crop names.
  const [selectedCropId, setSelectedCropId] = useState<string | null>(null);
  const [detailedPlanCropId, setDetailedPlanCropId] = useState<string | null>(
    null
  );

  const { toast } = useToast();

  const updateFarmData = <K extends keyof FarmData>(
    field: K,
    value: FarmData[K]
  ) => {
    setFarmData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const updateSoilData = <K extends keyof SoilData>(
    field: K,
    value: number
  ) => {
    setSoilData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const selectedCrop =
    recommendations.find((crop) => crop.id === selectedCropId) ?? null;

  const detailedPlanCrop =
    recommendations.find((crop) => crop.id === detailedPlanCropId) ?? null;

  const handleSelectCrop = (crop: CropRecommendation) => {
    setSelectedCropId(crop.id);

    toast({
      title: "Crop Selected",
      description: `${crop.crop} has been selected for your farm.`,
    });
  };

  const handleGetDetailedPlan = (crop: CropRecommendation) => {
    setDetailedPlanCropId(crop.id);

    toast({
      title: "Detailed Plan Opened",
      description: `Planning details for ${crop.crop} are displayed below.`,
    });
  };

  const closeDetailedPlan = () => {
    setDetailedPlanCropId(null);
  };

  const generateRecommendations = async () => {
    if (!farmData.location) {
      toast({
        title: "Location Required",
        description: "Please select your farm district.",
        variant: "destructive",
      });
      return;
    }

    if (!farmData.soilType) {
      toast({
        title: "Soil Type Required",
        description: "Please select your soil type.",
        variant: "destructive",
      });
      return;
    }

    if (!farmData.irrigationMethod) {
      toast({
        title: "Irrigation Method Required",
        description: "Please select your irrigation method.",
        variant: "destructive",
      });
      return;
    }

    if (
      farmData.farmSize.trim() &&
      (!Number.isFinite(Number(farmData.farmSize)) ||
        Number(farmData.farmSize) <= 0)
    ) {
      toast({
        title: "Invalid Farm Size",
        description: "Enter a farm size greater than zero.",
        variant: "destructive",
      });
      return;
    }

    if (
      farmData.budget.trim() &&
      (!Number.isFinite(Number(farmData.budget)) ||
        Number(farmData.budget) < 0)
    ) {
      toast({
        title: "Invalid Budget",
        description: "Enter a valid budget of zero or more.",
        variant: "destructive",
      });
      return;
    }

    if (
      !Number.isFinite(soilData.ph) ||
      soilData.ph < 0 ||
      soilData.ph > 14 ||
      !Number.isFinite(soilData.nitrogen) ||
      soilData.nitrogen < 0 ||
      !Number.isFinite(soilData.phosphorus) ||
      soilData.phosphorus < 0 ||
      !Number.isFinite(soilData.potassium) ||
      soilData.potassium < 0 ||
      !Number.isFinite(soilData.organicCarbon) ||
      soilData.organicCarbon < 0 ||
      !Number.isFinite(soilData.moisture) ||
      soilData.moisture < 0 ||
      soilData.moisture > 100
    ) {
      toast({
        title: "Invalid Soil Values",
        description: "Check all soil values before continuing.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setRecommendations([]);
    setRecommendationSource("");
    setSelectedCropId(null);
    setDetailedPlanCropId(null);

    try {
      // These are estimates, not live weather readings.
      const climateDefaults = {
        temperature: 28,
        humidity: 60,
        rainfall:
          farmData.season === "kharif"
            ? 1200
            : farmData.season === "zaid"
              ? 600
              : 400,
      };

      const requestBody = {
        location: farmData.location,
        soilType: farmData.soilType,
        season: farmData.season,
        farmSize: farmData.farmSize.trim()
          ? Number(farmData.farmSize)
          : undefined,
        experience: farmData.previousCrop.trim() || undefined,
        irrigationMethod: farmData.irrigationMethod,
        budget: farmData.budget.trim()
          ? Number(farmData.budget)
          : undefined,
        nitrogen: soilData.nitrogen,
        phosphorus: soilData.phosphorus,
        potassium: soilData.potassium,
        ph: soilData.ph,
        organicCarbon: soilData.organicCarbon,
        moisture: soilData.moisture,
        ...climateDefaults,
      };

      const response = await apiFetch<CropRecommendationResponse>(
        "/api/ai/recommend-crops",
        {
          method: "POST",
          body: JSON.stringify(requestBody),
        }
      );

      if (response?.model?.source !== "gemini") {
        throw new Error(
          "The backend did not confirm Gemini AI as the recommendation source."
        );
      }

      if (
        !Array.isArray(response.recommendations) ||
        response.recommendations.length === 0
      ) {
        throw new Error(
          "Gemini AI did not return any crop recommendations."
        );
      }

      const validRecommendations = response.recommendations.filter(
        (rec) =>
          rec &&
          typeof rec.crop === "string" &&
          rec.crop.trim().length > 0
      );

      if (validRecommendations.length === 0) {
        throw new Error(
          "Gemini AI returned recommendations in an invalid format."
        );
      }

      const mapped: CropRecommendation[] = validRecommendations
        .slice(0, 4)
        .map((rec, index) => {
          const confidence = clampPercentage(Number(rec.confidence) || 0);
          const suitability = clampPercentage(Number(rec.suitability) || 0);
          const rainfallScore = rec.parameterScores?.rainfall;

          const fertilizerPlan = getFertilizerRecommendation(rec.crop);

          const fertilizers = fertilizerPlan.slice(0, 3).map(
            (fertilizer) =>
              `${fertilizer.cropName}: N${fertilizer.NPK.N}-P${fertilizer.NPK.P}-K${fertilizer.NPK.K} kg/ha`
          );

          const reason =
            typeof rec.reason === "string" && rec.reason.trim()
              ? rec.reason.trim()
              : "No explanation was provided by Gemini AI.";

          const riskLevel =
            typeof rec.riskLevel === "string" && rec.riskLevel.trim()
              ? rec.riskLevel.trim()
              : "Not specified";

          return {
            id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 9)}`,
            crop: rec.crop.trim(),
            variety: rec.crop.trim(),
            confidence,
            expectedYield: rec.expectedYield || "Not available",
            profitEstimate: rec.profitEstimate || "Not available",
            plantingWindow: rec.growthPeriod || "Not available",
            waterRequirement:
              typeof rainfallScore === "number" &&
              Number.isFinite(rainfallScore)
                ? `${Math.round(clampPercentage(rainfallScore))}% rainfall match`
                : "Not specified",
            fertilizers,
            riskFactors: [
              reason,
              `Risk level: ${riskLevel}`,
            ],
            marketDemand:
              suitability >= 70
                ? "high"
                : suitability >= 45
                  ? "medium"
                  : "low",
            suitabilityScore: suitability,
          };
        });

      setRecommendations(mapped);
      setRecommendationSource("Gemini AI");

      toast({
        title: "Recommendations Ready",
        description: `${mapped.length} crops recommended using Gemini AI.`,
      });

      triggerLottieSuccess();
    } catch (error: unknown) {
      console.error("Crop recommendation error:", error);

      setRecommendations([]);
      setRecommendationSource("");
      setSelectedCropId(null);
      setDetailedPlanCropId(null);

      toast({
        title: "Crop Recommendations Failed",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const demandColors: Record<CropRecommendation["marketDemand"], string> = {
    high: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-red-100 text-red-700",
  };

  const soilParameters: SoilParameterConfig[] = [
    {
      displayLabel: "Soil pH",
      field: "ph",
      unit: "",
      paramId: "pH",
      min: 0,
      max: 14,
      progressMax: 14,
      step: 0.1,
    },
    {
      displayLabel: "Nitrogen",
      field: "nitrogen",
      unit: " kg/ha",
      paramId: "N",
      min: 0,
      max: 2000,
      progressMax: 560,
      step: 1,
    },
    {
      displayLabel: "Phosphorus",
      field: "phosphorus",
      unit: " kg/ha",
      paramId: "P",
      min: 0,
      max: 1000,
      progressMax: 100,
      step: 1,
    },
    {
      displayLabel: "Potassium",
      field: "potassium",
      unit: " kg/ha",
      paramId: "K",
      min: 0,
      max: 2000,
      progressMax: 400,
      step: 1,
    },
    {
      displayLabel: "Organic Carbon",
      field: "organicCarbon",
      unit: "%",
      paramId: "OC",
      min: 0,
      max: 10,
      progressMax: 1,
      step: 0.1,
    },
    {
      displayLabel: "Soil Moisture",
      field: "moisture",
      unit: "%",
      paramId: "",
      min: 0,
      max: 100,
      progressMax: 100,
      step: 1,
    },
  ];

  const detailedFertilizerPlan = detailedPlanCrop
    ? getFertilizerRecommendation(detailedPlanCrop.crop)
    : [];

  const detailedFertilizer = detailedFertilizerPlan[0];

  return (
    <div className="space-y-6">
      {/* Farm Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Farm Information
          </CardTitle>

          <CardDescription>
            Enter your farm details to receive crop recommendations.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="location">Location (District)</Label>

            <Select
              value={farmData.location}
              onValueChange={(value) => updateFarmData("location", value)}
            >
              <SelectTrigger id="location">
                <SelectValue placeholder="Select district" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="ludhiana">Ludhiana</SelectItem>
                <SelectItem value="amritsar">Amritsar</SelectItem>
                <SelectItem value="jalandhar">Jalandhar</SelectItem>
                <SelectItem value="patiala">Patiala</SelectItem>
                <SelectItem value="bathinda">Bathinda</SelectItem>
                <SelectItem value="ferozepur">Ferozepur</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="farm-size">Farm Size (acres)</Label>

            <Input
              id="farm-size"
              type="number"
              min="0.01"
              step="any"
              value={farmData.farmSize}
              onChange={(event) =>
                updateFarmData("farmSize", event.target.value)
              }
              placeholder="e.g., 5"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="soil-type">Soil Type</Label>

            <Select
              value={farmData.soilType}
              onValueChange={(value) => updateFarmData("soilType", value)}
            >
              <SelectTrigger id="soil-type">
                <SelectValue placeholder="Select soil type" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="alluvial">Alluvial</SelectItem>
                <SelectItem value="sandy-loam">Sandy Loam</SelectItem>
                <SelectItem value="clay-loam">Clay Loam</SelectItem>
                <SelectItem value="sandy">Sandy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="irrigation">Irrigation Method</Label>

            <Select
              value={farmData.irrigationMethod}
              onValueChange={(value) =>
                updateFarmData("irrigationMethod", value)
              }
            >
              <SelectTrigger id="irrigation">
                <SelectValue placeholder="Select irrigation" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="tube-well">Tube Well</SelectItem>
                <SelectItem value="canal">Canal</SelectItem>
                <SelectItem value="drip">Drip Irrigation</SelectItem>
                <SelectItem value="sprinkler">Sprinkler</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="previous-crop">Previous Crop</Label>

            <Input
              id="previous-crop"
              value={farmData.previousCrop}
              onChange={(event) =>
                updateFarmData("previousCrop", event.target.value)
              }
              placeholder="e.g., Rice, Cotton"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget">Available Budget (₹)</Label>

            <Input
              id="budget"
              type="number"
              min="0"
              step="any"
              value={farmData.budget}
              onChange={(event) =>
                updateFarmData("budget", event.target.value)
              }
              placeholder="e.g., 50000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="season">Growing Season</Label>

            <Select
              value={farmData.season}
              onValueChange={(value) => updateFarmData("season", value)}
            >
              <SelectTrigger id="season">
                <SelectValue placeholder="Select season" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="kharif">Kharif</SelectItem>
                <SelectItem value="rabi">Rabi</SelectItem>
                <SelectItem value="zaid">Zaid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Soil Health Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Leaf className="h-5 w-5" />
            Soil Health Analysis
          </CardTitle>

          <CardDescription>
            Default values are provided. Change them to match your soil test.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {soilParameters.map(
            ({
              displayLabel,
              field,
              unit,
              paramId,
              min,
              max,
              progressMax,
              step,
            }) => {
              const value = soilData[field];

              const status = paramId
                ? getSoilParameterStatus(paramId, value)
                : undefined;

              const category =
                status?.range?.category ??
                (field === "moisture" ? "Measured value" : "—");

              const isDeficient = status?.isDeficient ?? false;

              const isHigh =
                category === "High" || category === "Very High";

              const progressValue =
                progressMax > 0
                  ? clampPercentage((value / progressMax) * 100)
                  : 0;

              return (
                <div key={field} className="space-y-2 rounded-lg border p-3">
                  <Label htmlFor={`soil-${field}`} className="text-sm font-medium">
                    {displayLabel}: {value}
                    {unit}
                  </Label>

                  <Input
                    id={`soil-${field}`}
                    type="number"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(event) => {
                      const inputValue = event.target.value;

                      if (inputValue === "") return;

                      const nextValue = Number(inputValue);

                      if (
                        Number.isFinite(nextValue) &&
                        nextValue >= min &&
                        nextValue <= max
                      ) {
                        updateSoilData(field, nextValue);
                      }
                    }}
                  />

                  <Progress value={progressValue} className="h-2" />

                  <Badge
                    variant={
                      isDeficient
                        ? "destructive"
                        : isHigh
                          ? "default"
                          : "secondary"
                    }
                    className="text-xs"
                  >
                    {category}
                  </Badge>

                  {status?.range?.recommendation && (
                    <p className="text-xs leading-tight text-muted-foreground">
                      {status.range.recommendation}
                    </p>
                  )}
                </div>
              );
            }
          )}
        </CardContent>
      </Card>

      {/* Generate Recommendations */}
      <div className="text-center">
        <Button
          onClick={generateRecommendations}
          size="lg"
          disabled={loading}
          className="min-w-[200px]"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="mr-2 h-8 w-8">
                <LottieAnimation url={LOTTIE_URLS.aiProcessing} />
              </div>
              Processing Farm Data...
            </div>
          ) : (
            <>
              <Brain className="mr-2 h-4 w-4" />
              Get AI Recommendations
            </>
          )}
        </Button>
      </div>

      {/* Recommendations Display */}
      {recommendations.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xl font-semibold">
              AI-Generated Crop Recommendations
            </h3>

            <Badge variant="outline">Source: {recommendationSource}</Badge>
          </div>

          {recommendations.map((rec, index) => {
            const isSelected = selectedCropId === rec.id;
            const isPlanOpen = detailedPlanCropId === rec.id;

            return (
              <Card
                key={rec.id}
                className={`border-l-4 ${
                  isSelected
                    ? "border-l-green-600 ring-1 ring-green-200"
                    : "border-l-primary"
                }`}
              >
                <CardHeader>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-primary text-primary-foreground">
                          #{index + 1}
                        </Badge>

                        {rec.crop}

                        {isSelected && (
                          <Badge className="bg-green-600 text-white">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Selected
                          </Badge>
                        )}
                      </CardTitle>

                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <Badge className={demandColors[rec.marketDemand]}>
                          {rec.marketDemand} demand estimate
                        </Badge>

                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">
                            {rec.confidence}% confidence
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="sm:text-right">
                      <div className="text-xl font-bold text-green-600">
                        {rec.profitEstimate}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Expected profit estimate
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Expected Yield:</span>
                        <span>{rec.expectedYield}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Planting Window:</span>
                        <span>{rec.plantingWindow}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Droplets className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Water Requirement:</span>
                        <span>{rec.waterRequirement}</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">Suitability Score</span>
                          <span>{rec.suitabilityScore}%</span>
                        </div>

                        <Progress value={rec.suitabilityScore} />
                      </div>
                    </div>

                    <div>
                      <span className="font-medium">
                        Recommended Fertilizers:
                      </span>

                      {rec.fertilizers.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {rec.fertilizers.map((fertilizer, idx) => (
                            <Badge key={idx} variant="outline">
                              {fertilizer}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">
                          No matching fertilizer schedule is available in the
                          local reference data.
                        </p>
                      )}
                    </div>
                  </div>

                  {rec.riskFactors.length > 0 && (
                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <span className="font-medium text-yellow-800">
                          Explanation and Risks
                        </span>
                      </div>

                      <ul className="space-y-1 text-sm text-yellow-700">
                        {rec.riskFactors.map((risk, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-600" />
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      className="flex-1"
                      variant={isSelected ? "secondary" : "default"}
                      onClick={() => handleSelectCrop(rec)}
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Crop Selected
                        </>
                      ) : (
                        <>
                          <Sprout className="mr-2 h-4 w-4" />
                          Select This Crop
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        if (isPlanOpen) {
                          closeDetailedPlan();
                        } else {
                          handleGetDetailedPlan(rec);
                        }
                      }}
                    >
                      <ClipboardCheck className="mr-2 h-4 w-4" />
                      {isPlanOpen ? "Hide Detailed Plan" : "Get Detailed Plan"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detailed Plan for the Exact Recommendation ID */}
      {detailedPlanCrop && (
        <Card
          className="border-t-4 border-t-green-600"
          id="detailed-crop-plan"
        >
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <ClipboardCheck className="h-5 w-5" />
                  Detailed Crop Plan — {detailedPlanCrop.crop}
                </CardTitle>

                <CardDescription className="mt-2">
                  Planning summary based on the selected Gemini
                  recommendation, your submitted farm details, and available
                  fertilizer reference data.
                </CardDescription>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={closeDetailedPlan}
                aria-label="Close detailed crop plan"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Farm summary */}
            <div>
              <h4 className="mb-3 font-semibold">1. Farm Details</h4>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-sm text-muted-foreground">District</p>
                  <p className="font-medium">{farmData.location || "Not provided"}</p>
                </div>

                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-sm text-muted-foreground">Farm Size</p>
                  <p className="font-medium">
                    {farmData.farmSize
                      ? `${farmData.farmSize} acres`
                      : "Not provided"}
                  </p>
                </div>

                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-sm text-muted-foreground">Soil Type</p>
                  <p className="font-medium">{farmData.soilType || "Not provided"}</p>
                </div>

                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-sm text-muted-foreground">Season</p>
                  <p className="font-medium">{farmData.season}</p>
                </div>

                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-sm text-muted-foreground">
                    Irrigation Method
                  </p>
                  <p className="font-medium">
                    {farmData.irrigationMethod || "Not provided"}
                  </p>
                </div>

                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-sm text-muted-foreground">Previous Crop</p>
                  <p className="font-medium">
                    {farmData.previousCrop || "Not provided"}
                  </p>
                </div>

                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-sm text-muted-foreground">Available Budget</p>
                  <p className="font-medium">
                    {farmData.budget
                      ? `₹${Number(farmData.budget).toLocaleString("en-IN")}`
                      : "Not provided"}
                  </p>
                </div>
              </div>
            </div>

            {/* Soil summary */}
            <div>
              <h4 className="mb-3 font-semibold">2. Submitted Soil Values</h4>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: "pH", value: String(soilData.ph) },
                  {
                    label: "Nitrogen",
                    value: `${soilData.nitrogen} kg/ha`,
                  },
                  {
                    label: "Phosphorus",
                    value: `${soilData.phosphorus} kg/ha`,
                  },
                  {
                    label: "Potassium",
                    value: `${soilData.potassium} kg/ha`,
                  },
                  {
                    label: "Organic Carbon",
                    value: `${soilData.organicCarbon}%`,
                  },
                  {
                    label: "Soil Moisture",
                    value: `${soilData.moisture}%`,
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className="font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Crop planning */}
            <div>
              <h4 className="mb-3 font-semibold">3. Crop Planning Summary</h4>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex gap-3 rounded-lg border p-3">
                  <Calendar className="mt-1 h-5 w-5 shrink-0 text-green-600" />
                  <div>
                    <p className="font-medium">Planting Window</p>
                    <p className="text-sm text-muted-foreground">
                      {detailedPlanCrop.plantingWindow}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 rounded-lg border p-3">
                  <TrendingUp className="mt-1 h-5 w-5 shrink-0 text-green-600" />
                  <div>
                    <p className="font-medium">Expected Yield</p>
                    <p className="text-sm text-muted-foreground">
                      {detailedPlanCrop.expectedYield}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 rounded-lg border p-3">
                  <Droplets className="mt-1 h-5 w-5 shrink-0 text-blue-600" />
                  <div>
                    <p className="font-medium">Water Requirement</p>
                    <p className="text-sm text-muted-foreground">
                      {detailedPlanCrop.waterRequirement}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Use local rainfall and soil moisture readings to plan
                      irrigation. The rainfall match is an estimate, not a
                      measured water requirement.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 rounded-lg border p-3">
                  <IndianRupee className="mt-1 h-5 w-5 shrink-0 text-green-600" />
                  <div>
                    <p className="font-medium">Expected Profit</p>
                    <p className="text-sm text-muted-foreground">
                      {detailedPlanCrop.profitEstimate}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Treat this as an estimate; actual returns depend on
                      yield, costs, and market prices.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Explanation and risks */}
            <div>
              <h4 className="mb-3 font-semibold">
                4. Recommendation and Risk Factors
              </h4>

              <div className="space-y-2">
                {detailedPlanCrop.riskFactors.map((risk, index) => (
                  <div
                    key={`${detailedPlanCrop.id}-risk-${index}`}
                    className="flex items-start gap-2 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{risk}</span>
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="font-medium">Suitability</span>
                  <span className="font-semibold">
                    {detailedPlanCrop.suitabilityScore}%
                  </span>
                </div>

                <Progress value={detailedPlanCrop.suitabilityScore} />
              </div>
            </div>

            {/* Fertilizer schedule */}
            <div>
              <h4 className="mb-3 font-semibold">5. Fertilizer Reference</h4>

              {detailedFertilizer ? (
                <div className="space-y-4 rounded-lg border p-4">
                  <div>
                    <p className="font-medium">
                      Available reference: {detailedFertilizer.cropName}
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {detailedFertilizer.soilType} soil ·{" "}
                      {detailedFertilizer.season} season
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      N: {detailedFertilizer.NPK.N} kg/ha
                    </Badge>

                    <Badge variant="outline">
                      P₂O₅: {detailedFertilizer.NPK.P} kg/ha
                    </Badge>

                    <Badge variant="outline">
                      K₂O: {detailedFertilizer.NPK.K} kg/ha
                    </Badge>
                  </div>

                  <div>
                    <p className="mb-2 font-medium">Split Application Schedule</p>

                    <div className="space-y-2">
                      {detailedFertilizer.splitApplication.map(
                        (stage, index) => (
                          <div
                            key={`${detailedPlanCrop.id}-stage-${index}`}
                            className="flex gap-3 rounded-lg bg-muted/50 p-3"
                          >
                            <Badge variant="outline" className="shrink-0">
                              Stage {index + 1}
                            </Badge>

                            <div>
                              <p className="font-medium">{stage.stage}</p>
                              <p className="text-sm text-muted-foreground">
                                {stage.nutrients}
                              </p>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {detailedFertilizer.Micronutrients.length > 0 && (
                    <div>
                      <p className="mb-2 font-medium">
                        Micronutrient Corrections
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {detailedFertilizer.Micronutrients.map((item, index) => (
                          <Badge
                            key={`${detailedPlanCrop.id}-micro-${index}`}
                            variant="outline"
                          >
                            {item.name} — {item.dose}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                    <p className="font-medium text-green-800">Organic Manure</p>
                    <p className="text-sm text-green-700">
                      {detailedFertilizer.organicManure.type} @{" "}
                      {detailedFertilizer.organicManure.dose} —{" "}
                      {detailedFertilizer.organicManure.timing}
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {detailedFertilizer.notes}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    Reference: ICAR Crop-Wise Recommendation (2012), as
                    identified in the existing fertilizer data. Confirm the
                    correct dose for your soil test and local agricultural
                    recommendations before applying fertilizer.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-4">
                  <p className="font-medium">
                    No matching fertilizer schedule found
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    The local reference data does not contain a fertilizer
                    schedule matching {detailedPlanCrop.crop}. Consult your
                    local agricultural extension office for a crop-specific
                    recommendation.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                className="flex-1"
                variant={
                  selectedCropId === detailedPlanCrop.id
                    ? "secondary"
                    : "default"
                }
                onClick={() => handleSelectCrop(detailedPlanCrop)}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {selectedCropId === detailedPlanCrop.id
                  ? "Crop Already Selected"
                  : "Select This Crop"}
              </Button>

              <Button
                variant="outline"
                className="flex-1"
                onClick={closeDetailedPlan}
              >
                <X className="mr-2 h-4 w-4" />
                Close Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Crop Confirmation */}
      {selectedCrop && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle className="mt-1 h-5 w-5 shrink-0 text-green-700" />

              <div>
                <p className="font-semibold text-green-800">
                  Selected Crop: {selectedCrop.crop}
                </p>

                <p className="text-sm text-green-700">
                  Suitability score: {selectedCrop.suitabilityScore}% · Expected
                  yield: {selectedCrop.expectedYield}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => handleGetDetailedPlan(selectedCrop)}
            >
              <ClipboardCheck className="mr-2 h-4 w-4" />
              View Selected Crop Plan
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CropRecommendationEngine;