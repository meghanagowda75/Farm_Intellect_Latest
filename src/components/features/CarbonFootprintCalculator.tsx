
import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { apiBaseUrl } from "@/lib/api";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Leaf,
  Droplets,
  Recycle,
  Award,
  TrendingUp,
  Calculator,
  Target,
  CheckCircle,
  Trees,
  Sun,
  Loader2,
  Sparkles,
  AlertCircle,
} from "lucide-react";

interface CarbonCalculation {
  category: string;
  current: number;
  optimized: number;
  savings: number;
  unit: string;
}

interface CarbonReport {
  totalFootprint: number;
  reductionPotential: number;
  estimatedCredits: number;
  sustainabilityScore: number;
  recommendations: string[];
  summary: string;
  limitations: string;
  calculations: CarbonCalculation[];
}

interface RecommendationResponse {
  summary?: string;
  recommendations?: string[];
  limitations?: string;
  error?: string;
}

interface TradeAssessment {
  ready: boolean;
  missing: string[];
  indicativeValue: number | null;
}

const API_ENDPOINT = apiBaseUrl.endsWith("/api")
  ? `${apiBaseUrl}/ai/carbon-footprint-recommendations`
  : `${apiBaseUrl}/api/ai/carbon-footprint-recommendations`;

const selectClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const optionClass = "bg-background text-foreground";

const round = (value: number) => Math.round(value * 100) / 100;

