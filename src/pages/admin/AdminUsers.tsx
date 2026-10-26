import { useState, useEffect, useCallback, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  UserCheck,
  Shield,
  GraduationCap,
  Store,
  Search,
  RefreshCw,
} from "lucide-react";
import {
  supabase,
  hasSupabaseEnv,
} from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  getSecureItem,
  setSecureItem,
} from "@/lib/secure-storage";
import { toast } from "sonner";

type UserRole = "farmer" | "merchant" | "expert" | "admin";

interface UserWithRole {
  user_id: string;
  display_name: string;
  email: string | null;
  location: string | null;
  created_at: string;
  role: UserRole;
}

interface RegisteredMockUser {
  passkey?: string;
  user?: {
    id?: string;
    email?: string;
    created_at?: string;
    user_metadata?: Record<string, unknown>;
  };
  profile?: {
    id?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    role?: string;
    state?: string;
    district?: string;
    village?: string;
    location?: string;
    created_at?: string;
  };
  created_at?: string;
}

const VALID_ROLES: UserRole[] = [
  "farmer",
  "merchant",
  "expert",
  "admin",
];

const FETCH_TIMEOUT_MS = 12000;

const MOCK_JOIN_DATES = [
  "2026-10-12T10:30:00.000Z",
  "2026-10-08T09:15:00.000Z",
  "2026-10-04T12:00:00.000Z",
  "2026-09-29T08:45:00.000Z",
  "2026-09-24T11:20:00.000Z",
  "2026-09-18T07:30:00.000Z",
  "2026-09-12T13:10:00.000Z",
  "2026-09-05T09:00:00.000Z",
  "2026-08-28T10:00:00.000Z",
];

const DEFAULT_MOCK_USERS: UserWithRole[] = [
  {
    user_id: "mock-user-123412341234",
    display_name: "Rajesh Kumar",
    email: "rajesh@farmapp.local.io",
    location: "Karnal, Haryana",
    created_at: "2026-06-10T10:00:00Z",
    role: "farmer",
  },
  {
    user_id: "mock-user-222222222222",
    display_name: "Dr. Kavita Sharma",
    email: "kavita@farmapp.local.io",
    location: "IARI, New Delhi",
    created_at: "2026-05-15T14:20:00Z",
    role: "expert",
  },
  {
    user_id: "mock-user-333333333333",
    display_name: "Anil Gupta",
    email: "anil@farmapp.local.io",
    location: "Mandi, Punjab",
    created_at: "2026-04-12T09:15:00Z",
    role: "merchant",
  },
  {
    user_id: "mock-user-444444444444",
    display_name: "System Administrator",
    email: "admin@farmapp.local.io",
    location: "New Delhi, Delhi",
    created_at: "2026-01-01T00:00:00Z",
    role: "admin",
  },
];

const normalizeRole = (role: unknown): UserRole => {
  const normalized = String(role || "farmer").toLowerCase();

  return VALID_ROLES.includes(normalized as UserRole)
    ? (normalized as UserRole)
    : "farmer";
};

const isValidDate = (value: unknown): value is string => {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    !Number.isNaN(new Date(value).getTime())
  );
};

const getStoredRoleOverrides = (): UserWithRole[] => {
  try {
    const stored = localStorage.getItem("mock_users");

    if (!stored) {
      return [];
    }

    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (item: any) =>
          item &&
          typeof item.user_id === "string" &&
          typeof item.display_name === "string"
      )
      .map((item: any) => ({
        user_id: item.user_id,
        display_name: item.display_name,
        email: item.email || null,
        location: item.location || null,
        created_at: isValidDate(item.created_at)
          ? item.created_at
          : "",
        role: normalizeRole(item.role),
      }));
  } catch (error) {
    console.error("Could not read mock role overrides:", error);
    return [];
  }
};

const getRegisteredMockUsers = (): UserWithRole[] => {
  const registry = getSecureItem<
    Record<string, RegisteredMockUser>
  >("mock_registered_users", {});

  if (!registry || typeof registry !== "object") {
    return [];
  }

  return Object.entries(registry).map(([aadhaar, entry], index) => {
    const profile = entry?.profile || {};
    const account = entry?.user || {};
    const metadata = account.user_metadata || {};

    const firstName =
      profile.first_name ||
      String(metadata.first_name || "") ||
      "Registered User";

    const lastName =
      profile.last_name ||
      String(metadata.last_name || "");

    const fullName = `${firstName} ${lastName}`.trim();

    const locationParts = [
      profile.village,
      profile.district,
      profile.state,
    ].filter(
      (part): part is string =>
        typeof part === "string" && part.trim().length > 0
    );

    const savedDate =
      profile.created_at ||
      entry?.created_at ||
      account.created_at ||
      "";

    const createdAt = isValidDate(savedDate)
      ? savedDate
      : MOCK_JOIN_DATES[index % MOCK_JOIN_DATES.length];

    return {
      user_id:
        profile.id ||
        account.id ||
        `mock-user-${aadhaar}`,
      display_name: fullName || "Registered User",
      email: profile.email || account.email || null,
      location:
        profile.location ||
        (locationParts.length > 0
          ? locationParts.join(", ")
          : null),
      created_at: createdAt,
      role: normalizeRole(profile.role || metadata.role),
    };
  });
};

