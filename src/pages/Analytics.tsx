
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  BarChart3,
  PieChart,
  Users,
  Wheat,
  Target,
  Download,
  Filter,
  RefreshCw,
  MapPin,
  DollarSign,
  X,
} from "lucide-react";

type Crop = {
  crop: string;
  area: string;
  areaValue: number;
  yield: string;
  growth: string;
  status: string;
};

type Region = {
  region: string;
  farmers: number;
  area: string;
  performance: number;
};

const cropPerformance: Crop[] = [
  { crop: "Wheat", area: "15,420 ha", areaValue: 15420, yield: "42.3 qt/ha", growth: "+8.2%", status: "excellent" },
  { crop: "Rice", area: "12,850 ha", areaValue: 12850, yield: "38.7 qt/ha", growth: "+5.1%", status: "good" },
  { crop: "Cotton", area: "8,960 ha", areaValue: 8960, yield: "22.4 qt/ha", growth: "-2.3%", status: "average" },
  { crop: "Mustard", area: "6,740 ha", areaValue: 6740, yield: "18.9 qt/ha", growth: "+12.5%", status: "excellent" },
];

const regionData: Region[] = [
  { region: "Punjab", farmers: 1240, area: "28,450 ha", performance: 92 },
  { region: "Haryana", farmers: 890, area: "19,670 ha", performance: 88 },
  { region: "Uttar Pradesh", farmers: 567, area: "12,340 ha", performance: 85 },
  { region: "Rajasthan", farmers: 150, area: "4,780 ha", performance: 79 },
];

