import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Activity,
  Target,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  nationalCropStats,
  cropProductionMetadata,
} from "@/data/cropProduction";
import {
  mandiPrices,
  mandiPricesMetadata,
  getMSPCrops,
  getHighVolatilityCommodities,
} from "@/data/mandiPrices";

type BrowserUser = {
  id?: string;
  user_id?: string;
  email?: string;
  name?: string;
  display_name?: string;
  role?: string;
  userRole?: string;
  location?: string;
  created_at?: string;
  user_metadata?: Record<string, unknown>;
  profile?: Record<string, unknown>;
  user?: Record<string, unknown>;
  [key: string]: unknown;
};

type PlatformStats = {
  totalUsers: number;
  farmers: number;
  merchants: number;
  experts: number;
  admins: number;
  totalActivity: number | null;
  totalCropPlans: number | null;
  totalTasks: number | null;
};

const emptyStats: PlatformStats = {
  totalUsers: 0,
  farmers: 0,
  merchants: 0,
  experts: 0,
  admins: 0,
  totalActivity: null,
  totalCropPlans: null,
  totalTasks: null,
};

const demoUsers: BrowserUser[] = [
  {
    id: "demo-rajesh",
    email: "rajesh@farmapp.local.io",
    name: "Rajesh Kumar",
    role: "farmer",
  },
  {
    id: "demo-kavita",
    email: "kavita@farmapp.local.io",
    name: "Dr. Kavita Sharma",
    role: "expert",
  },
  {
    id: "demo-anil",
    email: "anil@farmapp.local.io",
    name: "Anil Gupta",
    role: "merchant",
  },
  {
    id: "demo-admin",
    email: "admin@farmapp.local.io",
    name: "System Administrator",
    role: "admin",
  },
];

const formatUpdatedAt = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const getString = (
  value: unknown,
  fallback = ""
): string => {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : fallback;
};

const normalizeUser = (value: unknown): BrowserUser | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;

  const profile =
    typeof record.profile === "object" && record.profile !== null
      ? (record.profile as Record<string, unknown>)
      : {};

  const user =
    typeof record.user === "object" && record.user !== null
      ? (record.user as Record<string, unknown>)
      : {};

  const userMetadata =
    typeof user.user_metadata === "object" &&
    user.user_metadata !== null
      ? (user.user_metadata as Record<string, unknown>)
      : {};

  const profileMetadata =
    typeof record.user_metadata === "object" &&
    record.user_metadata !== null
      ? (record.user_metadata as Record<string, unknown>)
      : {};

  const merged: BrowserUser = {
    ...user,
    ...record,
    ...profile,
  };

  merged.id = getString(
    profile.id,
    getString(
      record.user_id,
      getString(record.id, getString(user.id))
    )
  );

  merged.email = getString(
    profile.email,
    getString(
      record.email,
      getString(user.email)
    )
  );

  merged.name = getString(
    profile.name,
    getString(
      record.display_name,
      getString(
        record.name,
        getString(
          profile.full_name,
          getString(
            userMetadata.full_name,
            getString(profileMetadata.full_name)
          )
        )
      )
    )
  );

  merged.role = getString(
    profile.role,
    getString(
      record.role,
      getString(
        record.userRole,
        getString(
          userMetadata.role,
          getString(profileMetadata.role, getString(user.role))
        )
      )
    )
  );

  merged.location = getString(
    profile.location,
    getString(record.location, getString(user.location))
  );

  merged.created_at = getString(
    record.created_at,
    getString(profile.created_at, getString(user.created_at))
  );

  return merged;
};

const getRole = (user: BrowserUser): string => {
  const role = String(
    user.role ??
      user.userRole ??
      user.profile?.role ??
      user.user_metadata?.role ??
      "farmer"
  )
    .trim()
    .toUpperCase()
    .replace(/^ROLE_/, "");

  if (
    role === "FARMER" ||
    role === "MERCHANT" ||
    role === "EXPERT" ||
    role === "ADMIN"
  ) {
    return role;
  }

  return "FARMER";
};

const readStoredUsers = (storageKey: string): BrowserUser[] => {
  try {
    const stored = localStorage.getItem(storageKey);

    if (!stored) {
      return [];
    }

    const parsed: unknown = JSON.parse(stored);

    if (Array.isArray(parsed)) {
      return parsed
        .map(normalizeUser)
        .filter(
          (user): user is BrowserUser => user !== null
        );
    }

    if (typeof parsed !== "object" || parsed === null) {
      return [];
    }

    const objectData = parsed as Record<string, unknown>;

    if (Array.isArray(objectData.users)) {
      return objectData.users
        .map(normalizeUser)
        .filter(
          (user): user is BrowserUser => user !== null
        );
    }

    if (Array.isArray(objectData.data)) {
      return objectData.data
        .map(normalizeUser)
        .filter(
          (user): user is BrowserUser => user !== null
        );
    }

    // AuthContext stores registered accounts in an object
    // keyed by Aadhaar number. Each record can contain
    // nested user and profile objects.
    return Object.values(objectData)
      .map(normalizeUser)
      .filter(
        (user): user is BrowserUser => user !== null
      );
  } catch (error) {
    console.error(
      `Could not read ${storageKey}:`,
      error
    );
    return [];
  }
};

