import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { SeasonalCropGuide } from "@/components/crops/SeasonalCropGuide";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  Wheat,
  Plus,
  Search,
  Calendar,
  MapPin,
  TrendingUp,
  Droplets,
  AlertTriangle,
  X,
} from "lucide-react";

type CropStatus = "healthy" | "warning" | "critical";

type Crop = {
  id: number;
  name: string;
  variety: string;
  field: string;
  area: string;
  plantedDate: string;
  expectedHarvest: string;
  stage: string;
  health: number;
  status: CropStatus;
};

const initialCrops: Crop[] = [
  {
    id: 1,
    name: "Winter Wheat",
    variety: "Hard Red Winter",
    field: "Field A",
    area: "12.5 hectares",
    plantedDate: "2024-10-15",
    expectedHarvest: "2025-06-20",
    stage: "Flowering",
    health: 85,
    status: "healthy",
  },
  {
    id: 2,
    name: "Corn",
    variety: "Sweet Corn",
    field: "Field B",
    area: "8.2 hectares",
    plantedDate: "2024-05-20",
    expectedHarvest: "2024-09-15",
    stage: "Vegetative",
    health: 92,
    status: "healthy",
  },
  {
    id: 3,
    name: "Soybeans",
    variety: "Early Maturity",
    field: "Field C",
    area: "6.8 hectares",
    plantedDate: "2024-05-10",
    expectedHarvest: "2024-10-05",
    stage: "Germination",
    health: 67,
    status: "warning",
  },
];

const emptyForm = {
  name: "",
  variety: "",
  field: "",
  area: "",
  plantedDate: "",
  expectedHarvest: "",
  stage: "Germination",
};

type CropForm = typeof emptyForm;