const Analytics = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState("All");
  const [selectedRegion, setSelectedRegion] = useState("All");
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const user = {
    name: "Expert User",
    role: "expert",
  };

  const stats = [
    {
      title: "Total Farmers",
      value: "2,847",
      change: { value: "+12.3% this month", trend: "up" as const },
      icon: Users,
      variant: "primary" as const,
    },
    {
      title: "Active Crops",
      value: "45,280 ha",
      change: { value: "+8.5% from last season", trend: "up" as const },
      icon: Wheat,
      variant: "earth" as const,
    },
    {
      title: "Success Rate",
      value: "94.2%",
      change: { value: "+2.1% improvement", trend: "up" as const },
      icon: Target,
      variant: "water" as const,
    },
    {
      title: "Revenue",
      value: "₹1.2Cr",
      change: { value: "+15.7% this quarter", trend: "up" as const },
      icon: DollarSign,
      variant: "harvest" as const,
    },
  ];

  const filteredCrops = cropPerformance.filter(
    (crop) => selectedCrop === "All" || crop.crop === selectedCrop
  );

  const filteredRegions = regionData.filter(
    (region) => selectedRegion === "All" || region.region === selectedRegion
  );

  const filteredFarmerCount = filteredRegions.reduce(
    (total, region) => total + region.farmers,
    0
  );

  const filteredArea = filteredCrops.reduce(
    (total, crop) => total + crop.areaValue,
    0
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "excellent":
        return "bg-green-500";
      case "good":
        return "bg-blue-500";
      case "average":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "excellent":
        return "default";
      case "good":
        return "secondary";
      case "average":
        return "outline";
      default:
        return "outline";
    }
  };

  const clearFilters = () => {
    setSelectedCrop("All");
    setSelectedRegion("All");
  };

  const handleRefresh = () => {
    clearFilters();
    setShowFilters(false);
    setLastRefreshed(new Date());
  };

  const handleExport = () => {
    const rows: (string | number)[][] = [
      ["Report", "Category", "Value", "Details"],
      ...stats.map((stat) => [
        "Summary",
        stat.title,
        stat.value,
        stat.change.value,
      ]),
      ...filteredCrops.map((crop) => [
        "Crop Performance",
        crop.crop,
        crop.yield,
        `Area: ${crop.area}; Growth: ${crop.growth}; Status: ${crop.status}`,
      ]),
      ...filteredRegions.map((region) => [
        "Regional Analysis",
        region.region,
        `${region.performance}%`,
        `Farmers: ${region.farmers}; Area: ${region.area}`,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "farm-analytics.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
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

      <main className="p-6 md:ml-64">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-3xl font-bold text-foreground">
                Analytics Dashboard
              </h2>
              <p className="text-muted-foreground">
                Comprehensive insights and performance metrics
              </p>
              {lastRefreshed && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Filters reset at {lastRefreshed.toLocaleTimeString()}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters((current) => !current)}
                aria-expanded={showFilters}
              >
                {showFilters ? (
                  <X className="mr-2 h-4 w-4" />
                ) : (
                  <Filter className="mr-2 h-4 w-4" />
                )}
                {showFilters ? "Close Filters" : "Filters"}
              </Button>

              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>

              <Button onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          {/* Filter Controls */}
          {showFilters && (
            <Card>
              <CardHeader>
                <CardTitle>Filter Analytics</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-end gap-4">
                <div className="space-y-2">
                  <label htmlFor="crop-filter" className="text-sm font-medium">
                    Crop
                  </label>
                  <select
                    id="crop-filter"
                    value={selectedCrop}
                    onChange={(event) => setSelectedCrop(event.target.value)}
                    className="block min-w-40 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="All">All Crops</option>
                    {cropPerformance.map((crop) => (
                      <option key={crop.crop} value={crop.crop}>
                        {crop.crop}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="region-filter" className="text-sm font-medium">
                    Region
                  </label>
                  <select
                    id="region-filter"
                    value={selectedRegion}
                    onChange={(event) => setSelectedRegion(event.target.value)}
                    className="block min-w-40 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="All">All Regions</option>
                    {regionData.map((region) => (
                      <option key={region.region} value={region.region}>
                        {region.region}
                      </option>
                    ))}
                  </select>
                </div>

                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>

                <div className="w-full text-sm text-muted-foreground">
                  Showing {filteredCrops.length} crops and {filteredRegions.length} regions
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => {
              if (selectedRegion === "All" && selectedCrop === "All") {
                return <StatCard key={index} {...stat} />;
              }

              const filteredStat = { ...stat };

              if (stat.title === "Total Farmers" && selectedRegion !== "All") {
                filteredStat.value = String(filteredFarmerCount);
              }

              if (stat.title === "Active Crops" && selectedCrop !== "All") {
                filteredStat.value = filteredArea.toLocaleString("en-IN") + " ha";
              }

              return <StatCard key={index} {...filteredStat} />;
            })}
          </div>

          {/* Analytics Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 gap-1 md:grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="crops">Crop Performance</TabsTrigger>
              <TabsTrigger value="regions">Regional Analysis</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Monthly Growth
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Farmer Registrations</span>
                        <span className="text-sm font-medium">+12.3%</span>
                      </div>
                      <Progress value={75} className="h-2" />

                      <div className="flex items-center justify-between">
                        <span className="text-sm">Crop Area Expansion</span>
                        <span className="text-sm font-medium">+8.5%</span>
                      </div>
                      <Progress value={68} className="h-2" />

                      <div className="flex items-center justify-between">
                        <span className="text-sm">Revenue Growth</span>
                        <span className="text-sm font-medium">+15.7%</span>
                      </div>
                      <Progress value={85} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-primary" />
                      Crop Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {filteredCrops.length > 0 ? (
                        filteredCrops.map((crop) => (
                          <div
                            key={crop.crop}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`h-3 w-3 rounded-full ${getStatusColor(crop.status)}`}
                              />
                              <span className="text-sm font-medium">
                                {crop.crop}
                              </span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {crop.area}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No crops match the selected filter.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Crop Performance */}
            <TabsContent value="crops" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wheat className="h-5 w-5 text-primary" />
                    Crop Performance Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredCrops.length > 0 ? (
                      filteredCrops.map((crop) => (
                        <div
                          key={crop.crop}
                          className="flex flex-col justify-between gap-4 rounded-lg border p-4 sm:flex-row sm:items-center"
                        >
                          <div>
                            <h4 className="font-semibold">{crop.crop}</h4>
                            <p className="text-sm text-muted-foreground">
                              Area: {crop.area}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-4">
                            <div className="text-right">
                              <p className="font-medium">{crop.yield}</p>
                              <p className="text-sm text-muted-foreground">
                                Avg Yield
                              </p>
                            </div>

                            <Badge
                              variant={
                                crop.growth.startsWith("+")
                                  ? "default"
                                  : "destructive"
                              }
                            >
                              {crop.growth}
                            </Badge>

                            <Badge variant={getStatusVariant(crop.status) as any}>
                              {crop.status}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No crops match the selected filter.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Regional Analysis */}
            <TabsContent value="regions" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Regional Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredRegions.length > 0 ? (
                      filteredRegions.map((region) => (
                        <div
                          key={region.region}
                          className="flex flex-col justify-between gap-4 rounded-lg border p-4 sm:flex-row sm:items-center"
                        >
                          <div>
                            <h4 className="font-semibold">{region.region}</h4>
                            <p className="text-sm text-muted-foreground">
                              {region.farmers} farmers • {region.area}
                            </p>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-medium">
                                {region.performance}%
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Performance
                              </p>
                            </div>
                            <Progress
                              value={region.performance}
                              className="h-2 w-20"
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No regions match the selected filter.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Trends */}
            <TabsContent value="trends" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Market Trends & Predictions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <h4 className="font-semibold">Key Trends</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between rounded-lg bg-accent/50 p-3">
                          <span className="text-sm">
                            Organic farming adoption
                          </span>
                          <Badge>+45%</Badge>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-accent/50 p-3">
                          <span className="text-sm">
                            Smart irrigation usage
                          </span>
                          <Badge>+32%</Badge>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-accent/50 p-3">
                          <span className="text-sm">
                            AI advisory adoption
                          </span>
                          <Badge>+67%</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold">Seasonal Predictions</h4>
                      <div className="space-y-3">
                        <div className="rounded-lg border p-3">
                          <p className="font-medium">Next Rabi Season</p>
                          <p className="text-sm text-muted-foreground">
                            Expected 15% increase in wheat production
                          </p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="font-medium">Kharif Outlook</p>
                          <p className="text-sm text-muted-foreground">
                            Rice prices predicted to stabilize
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Analytics;