
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Camera,
  Scan,
  AlertTriangle,
  CheckCircle,
  Leaf,
  Bug,
  Droplets,
  Upload,
  RotateCcw
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import ReactMarkdown from "react-markdown";

interface DiseaseResult {
  disease: string;
  confidence: number;
  severity: string;
  treatment: string;
  prevention: string;
  fullAnalysis: string;
}

export const AICropDiseaseScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<DiseaseResult | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cropType, setCropType] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeWithAI = async () => {
    if (!selectedFile || !cropType.trim()) {
      toast.error("Please upload an image and enter the crop name.");
      return;
    }

    setIsScanning(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("cropType", cropType.trim());

      const response = await apiFetch<{
        detection: {
          disease: string;
          confidence: number;
          severity: string;
          description: string;
          treatment?: {
            chemical?: string[];
            organic?: string[];
            cultural?: string[];
          };
          prevention?: string[];
        };
      }>("/api/ai/detect-disease", {
        method: "POST",
        body: formData,
      });

      const detection = response.detection;
      const treatments = [
        ...(detection.treatment?.chemical || []),
        ...(detection.treatment?.organic || []),
        ...(detection.treatment?.cultural || []),
      ];

      setResult({
        disease: detection.disease,
        confidence: detection.confidence,
        severity: detection.severity,
        treatment: treatments.join("\n") || "No treatment recommendation available.",
        prevention: detection.prevention?.join("\n") || "No prevention advice available.",
        fullAnalysis: detection.description || "",
      });

      toast.success("Image analysis completed!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Disease analysis failed.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Please select an image smaller than 5MB.");
      return;
    }

    setSelectedFile(file);
    setResult(null);
    setUploadedImage(URL.createObjectURL(file));
    toast.success("Image uploaded. Enter the crop name and scan.");
  };

  const resetScanner = () => {
    setSelectedFile(null);
    setUploadedImage(null);
    setResult(null);
    setCropType("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "high":
      case "critical":
        return "text-red-600 bg-red-50";
      case "medium":
        return "text-yellow-600 bg-yellow-50";
      case "low":
        return "text-green-600 bg-green-50";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scan className="h-5 w-5 text-primary" />
          AI Crop Disease Scanner
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Upload a crop image and enter the crop name for disease analysis.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />

          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            size="sm"
          >
            <Upload className="h-4 w-4 mr-1" />
            Upload Image
          </Button>

          <Button onClick={resetScanner} variant="outline" size="sm">
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>

        {uploadedImage && (
          <img
            src={uploadedImage}
            alt="Uploaded crop"
            className="w-full max-w-md h-48 object-cover rounded-lg border"
          />
        )}

        <div>
          <label className="text-sm font-medium">Crop Type</label>
          <input
            className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background"
            placeholder="e.g., Wheat, Rice, Cotton, Tomato"
            value={cropType}
            onChange={(e) => setCropType(e.target.value)}
          />
        </div>

        <Button
          onClick={analyzeWithAI}
          disabled={isScanning || !selectedFile || !cropType.trim()}
          className="w-full"
        >
          {isScanning ? (
            <>
              <Scan className="h-4 w-4 mr-2 animate-spin" />
              Analyzing image...
            </>
          ) : (
            <>
              <Scan className="h-4 w-4 mr-2" />
              Start AI Analysis
            </>
          )}
        </Button>

        {isScanning && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Leaf className="h-4 w-4 text-green-500" />
              <span className="text-sm">Analyzing uploaded image...</span>
            </div>
            <Progress value={50} />
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-orange-500" />
              <span className="text-sm">Preparing diagnosis...</span>
            </div>
            <Progress value={80} />
          </div>
        )}

        {result && (
          <div className="space-y-4 p-4 border rounded-lg bg-card">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold">{result.disease}</h3>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={getSeverityColor(result.severity)}
                >
                  {result.severity.toUpperCase()}
                </Badge>
                <Badge variant="secondary">
                  {result.confidence}% confidence
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-blue-500" />
                <span className="font-medium">Treatment</span>
              </div>
              <div className="text-sm text-muted-foreground pl-6 whitespace-pre-line">
                {result.treatment}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="font-medium">Prevention</span>
              </div>
              <div className="text-sm text-muted-foreground pl-6 whitespace-pre-line">
                {result.prevention}
              </div>
            </div>

            {result.fullAnalysis && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Detailed Analysis</h4>
                <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                  <ReactMarkdown>{result.fullAnalysis}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}

        {!uploadedImage && (
          <div className="text-center p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
            <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">AI Disease Detection</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Upload a photo and enter the crop name to analyze it.
            </p>
            <div className="flex justify-center gap-4 text-xs text-muted-foreground">
              <span>Image analysis</span>
              <span>Diagnosis</span>
              <span>Treatment advice</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};