export const CarbonFootprintCalculator = () => {
  const [farmSize, setFarmSize] = useState("5");
  const [cropType, setCropType] = useState("wheat");
  const [irrigationType, setIrrigationType] = useState("drip");
  const [fertilizerUsage, setFertilizerUsage] = useState("medium");
  const [powerSource, setPowerSource] = useState("grid");
  const [transportDistance, setTransportDistance] = useState("50");

  const [report, setReport] = useState<CarbonReport | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] =
    useState(false);
  const [error, setError] = useState("");

  const [creditDialog, setCreditDialog] = useState<"apply" | "trade" | null>(
    null
  );

  const [applicantName, setApplicantName] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [farmLocation, setFarmLocation] = useState("");
  const [applicationMessage, setApplicationMessage] = useState("");

  const [tradeProjectName, setTradeProjectName] = useState("");
  const [tradeProjectLocation, setTradeProjectLocation] = useState("");
  const [tradeActivity, setTradeActivity] = useState("");
  const [tradeProgram, setTradeProgram] = useState("");
  const [tradeVerificationStatus, setTradeVerificationStatus] =
    useState("not-verified");
  const [tradeEligibilityConfirmed, setTradeEligibilityConfirmed] =
    useState(false);
  const [tradeMonitoringConfirmed, setTradeMonitoringConfirmed] =
    useState(false);
  const [tradePricePerCredit, setTradePricePerCredit] = useState("");
  const [tradeAssessment, setTradeAssessment] =
    useState<TradeAssessment | null>(null);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Improvement";
  };

  const calculateCarbonFootprint = async () => {
    setError("");

    const fieldSize = Number(farmSize);
    const transport = Number(transportDistance);

    if (!Number.isFinite(fieldSize) || fieldSize <= 0 || fieldSize > 100000) {
      setError(
        "Enter a farm size greater than 0 and no more than 100,000 hectares."
      );
      return;
    }

    if (
      !Number.isFinite(transport) ||
      transport < 0 ||
      transport > 1000000
    ) {
      setError(
        "Enter a valid transport distance between 0 and 1,000,000 km."
      );
      return;
    }

    setIsCalculating(true);
    setIsGeneratingRecommendations(false);

    try {
      const baseEmissions: Record<string, number> = {
        wheat: 2.8,
        rice: 4.2,
        maize: 2.4,
        cotton: 5.1,
        soybean: 1.9,
      };

      const irrigationEmissions: Record<string, number> = {
        flood: 1.2,
        sprinkler: 0.8,
        drip: 0.4,
      };

      const fertilizerEmissions: Record<string, number> = {
        low: 0.5,
        medium: 1.0,
        high: 1.8,
      };

      const energyEmissions: Record<string, number> = {
        solar: 0.2,
        grid: 1.5,
        diesel: 2.1,
      };

      const calculations: CarbonCalculation[] = [
        {
          category: "Crop Production",
          current: baseEmissions[cropType] * fieldSize,
          optimized: baseEmissions[cropType] * fieldSize * 0.8,
          savings: baseEmissions[cropType] * fieldSize * 0.2,
          unit: "tons CO2e",
        },
        {
          category: "Irrigation",
          current: irrigationEmissions[irrigationType] * fieldSize,
          optimized: irrigationEmissions[irrigationType] * fieldSize * 0.6,
          savings: irrigationEmissions[irrigationType] * fieldSize * 0.4,
          unit: "tons CO2e",
        },
        {
          category: "Fertilizers",
          current: fertilizerEmissions[fertilizerUsage] * fieldSize,
          optimized: fertilizerEmissions[fertilizerUsage] * fieldSize * 0.5,
          savings: fertilizerEmissions[fertilizerUsage] * fieldSize * 0.5,
          unit: "tons CO2e",
        },
        {
          category: "Energy Use",
          current: energyEmissions[powerSource] * fieldSize,
          optimized: energyEmissions[powerSource] * fieldSize * 0.3,
          savings: energyEmissions[powerSource] * fieldSize * 0.7,
          unit: "tons CO2e",
        },
        {
          category: "Transportation",
          current: (transport * 0.12 * fieldSize) / 100,
          optimized: ((transport * 0.12 * fieldSize) / 100) * 0.7,
          savings: ((transport * 0.12 * fieldSize) / 100) * 0.3,
          unit: "tons CO2e",
        },
      ];

      const totalCurrent = calculations.reduce(
        (sum, item) => sum + item.current,
        0
      );

      const totalOptimized = calculations.reduce(
        (sum, item) => sum + item.optimized,
        0
      );

      const totalSavings = Math.max(0, totalCurrent - totalOptimized);

      const sustainabilityScore = Math.min(
        100,
        Math.max(0, 100 - (totalOptimized / fieldSize) * 10)
      );

      const newReport: CarbonReport = {
        totalFootprint: round(totalCurrent),
        reductionPotential: round(totalSavings),
        estimatedCredits: round(totalSavings),
        sustainabilityScore: Math.round(sustainabilityScore),
        recommendations: [],
        summary: "",
        limitations:
          "The results are indicative estimates based on simplified emission factors. They are not independently measured or verified.",
        calculations,
      };

      setReport(newReport);
      setIsCalculating(false);
      setIsGeneratingRecommendations(true);

      try {
        const response = await fetch(API_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            farmSize: fieldSize,
            cropType,
            irrigationType,
            fertilizerUsage,
            powerSource,
            transportDistance: transport,
            totalFootprint: newReport.totalFootprint,
            reductionPotential: newReport.reductionPotential,
            calculations: calculations.map((item) => ({
              category: item.category,
              current: round(item.current),
              optimized: round(item.optimized),
              savings: round(item.savings),
            })),
          }),
        });

        const data = (await response.json()) as RecommendationResponse;

        if (!response.ok) {
          throw new Error(
            data.error ||
              `Recommendation request failed (${response.status}).`
          );
        }

        if (
          !Array.isArray(data.recommendations) ||
          data.recommendations.length === 0
        ) {
          throw new Error("Gemini did not return any recommendations.");
        }

        setReport((previous) =>
          previous
            ? {
                ...previous,
                summary: data.summary || "",
                recommendations: data.recommendations || [],
                limitations: data.limitations || previous.limitations,
              }
            : previous
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to generate AI recommendations."
        );
      } finally {
        setIsGeneratingRecommendations(false);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to calculate the carbon footprint."
      );
      setIsCalculating(false);
      setIsGeneratingRecommendations(false);
    }
  };

  const prepareApplication = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!report) {
      setApplicationMessage(
        "Calculate your carbon footprint before preparing an application."
      );
      return;
    }

    const applicationText = [
      "CARBON CREDIT APPLICATION DRAFT",
      "",
      `Applicant: ${applicantName.trim()}`,
      `Email: ${applicantEmail.trim()}`,
      `Farm location: ${farmLocation.trim()}`,
      `Farm size: ${farmSize} hectares`,
      `Primary crop: ${cropType}`,
      `Irrigation type: ${irrigationType}`,
      `Fertilizer usage: ${fertilizerUsage}`,
      `Power source: ${powerSource}`,
      `Transport distance: ${transportDistance} km`,
      `Estimated carbon footprint: ${report.totalFootprint} tons CO2e`,
      `Estimated reduction potential: ${report.reductionPotential} tons CO2e`,
      "",
      "Status: Draft only. Not submitted to a carbon-credit registry.",
      "All estimates require appropriate validation and independent verification.",
    ].join("\n");

    const blob = new Blob([applicationText], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "carbon-credit-application-draft.txt";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    setApplicationMessage(
      "Application draft downloaded successfully. It has not been submitted to a carbon-credit registry."
    );
  };

  const assessTradeReadiness = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");

    const missing: string[] = [];

    if (!report) {
      missing.push("Calculate the farm carbon footprint first.");
    }

    if (!tradeProjectName.trim()) {
      missing.push("Enter the project name.");
    }

    if (!tradeProjectLocation.trim()) {
      missing.push("Enter the project location.");
    }

    if (!tradeActivity.trim()) {
      missing.push("Select the emissions-reduction activity.");
    }

    if (!tradeProgram.trim()) {
      missing.push("Enter the intended carbon-credit program or methodology.");
    }

    if (!tradeEligibilityConfirmed) {
      missing.push("Confirm that project eligibility has been assessed.");
    }

    if (!tradeMonitoringConfirmed) {
      missing.push("Confirm that monitoring data and supporting records are available.");
    }

    if (tradeVerificationStatus !== "issued") {
      missing.push(
        "Credits must be independently verified and issued before trading."
      );
    }

    const priceText = tradePricePerCredit.trim();
    let indicativeValue: number | null = null;

    if (priceText !== "") {
      const price = Number(priceText);

      if (!Number.isFinite(price) || price < 0) {
        setError("Enter a valid non-negative price per credit.");
        return;
      }

      if (report) {
        indicativeValue = round(report.reductionPotential * price);
      }
    }

    setTradeAssessment({
      ready: missing.length === 0,
      missing,
      indicativeValue,
    });
  };

  const resetTradeAssessment = () => {
    setTradeAssessment(null);
  };

  return (
    <Card className="w-full bg-card text-card-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Leaf className="h-5 w-5 text-primary" />
          Carbon Footprint Calculator &amp; Optimizer
        </CardTitle>

        <p className="text-sm text-muted-foreground">
          Estimate farm emissions and get personalized sustainability
          recommendations powered by Gemini AI.
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant="outline">Indicative estimates</Badge>
          <Badge variant="secondary">
            <Sparkles className="mr-1 h-3 w-3" />
            Gemini recommendations
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="calculator" className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-3">
            <TabsTrigger value="calculator">Calculator</TabsTrigger>
            <TabsTrigger value="report">Carbon Report</TabsTrigger>
            <TabsTrigger value="credits">Carbon Credits</TabsTrigger>
          </TabsList>

          <TabsContent value="calculator" className="space-y-6 pt-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="farmSize">Farm Size (hectares)</Label>
                <Input
                  id="farmSize"
                  type="number"
                  min="0.1"
                  max="100000"
                  step="0.1"
                  value={farmSize}
                  onChange={(event) => setFarmSize(event.target.value)}
                  className="bg-background text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cropType">Primary Crop</Label>
                <select
                  id="cropType"
                  className={selectClass}
                  value={cropType}
                  onChange={(event) => setCropType(event.target.value)}
                >
                  <option className={optionClass} value="wheat">Wheat</option>
                  <option className={optionClass} value="rice">Rice</option>
                  <option className={optionClass} value="maize">Maize</option>
                  <option className={optionClass} value="cotton">Cotton</option>
                  <option className={optionClass} value="soybean">Soybean</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="irrigation">Irrigation Type</Label>
                <select
                  id="irrigation"
                  className={selectClass}
                  value={irrigationType}
                  onChange={(event) => setIrrigationType(event.target.value)}
                >
                  <option className={optionClass} value="drip">Drip Irrigation</option>
                  <option className={optionClass} value="sprinkler">Sprinkler</option>
                  <option className={optionClass} value="flood">Flood Irrigation</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fertilizer">Fertilizer Usage</Label>
                <select
                  id="fertilizer"
                  className={selectClass}
                  value={fertilizerUsage}
                  onChange={(event) => setFertilizerUsage(event.target.value)}
                >
                  <option className={optionClass} value="low">Low (Organic/Minimal)</option>
                  <option className={optionClass} value="medium">Medium (Balanced)</option>
                  <option className={optionClass} value="high">High (Intensive)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="power">Power Source</Label>
                <select
                  id="power"
                  className={selectClass}
                  value={powerSource}
                  onChange={(event) => setPowerSource(event.target.value)}
                >
                  <option className={optionClass} value="solar">Solar Energy</option>
                  <option className={optionClass} value="grid">Grid Electricity</option>
                  <option className={optionClass} value="diesel">Diesel Generator</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transport">Transport Distance (km)</Label>
                <Input
                  id="transport"
                  type="number"
                  min="0"
                  max="1000000"
                  step="1"
                  value={transportDistance}
                  onChange={(event) => setTransportDistance(event.target.value)}
                  className="bg-background text-foreground"
                />
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              onClick={calculateCarbonFootprint}
              disabled={isCalculating || isGeneratingRecommendations}
              className="w-full"
              size="lg"
            >
              {isCalculating || isGeneratingRecommendations ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Calculator className="mr-2 h-4 w-4" />
              )}

              {isCalculating
                ? "Calculating..."
                : isGeneratingRecommendations
                  ? "Generating Gemini Recommendations..."
                  : "Calculate Carbon Footprint"}
            </Button>

            {isGeneratingRecommendations && (
              <p className="text-sm text-muted-foreground">
                Your estimate is ready. Gemini is generating recommendations
                based on your farm selections.
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              Estimates use simplified factors and are not a substitute for a
              verified greenhouse-gas inventory.
            </p>
          </TabsContent>

          <TabsContent value="report" className="space-y-6 pt-4">
            {!report ? (
              <p className="py-8 text-center text-muted-foreground">
                Calculate your footprint to view the report.
              </p>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Leaf className="mx-auto mb-2 h-6 w-6 text-red-500" />
                      <p className="text-sm text-muted-foreground">
                        Estimated Footprint
                      </p>
                      <p className="text-xl font-bold text-red-600">
                        {report.totalFootprint.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">tons CO2e</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 text-center">
                      <TrendingUp className="mx-auto mb-2 h-6 w-6 text-green-600" />
                      <p className="text-sm text-muted-foreground">
                        Potential Reduction
                      </p>
                      <p className="text-xl font-bold text-green-600">
                        {report.reductionPotential.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">tons CO2e</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 text-center">
                      <Award className="mx-auto mb-2 h-6 w-6 text-blue-500" />
                      <p className="text-sm text-muted-foreground">
                        Estimated Credit Potential
                      </p>
                      <p className="text-xl font-bold text-blue-600">
                        {report.estimatedCredits.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Not certified credits
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 text-center">
                      <Target className="mx-auto mb-2 h-6 w-6 text-purple-500" />
                      <p className="text-sm text-muted-foreground">
                        Indicative Score
                      </p>
                      <p className={`text-xl font-bold ${getScoreColor(report.sustainabilityScore)}`}>
                        {report.sustainabilityScore}/100
                      </p>
                      <p className={`text-xs ${getScoreColor(report.sustainabilityScore)}`}>
                        {getScoreLabel(report.sustainabilityScore)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Emissions Breakdown</CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-5">
                    {report.calculations.map((item) => {
                      const reductionPercent =
                        item.current > 0
                          ? Math.round((item.savings / item.current) * 100)
                          : 0;

                      return (
                        <div key={item.category} className="space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium">{item.category}</span>
                            <Badge variant="outline">
                              {reductionPercent}% potential reduction
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                            <div>
                              <p className="text-muted-foreground">Current estimate</p>
                              <p className="font-semibold text-red-600">
                                {item.current.toFixed(2)} {item.unit}
                              </p>
                            </div>

                            <div>
                              <p className="text-muted-foreground">Optimized estimate</p>
                              <p className="font-semibold text-green-600">
                                {item.optimized.toFixed(2)} {item.unit}
                              </p>
                            </div>

                            <div>
                              <p className="text-muted-foreground">Potential savings</p>
                              <p className="font-semibold text-blue-600">
                                {item.savings.toFixed(2)} {item.unit}
                              </p>
                            </div>
                          </div>

                          <Progress value={reductionPercent} className="h-2 w-full" />
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Gemini AI Recommendations
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {report.summary && (
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {report.summary}
                      </p>
                    )}

                    {isGeneratingRecommendations && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating personalized recommendations...
                      </div>
                    )}

                    {report.recommendations.length > 0 ? (
                      <div className="space-y-3">
                        {report.recommendations.map((recommendation, index) => (
                          <div
                            key={`${index}-${recommendation}`}
                            className="flex items-start gap-3"
                          >
                            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                            <p className="text-sm leading-relaxed">
                              {recommendation}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      !isGeneratingRecommendations && (
                        <p className="text-sm text-muted-foreground">
                          Recommendations are unavailable. Check the error
                          message on the Calculator tab and try again.
                        </p>
                      )
                    )}

                    <div className="rounded-lg border border-border bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
                      {report.limitations}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="credits" className="space-y-6 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Carbon Credit Potential</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <div className="text-center">
                    <Award className="mx-auto mb-2 h-8 w-8 text-green-600" />
                    <p className="font-semibold">Estimated Potential</p>
                    <p className="text-2xl font-bold text-green-600">
                      {report ? report.estimatedCredits.toFixed(2) : "—"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Not verified or issued
                    </p>
                  </div>

                  <div className="text-center">
                    <TrendingUp className="mx-auto mb-2 h-8 w-8 text-blue-600" />
                    <p className="font-semibold">Market Value</p>
                    <p className="text-xl font-bold">Not estimated</p>
                    <p className="text-sm text-muted-foreground">
                      Requires a verified project and market assessment
                    </p>
                  </div>

                  <div className="text-center">
                    <Recycle className="mx-auto mb-2 h-8 w-8 text-purple-600" />
                    <p className="font-semibold">Potential CO2 Reduction</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {report ? report.reductionPotential.toFixed(2) : "—"}
                    </p>
                    <p className="text-sm text-muted-foreground">tons CO2e</p>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    This calculator does not issue carbon credits. Actual credits
                    require eligible activities, a recognized methodology,
                    monitoring, independent verification and issuance through an
                    applicable carbon-credit program.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Button
                    className="w-full"
                    onClick={() => {
                      setApplicationMessage("");
                      setCreditDialog("apply");
                    }}
                  >
                    <Award className="mr-2 h-4 w-4" />
                    Apply for Credits
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      resetTradeAssessment();
                      setCreditDialog("trade");
                    }}
                  >
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Trade Credits
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sustainable Practices</CardTitle>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {[
                    {
                      icon: Trees,
                      title: "Agroforestry",
                      desc: "Consider suitable tree planting and farm biodiversity practices.",
                    },
                    {
                      icon: Droplets,
                      title: "Water Conservation",
                      desc: "Use efficient irrigation, soil-moisture monitoring and rainwater harvesting.",
                    },
                    {
                      icon: Leaf,
                      title: "Soil Health",
                      desc: "Use soil testing and nutrient management to guide fertilizer application.",
                    },
                    {
                      icon: Sun,
                      title: "Renewable Energy",
                      desc: "Evaluate solar-powered pumps and other suitable renewable energy options.",
                    },
                  ].map((practice) => {
                    const Icon = practice.icon;

                    return (
                      <div
                        key={practice.title}
                        className="rounded-lg border border-border bg-card p-4"
                      >
                        <div className="mb-2 flex items-center gap-3">
                          <Icon className="h-5 w-5 text-green-600" />
                          <span className="font-medium">{practice.title}</span>
                        </div>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {practice.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>

      {creditDialog && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setCreditDialog(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="credit-dialog-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-background p-6 text-foreground shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            {creditDialog === "apply" ? (
              <>
                <div className="mb-4 flex items-center gap-3">
                  <Award className="h-7 w-7 text-green-600" />
                  <h2 id="credit-dialog-title" className="text-xl font-bold">
                    Apply for Carbon Credits
                  </h2>
                </div>

                <p className="mb-4 text-sm text-muted-foreground">
                  Prepare a draft application using your farm information.
                  This form does not submit an application to a registry.
                </p>

                <div className="mb-5 rounded-lg border border-border bg-muted/40 p-4">
                  <p className="text-sm text-muted-foreground">
                    Estimated reduction potential
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {report ? report.reductionPotential.toFixed(2) : "0.00"} tons CO2e
                  </p>
                </div>

                <form className="space-y-4" onSubmit={prepareApplication}>
                  <div className="space-y-2">
                    <Label htmlFor="applicantName">Applicant name</Label>
                    <Input
                      id="applicantName"
                      value={applicantName}
                      onChange={(event) => setApplicantName(event.target.value)}
                      placeholder="Enter applicant name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="applicantEmail">Email address</Label>
                    <Input
                      id="applicantEmail"
                      type="email"
                      value={applicantEmail}
                      onChange={(event) => setApplicantEmail(event.target.value)}
                      placeholder="Enter email address"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="farmLocation">Farm location</Label>
                    <Input
                      id="farmLocation"
                      value={farmLocation}
                      onChange={(event) => setFarmLocation(event.target.value)}
                      placeholder="Village, district, state"
                      required
                    />
                  </div>

                  {applicationMessage && (
                    <div
                      role="status"
                      className="rounded-lg border border-border bg-muted/50 p-3 text-sm"
                    >
                      {applicationMessage}
                    </div>
                  )}

                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreditDialog(null)}
                    >
                      Close
                    </Button>

                    <Button type="submit">
                      <Award className="mr-2 h-4 w-4" />
                      Prepare Application
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="mb-4 flex items-center gap-3">
                  <TrendingUp className="h-7 w-7 text-blue-600" />
                  <h2 id="credit-dialog-title" className="text-xl font-bold">
                    Trade Readiness Assessment
                  </h2>
                </div>

                <p className="mb-4 text-sm text-muted-foreground">
                  Enter your project information to assess trading readiness.
                  This assessment is informational and does not connect to a
                  registry or marketplace.
                </p>

                <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-sm text-muted-foreground">
                      Estimated reduction
                    </p>
                    <p className="text-xl font-bold text-green-600">
                      {report ? report.reductionPotential.toFixed(2) : "0.00"}
                    </p>
                    <p className="text-xs text-muted-foreground">tons CO2e</p>
                  </div>

                  <div className="rounded-lg border border-border p-4">
                    <p className="text-sm text-muted-foreground">
                      Price per credit
                    </p>
                    <p className="text-xl font-bold">
                      {tradePricePerCredit.trim() !== "" &&
                      Number.isFinite(Number(tradePricePerCredit)) &&
                      Number(tradePricePerCredit) >= 0
                        ? `₹${Number(tradePricePerCredit).toLocaleString("en-IN")}`
                        : "Not provided"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      User-provided price
                    </p>
                  </div>
                </div>

                <form className="space-y-4" onSubmit={assessTradeReadiness}>
                  <div className="space-y-2">
                    <Label htmlFor="tradeProjectName">Project name</Label>
                    <Input
                      id="tradeProjectName"
                      value={tradeProjectName}
                      onChange={(event) => {
                        setTradeProjectName(event.target.value);
                        setTradeAssessment(null);
                      }}
                      placeholder="Enter your project name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tradeProjectLocation">Project location</Label>
                    <Input
                      id="tradeProjectLocation"
                      value={tradeProjectLocation}
                      onChange={(event) => {
                        setTradeProjectLocation(event.target.value);
                        setTradeAssessment(null);
                      }}
                      placeholder="Village, district, state, country"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tradeActivity">
                      Emissions-reduction activity
                    </Label>
                    <select
                      id="tradeActivity"
                      className={selectClass}
                      value={tradeActivity}
                      onChange={(event) => {
                        setTradeActivity(event.target.value);
                        setTradeAssessment(null);
                      }}
                      required
                    >
                      <option className={optionClass} value="">
                        Select an activity
                      </option>
                      <option className={optionClass} value="Agroforestry">
                        Agroforestry or tree planting
                      </option>
                      <option className={optionClass} value="Renewable energy">
                        Renewable energy
                      </option>
                      <option className={optionClass} value="Efficient irrigation">
                        Efficient irrigation
                      </option>
                      <option className={optionClass} value="Soil carbon management">
                        Soil carbon management
                      </option>
                      <option className={optionClass} value="Other">
                        Other
                      </option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tradeProgram">
                      Carbon-credit program or methodology
                    </Label>
                    <Input
                      id="tradeProgram"
                      value={tradeProgram}
                      onChange={(event) => {
                        setTradeProgram(event.target.value);
                        setTradeAssessment(null);
                      }}
                      placeholder="Enter the program or methodology, if known"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tradeVerificationStatus">
                      Verification and issuance status
                    </Label>
                    <select
                      id="tradeVerificationStatus"
                      className={selectClass}
                      value={tradeVerificationStatus}
                      onChange={(event) => {
                        setTradeVerificationStatus(event.target.value);
                        setTradeAssessment(null);
                      }}
                    >
                      <option className={optionClass} value="not-verified">
                        Not independently verified
                      </option>
                      <option className={optionClass} value="verified">
                        Verified, but credits not issued
                      </option>
                      <option className={optionClass} value="issued">
                        Credits issued by a recognized program
                      </option>
                    </select>
                  </div>

                  <div className="space-y-3 rounded-lg border border-border p-4">
                    <p className="font-medium">Project checks</p>

                    <label className="flex cursor-pointer items-start gap-3 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-primary"
                        checked={tradeEligibilityConfirmed}
                        onChange={(event) => {
                          setTradeEligibilityConfirmed(event.target.checked);
                          setTradeAssessment(null);
                        }}
                      />
                      <span>
                        I have assessed the project's eligibility under the
                        intended carbon-credit program.
                      </span>
                    </label>

                    <label className="flex cursor-pointer items-start gap-3 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-primary"
                        checked={tradeMonitoringConfirmed}
                        onChange={(event) => {
                          setTradeMonitoringConfirmed(event.target.checked);
                          setTradeAssessment(null);
                        }}
                      />
                      <span>
                        Monitoring data and supporting project records are
                        available.
                      </span>
                    </label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tradePricePerCredit">
                      Indicative price per credit (₹, optional)
                    </Label>
                    <Input
                      id="tradePricePerCredit"
                      type="number"
                      min="0"
                      step="0.01"
                      value={tradePricePerCredit}
                      onChange={(event) => {
                        setTradePricePerCredit(event.target.value);
                        setTradeAssessment(null);
                      }}
                      placeholder="Enter a price per credit"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter a price from a credible source. This is not a live
                      market quote, and estimated reductions are not issued
                      credits.
                    </p>
                  </div>

                  <Button type="submit" className="w-full">
                    <Calculator className="mr-2 h-4 w-4" />
                    Assess Trade Readiness
                  </Button>
                </form>

                {tradeAssessment && (
                  <div className="mt-5 space-y-4 rounded-lg border border-border p-4">
                    <h3 className="font-semibold">Assessment Results</h3>

                    <Badge
                      variant="outline"
                      className={
                        tradeAssessment.ready
                          ? "border-green-600 text-green-700"
                          : "border-amber-600 text-amber-700"
                      }
                    >
                      {tradeAssessment.ready
                        ? "Self-reported checks completed"
                        : "Additional requirements remain"}
                    </Badge>

                    {tradeAssessment.missing.length > 0 && (
                      <div>
                        <p className="mb-2 text-sm font-medium">
                          Items requiring attention
                        </p>
                        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                          {tradeAssessment.missing.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {tradeAssessment.indicativeValue !== null ? (
                      <div className="rounded-lg border border-border bg-muted/40 p-4">
                        <p className="text-sm text-muted-foreground">
                          Hypothetical value based on estimated reduction ×
                          your price
                        </p>
                        <p className="text-2xl font-bold">
                          ₹{tradeAssessment.indicativeValue.toLocaleString("en-IN")}
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                          This is an illustrative calculation, not the value of
                          tradeable credits. It assumes the estimated reduction
                          could be priced at the amount entered. Actual value
                          depends on eligible, verified and issued credits,
                          program rules, fees and a real buyer's price.
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No indicative value calculated. Enter a price per
                        credit and reassess to see a hypothetical estimate.
                      </p>
                    )}

                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm leading-relaxed">
                      This is a self-reported assessment only. Farm Intellect
                      does not independently validate the information, issue
                      credits, confirm registry status or execute trades. Even
                      when all checks are selected, eligibility and tradeability
                      must be confirmed by the relevant program or registry.
                    </div>
                  </div>
                )}

                <div className="mt-5 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreditDialog(null)}
                  >
                    Close
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};
