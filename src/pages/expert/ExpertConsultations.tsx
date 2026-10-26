import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  MessageSquare,
  CheckCircle,
  Clock,
  Users,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type Consultation = {
  id: string;
  farmer_id: string;
  expert_id: string | null;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: "pending" | "assigned" | "resolved";
  resolution?: string;
  created_at: string;
  updated_at?: string;
  resolved_at?: string;
};

const STORAGE_KEY = "farm_intellect_expert_demo_consultations_v2";

const DEFAULT_CONSULTATIONS: Consultation[] = [
  {
    id: "demo-cons-1",
    farmer_id: "farmer-1",
    expert_id: "demo-expert",
    title: "Wheat leaf discoloration",
    description:
      "My wheat crop leaves are turning yellow with brown spots. Please suggest a solution.",
    category: "Disease",
    priority: "high",
    status: "assigned",
    created_at: "2026-10-02T10:30:00",
  },
  {
    id: "demo-cons-2",
    farmer_id: "farmer-2",
    expert_id: "demo-expert",
    title: "Best fertilizer for cotton",
    description:
      "What NPK ratio should I use for BT cotton at flowering stage?",
    category: "Nutrition",
    priority: "medium",
    status: "assigned",
    created_at: "2026-10-02T12:35:00",
  },
  {
    id: "demo-cons-3",
    farmer_id: "farmer-3",
    expert_id: "demo-expert",
    title: "Tomato plants turning yellow",
    description:
      "My tomato plants are turning yellow, and the leaves are drying. What should I do?",
    category: "Crop Health",
    priority: "high",
    status: "assigned",
    created_at: "2026-10-03T09:15:00",
  },
  {
    id: "demo-cons-4",
    farmer_id: "farmer-4",
    expert_id: "demo-expert",
    title: "Pest control for rice crops",
    description:
      "Insects are damaging my paddy crop. Please suggest a suitable pest-control method.",
    category: "Pest Control",
    priority: "medium",
    status: "assigned",
    created_at: "2026-10-03T11:45:00",
  },
];

const getInitialConsultations = (): Consultation[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
      const parsed: Consultation[] = JSON.parse(stored);

      if (Array.isArray(parsed)) {
        const existingIds = new Set(
          parsed.map((c) => c.id)
        );

        const missingConsultations =
          DEFAULT_CONSULTATIONS.filter(
            (c) => !existingIds.has(c.id)
          );

        return [...parsed, ...missingConsultations];
      }
    }
  } catch (error) {
    console.error("Unable to load consultations:", error);
  }

  return DEFAULT_CONSULTATIONS;
};

const ExpertConsultations = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useCurrentUser();
  const { toast } = useToast();

  const [consultations, setConsultations] = useState<Consultation[]>(
    getInitialConsultations
  );

  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(consultations)
      );
    } catch (error) {
      console.error("Unable to save consultations:", error);
    }
  }, [consultations]);

  const stats = {
    total: consultations.length,
    pending: consultations.filter(
      (c) => c.status === "pending"
    ).length,
    assigned: consultations.filter(
      (c) => c.status === "assigned"
    ).length,
    resolved: consultations.filter(
      (c) => c.status === "resolved"
    ).length,
  };

  const handleResolve = () => {
    if (!resolveId || !resolution.trim()) {
      toast({
        title: "Enter resolution advice",
        description: "Please enter advice before submitting.",
        variant: "destructive",
      });
      return;
    }

    const now = new Date().toISOString();

    setConsultations((current) =>
      current.map((c) =>
        c.id === resolveId
          ? {
              ...c,
              status: "resolved",
              resolution: resolution.trim(),
              resolved_at: now,
              updated_at: now,
            }
          : c
      )
    );

    toast({
      title: "Consultation resolved successfully!",
    });

    setResolveId(null);
    setResolution("");
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-amber-100 text-amber-800",
      assigned: "bg-blue-100 text-blue-800",
      resolved: "bg-green-100 text-green-800",
    };

    return styles[status] || "bg-muted text-muted-foreground";
  };

  const priorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      high: "bg-red-100 text-red-800",
      medium: "bg-amber-100 text-amber-800",
      low: "bg-gray-100 text-gray-700",
    };

    return styles[priority] || "bg-muted text-muted-foreground";
  };

  const statCards = [
    {
      icon: Users,
      label: "Total",
      value: stats.total,
      color: "text-blue-600",
      background: "bg-blue-100",
    },
    {
      icon: Clock,
      label: "Pending",
      value: stats.pending,
      color: "text-amber-600",
      background: "bg-amber-100",
    },
    {
      icon: MessageSquare,
      label: "Assigned",
      value: stats.assigned,
      color: "text-indigo-600",
      background: "bg-indigo-100",
    },
    {
      icon: CheckCircle,
      label: "Resolved",
      value: stats.resolved,
      color: "text-green-600",
      background: "bg-green-100",
    },
  ];

  const selectedConsultation = consultations.find(
    (c) => c.id === resolveId
  );

  return (
    <div className="min-h-screen bg-background">
      <Header
        user={{
          name: user?.name || "Expert",
          role: "expert",
        }}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
      />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole="expert"
      />

      <main className="md:ml-64 pt-16 p-6">
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-gradient-tricolor">
            🔬 Consultation Queue
          </h1>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map((stat) => {
              const Icon = stat.icon;

              return (
                <Card
                  key={stat.label}
                  className="tricolor-card"
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div
                      className={`p-2 rounded-full ${stat.background}`}
                    >
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>

                    <div>
                      <p className="text-2xl font-bold">
                        {stat.value}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {stat.label}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="tricolor-card">
            <CardHeader>
              <CardTitle>Farmer Consultations</CardTitle>
            </CardHeader>

            <CardContent>
              {consultations.length > 0 ? (
                <div className="divide-y divide-border">
                  {consultations.map((c) => (
                    <div
                      key={c.id}
                      className="py-4 space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">
                            {c.title}
                          </span>

                          <Badge className={statusBadge(c.status)}>
                            {c.status}
                          </Badge>

                          <Badge
                            className={priorityBadge(c.priority)}
                          >
                            {c.priority}
                          </Badge>

                          {c.category && (
                            <Badge variant="outline">
                              {c.category}
                            </Badge>
                          )}
                        </div>

                        <span className="text-xs text-muted-foreground">
                          {c.created_at
                            ? format(
                                new Date(c.created_at),
                                "MMM dd, HH:mm"
                              )
                            : ""}
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {c.description}
                      </p>

                      {c.resolution && (
                        <p className="text-sm text-primary bg-primary/5 p-2 rounded">
                          ✅ {c.resolution}
                        </p>
                      )}

                      {c.status === "assigned" && (
                        <Button
                          size="sm"
                          className="bg-primary text-primary-foreground"
                          onClick={() => {
                            setResolveId(c.id);
                            setResolution("");
                          }}
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>No consultations in queue</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog
        open={resolveId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setResolveId(null);
            setResolution("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Resolve Consultation
            </DialogTitle>
          </DialogHeader>

          {selectedConsultation && (
            <div className="space-y-4">
              <div>
                <p className="font-semibold">
                  {selectedConsultation.title}
                </p>

                <p className="text-sm text-muted-foreground">
                  {selectedConsultation.description}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Resolution / Advice</Label>

                <Textarea
                  value={resolution}
                  onChange={(e) =>
                    setResolution(e.target.value)
                  }
                  placeholder="Enter your expert advice..."
                  rows={4}
                />
              </div>

              <Button
                onClick={handleResolve}
                className="w-full bg-primary text-primary-foreground"
              >
                Submit Resolution
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExpertConsultations;