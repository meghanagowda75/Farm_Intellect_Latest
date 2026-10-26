
import { useEffect, useState } from "react";
import { ExpertConsultationWorkflow } from "@/components/features/ExpertConsultationWorkflow";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  Brain,
  Calendar,
  TrendingUp,
  Wheat,
  Droplets,
  Bug,
  Zap,
  CheckCircle,
  Clock,
} from "lucide-react";
import { cropRecommendationsMetadata } from "@/data/cropRecommendations";
import { pestDataMetadata } from "@/data/pestData";
import { soilHealthMetadata } from "@/data/soilHealth";

type AdvisoryItem = {
  id: number;
  title: string;
  type: string;
  priority: string;
  crop: string;
  field: string;
  description: string;
  recommendation: string;
  confidence: number;
  createdDate: string;
  status: string;
  aiGenerated: boolean;
  scheduledDate?: string;
};

const STORAGE_KEY = "farm-intellect-advisory";

const mockAdvisory: AdvisoryItem[] = [
  {
    id: 1,
    title: "Optimal Irrigation Schedule",
    type: "irrigation",
    priority: "high",
    crop: "Winter Wheat",
    field: "Field A",
    description:
      "Based on soil moisture sensors and weather forecast, increase irrigation frequency for the next 5 days.",
    recommendation:
      "Apply 25mm of water every 2 days. Monitor soil moisture levels at 20cm depth.",
    confidence: 94,
    createdDate: "2026-09-25T09:30:00",
    status: "pending",
    aiGenerated: true,
  },
  {
    id: 2,
    title: "Nitrogen Fertilizer Application",
    type: "fertilizer",
    priority: "medium",
    crop: "Corn",
    field: "Field B",
    description:
      "Corn is entering rapid growth phase. Additional nitrogen will optimize yield potential.",
    recommendation:
      "Apply 45kg N/hectare using urea fertilizer. Best applied before next rainfall.",
    confidence: 87,
    createdDate: "2026-09-30T11:15:00",
    status: "pending",
    aiGenerated: true,
  },
  {
    id: 3,
    title: "Pest Monitoring Alert",
    type: "pest",
    priority: "high",
    crop: "Soybeans",
    field: "Field C",
    description:
      "Weather conditions favorable for aphid development. Implement preventive scouting.",
    recommendation:
      "Scout fields daily for 7 days. Look for aphid colonies on leaf undersides. Consider beneficial insects.",
    confidence: 78,
    createdDate: "2026-09-29T14:00:00",
    status: "in-progress",
    aiGenerated: true,
  },
  {
    id: 4,
    title: "Harvest Timing Optimization",
    type: "harvest",
    priority: "medium",
    crop: "Soybeans",
    field: "Field C",
    description:
      "Based on moisture content and weather forecast, optimal harvest window identified.",
    recommendation:
      "Harvest when moisture content reaches 13-15%. Expected optimal window: Sept 28 - Oct 5.",
    confidence: 91,
    createdDate: "2026-09-28T08:45:00",
    status: "completed",
    aiGenerated: false,
  },
];

const typeIcons = {
  irrigation: Droplets,
  fertilizer: Zap,
  pest: Bug,
  harvest: Wheat,
  planting: Calendar,
};

const typeColors = {
  irrigation: "text-water",
  fertilizer: "text-harvest",
  pest: "text-destructive",
  harvest: "text-primary",
  planting: "text-earth",
};

const priorityColors = {
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

const statusColors = {
  pending: "secondary",
  "in-progress": "default",
  completed: "outline",
};

const formatDateTime = (value: string | Date) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

const getTimeStatus = (value: string | Date, now: Date) => {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) return "Unknown";
  if (timestamp < now.getTime()) return "Historical";
  if (timestamp > now.getTime()) return "Upcoming";
  return "Current";
};

const loadAdvisoryItems = (): AdvisoryItem[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      const parsed: unknown = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        return parsed as AdvisoryItem[];
      }
    }
  } catch (error) {
    console.error("Unable to load saved advisory data:", error);
  }

  return mockAdvisory;
};

