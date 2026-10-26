
import { useState, useCallback, useMemo } from "react";
import type { ChangeEvent } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload,
  Camera,
  Scan,
  Brain,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Activity,
  X,
  ShieldCheck,
  Sprout,
  ClipboardList,
  Info,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";

interface ScanMedicine {
  name: string;
  dosage: string;
  type: string;
}

interface RelatedPest {
  name: string;
  damage: string;
}

interface ScanResult {
  disease: string;
  confidence: number;
  severity: string;
  category: string;
  yieldLoss: string | null;
  description: string;
  affectedParts: string[];
  treatment: {
    immediate: string;
    followup: string;
    prevention: string;
  };
  medicines: ScanMedicine[];
  organic: string[];
  preventionTips: string[];
  relatedPests: RelatedPest[];
}

interface DetectionResponse {
  detection: {
    disease?: string;
    confidence?: number;
    severity?: string;
    category?: string;
    description?: string;
    symptomsDetected?: string[];
    treatment?: {
      chemical?: string[];
      organic?: string[];
      cultural?: string[];
    };
    prevention?: string[];
    yieldLossEstimate?: string;
    urgency?: string;
    alternativeDiagnoses?: Array<{
      disease: string;
      confidence: number;
    }>;
  };
}

const severityLabel = (severity: string) => {
  const value = severity.toLowerCase();

  if (value === "critical") return "Critical";
  if (value === "high") return "High";
  if (value === "medium") return "Medium";
  if (value === "low") return "Low";

  return "Not assessed";
};

const severityVariant = (
  severity: string,
): "destructive" | "secondary" | "outline" => {
  const value = severity.toLowerCase();

  if (value === "critical" || value === "high") return "destructive";
  if (value === "medium") return "secondary";

  return "outline";
};

const cleanText = (value: unknown, fallback = ""): string => {
  if (typeof value !== "string") return fallback;
  return value.trim() || fallback;
};

const cleanList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is string =>
      typeof item === "string" && item.trim().length > 0,
  ).map((item) => item.trim());
};

const getImmediateAdvice = (
  disease: string,
  symptoms: string[],
  urgency: string,
): string => {
  const diseaseName = disease.toLowerCase();
  const symptomText = symptoms.join(" ").toLowerCase();

  if (
    diseaseName.includes("fusarium ear rot") ||
    diseaseName.includes("ear rot")
  ) {
    return "Inspect nearby ears for similar damage. Keep visibly mouldy ears separate from healthy grain. Do not use mouldy grain as food or animal feed until its safety has been assessed.";
  }

  if (
    diseaseName.includes("unknown") ||
    diseaseName.includes("uncertain") ||
    diseaseName.includes("unidentified")
  ) {
    return "The disease has not been identified reliably. Take clear photos of the affected leaves, stems and fruits, and ask a local agricultural officer to confirm the problem before treating the crop.";
  }

  if (
    symptomText.includes("wilting") ||
    symptomText.includes("rotting") ||
    symptomText.includes("decaying")
  ) {
    return "Inspect the affected plants and check soil moisture and drainage. Avoid moving soil or plant material from affected areas to healthy parts of the field until the cause is clearer.";
  }

  if (urgency === "immediate") {
    return "Inspect the affected plants and nearby crops today. If the problem is spreading quickly, contact a local agricultural officer for confirmation and urgent crop-specific advice.";
  }

  return "Inspect several affected plants and compare them with healthy plants. Take clear photos and confirm the cause before applying any pesticide, fungicide or other treatment.";
};

const getFollowupAdvice = (urgency: string): string => {
  if (urgency === "immediate") {
    return "Check the affected area again as soon as practical. Record whether new plants are showing symptoms and seek prompt advice from a local agricultural expert.";
  }

  if (urgency === "within_week") {
    return "Recheck affected and nearby plants over the next few days. Note whether the symptoms are increasing, spreading or staying the same.";
  }

  return "Monitor the affected plants regularly. If symptoms spread or worsen, obtain a confirmed diagnosis before deciding on treatment.";
};