const Crops = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [crops, setCrops] = useState<Crop[]>(initialCrops);
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [addCropOpen, setAddCropOpen] = useState(false);
  const [form, setForm] = useState<CropForm>({ ...emptyForm });
  const [formError, setFormError] = useState("");
  const { t } = useLanguage();
  const { user } = useCurrentUser();

  const filteredCrops = crops.filter((crop) => {
    const matchesSearch =
      crop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      crop.variety.toLowerCase().includes(searchTerm.toLowerCase()) ||
      crop.field.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "all" || crop.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const updateForm = (field: keyof CropForm, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setFormError("");
  };

  const closeAddForm = () => {
    setAddCropOpen(false);
    setForm({ ...emptyForm });
    setFormError("");
  };

  const handleAddCrop = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      !form.name.trim() ||
      !form.variety.trim() ||
      !form.field.trim() ||
      !form.area.trim() ||
      !form.plantedDate ||
      !form.expectedHarvest
    ) {
      setFormError("Please fill in all fields.");
      return;
    }

    if (form.expectedHarvest < form.plantedDate) {
      setFormError("Expected harvest must be on or after the planting date.");
      return;
    }

    const newCrop: Crop = {
      id: Date.now(),
      name: form.name.trim(),
      variety: form.variety.trim(),
      field: form.field.trim(),
      area: `${form.area.trim()} hectares`,
      plantedDate: form.plantedDate,
      expectedHarvest: form.expectedHarvest,
      stage: form.stage,
      health: 100,
      status: "healthy",
    };

    setCrops((previous) => [newCrop, ...previous]);
    setSearchTerm("");
    setFilterStatus("all");
    closeAddForm();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-primary";
      case "warning":
        return "text-harvest";
      case "critical":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return "default";
      case "warning":
        return "secondary";
      case "critical":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-background">
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
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-3xl font-bold text-foreground">
                {t("crops.title")}
              </h2>
              <p className="text-muted-foreground">{t("crops.subtitle")}</p>
            </div>

            <Button
              type="button"
              className="tricolor-shimmer hover:animate-shimmer w-full sm:w-auto"
              onClick={() => {
                setForm({ ...emptyForm });
                setFormError("");
                setAddCropOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("crops.add_new")}
            </Button>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("crops.search")}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t("crops.filter_status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("crops.all_status")}</SelectItem>
                <SelectItem value="healthy">{t("crops.healthy")}</SelectItem>
                <SelectItem value="warning">{t("crops.warning")}</SelectItem>
                <SelectItem value="critical">{t("crops.critical")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="my-crops" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="my-crops">
                {t("crops.my_crops_tab")}
              </TabsTrigger>
              <TabsTrigger value="crop-guide">
                {t("crops.crop_guide_tab")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="my-crops" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredCrops.map((crop, index) => (
                  <Card
                    key={crop.id}
                    className="tricolor-card cursor-pointer transition-all duration-300 hover:shadow-lg"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Wheat className="h-5 w-5 shrink-0 text-primary" />
                          <CardTitle className="text-lg">
                            {crop.name}
                          </CardTitle>
                        </div>
                        <Badge variant={getStatusBadge(crop.status) as any}>
                          {crop.stage}
                        </Badge>
                      </div>
                      <CardDescription>{crop.variety}</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span>
                            {crop.field} - {crop.area}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span>
                            {t("crops.planted")}:{" "}
                            {new Date(
                              `${crop.plantedDate}T00:00:00`,
                            ).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <TrendingUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span>
                            {t("crops.harvest")}:{" "}
                            {new Date(
                              `${crop.expectedHarvest}T00:00:00`,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{t("crops.health_score")}</span>
                          <span
                            className={`font-medium ${getStatusColor(crop.status)}`}
                          >
                            {crop.health}%
                          </span>
                        </div>

                        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              crop.status === "healthy"
                                ? "bg-primary"
                                : crop.status === "warning"
                                  ? "bg-harvest"
                                  : "bg-destructive"
                            }`}
                            style={{ width: `${crop.health}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1 hover:bg-primary/10"
                          onClick={() => setSelectedCrop(crop)}
                        >
                          {t("common.view_details")}
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="hover:bg-primary/10"
                          aria-label={`Water ${crop.name}`}
                          title={`Water ${crop.name}`}
                          onClick={() => setSelectedCrop(crop)}
                        >
                          <Droplets className="h-4 w-4" />
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="hover:bg-destructive/10"
                          aria-label={`View alerts for ${crop.name}`}
                          title={`View alerts for ${crop.name}`}
                          onClick={() => setSelectedCrop(crop)}
                        >
                          <AlertTriangle className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredCrops.length === 0 && (
                <div className="animate-fade-in py-12 text-center">
                  <Wheat className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="text-lg font-medium">
                    {t("crops.no_crops")}
                  </h3>
                  <p className="text-muted-foreground">
                    {t("crops.adjust_filters")}
                  </p>
                  <Button
                    type="button"
                    className="mt-4"
                    onClick={() => setAddCropOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Crop
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="crop-guide">
              <SeasonalCropGuide />
            </TabsContent>
          </Tabs>

          {selectedCrop && (
            <div
              className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-3 sm:p-4"
              role="presentation"
              onClick={() => setSelectedCrop(null)}
            >
              <div
                className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-background p-5 shadow-xl sm:p-6"
                role="dialog"
                aria-modal="true"
                aria-labelledby="crop-details-title"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2
                    id="crop-details-title"
                    className="text-xl font-bold text-foreground"
                  >
                    {selectedCrop.name} Details
                  </h2>
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

                <div className="space-y-3 break-words text-sm">
                  <p>
                    <strong>Variety:</strong> {selectedCrop.variety}
                  </p>
                  <p>
                    <strong>Field:</strong> {selectedCrop.field}
                  </p>
                  <p>
                    <strong>Area:</strong> {selectedCrop.area}
                  </p>
                  <p>
                    <strong>Planted Date:</strong>{" "}
                    {new Date(
                      `${selectedCrop.plantedDate}T00:00:00`,
                    ).toLocaleDateString()}
                  </p>
                  <p>
                    <strong>Expected Harvest:</strong>{" "}
                    {new Date(
                      `${selectedCrop.expectedHarvest}T00:00:00`,
                    ).toLocaleDateString()}
                  </p>
                  <p>
                    <strong>Growth Stage:</strong> {selectedCrop.stage}
                  </p>
                  <p>
                    <strong>Health Score:</strong> {selectedCrop.health}%
                  </p>
                  <p>
                    <strong>Status:</strong> {selectedCrop.status}
                  </p>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button
                    type="button"
                    onClick={() => setSelectedCrop(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}

          {addCropOpen && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 sm:p-4"
              role="presentation"
              onClick={closeAddForm}
            >
              <div
                className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-xl border border-border bg-background p-5 shadow-2xl sm:p-6"
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-crop-title"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h2
                      id="add-crop-title"
                      className="text-xl font-bold text-foreground sm:text-2xl"
                    >
                      Add New Crop
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Enter your crop and field details.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Close add crop form"
                    onClick={closeAddForm}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <form onSubmit={handleAddCrop} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        htmlFor="crop-name"
                        className="text-sm font-medium text-foreground"
                      >
                        Crop Name *
                      </label>
                      <Input
                        id="crop-name"
                        value={form.name}
                        onChange={(event) =>
                          updateForm("name", event.target.value)
                        }
                        placeholder="e.g. Rice"
                        required
                        autoFocus
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="crop-variety"
                        className="text-sm font-medium text-foreground"
                      >
                        Variety *
                      </label>
                      <Input
                        id="crop-variety"
                        value={form.variety}
                        onChange={(event) =>
                          updateForm("variety", event.target.value)
                        }
                        placeholder="e.g. Basmati"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="crop-field"
                        className="text-sm font-medium text-foreground"
                      >
                        Field Name *
                      </label>
                      <Input
                        id="crop-field"
                        value={form.field}
                        onChange={(event) =>
                          updateForm("field", event.target.value)
                        }
                        placeholder="e.g. Field D"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="crop-area"
                        className="text-sm font-medium text-foreground"
                      >
                        Area (hectares) *
                      </label>
                      <Input
                        id="crop-area"
                        type="number"
                        min="0.01"
                        step="any"
                        value={form.area}
                        onChange={(event) =>
                          updateForm("area", event.target.value)
                        }
                        placeholder="e.g. 2.5"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="crop-planted-date"
                        className="text-sm font-medium text-foreground"
                      >
                        Planting Date *
                      </label>
                      <Input
                        id="crop-planted-date"
                        type="date"
                        value={form.plantedDate}
                        onChange={(event) =>
                          updateForm("plantedDate", event.target.value)
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="crop-harvest-date"
                        className="text-sm font-medium text-foreground"
                      >
                        Expected Harvest *
                      </label>
                      <Input
                        id="crop-harvest-date"
                        type="date"
                        min={form.plantedDate || undefined}
                        value={form.expectedHarvest}
                        onChange={(event) =>
                          updateForm("expectedHarvest", event.target.value)
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <label
                        htmlFor="crop-stage"
                        className="text-sm font-medium text-foreground"
                      >
                        Growth Stage
                      </label>
                      <Select
                        value={form.stage}
                        onValueChange={(value) => updateForm("stage", value)}
                      >
                        <SelectTrigger id="crop-stage" className="w-full">
                          <SelectValue placeholder="Select growth stage" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Germination">
                            Germination
                          </SelectItem>
                          <SelectItem value="Seedling">Seedling</SelectItem>
                          <SelectItem value="Vegetative">
                            Vegetative
                          </SelectItem>
                          <SelectItem value="Flowering">Flowering</SelectItem>
                          <SelectItem value="Fruiting">Fruiting</SelectItem>
                          <SelectItem value="Maturity">Maturity</SelectItem>
                          <SelectItem value="Harvest Ready">
                            Harvest Ready
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formError && (
                    <p
                      role="alert"
                      className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                    >
                      {formError}
                    </p>
                  )}

                  <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeAddForm}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="w-full sm:w-auto">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Crop
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Crops;