const readBrowserUsers = (): BrowserUser[] => {
  const adminUsers = readStoredUsers("mock_users");
  const registeredUsers = readStoredUsers(
    "mock_registered_users"
  );

  // Start with defaults, then allow saved records to replace
  // matching defaults so updated roles are reflected.
  const allUsers = [
    ...demoUsers,
    ...registeredUsers,
    ...adminUsers,
  ];

  const uniqueUsers = new Map<string, BrowserUser>();

  allUsers.forEach((user, index) => {
    const email = getString(user.email).toLowerCase();
    const id = getString(user.id, getString(user.user_id));

    // Prefer email for deduplication because the same account
    // may appear in both storage locations with different IDs.
    const key = email
      ? `email:${email}`
      : id
        ? `id:${id}`
        : `record:${index}`;

    uniqueUsers.set(key, user);
  });

  return Array.from(uniqueUsers.values());
};

const StatCard = ({
  title,
  value,
  icon: Icon,
  subtitle,
  loading,
}: {
  title: string;
  value: number | string | null;
  icon: typeof Users;
  subtitle?: string;
  loading: boolean;
}) => (
  <Card className="tricolor-card">
    <CardContent className="p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">
            {title}
          </p>

          {loading ? (
            <Skeleton className="mt-1 h-8 w-20" />
          ) : (
            <p className="break-words text-2xl font-bold text-foreground">
              {value === null
                ? "—"
                : typeof value === "number"
                  ? value.toLocaleString("en-IN")
                  : value}
            </p>
          )}

          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        <div className="shrink-0 rounded-full bg-primary/10 p-2">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export const EnhancedAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] =
    useState<PlatformStats>(emptyStats);

  useEffect(() => {
    const loadBrowserAnalytics = () => {
      try {
        setLoading(true);

        const users = readBrowserUsers();

        const counts = {
          FARMER: 0,
          MERCHANT: 0,
          EXPERT: 0,
          ADMIN: 0,
        };

        users.forEach((user) => {
          const role = getRole(user);
          counts[role as keyof typeof counts] += 1;
        });

        setStats({
          totalUsers: users.length,
          farmers: counts.FARMER,
          merchants: counts.MERCHANT,
          experts: counts.EXPERT,
          admins: counts.ADMIN,
          totalActivity: null,
          totalCropPlans: null,
          totalTasks: null,
        });
      } catch (error) {
        console.error(
          "Unable to load browser analytics:",
          error
        );
        setStats(emptyStats);
      } finally {
        setLoading(false);
      }
    };

    loadBrowserAnalytics();

    // Refresh if another browser tab updates the saved users.
    window.addEventListener("storage", loadBrowserAnalytics);

    // Also support same-tab updates dispatched by app components.
    window.addEventListener(
      "mock-users-updated",
      loadBrowserAnalytics
    );

    return () => {
      window.removeEventListener(
        "storage",
        loadBrowserAnalytics
      );

      window.removeEventListener(
        "mock-users-updated",
        loadBrowserAnalytics
      );
    };
  }, []);

  const productionChartData = nationalCropStats
    .slice(0, 8)
    .map((item) => ({
      crop: item.crop.split(" ")[0],
      production: item.production,
    }));

  const mandiPriceChart = mandiPrices
    .slice(0, 8)
    .map((item) => ({
      commodity: item.commodity.split(" ")[0],
      msp: item.mspPrice,
      modal:
        item.marketPrices.length > 0
          ? Math.round(
              item.marketPrices.reduce(
                (total, price) =>
                  total + price.modalPrice,
                0
              ) / item.marketPrices.length
            )
          : null,
    }));

  const volatileCommodities =
    getHighVolatilityCommodities();

  const mspCrops = getMSPCrops();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gradient-tricolor">
          📊 Platform Analytics Dashboard
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Comprehensive insights into platform performance
          and user engagement
        </p>
      </div>

      <Card className="border-border">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />

          <div>
            <p className="font-medium text-foreground">
              Browser demo mode
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              User totals combine saved mock accounts from
              the Admin Users page and registered browser
              accounts. These are not live platform-wide
              database totals. Activity, crop calendar, and
              task statistics are unavailable without a
              connected backend database.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Browser Demo Users"
          value={stats.totalUsers}
          icon={Users}
          subtitle="Unique saved and default mock accounts"
          loading={loading}
        />

        <StatCard
          title="Activity Events"
          value={stats.totalActivity}
          icon={Activity}
          subtitle="Live activity data unavailable"
          loading={loading}
        />

        <StatCard
          title="Crop Calendar Records"
          value={stats.totalCropPlans}
          icon={Target}
          subtitle="Live database data unavailable"
          loading={loading}
        />

        <StatCard
          title="User Tasks"
          value="Not tracked"
          icon={BarChart3}
          subtitle="Task statistics unavailable"
          loading={loading}
        />
      </div>

      <Card className="tricolor-card">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <Users className="h-5 w-5" />
            Browser Demo User Distribution

            <Badge
              variant="outline"
              className="sm:ml-auto"
            >
              Demo data
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="w-full overflow-x-auto">
            <BarChart
              width={600}
              height={280}
              data={[
                {
                  role: "Farmers",
                  count: stats.farmers,
                },
                {
                  role: "Merchants",
                  count: stats.merchants,
                },
                {
                  role: "Experts",
                  count: stats.experts,
                },
                {
                  role: "Admins",
                  count: stats.admins,
                },
              ]}
              margin={{
                top: 10,
                right: 20,
                left: 0,
                bottom: 10,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="role" />
              <YAxis allowDecimals={false} />
              <Tooltip />

              <Bar
                dataKey="count"
                fill="hsl(145, 63%, 30%)"
                name="Browser demo users"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </div>
        </CardContent>
      </Card>

      <Card className="tricolor-card">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <BarChart3 className="h-5 w-5 shrink-0" />
            <span>
              Indian Crop Production 2023–24 (Mt)
            </span>

            <Badge
              variant="outline"
              className="sm:ml-auto"
            >
              Updated{" "}
              {formatUpdatedAt(
                cropProductionMetadata.lastUpdated
              )}
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Historical national production data in million
            tonnes.
          </p>

          <div className="w-full overflow-x-auto">
            <BarChart
              width={700}
              height={300}
              data={productionChartData}
              margin={{
                top: 10,
                right: 20,
                left: 10,
                bottom: 10,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="crop" />
              <YAxis />

              <Tooltip
                formatter={(value: number) => [
                  `${value} Mt`,
                  "Production",
                ]}
              />

              <Bar
                dataKey="production"
                fill="hsl(145, 63%, 30%)"
                name="Production (Mt)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </div>
        </CardContent>
      </Card>

      <Card className="tricolor-card">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <TrendingUp className="h-5 w-5 shrink-0" />
            <span>
              Mandi vs MSP 2024–25 (₹/quintal)
            </span>

            <Badge
              variant="outline"
              className="sm:ml-auto"
            >
              Updated{" "}
              {formatUpdatedAt(
                mandiPricesMetadata.lastUpdated
              )}
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Historical reference only. Mandi modal prices
            are dataset averages, not live market quotations.
          </p>

          <div className="w-full overflow-x-auto">
            <BarChart
              width={700}
              height={300}
              data={mandiPriceChart}
              margin={{
                top: 10,
                right: 20,
                left: 10,
                bottom: 10,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="commodity" />
              <YAxis />

              <Tooltip
                formatter={(
                  value: number | null,
                  name: string
                ) => [
                  value === null
                    ? "Unavailable"
                    : `₹${value.toLocaleString("en-IN")}`,
                  name,
                ]}
              />

              <Bar
                dataKey="msp"
                fill="hsl(24, 95%, 48%)"
                name="MSP"
                radius={[4, 4, 0, 0]}
              />

              <Bar
                dataKey="modal"
                fill="hsl(220, 72%, 35%)"
                name="Historical mandi modal average"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </div>

          {volatileCommodities.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Historically high volatility:
              </span>

              {volatileCommodities.map((commodity) => (
                <Badge
                  key={commodity.commodity}
                  variant="destructive"
                  className="text-xs"
                >
                  {commodity.commodity}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="tricolor-card">
        <CardHeader>
          <CardTitle>
            MSP 2024–25 Historical Reference
          </CardTitle>

          <p className="text-sm text-muted-foreground">
            Minimum Support Price figures from the existing
            historical dataset, in rupees per quintal.
          </p>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {mspCrops.map((crop) => (
              <div
                key={crop.commodity}
                className="rounded-lg border border-border p-3 text-center"
              >
                <p className="text-sm font-medium text-foreground">
                  {crop.commodity.split(" ")[0]}
                </p>

                <p className="text-lg font-bold text-primary">
                  ₹{crop.msp.toLocaleString("en-IN")}
                </p>

                <p className="text-xs text-muted-foreground">
                  per quintal
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};