const buildMockUserList = (): UserWithRole[] => {
  const usersById = new Map<string, UserWithRole>();

  for (const demoUser of DEFAULT_MOCK_USERS) {
    usersById.set(demoUser.user_id, { ...demoUser });
  }

  for (const registeredUser of getRegisteredMockUsers()) {
    const existing = usersById.get(registeredUser.user_id);

    usersById.set(registeredUser.user_id, {
      ...existing,
      ...registeredUser,
      created_at:
        registeredUser.created_at ||
        existing?.created_at ||
        "",
    });
  }

  for (const override of getStoredRoleOverrides()) {
    const existing = usersById.get(override.user_id);

    if (existing) {
      usersById.set(override.user_id, {
        ...existing,
        role: override.role,
      });
    }
  }

  return Array.from(usersById.values()).sort((a, b) => {
    const dateA = isValidDate(a.created_at)
      ? new Date(a.created_at).getTime()
      : 0;

    const dateB = isValidDate(b.created_at)
      ? new Date(b.created_at).getTime()
      : 0;

    return dateB - dateA;
  });
};

const AdminUsers = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useCurrentUser();

  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(!hasSupabaseEnv);

  const fetchUsers = useCallback(async () => {
    setLoading(true);

    let timeoutId: number | undefined;

    try {
      if (!hasSupabaseEnv) {
        const mockUsers = buildMockUserList();

        setUsers(mockUsers);
        setUsingMockData(true);

        console.info(
          "[AdminUsers] Loaded local demo users:",
          mockUsers.length
        );

        return;
      }

      const loadDatabaseUsers = async (): Promise<UserWithRole[]> => {
        const { data: profiles, error: profilesError } =
          await supabase
            .from("profiles")
            .select(
              "user_id, display_name, email, location, created_at"
            )
            .order("created_at", { ascending: false });

        if (profilesError) {
          throw profilesError;
        }

        const { data: roles, error: rolesError } =
          await supabase
            .from("user_roles")
            .select("user_id, role");

        if (rolesError) {
          throw rolesError;
        }

        const roleMap = new Map<string, UserRole>(
          (roles || []).map((item) => [
            item.user_id,
            normalizeRole(item.role),
          ])
        );

        return (profiles || []).map((profile) => ({
          user_id: profile.user_id,
          display_name: profile.display_name || "Unnamed User",
          email: profile.email,
          location: profile.location,
          created_at: profile.created_at || "",
          role: roleMap.get(profile.user_id) || "farmer",
        }));
      };

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(
            new Error(
              "Loading users timed out. Check your Supabase connection."
            )
          );
        }, FETCH_TIMEOUT_MS);
      });

      const databaseUsers = await Promise.race([
        loadDatabaseUsers(),
        timeoutPromise,
      ]);

      setUsers(databaseUsers);
      setUsingMockData(false);

      console.info(
        "[AdminUsers] Loaded database users:",
        databaseUsers.length
      );
    } catch (error) {
      console.error("[AdminUsers] Database loading failed:", error);

      const mockUsers = buildMockUserList();

      setUsers(mockUsers);
      setUsingMockData(true);

      toast.error(
        "Database unavailable. Showing locally saved demo users instead."
      );
    } finally {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }

      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (
    targetUserId: string,
    newRoleValue: string
  ) => {
    if (!VALID_ROLES.includes(newRoleValue as UserRole)) {
      toast.error("Invalid role selected");
      return;
    }

    const newRole = newRoleValue as UserRole;

    setChangingRole(targetUserId);

    try {
      if (usingMockData || !hasSupabaseEnv) {
        const currentUsers = buildMockUserList();

        const updatedUsers = currentUsers.map((item) =>
          item.user_id === targetUserId
            ? { ...item, role: newRole }
            : item
        );

        localStorage.setItem(
          "mock_users",
          JSON.stringify(updatedUsers)
        );

        const registry = getSecureItem<
          Record<string, RegisteredMockUser>
        >("mock_registered_users", {});

        for (const [aadhaar, entry] of Object.entries(registry)) {
          const registeredId =
            entry?.profile?.id ||
            entry?.user?.id ||
            `mock-user-${aadhaar}`;

          if (registeredId === targetUserId) {
            registry[aadhaar] = {
              ...entry,
              profile: {
                ...(entry.profile || {}),
                role: newRole,
              },
            };
          }
        }

        setSecureItem("mock_registered_users", registry);
        setUsers(updatedUsers);

        toast.success(`Role updated to ${newRole}`);
        return;
      }

      const { error } = await supabase.rpc("admin_assign_role", {
        _target_user_id: targetUserId,
        _new_role: newRole,
      });

      if (error) {
        throw error;
      }

      setUsers((previousUsers) =>
        previousUsers.map((item) =>
          item.user_id === targetUserId
            ? { ...item, role: newRole }
            : item
        )
      );

      toast.success(`Role updated to ${newRole}`);
    } catch (error) {
      console.error("[AdminUsers] Failed to change role:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to change role"
      );

      await fetchUsers();
    } finally {
      setChangingRole(null);
    }
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredUsers = useMemo(() => {
    return users.filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        item.display_name.toLowerCase().includes(normalizedSearch) ||
        (item.email || "").toLowerCase().includes(normalizedSearch);

      const matchesRole =
        roleFilter === "all" || item.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, normalizedSearch, roleFilter]);

  const roleCounts = useMemo(
    () => ({
      total: users.length,
      farmer: users.filter((item) => item.role === "farmer").length,
      merchant: users.filter((item) => item.role === "merchant").length,
      expert: users.filter((item) => item.role === "expert").length,
      admin: users.filter((item) => item.role === "admin").length,
    }),
    [users]
  );

  const getRoleBadge = (role: UserRole) => {
    const styles: Record<UserRole, string> = {
      farmer: "bg-primary/15 text-primary border-primary/30",
      merchant: "bg-accent/15 text-accent border-accent/30",
      expert: "bg-navy/15 text-navy border-navy/30",
      admin: "bg-destructive/15 text-destructive border-destructive/30",
    };

    return styles[role];
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "farmer":
        return <UserCheck className="h-4 w-4" />;
      case "merchant":
        return <Store className="h-4 w-4" />;
      case "expert":
        return <GraduationCap className="h-4 w-4" />;
      case "admin":
        return <Shield className="h-4 w-4" />;
    }
  };

  const stats = [
    {
      label: "Total",
      count: roleCounts.total,
      icon: Users,
      color: "text-foreground",
    },
    {
      label: "Farmers",
      count: roleCounts.farmer,
      icon: UserCheck,
      color: "text-primary",
    },
    {
      label: "Merchants",
      count: roleCounts.merchant,
      icon: Store,
      color: "text-accent",
    },
    {
      label: "Experts",
      count: roleCounts.expert,
      icon: GraduationCap,
      color: "text-navy",
    },
    {
      label: "Admins",
      count: roleCounts.admin,
      icon: Shield,
      color: "text-destructive",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header
        user={{
          name: user.name,
          role: "admin",
        }}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
      />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole="admin"
      />

      <main className="md:ml-64 pt-16 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gradient-saffron-navy">
              👥 User Management
            </h1>

            <p className="text-muted-foreground mt-1">
              Manage all platform users and roles
            </p>
          </div>

          {usingMockData && (
            <p className="text-sm text-amber-600">
              Demo mode: showing locally saved users. Database users may
              not be available.
            </p>
          )}

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {stats.map((stat) => (
              <Card key={stat.label} className="tricolor-card">
                <CardContent className="p-4 flex items-center gap-3">
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />

                  <div>
                    <p className="text-2xl font-bold tabular-nums">
                      {loading ? "…" : stat.count}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(event) =>
                      setSearchQuery(event.target.value)
                    }
                    className="pl-10"
                  />
                </div>

                <Select
                  value={roleFilter}
                  onValueChange={setRoleFilter}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="farmer">Farmers</SelectItem>
                    <SelectItem value="merchant">Merchants</SelectItem>
                    <SelectItem value="expert">Experts</SelectItem>
                    <SelectItem value="admin">Admins</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={() => void fetchUsers()}
                  disabled={loading}
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${
                      loading ? "animate-spin" : ""
                    }`}
                  />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                All Users ({loading ? "…" : filteredUsers.length})
              </CardTitle>

              <CardDescription>
                Change a user's role using the selector.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No users found
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredUsers.map((item) => {
                    const initials = item.display_name
                      .trim()
                      .split(/\s+/)
                      .map((part) => part[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);

                    const joinedDate = isValidDate(item.created_at)
                      ? new Date(item.created_at)
                      : null;

                    return (
                      <div
                        key={item.user_id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {initials || "U"}
                            </AvatarFallback>
                          </Avatar>

                          <div>
                            <p className="font-medium">
                              {item.display_name}
                            </p>

                            <p className="text-sm text-muted-foreground">
                              {item.email || "No email"}
                            </p>

                            <p className="text-xs text-muted-foreground">
                              {item.location || "Location unavailable"}
                              {" • "}
                              Joined{" "}
                              {joinedDate
                                ? joinedDate.toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "date unavailable"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge
                            className={`${getRoleBadge(item.role)} border`}
                          >
                            {getRoleIcon(item.role)}
                            <span className="ml-1 capitalize">
                              {item.role}
                            </span>
                          </Badge>

                          <Select
                            value={item.role}
                            onValueChange={(role) =>
                              void handleRoleChange(item.user_id, role)
                            }
                            disabled={changingRole === item.user_id}
                          >
                            <SelectTrigger className="w-[130px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>

                            <SelectContent>
                              <SelectItem value="farmer">
                                🌾 Farmer
                              </SelectItem>
                              <SelectItem value="merchant">
                                🏢 Merchant
                              </SelectItem>
                              <SelectItem value="expert">
                                🎓 Expert
                              </SelectItem>
                              <SelectItem value="admin">
                                🛡️ Admin
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminUsers;