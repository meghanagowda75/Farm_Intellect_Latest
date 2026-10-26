import { useState } from "react";
import type { CropInfo } from "@/data/cropsData";
import { cropsData } from "@/data/cropsData";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Droplets,
  Calendar,
  TrendingUp,
  DollarSign,
  Leaf,
  X,
} from "lucide-react";

export const SeasonalCropGuide = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSeason, setSelectedSeason] = useState("all");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [selectedCrop, setSelectedCrop] = useState<CropInfo | null>(null);

  const filteredCrops = cropsData.filter((crop) => {
    const term = searchTerm.toLowerCase();

    const matchesSearch =
      crop.name.toLowerCase().includes(term) ||
      crop.hindi.toLowerCase().includes(term) ||
      crop.punjabi.toLowerCase().includes(term);

    const matchesSeason =
      selectedSeason === "all" || crop.season === selectedSeason;

    const matchesRegion =
      selectedRegion === "all" || crop.region.includes(selectedRegion);

    const matchesDifficulty =
      selectedDifficulty === "all" ||
      crop.difficulty === selectedDifficulty;

    return (
      matchesSearch &&
      matchesSeason &&
      matchesRegion &&
      matchesDifficulty
    );
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-100 text-green-700";
      case "Medium":
        return "bg-yellow-100 text-yellow-700";
      case "Hard":
        return "bg-red-100 text-red-700";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getProfitabilityColor = (profitability: string) => {
    switch (profitability) {
      case "High":
        return "text-green-600";
      case "Medium":
        return "text-yellow-600";
      case "Low":
        return "text-red-600";
      default:
        return "text-muted-foreground";
    }
  };

  const getWaterColor = (water: string) => {
    switch (water) {
      case "Low":
        return "text-blue-400";
      case "Medium":
        return "text-blue-600";
      case "High":
        return "text-blue-800";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-primary" />
            Seasonal Crop Guide
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search crops..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-10"
              />
            </div>

            <Select
              value={selectedSeason}
              onValueChange={setSelectedSeason}
            >
              <SelectTrigger>
                <SelectValue placeholder="Season" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Seasons</SelectItem>
                <SelectItem value="rabi">Rabi (Winter)</SelectItem>
                <SelectItem value="kharif">Kharif (Monsoon)</SelectItem>
                <SelectItem value="summer">Summer</SelectItem>
                <SelectItem value="perennial">Perennial</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={selectedRegion}
              onValueChange={setSelectedRegion}
            >
              <SelectTrigger>
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                <SelectItem value="Punjab">Punjab</SelectItem>
                <SelectItem value="Haryana">Haryana</SelectItem>
                <SelectItem value="UP">Uttar Pradesh</SelectItem>
                <SelectItem value="MP">Madhya Pradesh</SelectItem>
                <SelectItem value="Rajasthan">Rajasthan</SelectItem>
                <SelectItem value="Gujarat">Gujarat</SelectItem>
                <SelectItem value="Maharashtra">Maharashtra</SelectItem>
                <SelectItem value="Karnataka">Karnataka</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={selectedDifficulty}
              onValueChange={setSelectedDifficulty}
            >
              <SelectTrigger>
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Hard">Hard</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setSelectedSeason("all");
                setSelectedRegion("all");
                setSelectedDifficulty("all");
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredCrops.map((crop) => (
          <Card
            key={crop.id}
            className="overflow-hidden transition-shadow hover:shadow-lg"
          >
            <div className="relative overflow-hidden">
              <img
                src={crop.image}
                alt={crop.name}
                className="h-48 w-full object-cover"
              />

              <Badge
                className={`absolute left-3 top-3 ${getDifficultyColor(
                  crop.difficulty
                )}`}
              >
                {crop.difficulty}
              </Badge>

              <Badge
                variant="outline"
                className="absolute right-3 top-3 bg-background"
              >
                {crop.season}
              </Badge>
            </div>

            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between gap-2 text-lg">
                <span>{crop.name}</span>
                <TrendingUp
                  className={`h-4 w-4 shrink-0 ${getProfitabilityColor(
                    crop.profitability
                  )}`}
                />
              </CardTitle>

              <p className="text-sm text-muted-foreground">
                {crop.hindi} · {crop.punjabi}
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{crop.duration}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Droplets
                    className={`h-4 w-4 shrink-0 ${getWaterColor(
                      crop.waterRequirement
                    )}`}
                  />
                  <span>{crop.waterRequirement} Water</span>
                </div>

                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 shrink-0 text-green-600" />
                  <span>{crop.marketPrice.split(" ")[0]}</span>
                </div>

                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{crop.avgYield}</span>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Planting:</span>
                  <span className="text-right font-medium">
                    {crop.plantingTime}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Harvest:</span>
                  <span className="text-right font-medium">
                    {crop.harvestTime}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {crop.region.slice(0, 3).map((region) => (
                  <Badge key={region} variant="outline" className="text-xs">
                    {region}
                  </Badge>
                ))}

                {crop.region.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{crop.region.length - 3} more
                  </Badge>
                )}
              </div>

              <p className="line-clamp-2 text-sm text-muted-foreground">
                {crop.description}
              </p>

              <Button
                type="button"
                className="w-full"
                size="sm"
                onClick={() => setSelectedCrop(crop)}
              >
                View Details
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCrops.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Leaf className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium">No crops found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search criteria or filters.
            </p>
          </CardContent>
        </Card>
      )}

      {selectedCrop && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-6"
          onClick={() => setSelectedCrop(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="seasonal-crop-details-title"
            className="my-auto max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-xl border bg-background p-5 shadow-xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="seasonal-crop-details-title"
                  className="text-2xl font-bold"
                >
                  {selectedCrop.name}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedCrop.hindi} · {selectedCrop.punjabi}
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close crop details"
                onClick={() => setSelectedCrop(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <img
              src={selectedCrop.image}
              alt={selectedCrop.name}
              className="mb-5 h-44 w-full rounded-lg object-cover sm:h-56"
            />

            <div className="mb-5 flex flex-wrap gap-2">
              <Badge>{selectedCrop.season}</Badge>
              <Badge variant="outline">
                {selectedCrop.difficulty} difficulty
              </Badge>
              <Badge variant="outline">
                {selectedCrop.profitability} profitability
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <Detail label="Planting time" value={selectedCrop.plantingTime} />
              <Detail label="Harvest time" value={selectedCrop.harvestTime} />
              <Detail label="Growing duration" value={selectedCrop.duration} />
              <Detail label="Average yield" value={selectedCrop.avgYield} />
              <Detail label="Market price" value={selectedCrop.marketPrice} />
              <Detail
                label="Water requirement"
                value={selectedCrop.waterRequirement}
              />
              <Detail label="Climate" value={selectedCrop.climate} />
              <Detail label="Soil type" value={selectedCrop.soilType} />
              <Detail
                label="Suitable regions"
                value={selectedCrop.region.join(", ")}
              />
              <Detail
                label="Fertilizers"
                value={selectedCrop.fertilizers.join(", ")}
              />
              <Detail
                label="Common diseases"
                value={selectedCrop.diseases.join(", ")}
              />
            </div>

            <div className="mt-5 rounded-lg bg-muted/50 p-4">
              <h3 className="mb-2 font-semibold">About this crop</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {selectedCrop.description}
              </p>
            </div>

            <div className="mt-6 flex justify-end">
              <Button type="button" onClick={() => setSelectedCrop(null)}>
                Close
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

const Detail = ({ label, value }: { label: string; value: string }) => (
  <div className="min-w-0 rounded-lg border p-3">
    <p className="mb-1 text-muted-foreground">{label}</p>
    <p className="break-words font-medium">{value || "Not available"}</p>
  </div>
);