const Advisory = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [advisoryItems, setAdvisoryItems] =
    useState<AdvisoryItem[]>(loadAdvisoryItems);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  const { user } = useCurrentUser();

  // Save recommendation data whenever it changes.
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(advisoryItems)
      );
    } catch (error) {
      console.error("Unable to save advisory data:", error);
    }
  }, [advisoryItems]);

  // Update current time every five seconds.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  const filteredAdvisory =
    filter === "all"
      ? advisoryItems
      : advisoryItems.filter((item) => item.status === filter);

  const advisorySources = [
    { label: "Crop recommendations", meta: cropRecommendationsMetadata },
    { label: "Pest intelligence", meta: pestDataMetadata },
    { label: "Soil health baselines", meta: soilHealthMetadata },
  ];

  const formatUpdatedAt = (value: string) =>
    new Date(value).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const scheduleAdvisory = (id: number) => {
    const dateInput = window.prompt(
      "Enter schedule date and time (YYYY-MM-DDTHH:mm):"
    );

    if (!dateInput) return;

    const scheduled = new Date(dateInput);

    if (Number.isNaN(scheduled.getTime())) {
      window.alert("Invalid date. Please enter a valid date and time.");
      return;
    }

    if (scheduled.getTime() <= Date.now()) {
      window.alert("Please select a future date and time.");
      return;
    }

    setAdvisoryItems((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, scheduledDate: scheduled.toISOString() }
          : item
      )
    );

    window.alert(`Scheduled for ${formatDateTime(scheduled)}`);
  };

  const updateStatus = (
    id: number,
    status: "in-progress" | "completed"
  ) => {
    setAdvisoryItems((items) =>
      items.map((item) =>
        item.id === id ? { ...item, status } : item
      )
    );

    window.alert(
      status === "completed"
        ? "Recommendation marked as completed."
        : "Recommendation marked as in progress."
    );
  };

  const showDetails = (advisory: AdvisoryItem) => {
    window.alert(
      `${advisory.title}\n\n` +
        `Crop: ${advisory.crop}\n` +
        `Field: ${advisory.field}\n` +
        `Priority: ${advisory.priority}\n` +
        `Status: ${advisory.status}\n` +
        `Created: ${formatDateTime(advisory.createdDate)}\n` +
        `Time category: ${getTimeStatus(advisory.createdDate, currentTime)}\n\n` +
        `Analysis:\n${advisory.description}\n\n` +
        `Recommendation:\n${advisory.recommendation}` +
        (advisory.scheduledDate
          ? `\n\nScheduled: ${formatDateTime(advisory.scheduledDate)}\n` +
            `Schedule status: ${getTimeStatus(advisory.scheduledDate, currentTime)}`
          : "")
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        user={{ name: user.name, role: "farmer" }}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        notificationCount={3}
      />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole="farmer"
      />

      <main className="md:ml-64 p-6">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-foreground">
                Advisory Center
              </h2>
              <p className="text-muted-foreground">
                AI-powered recommendations, irrigation guidance, and bookable
                expert support for your crops
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">
                AI-Powered Insights
              </span>
            </div>
          </div>

          <ExpertConsultationWorkflow />

          {/* Live Current Time */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">
                  Live Current Time
                </CardTitle>
              </div>
              <Badge variant="outline">Live</Badge>
            </CardHeader>

            <CardContent>
              <p className="text-2xl font-semibold text-foreground">
                {formatDateTime(currentTime)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Automatically refreshes every 5 seconds
              </p>
            </CardContent>
          </Card>

          {/* Historical and Future Timestamp Summary */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Historical Recommendations
                </CardTitle>
                <CardDescription>
                  Previously created advisory records
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                {advisoryItems
                  .filter(
                    (item) =>
                      getTimeStatus(item.createdDate, currentTime) ===
                      "Historical"
                  )
                  .map((item) => (
                    <div key={item.id} className="rounded-md border p-3">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Created: {formatDateTime(item.createdDate)}
                      </p>
                      <Badge variant="secondary" className="mt-2">
                        Historical
                      </Badge>
                    </div>
                  ))}

                {advisoryItems.every(
                  (item) =>
                    getTimeStatus(item.createdDate, currentTime) !==
                    "Historical"
                ) && (
                  <p className="text-sm text-muted-foreground">
                    No historical recommendations.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Upcoming Scheduled Activities
                </CardTitle>
                <CardDescription>
                  Activities planned for a future date
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                {advisoryItems
                  .filter(
                    (item) =>
                      item.scheduledDate &&
                      getTimeStatus(item.scheduledDate, currentTime) ===
                        "Upcoming"
                  )
                  .map((item) => (
                    <div key={item.id} className="rounded-md border p-3">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Scheduled: {formatDateTime(item.scheduledDate!)}
                      </p>
                      <Badge variant="outline" className="mt-2">
                        Upcoming
                      </Badge>
                    </div>
                  ))}

                {!advisoryItems.some(
                  (item) =>
                    item.scheduledDate &&
                    getTimeStatus(item.scheduledDate, currentTime) ===
                      "Upcoming"
                ) && (
                  <p className="text-sm text-muted-foreground">
                    No upcoming scheduled activities. Use Schedule on a
                    recommendation to add one.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Advisory Data Freshness */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">
                  Advisory data freshness
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-xs">
                Verified sources
              </Badge>
            </CardHeader>

            <CardContent className="grid gap-2 sm:grid-cols-3">
              {advisorySources.map(({ label, meta }) => (
                <div
                  key={label}
                  className="rounded-md border border-border bg-background p-3 text-sm"
                >
                  <div className="font-medium text-foreground">{label}</div>
                  <div className="text-xs text-muted-foreground">
                    Updated {formatUpdatedAt(meta.lastUpdated)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Version {meta.version}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Filter Tabs */}
          <div className="flex gap-2 border-b">
            {[
              { key: "all", label: "All" },
              { key: "pending", label: "Pending" },
              { key: "in-progress", label: "In Progress" },
              { key: "completed", label: "Completed" },
            ].map((tab) => (
              <Button
                key={tab.key}
                variant={filter === tab.key ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilter(tab.key)}
                className="mb-2"
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Advisory Cards */}
          <div className="space-y-4">
            {filteredAdvisory.map((advisory) => {
              const TypeIcon =
                typeIcons[advisory.type as keyof typeof typeIcons];

              return (
                <Card
                  key={advisory.id}
                  className="transition-shadow hover:shadow-lg"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <TypeIcon
                          className={`h-6 w-6 ${
                            typeColors[
                              advisory.type as keyof typeof typeColors
                            ]
                          }`}
                        />

                        <div>
                          <div className="mb-1 flex items-center gap-2">
                            <CardTitle className="text-lg">
                              {advisory.title}
                            </CardTitle>
                            {advisory.aiGenerated && (
                              <Badge variant="outline" className="text-xs">
                                <Brain className="mr-1 h-3 w-3" />
                                AI
                              </Badge>
                            )}
                          </div>
                          <CardDescription>
                            {advisory.crop} • {advisory.field}
                          </CardDescription>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <Badge
                          variant={
                            priorityColors[
                              advisory.priority as keyof typeof priorityColors
                            ] as any
                          }
                        >
                          {advisory.priority} priority
                        </Badge>
                        <Badge
                          variant={
                            statusColors[
                              advisory.status as keyof typeof statusColors
                            ] as any
                          }
                        >
                          {advisory.status === "in-progress"
                            ? "In Progress"
                            : advisory.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="mb-2 font-medium">Analysis</h4>
                      <p className="text-sm text-muted-foreground">
                        {advisory.description}
                      </p>
                    </div>

                    <div>
                      <h4 className="mb-2 font-medium">Recommendation</h4>
                      <p className="text-sm">{advisory.recommendation}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Created: {formatDateTime(advisory.createdDate)}
                          </span>
                        </div>

                        <Badge variant="secondary">
                          {getTimeStatus(advisory.createdDate, currentTime)}
                        </Badge>

                        {advisory.scheduledDate && (
                          <div className="flex flex-wrap items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>
                              Scheduled:{" "}
                              {formatDateTime(advisory.scheduledDate)}
                            </span>
                            <Badge variant="outline">
                              {getTimeStatus(
                                advisory.scheduledDate,
                                currentTime
                              )}
                            </Badge>
                          </div>
                        )}

                        {advisory.aiGenerated && (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" />
                            {advisory.confidence}% confidence
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {advisory.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                scheduleAdvisory(advisory.id)
                              }
                            >
                              <Clock className="mr-1 h-4 w-4" />
                              Schedule
                            </Button>

                            <Button
                              size="sm"
                              onClick={() =>
                                updateStatus(advisory.id, "in-progress")
                              }
                            >
                              <CheckCircle className="mr-1 h-4 w-4" />
                              Apply
                            </Button>
                          </>
                        )}

                        {advisory.status === "in-progress" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateStatus(advisory.id, "completed")
                            }
                          >
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Mark Complete
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => showDetails(advisory)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredAdvisory.length === 0 && (
            <div className="py-12 text-center">
              <Brain className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium">
                No advisory items found
              </h3>
              <p className="text-muted-foreground">
                {filter === "all"
                  ? "Advisory recommendations will appear here as they become available"
                  : `No ${filter} advisory items at the moment`}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Advisory;