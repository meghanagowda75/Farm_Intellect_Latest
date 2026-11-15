import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Search, Filter, RefreshCw } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { format, isValid } from "date-fns";

interface AuditLog {
  id: string;
  action: string;
  description: string;
  actionType: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
    role: string;
  };
}

const SAMPLE_AUDIT_LOGS: AuditLog[] = [
  {
    id: "sample-1",
    action: "POST /api/auth/login",
    description: "Administrator signed in successfully",
    actionType: "post",
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
    user: { name: "Tom", email: "admin@farmintellect.com", role: "ADMIN" },
  },
  {
    id: "sample-2",
    action: "PUT /api/users/profile",
    description: "Farmer profile information updated",
    actionType: "put",
    createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
    user: { name: "Tom", email: "admin@farmintellect.com", role: "ADMIN" },
  },
  {
    id: "sample-3",
    action: "POST /api/crops/recommend",
    description: "Crop recommendation generated",
    actionType: "post",
    createdAt: new Date(Date.now() - 55 * 60000).toISOString(),
    user: { name: "Ramesh Patil", email: "ramesh@example.com", role: "FARMER" },
  },
  {
    id: "sample-4",
    action: "GET /api/weather/forecast",
    description: "Weather forecast information accessed",
    actionType: "get",
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    user: { name: "Tom", email: "admin@farmintellect.com", role: "ADMIN" },
  },
  {
    id: "sample-5",
    action: "POST /api/market/prices",
    description: "Market price information refreshed",
    actionType: "post",
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    user: { name: "Ramesh Patil", email: "ramesh@example.com", role: "FARMER" },
  },
  {
    id: "sample-6",
    action: "PUT /api/schemes/eligibility",
    description: "Government scheme eligibility checked",
    actionType: "put",
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    user: { name: "Tom", email: "admin@farmintellect.com", role: "ADMIN" },
  },
  {
    id: "sample-7",
    action: "POST /api/vision/scan",
    description: "Crop leaf image submitted for disease analysis",
    actionType: "post",
    createdAt: new Date(Date.now() - 8 * 3600000).toISOString(),
    user: { name: "Ramesh Patil", email: "ramesh@example.com", role: "FARMER" },
  },
  {
    id: "sample-8",
    action: "DELETE /api/notifications/old",
    description: "Old notification removed",
    actionType: "delete",
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    user: { name: "Tom", email: "admin@farmintellect.com", role: "ADMIN" },
  },
];

const AdminAuditLog = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useCurrentUser();
  const { session, loading: authLoading } = useAuth();

  const isSampleAccount =
    session?.access_token === "mock-token" &&
    user?.role?.toLowerCase() === "admin";

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const fetchLogs = async () => {
    if (isSampleAccount) {
      setLogs(SAMPLE_AUDIT_LOGS);
      setError("");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiFetch<{ logs: AuditLog[] }>(
        "/api/admin/audit-logs"
      );
      setLogs(response.logs ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load audit logs."
      );
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    void fetchLogs();
  }, [authLoading, isSampleAccount]);

  const displayedLogs = isSampleAccount ? SAMPLE_AUDIT_LOGS : logs;

  const actionTypes = [
    ...new Set(displayedLogs.map((log) => log.actionType)),
  ];

  const filtered = displayedLogs.filter((log) => {
    const searchText = search.toLowerCase();

    const matchSearch =
      !searchText ||
      log.action.toLowerCase().includes(searchText) ||
      log.description.toLowerCase().includes(searchText) ||
      log.user.name.toLowerCase().includes(searchText) ||
      log.user.email.toLowerCase().includes(searchText);

    const matchType =
      typeFilter === "all" || log.actionType === typeFilter;

    return matchSearch && matchType;
  });

  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      post: "bg-primary/10 text-primary",
      put: "bg-accent/10 text-accent",
      patch: "bg-accent/10 text-accent",
      delete: "bg-destructive/10 text-destructive",
    };

    return colors[type] || "bg-secondary text-secondary-foreground";
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        user={{ name: user?.name || "Admin", role: "admin" }}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
      />
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole="admin"
      />

      <main className="md:ml-64 pt-16 p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-gradient-tricolor">
                Audit Log
              </h1>
            </div>

            <Button
              variant="outline"
              onClick={() => void fetchLogs()}
              disabled={loading || authLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search actions or users..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {actionTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>

          <Card className="tricolor-card">
            <CardHeader>
              <CardTitle>
                Activity Log ({filtered.length} entries)
              </CardTitle>
            </CardHeader>

            <CardContent>
              {authLoading || loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex gap-4 py-3 border-b border-border"
                  >
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 flex-1" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                ))
              ) : error ? (
                <div className="text-center py-12 text-destructive">
                  <p>{error}</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => void fetchLogs()}
                  >
                    Try again
                  </Button>
                </div>
              ) : filtered.length > 0 ? (
                <div className="divide-y divide-border">
                  {filtered.map((log) => {
                    const date = new Date(log.createdAt);

                    return (
                      <div
                        key={log.id}
                        className="flex flex-col gap-2 py-4 md:flex-row md:items-center md:gap-4"
                      >
                        <Badge className={getTypeBadgeColor(log.actionType)}>
                          {log.actionType.toUpperCase()}
                        </Badge>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {log.action}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {log.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {log.user.name} ({log.user.role})
                          </p>
                        </div>

                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {isValid(date)
                            ? format(date, "MMM dd, yyyy HH:mm")
                            : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>No audit log entries found.</p>
                  <p className="text-xs mt-2">
                    Recorded activities will appear here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminAuditLog;