const AICropScanner = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult | null>(null);
  const [cropType, setCropType] = useState("");

  const { toast } = useToast();
  const { user } = useCurrentUser();

  const aiStats = {
    totalScans: 1247,
    diseasesDetected: 89,
    accuracy: 94.2,
    preventionTips: 156,
  };

  const recentScans = [
    {
      id: "SC001",
      farmer: "Rajesh Kumar",
      crop: "Wheat",
      disease: "Leaf Rust",
      confidence: 92,
      status: "treated",
      timestamp: "2 hours ago",
    },
    {
      id: "SC002",
      farmer: "Priya Singh",
      crop: "Rice",
      disease: "Blast Disease",
      confidence: 87,
      status: "pending",
      timestamp: "4 hours ago",
    },
    {
      id: "SC003",
      farmer: "Mohan Patel",
      crop: "Cotton",
      disease: "Bollworm",
      confidence: 95,
      status: "treated",
      timestamp: "1 day ago",
    },
  ];

  const localMlCandidates = useMemo(() => {
    if (!scanResults) return [];

    return scanResults.relatedPests;
  }, [scanResults]);

  const handleImageSelect = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file",
          description: "Please select an image file.",
          variant: "destructive",
        });
        event.target.value = "";
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Image too large",
          description: "Please select an image smaller than 5 MB.",
          variant: "destructive",
        });
        event.target.value = "";
        return;
      }

      if (previewUrl) URL.revokeObjectURL(previewUrl);

      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setScanResults(null);
    },
    [previewUrl, toast],
  );

  const handleScan = async () => {
    if (!selectedImage || !cropType.trim()) {
      toast({
        title: "Missing information",
        description: "Select a crop image and enter the crop name first.",
        variant: "destructive",
      });
      return;
    }

    setScanning(true);
    setScanResults(null);

    try {
      const formData = new FormData();
      formData.append("image", selectedImage);
      formData.append("cropType", cropType.trim());

      const response = await apiFetch<DetectionResponse>(
        "/api/ai/detect-disease",
        {
          method: "POST",
          body: formData,
        },
      );

      const detection = response?.detection;

      if (!detection || !detection.disease) {
        throw new Error(
          "The scan did not return a clear result. Please try another image.",
        );
      }

      const chemicalTreatments = cleanList(detection.treatment?.chemical);
      const organicTreatments = cleanList(detection.treatment?.organic);
      const culturalTreatments = cleanList(detection.treatment?.cultural);
      const preventionTips = cleanList(detection.prevention);
      const symptoms = cleanList(detection.symptomsDetected);

      const urgency = cleanText(detection.urgency).toLowerCase();
      const category = cleanText(detection.category, "Unconfirmed");
      const disease = cleanText(detection.disease, "Unidentified problem");

      const medicines: ScanMedicine[] = chemicalTreatments
        .slice(0, 3)
        .map((item) => {
          const separatorIndex = item.indexOf("@");

          const name =
            separatorIndex >= 0
              ? item.slice(0, separatorIndex).trim()
              : item.trim();

          const dosage =
            separatorIndex >= 0
              ? item.slice(separatorIndex + 1).trim()
              : "Check the approved product label and local expert guidance.";

          return {
            name,
            dosage: dosage || "Check the approved product label.",
            type: category,
          };
        })
        .filter((item) => item.name.length > 0);

      const rawConfidence = Number(detection.confidence);
      const confidence = Number.isFinite(rawConfidence)
        ? Math.max(0, Math.min(100, Math.round(rawConfidence)))
        : 0;

      const severity = cleanText(detection.severity, "unknown").toLowerCase();

      const result: ScanResult = {
        disease,
        confidence,
        severity,
        category,
        yieldLoss:
          typeof detection.yieldLossEstimate === "string" &&
          detection.yieldLossEstimate.trim()
            ? detection.yieldLossEstimate.trim()
            : null,
        description: cleanText(
          detection.description,
          "The image has been analysed, but the symptoms need to be checked against the actual plant.",
        ),
        affectedParts: symptoms,
        treatment: {
          immediate: getImmediateAdvice(disease, symptoms, urgency),
          followup: getFollowupAdvice(urgency),
          prevention:
            culturalTreatments[0] ||
            preventionTips[0] ||
            "Keep the field under regular observation, use healthy planting material and follow crop-specific advice from your local agricultural department.",
        },
        medicines,
        organic: organicTreatments,
        preventionTips,
        relatedPests: (detection.alternativeDiagnoses || [])
          .filter(
            (alt) =>
              typeof alt?.disease === "string" &&
              alt.disease.trim().length > 0,
          )
          .slice(0, 3)
          .map((alt) => ({
            name: alt.disease,
            damage:
              typeof alt.confidence === "number"
                ? `Alternative possibility reported by the model (${Math.round(Math.max(0, Math.min(100, alt.confidence)))}% model confidence). This is not a confirmed diagnosis.`
                : "Alternative possibility. This is not a confirmed diagnosis.",
          })),
      };

      setScanResults(result);

      toast({
        title: "Scan completed",
        description:
          "Review the findings and confirm the diagnosis before treatment.",
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to analyse the crop image.";

      toast({
        title: "Scan failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  };

  const clearImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setSelectedImage(null);
    setPreviewUrl(null);
    setScanResults(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        user={{ name: user.name, role: "farmer" }}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        notificationCount={5}
      />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole="farmer"
      />

      <main className="p-4 md:ml-64 md:p-6">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground md:text-3xl">
                <Brain className="h-8 w-8 text-primary" />
                AI Crop Disease Scanner
              </h2>
              <p className="mt-2 text-muted-foreground">
                Check possible crop problems and understand what to do next.
              </p>
            </div>
            <Badge variant="outline">AI-assisted screening</Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Scans
                </CardTitle>
                <Scan className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{aiStats.totalScans}</div>
                <p className="text-xs text-muted-foreground">
                  Demo dashboard statistic
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Diseases Detected
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {aiStats.diseasesDetected}
                </div>
                <p className="text-xs text-muted-foreground">
                  Demo dashboard statistic
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Displayed Accuracy
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{aiStats.accuracy}%</div>
                <p className="text-xs text-muted-foreground">
                  Demo statistic, not a guarantee for this scan
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Prevention Tips
                </CardTitle>
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {aiStats.preventionTips}
                </div>
                <p className="text-xs text-muted-foreground">
                  Demo dashboard statistic
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="space-y-6 xl:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Scan Your Crop
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="crop-type">What crop are you growing?</Label>
                    <Input
                      id="crop-type"
                      placeholder="e.g. Maize, wheat, rice or tomato"
                      value={cropType}
                      onChange={(event) => setCropType(event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="image-upload">Upload a clear crop image</Label>
                    <Input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      Choose a well-lit image of the affected leaf, stem, fruit
                      or ear. Maximum size: 5 MB.
                    </p>
                  </div>

                  {previewUrl && (
                    <div className="relative">
                      <div className="aspect-video overflow-hidden rounded-lg border bg-muted">
                        <img
                          src={previewUrl}
                          alt="Selected crop for disease screening"
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Remove selected image"
                        className="absolute right-2 top-2"
                        onClick={clearImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  <Button
                    onClick={handleScan}
                    disabled={!selectedImage || !cropType.trim() || scanning}
                    className="w-full"
                    size="lg"
                  >
                    {scanning ? (
                      <>
                        <Activity className="mr-2 h-4 w-4 animate-spin" />
                        Checking your crop...
                      </>
                    ) : (
                      <>
                        <Brain className="mr-2 h-4 w-4" />
                        Check for Crop Problems
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {scanResults && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-primary" />
                      Your Crop Check Results
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      These are AI-generated findings. Check them against the
                      actual plant before taking action.
                    </p>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    <section className="space-y-3 rounded-lg border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm text-muted-foreground">
                            Crop: {cropType.trim()}
                          </p>
                          <h3 className="mt-1 text-xl font-bold">
                            {scanResults.disease}
                          </h3>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Category: {scanResults.category}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={severityVariant(scanResults.severity)}>
                            {severityLabel(scanResults.severity)} risk
                          </Badge>
                          <Badge variant="outline">
                            {scanResults.confidence}% model confidence
                          </Badge>
                        </div>
                      </div>

                      <div className="rounded-md bg-muted p-3">
                        <p className="flex items-center gap-2 font-medium">
                          <Info className="h-4 w-4 shrink-0" />
                          What does this mean?
                        </p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {scanResults.description}
                        </p>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Model confidence is not the same as verified diagnostic
                        accuracy. Yield loss is not estimated unless the model
                        provides an estimate.
                      </p>

                      {scanResults.yieldLoss && (
                        <p className="text-sm">
                          <strong>Possible yield loss:</strong>{" "}
                          {scanResults.yieldLoss}
                        </p>
                      )}
                    </section>

                    {scanResults.affectedParts.length > 0 && (
                      <section className="space-y-2">
                        <h4 className="flex items-center gap-2 font-semibold">
                          <AlertTriangle className="h-4 w-4" />
                          Signs found in the image
                        </h4>
                        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                          {scanResults.affectedParts.map((part, index) => (
                            <li key={`${part}-${index}`}>{part}</li>
                          ))}
                        </ul>
                      </section>
                    )}

                    <section className="space-y-3">
                      <h4 className="flex items-center gap-2 font-semibold">
                        <ClipboardList className="h-4 w-4" />
                        What should you do now?
                      </h4>

                      <div className="space-y-3 rounded-lg border p-4">
                        <div>
                          <p className="font-medium">1. First step</p>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {scanResults.treatment.immediate}
                          </p>
                        </div>

                        <div className="border-t pt-3">
                          <p className="font-medium">2. Check again</p>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {scanResults.treatment.followup}
                          </p>
                        </div>

                        <div className="border-t pt-3">
                          <p className="font-medium">3. Reduce future risk</p>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {scanResults.treatment.prevention}
                          </p>
                        </div>
                      </div>
                    </section>

                    {scanResults.medicines.length > 0 && (
                      <section className="space-y-3">
                        <h4 className="font-semibold">
                          Treatment suggestions returned by the AI
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          These suggestions have not been independently
                          verified by this screen. Confirm that any product
                          is approved for this crop and disease in your area.
                          Follow its official label and local expert advice.
                        </p>

                        <div className="space-y-2">
                          {scanResults.medicines.map((medicine, index) => (
                            <div
                              key={`${medicine.name}-${index}`}
                              className="space-y-1 rounded-lg border p-3"
                            >
                              <p className="font-medium">{medicine.name}</p>
                              <p className="text-sm text-muted-foreground">
                                Type: {medicine.type}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Guidance: {medicine.dosage}
                              </p>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {scanResults.organic.length > 0 && (
                      <section className="space-y-2">
                        <h4 className="flex items-center gap-2 font-semibold">
                          <Sprout className="h-4 w-4" />
                          Other suggestions from the AI
                        </h4>
                        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                          {scanResults.organic.map((item, index) => (
                            <li key={`${item}-${index}`}>{item}</li>
                          ))}
                        </ul>
                        <p className="text-xs text-muted-foreground">
                          Confirm suitability for your crop and the identified
                          problem before using any suggested remedy.
                        </p>
                      </section>
                    )}

                    {scanResults.preventionTips.length > 0 && (
                      <section className="space-y-2">
                        <h4 className="font-semibold">
                          More prevention advice
                        </h4>
                        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                          {scanResults.preventionTips.map((tip, index) => (
                            <li key={`${tip}-${index}`}>{tip}</li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {localMlCandidates.length > 0 && (
                      <section className="space-y-2">
                        <h4 className="font-semibold">
                          Other possible diagnoses
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          These are alternatives suggested by the model, not
                          confirmed diseases.
                        </p>
                        {localMlCandidates.map((candidate, index) => (
                          <div
                            key={`${candidate.name}-${index}`}
                            className="rounded-lg border p-3"
                          >
                            <p className="font-medium">{candidate.name}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {candidate.damage}
                            </p>
                          </div>
                        ))}
                      </section>
                    )}

                    <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
                      <p className="flex items-center gap-2 font-semibold">
                        <ShieldCheck className="h-5 w-5 shrink-0" />
                        Before you treat the crop
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        A photo alone may not confirm a disease. If the
                        diagnosis is uncertain, the crop is deteriorating, or
                        you are considering a chemical treatment, consult your
                        local agricultural officer or Krishi Vigyan Kendra.
                        Use only products approved for the crop and problem,
                        following the product label.
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={clearImage}
                    >
                      Scan Another Image
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Scans
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Sample records displayed by this demo screen.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentScans.map((scan) => (
                  <div
                    key={scan.id}
                    className="space-y-2 rounded-lg border p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{scan.farmer}</p>
                        <p className="text-xs text-muted-foreground">
                          {scan.crop}
                        </p>
                      </div>
                      <Badge
                        variant={
                          scan.status === "treated" ? "default" : "secondary"
                        }
                      >
                        {scan.status}
                      </Badge>
                    </div>

                    <p className="text-sm font-medium">{scan.disease}</p>
                    <p className="text-xs text-muted-foreground">
                      {scan.confidence}% model confidence · {scan.timestamp}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AICropScanner;
